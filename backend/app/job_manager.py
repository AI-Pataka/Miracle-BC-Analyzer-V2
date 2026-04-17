"""
In-process job manager for background analysis runs.

Each analysis kicked off via `/api/analyze/start` spawns an `asyncio.Task` that
walks the streaming pipeline, persists every event to Firestore (via
`analysis_store`), and fans events out to live SSE subscribers through a
`JobBus`. Because the task owns its own state, the original HTTP request can
close without killing the job — subsequent `/api/analyses/{id}/stream` calls
replay persisted events from Firestore, then tail the live bus.

This is deliberately single-process. If we ever scale to multiple workers,
the bus becomes a Redis pub/sub and persistence remains the source of truth.
"""

import asyncio
from typing import AsyncIterator, Optional

from app.analysis_store import (
    append_event,
    mark_complete,
    mark_failed,
    set_status,
    update_stage,
)
from app.logger import agent_logger


# ── JobBus ────────────────────────────────────────────────────────────

class JobBus:
    """
    Fan-out bus keyed by analysis_id. Every subscriber gets its own queue;
    `publish` copies the event into each one. A sentinel `None` is pushed
    when the job finishes so subscribers know to close.
    """

    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue]] = {}
        self._finished: set[str] = set()
        self._lock = asyncio.Lock()

    async def publish(self, analysis_id: str, event: dict) -> None:
        async with self._lock:
            queues = list(self._queues.get(analysis_id, ()))
        for q in queues:
            await q.put(event)

    async def subscribe(self, analysis_id: str) -> asyncio.Queue:
        """Create a new subscriber queue. Caller is responsible for unsubscribe."""
        q: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._queues.setdefault(analysis_id, []).append(q)
            already_finished = analysis_id in self._finished
        if already_finished:
            # Job finished before this subscriber arrived — push sentinel so
            # the subscriber's consumer loop terminates after draining replay.
            await q.put(None)
        return q

    async def unsubscribe(self, analysis_id: str, q: asyncio.Queue) -> None:
        async with self._lock:
            queues = self._queues.get(analysis_id)
            if queues and q in queues:
                queues.remove(q)
                if not queues:
                    self._queues.pop(analysis_id, None)

    async def finish(self, analysis_id: str) -> None:
        """Mark a job as finished and close all current subscriber queues."""
        async with self._lock:
            self._finished.add(analysis_id)
            queues = list(self._queues.get(analysis_id, ()))
        for q in queues:
            await q.put(None)

    def is_active(self, analysis_id: str) -> bool:
        return analysis_id in self._queues and analysis_id not in self._finished


_bus = JobBus()


def get_bus() -> JobBus:
    return _bus


# ── Background runner ─────────────────────────────────────────────────

async def _run_analysis(
    *,
    user_id: str,
    analysis_id: str,
    input_text: str,
    core_assumptions: str,
    max_retries: int,
) -> None:
    """
    Drive the streaming pipeline, persisting every event to Firestore and
    publishing to the JobBus. Runs as a detached asyncio task.
    """
    # Local import to avoid circular dep (orchestrator also uses logger/etc).
    from app.orchestrator import run_full_pipeline_streaming_v2

    bus = get_bus()

    async def emit(event: dict) -> None:
        # Persist first so late subscribers see it on replay, then publish.
        try:
            append_event(user_id, analysis_id, event)
        except Exception as e:
            agent_logger.warning(f"[job_manager] persist event failed for {analysis_id}: {e}")
        await bus.publish(analysis_id, event)

    try:
        set_status(user_id, analysis_id, "running")
        await emit({"type": "status", "status": "running"})

        async for event in run_full_pipeline_streaming_v2(
            user_id=user_id,
            analysis_id=analysis_id,
            input_text=input_text,
            core_assumptions=core_assumptions,
            max_retries=max_retries,
        ):
            etype = event.get("type")
            stage = event.get("stage")

            # Mirror stage transitions into the per-stage sub-doc so reloads
            # after reconnect show the latest state without replaying events.
            if etype == "stage_start" and stage:
                update_stage(
                    user_id, analysis_id, stage,
                    status="running",
                    attempt=event.get("attempt", 1),
                    started_at=event.get("started_at", ""),
                )
            elif etype == "stage_done" and stage:
                update_stage(
                    user_id, analysis_id, stage,
                    status="done",
                    duration_ms=event.get("duration_ms", 0),
                )
            elif etype == "stage_output" and stage:
                update_stage(
                    user_id, analysis_id, stage,
                    output=event.get("markdown", ""),
                )
            elif etype == "complete":
                mark_complete(
                    user_id, analysis_id,
                    final_output=event.get("final_output", ""),
                    qa_pass=bool(event.get("qa_pass", False)),
                    qa_feedback=event.get("qa_feedback", ""),
                    attempts=int(event.get("attempts", 1)),
                )
            elif etype == "error":
                mark_failed(user_id, analysis_id, event.get("detail", "unknown error"))

            await emit(event)

    except Exception as e:
        agent_logger.error(f"[job_manager] analysis {analysis_id} crashed: {e}")
        try:
            mark_failed(user_id, analysis_id, str(e))
        except Exception:
            pass
        await emit({"type": "error", "detail": str(e)})
    finally:
        await bus.finish(analysis_id)


_tasks: dict[str, asyncio.Task] = {}


def start_background_analysis(
    *,
    user_id: str,
    analysis_id: str,
    input_text: str,
    core_assumptions: str,
    max_retries: int = 2,
) -> asyncio.Task:
    """Spawn the pipeline as a detached task and return a handle."""
    task = asyncio.create_task(
        _run_analysis(
            user_id=user_id,
            analysis_id=analysis_id,
            input_text=input_text,
            core_assumptions=core_assumptions,
            max_retries=max_retries,
        ),
        name=f"analysis:{analysis_id}",
    )
    _tasks[analysis_id] = task

    def _cleanup(_t: asyncio.Task, aid: str = analysis_id) -> None:
        _tasks.pop(aid, None)

    task.add_done_callback(_cleanup)
    return task


def is_running(analysis_id: str) -> bool:
    task = _tasks.get(analysis_id)
    return bool(task and not task.done())


# ── SSE stream helper ─────────────────────────────────────────────────

async def stream_events(
    *,
    user_id: str,
    analysis_id: str,
    replay: list[dict],
) -> AsyncIterator[dict]:
    """
    Replay persisted events first, then tail live events from the bus until
    the job finishes. Used by `/api/analyses/{id}/stream`.

    If the analysis is already finished (no active task), only the replay is
    yielded — the bus subscription will immediately see the sentinel.
    """
    for event in replay:
        yield event

    bus = get_bus()
    q = await bus.subscribe(analysis_id)
    try:
        while True:
            event: Optional[dict] = await q.get()
            if event is None:
                return
            yield event
    finally:
        await bus.unsubscribe(analysis_id, q)
