"""
LangGraph Orchestrator — parallel state machine + per-agent LLM config.

Each of the seven agents (master, context, capability, journey, systems,
financial, qa) loads its own LangChain chat model from
`app.agent_config.load_agent_config`, so users can override provider / model /
API key / temperature / Skills.md per agent. Behavior matches the previous
hardcoded `ChatAnthropic(claude-sonnet-4)` defaults when no override exists.

Two streaming entry points exist:
  * `run_full_pipeline_streaming`  — legacy sequential; preserved for the old
    `/api/approve/stream` endpoint.
  * `run_full_pipeline_streaming_v2` — wave-parallel + emits `stage_output`
    events after each stage so the frontend can render progressively. This is
    what the new `/api/analyze/start` + `/api/analyses/{id}/stream` pair uses.
"""

import time
import asyncio
import operator
from datetime import datetime, timezone
from typing import TypedDict, Annotated, Literal, Callable, AsyncIterator
from dotenv import load_dotenv

from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END

from app.agents.prompts import (
    MASTER_ORCHESTRATOR_PROMPT,
    CONTEXT_AGENT_PROMPT,
    CAPABILITY_AGENT_PROMPT,
    JOURNEY_AGENT_PROMPT,
    SYSTEMS_AGENT_PROMPT,
    FINANCIAL_AGENT_PROMPT,
)
from app.tools.firestore_tools import (
    search_capability_kb,
    get_product_owner,
    get_journey_steps,
)
from app.agents.qa_agent import qa_validation_node, run_qa_validation
from app.agent_config import load_agent_config, build_llm, compose_prompt
from app.logger import agent_logger, generate_run_id

load_dotenv()


# ══════════════════════════════════════════════════════════════════════
# STATE DEFINITION
# ══════════════════════════════════════════════════════════════════════

class AnalyzerState(TypedDict):
    """Strict state schema passed between all nodes in the graph."""
    input_text: str
    user_id: str
    core_assumptions: str
    validation_status: str  # "pending" | "approved" | "rejected"
    context_output: str
    capability_output: str
    journey_output: str
    systems_output: str
    financial_output: str
    qa_feedback: str
    qa_pass: bool
    final_output: str


# ══════════════════════════════════════════════════════════════════════
# PER-AGENT LLM + PROMPT LOADING
# ══════════════════════════════════════════════════════════════════════

def _build_agent_chain(
    agent_name: str,
    base_prompt,
    user_id: str,
    *,
    temperature_override: float | None = None,
    tools: list | None = None,
):
    """
    Load the user's config for this agent, compose Skills.md into the prompt,
    and return (chain, llm, cfg). Callers that need `llm.bind_tools(...)` can
    use the raw llm; the chain already has tools bound when `tools` is given.
    """
    cfg = load_agent_config(user_id, agent_name)
    if temperature_override is not None:
        cfg.temperature = temperature_override
    llm = build_llm(cfg)
    composed_prompt = compose_prompt(base_prompt, cfg.skills_md)
    if tools:
        chain = composed_prompt | llm.bind_tools(tools)
    else:
        chain = composed_prompt | llm
    return chain, llm, cfg


def get_llm(temperature: float = 0.1):
    """
    Backward-compat shim for code paths that want a Claude Sonnet LLM without
    going through per-agent config (e.g. the /api/summarize endpoint). For
    agent nodes, use `_build_agent_chain` instead.
    """
    from app.agent_config import AgentConfig, build_llm
    return build_llm(AgentConfig(
        agent_name="master", provider="anthropic",
        model="claude-sonnet-4-20250514",
        temperature=temperature, max_tokens=8192,
    ))


def invoke_with_retry(chain, inputs, max_retries: int = 6, base_delay: float = 3.0):
    """Invoke a chain with exponential backoff on 529/429 errors."""
    for attempt in range(max_retries + 1):
        try:
            return chain.invoke(inputs)
        except Exception as e:
            error_str = str(e).lower()
            is_retryable = (
                "529" in error_str
                or "overloaded" in error_str
                or "429" in error_str
                or "rate" in error_str
            )
            if is_retryable and attempt < max_retries:
                delay = base_delay * (2 ** attempt)
                agent_logger.warning(
                    f"API overloaded/rate-limited (attempt {attempt + 1}/{max_retries + 1}), "
                    f"retrying in {delay:.0f}s..."
                )
                time.sleep(delay)
            else:
                raise


# ══════════════════════════════════════════════════════════════════════
# NODE FUNCTIONS
# ══════════════════════════════════════════════════════════════════════

def master_node(state: AnalyzerState) -> dict:
    """Master Orchestrator: extracts 5 core assumptions."""
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] MASTER AGENT — started")
    chain, _, _ = _build_agent_chain("master", MASTER_ORCHESTRATOR_PROMPT, state["user_id"])

    response = invoke_with_retry(chain, {"input_text": state["input_text"]})

    agent_logger.info(f"[{run_id}] MASTER AGENT — finished (assumptions extracted)")
    return {
        "core_assumptions": response.content,
        "validation_status": "pending",
    }


def context_node(state: AnalyzerState) -> dict:
    """Context Sub-Agent: slides 1, 2, 7, 8, 10, 11."""
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] CONTEXT AGENT — started")
    chain, _, _ = _build_agent_chain("context", CONTEXT_AGENT_PROMPT, state["user_id"])

    response = invoke_with_retry(chain, {
        "input_text": state["input_text"],
        "core_assumptions": state["core_assumptions"],
    })

    agent_logger.info(f"[{run_id}] CONTEXT AGENT — finished")
    return {"context_output": response.content}


def capability_node(state: AnalyzerState) -> dict:
    """Capability Sub-Agent: slides 3, 4, Appendix A. Uses search_capability_kb."""
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] CAPABILITY AGENT — started")
    chain, llm, _ = _build_agent_chain(
        "capability", CAPABILITY_AGENT_PROMPT, state["user_id"],
        tools=[search_capability_kb],
    )

    response = invoke_with_retry(chain, {
        "input_text": state["input_text"],
        "core_assumptions": state["core_assumptions"],
        "user_id": state["user_id"],
    })

    output = response.content
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_results = []
        for tool_call in response.tool_calls:
            if tool_call["name"] == "search_capability_kb":
                result = search_capability_kb.invoke(tool_call["args"])
                tool_results.append(f"Tool result for '{tool_call['args'].get('query', '')}': {result}")

        followup_prompt = (
            f"Based on the following knowledge base search results, generate the final "
            f"Slides 3, 4, and Appendix A output.\n\n"
            f"CRITICAL RULES:\n"
            f"- For each capability: if the search returned 'MATCH FOUND', use the matched "
            f"name exactly and do NOT add '(New)'.\n"
            f"- If the search returned 'NO MATCH', you MUST mark that capability with the "
            f"exact string '(New)' appended to the L4 Capability name in Slide 4.\n"
            f"- In Appendix A, for EVERY capability list: (1) the KB search query used, "
            f"(2) whether a match was found ('KB: MATCH' or 'KB: NO MATCH'), and "
            f"(3) the rationale. This evidence is required for QA validation.\n\n"
            f"KB Search Results:\n"
            + "\n".join(tool_results)
            + f"\n\nOriginal input:\n{state['input_text']}"
        )
        followup_response = invoke_with_retry(llm, [HumanMessage(content=followup_prompt)])
        output = followup_response.content

    agent_logger.info(f"[{run_id}] CAPABILITY AGENT — finished")
    return {"capability_output": output}


def journey_node(state: AnalyzerState) -> dict:
    """Journey Sub-Agent: slides 5, 9. Uses get_journey_steps."""
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] JOURNEY AGENT — started")
    chain, llm, _ = _build_agent_chain(
        "journey", JOURNEY_AGENT_PROMPT, state["user_id"],
        tools=[get_journey_steps],
    )

    response = invoke_with_retry(chain, {
        "input_text": state["input_text"],
        "core_assumptions": state["core_assumptions"],
        "capability_output": state.get("capability_output", "Not yet available"),
        "user_id": state["user_id"],
    })

    output = response.content
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_results = []
        for tool_call in response.tool_calls:
            if tool_call["name"] == "get_journey_steps":
                result = get_journey_steps.invoke(tool_call["args"])
                tool_results.append(f"Journey steps: {result}")

        followup_prompt = (
            f"Based on the following journey framework, generate Slides 5 and 9.\n\n"
            f"Journey Framework:\n" + "\n".join(tool_results)
            + f"\n\nCapabilities from Slide 4:\n{state.get('capability_output', 'N/A')}"
            + f"\n\nOriginal input:\n{state['input_text']}"
        )
        followup_response = invoke_with_retry(llm, [HumanMessage(content=followup_prompt)])
        output = followup_response.content

    agent_logger.info(f"[{run_id}] JOURNEY AGENT — finished")
    return {"journey_output": output}


def systems_node(state: AnalyzerState) -> dict:
    """Systems Sub-Agent: slides 6, 12. Uses get_product_owner."""
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] SYSTEMS AGENT — started")
    chain, llm, _ = _build_agent_chain(
        "systems", SYSTEMS_AGENT_PROMPT, state["user_id"],
        tools=[get_product_owner],
    )

    response = invoke_with_retry(chain, {
        "input_text": state["input_text"],
        "core_assumptions": state["core_assumptions"],
        "capability_output": state.get("capability_output", "Not yet available"),
        "user_id": state["user_id"],
    })

    output = response.content
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_results = []
        for tool_call in response.tool_calls:
            if tool_call["name"] == "get_product_owner":
                result = get_product_owner.invoke(tool_call["args"])
                tool_results.append(
                    f"Product lookup for '{tool_call['args'].get('action_keyword', '')}': {result}"
                )

        followup_prompt = (
            f"Based on the following product lookups, generate Slides 6 and 12.\n\n"
            f"Product Lookups:\n" + "\n".join(tool_results)
            + f"\n\nCapabilities:\n{state.get('capability_output', 'N/A')}"
            + f"\n\nOriginal input:\n{state['input_text']}"
        )
        followup_response = invoke_with_retry(llm, [HumanMessage(content=followup_prompt)])
        output = followup_response.content

    agent_logger.info(f"[{run_id}] SYSTEMS AGENT — finished")
    return {"systems_output": output}


def financial_node(state: AnalyzerState) -> dict:
    """Financial Sub-Agent: Appendices B, C, D."""
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] FINANCIAL AGENT — started")
    chain, _, _ = _build_agent_chain("financial", FINANCIAL_AGENT_PROMPT, state["user_id"])

    response = invoke_with_retry(chain, {
        "input_text": state["input_text"],
        "core_assumptions": state["core_assumptions"],
        "journey_output": state.get("journey_output", "Not yet available"),
        "capability_output": state.get("capability_output", "Not yet available"),
        "systems_output": state.get("systems_output", "Not yet available"),
    })

    agent_logger.info(f"[{run_id}] FINANCIAL AGENT — finished")
    return {"financial_output": response.content}


def merge_node(state: AnalyzerState) -> dict:
    """Compiler Node: merge all sub-agent outputs into one Markdown document."""
    def to_str(val):
        if val is None:
            return ""
        if isinstance(val, list):
            return "\n".join(str(item) for item in val)
        return str(val)

    sections = ["# Business Capability Analysis Report\n", "---\n"]

    for key in ("context_output", "capability_output", "journey_output",
                "systems_output", "financial_output"):
        if state.get(key):
            sections.append(to_str(state[key]))
            if key != "financial_output":
                sections.append("\n---\n")

    return {"final_output": "\n".join(sections)}


# ══════════════════════════════════════════════════════════════════════
# ROUTING FUNCTIONS (legacy graph)
# ══════════════════════════════════════════════════════════════════════

def validation_router(state: AnalyzerState) -> Literal["parallel_agents", "__end__"]:
    if state.get("validation_status") == "approved":
        return "parallel_agents"
    return "__end__"


def qa_router(state: AnalyzerState) -> Literal["parallel_agents", "__end__"]:
    if state.get("qa_pass", False):
        return "__end__"
    return "parallel_agents"


def parallel_agents_node(state: AnalyzerState) -> dict:
    """Sequential wrapper used by the legacy graph. New code uses v2 streaming."""
    results = {}
    results.update(context_node(state))
    results.update(capability_node(state))
    updated_state = {**state, **results}
    results.update(journey_node(updated_state))
    results.update(systems_node(updated_state))
    updated_state = {**state, **results}
    results.update(financial_node(updated_state))
    return results


def build_graph() -> StateGraph:
    workflow = StateGraph(AnalyzerState)
    workflow.add_node("master", master_node)
    workflow.add_node("parallel_agents", parallel_agents_node)
    workflow.add_node("merge", merge_node)
    workflow.add_node("qa_validation", qa_validation_node)
    workflow.set_entry_point("master")
    workflow.add_conditional_edges(
        "master", validation_router,
        {"parallel_agents": "parallel_agents", "__end__": END},
    )
    workflow.add_edge("parallel_agents", "merge")
    workflow.add_edge("merge", "qa_validation")
    workflow.add_conditional_edges(
        "qa_validation", qa_router,
        {"parallel_agents": "parallel_agents", "__end__": END},
    )
    return workflow.compile()


graph = build_graph()


# ══════════════════════════════════════════════════════════════════════
# MASTER EXTRACTION (step 1 of the UI flow)
# ══════════════════════════════════════════════════════════════════════

async def run_master_extraction(input_text: str, user_id: str) -> dict:
    run_id = generate_run_id()
    agent_logger.info(f"[{run_id}] === MASTER EXTRACTION (user={user_id}) ===")

    initial_state = {
        "input_text": input_text,
        "user_id": user_id,
        "core_assumptions": "",
        "validation_status": "pending",
        "context_output": "", "capability_output": "", "journey_output": "",
        "systems_output": "", "financial_output": "",
        "qa_feedback": "", "qa_pass": False, "final_output": "",
        "_run_id": run_id,
    }
    result = await asyncio.to_thread(master_node, initial_state)
    agent_logger.info(f"[{run_id}] === MASTER EXTRACTION COMPLETE ===")
    return {
        "core_assumptions": result["core_assumptions"],
        "validation_status": "pending",
    }


# ══════════════════════════════════════════════════════════════════════
# LEGACY SEQUENTIAL STREAMING (kept for backward compat)
# ══════════════════════════════════════════════════════════════════════

async def run_full_pipeline_streaming(
    input_text: str,
    user_id: str,
    core_assumptions: str,
    max_retries: int = 2,
):
    """Legacy sequential streaming pipeline. Still used by `/api/approve/stream`."""
    run_id = generate_run_id()
    agent_logger.info(f"[{run_id}] === STREAMING PIPELINE (user={user_id}) ===")

    state = {
        "input_text": input_text,
        "user_id": user_id,
        "core_assumptions": core_assumptions,
        "validation_status": "approved",
        "context_output": "", "capability_output": "", "journey_output": "",
        "systems_output": "", "financial_output": "",
        "qa_feedback": "", "qa_pass": False, "final_output": "",
        "_run_id": run_id,
    }

    seq = [
        ("context", "Market Context & KPIs", context_node),
        ("capability", "Capability Design", capability_node),
        ("journey", "Journey Mapping", journey_node),
        ("systems", "Architecture & Systems", systems_node),
        ("financial", "Financial Analysis", financial_node),
        ("merge", "Compiling Report", merge_node),
    ]

    try:
        for attempt in range(max_retries + 1):
            for stage, label, fn in seq:
                t0 = int(time.time() * 1000)
                yield {"type": "stage_start", "stage": stage, "label": label, "attempt": attempt + 1}
                await asyncio.sleep(0)
                result = await asyncio.to_thread(fn, state)
                state.update(result)
                yield {"type": "stage_done", "stage": stage, "label": label,
                       "duration_ms": int(time.time() * 1000) - t0}
                await asyncio.sleep(0)

            t0 = int(time.time() * 1000)
            yield {"type": "stage_start", "stage": "qa", "label": "QA Validation", "attempt": attempt + 1}
            await asyncio.sleep(0)
            qa_result = await asyncio.to_thread(run_qa_validation, state["final_output"], user_id)
            yield {"type": "stage_done", "stage": "qa", "label": "QA Validation",
                   "duration_ms": int(time.time() * 1000) - t0}
            await asyncio.sleep(0)

            if qa_result["qa_pass"]:
                yield {"type": "complete", "qa_pass": True, "qa_feedback": "",
                       "attempts": attempt + 1, "final_output": state["final_output"]}
                return

            state["qa_feedback"] = qa_result["qa_feedback"]
            if attempt < max_retries:
                yield {"type": "qa_retry", "attempt": attempt + 1,
                       "feedback": qa_result["qa_feedback"][:300]}
                state["input_text"] = (
                    input_text
                    + f"\n\n--- QA CORRECTION REQUIRED (Attempt {attempt + 2}) ---\n"
                    + qa_result["qa_feedback"] + "\nFix the above violations in your output."
                )

        yield {"type": "complete", "qa_pass": False, "qa_feedback": state["qa_feedback"],
               "attempts": max_retries + 1, "final_output": state["final_output"]}
    except Exception as e:
        agent_logger.error(f"[{run_id}] Streaming pipeline error: {e}")
        yield {"type": "error", "detail": str(e)}


# ══════════════════════════════════════════════════════════════════════
# WAVE-PARALLEL STREAMING V2 (used by the new /api/analyze/start endpoint)
# ══════════════════════════════════════════════════════════════════════

STAGE_LABELS = {
    "context": "Market Context & KPIs",
    "capability": "Capability Design",
    "journey": "Journey Mapping",
    "systems": "Architecture & Systems",
    "financial": "Financial Analysis",
    "merge": "Compiling Report",
    "qa": "QA Validation",
}

STAGE_OUTPUT_KEY = {
    "context": "context_output",
    "capability": "capability_output",
    "journey": "journey_output",
    "systems": "systems_output",
    "financial": "financial_output",
    "merge": "final_output",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


async def _run_wave(
    stages: list[tuple[str, Callable[[dict], dict]]],
    state: dict,
    attempt: int,
) -> AsyncIterator[dict]:
    """
    Launch all stages in a wave concurrently via `asyncio.to_thread` and yield
    events (`stage_start` up front, then `stage_done` + `stage_output` in the
    order they actually finish). Mutates `state` in place.
    """
    for stage, _fn in stages:
        yield {
            "type": "stage_start",
            "stage": stage,
            "label": STAGE_LABELS.get(stage, stage),
            "attempt": attempt,
            "started_at": _now_iso(),
        }

    async def _run_one(stage: str, fn: Callable[[dict], dict]) -> dict:
        t0 = int(time.time() * 1000)
        result = await asyncio.to_thread(fn, state)
        return {
            "stage": stage,
            "duration_ms": int(time.time() * 1000) - t0,
            "result": result,
        }

    tasks = [asyncio.create_task(_run_one(s, fn)) for s, fn in stages]
    for coro in asyncio.as_completed(tasks):
        info = await coro
        state.update(info["result"])
        stage = info["stage"]
        yield {
            "type": "stage_done",
            "stage": stage,
            "label": STAGE_LABELS.get(stage, stage),
            "duration_ms": info["duration_ms"],
        }
        output_key = STAGE_OUTPUT_KEY.get(stage)
        if output_key and state.get(output_key):
            yield {
                "type": "stage_output",
                "stage": stage,
                "markdown": state[output_key],
            }


async def run_full_pipeline_streaming_v2(
    *,
    user_id: str,
    analysis_id: str,
    input_text: str,
    core_assumptions: str,
    max_retries: int = 2,
) -> AsyncIterator[dict]:
    """
    Wave-parallel streaming pipeline.

    Waves:
      1. context ‖ capability                 (truly concurrent)
      2. journey ‖ systems                    (both depend on capability_output)
      3. financial                            (depends on the prior three)
      4. merge → qa                           (sequential finishers)

    On QA failure, loops back to wave 1 with the feedback appended.
    """
    run_id = generate_run_id()
    agent_logger.info(
        f"[{run_id}] === V2 STREAMING (user={user_id} analysis={analysis_id}) ==="
    )

    state = {
        "input_text": input_text,
        "user_id": user_id,
        "core_assumptions": core_assumptions,
        "validation_status": "approved",
        "context_output": "", "capability_output": "", "journey_output": "",
        "systems_output": "", "financial_output": "",
        "qa_feedback": "", "qa_pass": False, "final_output": "",
        "_run_id": run_id,
    }

    try:
        for attempt in range(max_retries + 1):
            attempt_num = attempt + 1
            agent_logger.info(f"[{run_id}] Attempt {attempt_num}/{max_retries + 1}")

            # Wave 1 — context ‖ capability
            async for ev in _run_wave(
                [("context", context_node), ("capability", capability_node)],
                state, attempt_num,
            ):
                yield ev

            # Wave 2 — journey ‖ systems (now that capability_output is set)
            async for ev in _run_wave(
                [("journey", journey_node), ("systems", systems_node)],
                state, attempt_num,
            ):
                yield ev

            # Wave 3 — financial
            async for ev in _run_wave(
                [("financial", financial_node)],
                state, attempt_num,
            ):
                yield ev

            # Wave 4a — merge
            async for ev in _run_wave(
                [("merge", merge_node)],
                state, attempt_num,
            ):
                yield ev

            # Wave 4b — QA (separate because it has custom pass/fail logic)
            t0 = int(time.time() * 1000)
            yield {
                "type": "stage_start", "stage": "qa",
                "label": STAGE_LABELS["qa"],
                "attempt": attempt_num, "started_at": _now_iso(),
            }
            qa_result = await asyncio.to_thread(run_qa_validation, state["final_output"], user_id)
            yield {
                "type": "stage_done", "stage": "qa",
                "label": STAGE_LABELS["qa"],
                "duration_ms": int(time.time() * 1000) - t0,
            }

            if qa_result["qa_pass"]:
                yield {
                    "type": "complete", "qa_pass": True, "qa_feedback": "",
                    "attempts": attempt_num, "final_output": state["final_output"],
                }
                return

            state["qa_feedback"] = qa_result["qa_feedback"]
            if attempt < max_retries:
                yield {
                    "type": "qa_retry", "attempt": attempt_num,
                    "feedback": qa_result["qa_feedback"][:300],
                }
                state["input_text"] = (
                    input_text
                    + f"\n\n--- QA CORRECTION REQUIRED (Attempt {attempt_num + 1}) ---\n"
                    + qa_result["qa_feedback"]
                    + "\nFix the above violations in your output."
                )

        yield {
            "type": "complete", "qa_pass": False,
            "qa_feedback": state["qa_feedback"],
            "attempts": max_retries + 1,
            "final_output": state["final_output"],
        }
    except Exception as e:
        agent_logger.error(f"[{run_id}] V2 streaming error: {e}")
        yield {"type": "error", "detail": str(e)}


# ══════════════════════════════════════════════════════════════════════
# SYNCHRONOUS FULL PIPELINE (kept for parity with previous API)
# ══════════════════════════════════════════════════════════════════════

async def run_full_pipeline(
    input_text: str,
    user_id: str,
    core_assumptions: str,
    max_retries: int = 2,
) -> dict:
    run_id = generate_run_id()
    agent_logger.info(
        f"[{run_id}] === FULL PIPELINE (user={user_id}, max_retries={max_retries}) ==="
    )

    state = {
        "input_text": input_text,
        "user_id": user_id,
        "core_assumptions": core_assumptions,
        "validation_status": "approved",
        "context_output": "", "capability_output": "", "journey_output": "",
        "systems_output": "", "financial_output": "",
        "qa_feedback": "", "qa_pass": False, "final_output": "",
        "_run_id": run_id,
    }

    for attempt in range(max_retries + 1):
        agent_results = await asyncio.to_thread(parallel_agents_node, state)
        state.update(agent_results)

        merge_result = await asyncio.to_thread(merge_node, state)
        state.update(merge_result)

        qa_result = await asyncio.to_thread(run_qa_validation, state["final_output"], user_id)

        if qa_result["qa_pass"]:
            return {
                "final_output": state["final_output"],
                "qa_pass": True, "qa_feedback": "",
                "attempts": attempt + 1,
            }

        state["qa_feedback"] = qa_result["qa_feedback"]
        if attempt < max_retries:
            state["input_text"] = (
                input_text
                + f"\n\n--- QA CORRECTION REQUIRED (Attempt {attempt + 2}) ---\n"
                + qa_result["qa_feedback"] + "\nFix the above violations in your output."
            )

    return {
        "final_output": state["final_output"],
        "qa_pass": False,
        "qa_feedback": state["qa_feedback"],
        "attempts": max_retries + 1,
    }
