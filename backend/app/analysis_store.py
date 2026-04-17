"""
Firestore persistence for analysis runs.

Documents live at `users/{uid}/analyses/{analysis_id}` — putting them under the
user path means ownership is enforced by the read path itself (no cross-user
leakage possible) and listing a user's history is a single collection fetch.

We deliberately use read-modify-write for stage updates instead of nested
updateMask writes. Only one background task ever writes to a given analysis
doc at a time, and read-modify-write keeps the REST encoding simple.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from app.firebase_config import get_firestore_client
from app.logger import agent_logger


STAGE_KEYS = ("context", "capability", "journey", "systems", "financial", "merge", "qa")


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _ref(user_id: str, analysis_id: str):
    db = get_firestore_client()
    return db.document(f"users/{user_id}/analyses/{analysis_id}")


def _collection(user_id: str):
    db = get_firestore_client()
    return db.document(f"users/{user_id}").collection("analyses")


def _derive_initiative_name(problem_statement: str) -> str:
    """First non-empty line of the problem statement, truncated to 120 chars."""
    for line in (problem_statement or "").splitlines():
        stripped = line.strip().lstrip("#").strip()
        if stripped:
            return stripped[:120]
    return "Untitled Initiative"


def create_analysis(
    user_id: str,
    *,
    input_text: str,
    core_assumptions: str,
    industry: str,
    consulting_company: str,
    client_company: str,
    problem_statement: str,
) -> str:
    """Create a fresh analysis doc with status=queued and return its id."""
    analysis_id = uuid.uuid4().hex
    now = _now_iso()
    empty_stage = {"status": "pending", "started_at": "", "duration_ms": 0, "output": "", "attempt": 0}
    payload = {
        "analysis_id": analysis_id,
        "user_id": user_id,
        "created_at": now,
        "updated_at": now,
        "industry": industry or "",
        "consulting_company": consulting_company or "",
        "client_company": client_company or "",
        "initiative_name": _derive_initiative_name(problem_statement),
        "problem_statement": problem_statement or "",
        "input_text": input_text,
        "core_assumptions": core_assumptions,
        "status": "queued",
        "current_stage": "",
        "attempts": 0,
        "stages": {k: dict(empty_stage) for k in STAGE_KEYS},
        "events": [],
        "final_output": "",
        "qa_pass": False,
        "qa_feedback": "",
        "error": "",
    }
    _ref(user_id, analysis_id).set(payload)
    agent_logger.info(f"[analysis_store] created {analysis_id} for user {user_id}")
    return analysis_id


def _read(user_id: str, analysis_id: str) -> Optional[dict]:
    try:
        return _ref(user_id, analysis_id).get()
    except Exception as e:
        agent_logger.warning(f"[analysis_store] read failed for {analysis_id}: {e}")
        return None


def get_analysis(user_id: str, analysis_id: str) -> Optional[dict]:
    """Return the full doc or None if not found / not owned."""
    return _read(user_id, analysis_id)


def append_event(user_id: str, analysis_id: str, event: dict) -> None:
    """Append an event to the analysis doc's events list (read-modify-write)."""
    doc = _read(user_id, analysis_id)
    if not doc:
        return
    events = doc.get("events") or []
    events.append(event)
    # Keep the list from growing unbounded across many QA retries.
    if len(events) > 500:
        events = events[-500:]
    _ref(user_id, analysis_id).update({
        "events": events,
        "updated_at": _now_iso(),
    })


def update_stage(
    user_id: str,
    analysis_id: str,
    stage: str,
    *,
    status: Optional[str] = None,
    output: Optional[str] = None,
    duration_ms: Optional[int] = None,
    attempt: Optional[int] = None,
    started_at: Optional[str] = None,
    extra: Optional[dict] = None,
) -> None:
    """Merge patch into stages.{stage}, leaving other stages untouched."""
    doc = _read(user_id, analysis_id)
    if not doc:
        return
    stages = doc.get("stages") or {k: {} for k in STAGE_KEYS}
    current = dict(stages.get(stage) or {})
    if status is not None:
        current["status"] = status
    if output is not None:
        current["output"] = output
    if duration_ms is not None:
        current["duration_ms"] = int(duration_ms)
    if attempt is not None:
        current["attempt"] = int(attempt)
    if started_at is not None:
        current["started_at"] = started_at
    if extra:
        current.update(extra)
    stages[stage] = current

    updates = {
        "stages": stages,
        "updated_at": _now_iso(),
        "current_stage": stage if status in ("running", "pending") else doc.get("current_stage", ""),
    }
    _ref(user_id, analysis_id).update(updates)


def set_status(user_id: str, analysis_id: str, status: str, *, error: str = "") -> None:
    patch = {"status": status, "updated_at": _now_iso()}
    if error:
        patch["error"] = error
    _ref(user_id, analysis_id).update(patch)


def mark_complete(
    user_id: str,
    analysis_id: str,
    *,
    final_output: str,
    qa_pass: bool,
    qa_feedback: str,
    attempts: int,
) -> None:
    _ref(user_id, analysis_id).update({
        "status": "completed",
        "final_output": final_output or "",
        "qa_pass": bool(qa_pass),
        "qa_feedback": qa_feedback or "",
        "attempts": int(attempts),
        "current_stage": "",
        "updated_at": _now_iso(),
    })


def mark_failed(user_id: str, analysis_id: str, error: str) -> None:
    _ref(user_id, analysis_id).update({
        "status": "failed",
        "error": error,
        "updated_at": _now_iso(),
    })


def delete_analysis(user_id: str, analysis_id: str) -> None:
    _ref(user_id, analysis_id).delete()


def list_analyses(
    user_id: str,
    *,
    q: str = "",
    industry: str = "",
    client_company: str = "",
    initiative: str = "",
    date_from: str = "",
    date_to: str = "",
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """
    Return this user's analyses, filtered and sorted by created_at desc.

    Filters apply in Python after a collection fetch — adequate for per-user
    volumes in the low hundreds. If a user grows beyond that we'll introduce
    a Firestore runQuery index.
    """
    try:
        docs = _collection(user_id).stream()
    except Exception as e:
        agent_logger.warning(f"[analysis_store] list failed for {user_id}: {e}")
        return []

    q_lower = (q or "").strip().lower()
    industry_lower = (industry or "").strip().lower()
    client_lower = (client_company or "").strip().lower()
    initiative_lower = (initiative or "").strip().lower()

    def matches(d: dict) -> bool:
        if industry_lower and d.get("industry", "").lower() != industry_lower:
            return False
        if client_lower and client_lower not in d.get("client_company", "").lower():
            return False
        if initiative_lower and initiative_lower not in d.get("initiative_name", "").lower():
            return False
        if date_from and d.get("created_at", "") < date_from:
            return False
        if date_to and d.get("created_at", "") > date_to + "T23:59:59.999Z":
            return False
        if q_lower:
            haystack = " ".join([
                d.get("initiative_name", ""),
                d.get("industry", ""),
                d.get("client_company", ""),
                d.get("consulting_company", ""),
                d.get("problem_statement", ""),
            ]).lower()
            if q_lower not in haystack:
                return False
        return True

    filtered = [d for d in docs if matches(d)]
    filtered.sort(key=lambda d: d.get("created_at", ""), reverse=True)

    # Strip heavy fields from the list response — frontend fetches full doc on demand.
    def summarize(d: dict) -> dict:
        return {
            "analysis_id": d.get("analysis_id") or d.get("id", ""),
            "created_at": d.get("created_at", ""),
            "updated_at": d.get("updated_at", ""),
            "industry": d.get("industry", ""),
            "consulting_company": d.get("consulting_company", ""),
            "client_company": d.get("client_company", ""),
            "initiative_name": d.get("initiative_name", ""),
            "status": d.get("status", ""),
            "qa_pass": d.get("qa_pass", False),
            "attempts": d.get("attempts", 0),
        }

    return [summarize(d) for d in filtered[offset:offset + limit]]
