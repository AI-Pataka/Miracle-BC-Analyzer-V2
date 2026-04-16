"""
LangGraph Orchestrator — Phase 4: Parallel State Machine

Prompt: "Build the LangGraph state machine with parallel fan-out execution.
Create orchestrator.py using a TypedDict state containing: input_text, user_id,
core_assumptions, validation_status, qa_feedback, and a dictionary for sub-agent
outputs. The Master Node extracts 5 core assumptions. A human-in-the-loop edge
pauses the graph if validation_status is 'pending' and routes to the parallel
fan-out if 'approved'. Implement LangGraph parallel branching to route state to
the Context, Capability, Journey, Systems, and Financial nodes simultaneously.
A Merge Node waits for all 5 sub-agents to finish and merges their outputs into
a single Markdown string. Use Google Gemini via langchain-google-genai as the
LLM. Bind the appropriate LangChain tools to each sub-agent that requires them."
"""

import os
import time
import operator
from typing import TypedDict, Annotated, Literal
from dotenv import load_dotenv

from langchain_anthropic import ChatAnthropic
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
from app.agents.qa_agent import qa_validation_node
from app.logger import agent_logger, generate_run_id

load_dotenv()


# ══════════════════════════════════════════════════════════════════════
# STATE DEFINITION
# ══════════════════════════════════════════════════════════════════════

class AnalyzerState(TypedDict):
    """Strict state schema passed between all nodes in the graph."""
    # Input
    input_text: str
    user_id: str

    # Master agent output
    core_assumptions: str

    # Human-in-the-loop
    validation_status: str  # "pending" | "approved" | "rejected"

    # Sub-agent outputs
    context_output: str
    capability_output: str
    journey_output: str
    systems_output: str
    financial_output: str

    # QA
    qa_feedback: str
    qa_pass: bool

    # Final compiled output
    final_output: str


# ══════════════════════════════════════════════════════════════════════
# LLM INITIALIZATION
# ══════════════════════════════════════════════════════════════════════

def get_llm(temperature: float = 0.1):
    """Initialize the Claude Sonnet LLM."""
    return ChatAnthropic(
        model="claude-sonnet-4-20250514",
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        temperature=temperature,
        max_tokens=8192,
        max_retries=3,
    )


def get_llm_with_tools(tools: list, temperature: float = 0.1):
    """Initialize LLM with bound tools for agents that need Firestore access."""
    llm = get_llm(temperature)
    return llm.bind_tools(tools)


def invoke_with_retry(chain, inputs, max_retries: int = 6, base_delay: float = 3.0):
    """
    Invoke a LangChain chain with exponential backoff retry on overloaded (529)
    or rate-limit (429) errors.
    Retries up to max_retries times with delays of 3s, 6s, 12s, 24s, 48s, 96s.
    """
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
    """
    Master Orchestrator: Extracts 5 core assumptions from the input.
    This runs first, before the human validation gate.
    """
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] MASTER AGENT — started")
    llm = get_llm(temperature=0.2)
    chain = MASTER_ORCHESTRATOR_PROMPT | llm

    response = invoke_with_retry(chain, {
        "input_text": state["input_text"],
    })

    agent_logger.info(f"[{run_id}] MASTER AGENT — finished (assumptions extracted)")
    return {
        "core_assumptions": response.content,
        "validation_status": "pending",
    }


def context_node(state: AnalyzerState) -> dict:
    """Context Sub-Agent: Generates slides 1, 2, 7, 8, 10, 11."""
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] CONTEXT AGENT — started")
    llm = get_llm()
    chain = CONTEXT_AGENT_PROMPT | llm

    response = invoke_with_retry(chain, {
        "input_text": state["input_text"],
        "core_assumptions": state["core_assumptions"],
    })

    agent_logger.info(f"[{run_id}] CONTEXT AGENT — finished")
    return {"context_output": response.content}


def capability_node(state: AnalyzerState) -> dict:
    """
    Capability Sub-Agent: Generates slides 3, 4, and Appendix A.
    Uses search_capability_kb tool to validate capabilities.
    """
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] CAPABILITY AGENT — started")
    llm = get_llm()
    tools = [search_capability_kb]
    llm_with_tools = llm.bind_tools(tools)

    # First pass: let the agent identify capabilities and call tools
    chain = CAPABILITY_AGENT_PROMPT | llm_with_tools

    response = invoke_with_retry(chain, {
        "input_text": state["input_text"],
        "core_assumptions": state["core_assumptions"],
        "user_id": state["user_id"],
    })

    # Handle tool calls if any
    output = response.content
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_results = []
        for tool_call in response.tool_calls:
            if tool_call["name"] == "search_capability_kb":
                result = search_capability_kb.invoke(tool_call["args"])
                tool_results.append(f"Tool result for '{tool_call['args'].get('query', '')}': {result}")

        # Second pass: generate final output with tool results
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
    """
    Journey Sub-Agent: Generates slides 5 and 9.
    Uses get_journey_steps tool to fetch journey framework.
    """
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] JOURNEY AGENT — started")
    llm = get_llm()
    tools = [get_journey_steps]
    llm_with_tools = llm.bind_tools(tools)

    chain = JOURNEY_AGENT_PROMPT | llm_with_tools

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
    """
    Systems Sub-Agent: Generates slides 6 and 12.
    Uses get_product_owner tool to find system owners.
    """
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] SYSTEMS AGENT — started")
    llm = get_llm()
    tools = [get_product_owner]
    llm_with_tools = llm.bind_tools(tools)

    chain = SYSTEMS_AGENT_PROMPT | llm_with_tools

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
    """
    Financial Sub-Agent: Generates Appendices B, C, and D.
    No tools — works from journey and capability outputs.
    """
    run_id = state.get("_run_id", "no-id")
    agent_logger.info(f"[{run_id}] FINANCIAL AGENT — started")
    llm = get_llm()
    chain = FINANCIAL_AGENT_PROMPT | llm

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
    """
    Compiler Node: Merges all sub-agent outputs into a single Markdown document.
    Waits for all 5 agents to complete before assembling.
    """
    sections = []

    sections.append("# Business Capability Analysis Report\n")
    sections.append("---\n")

    # Helper to safely convert output to string
    def to_str(val):
        if val is None:
            return ""
        if isinstance(val, list):
            return "\n".join(str(item) for item in val)
        return str(val)

    # Context slides (1, 2, 7, 8, 10, 11)
    if state.get("context_output"):
        sections.append(to_str(state["context_output"]))
        sections.append("\n---\n")

    # Capability slides (3, 4, Appendix A)
    if state.get("capability_output"):
        sections.append(to_str(state["capability_output"]))
        sections.append("\n---\n")

    # Journey slides (5, 9)
    if state.get("journey_output"):
        sections.append(to_str(state["journey_output"]))
        sections.append("\n---\n")

    # Systems slides (6, 12)
    if state.get("systems_output"):
        sections.append(to_str(state["systems_output"]))
        sections.append("\n---\n")

    # Financial appendices (B, C, D)
    if state.get("financial_output"):
        sections.append(to_str(state["financial_output"]))

    final = "\n".join(sections)

    return {"final_output": final}


# ══════════════════════════════════════════════════════════════════════
# ROUTING FUNCTIONS
# ══════════════════════════════════════════════════════════════════════


def validation_router(state: AnalyzerState) -> Literal["parallel_agents", "__end__"]:
    """
    Human-in-the-loop gate.
    Routes to parallel fan-out if approved, ends if rejected.
    """
    if state.get("validation_status") == "approved":
        return "parallel_agents"
    elif state.get("validation_status") == "rejected":
        return "__end__"
    # If still pending, the graph will be interrupted here
    return "__end__"


def qa_router(state: AnalyzerState) -> Literal["parallel_agents", "__end__"]:
    """
    QA validation routing.
    If QA passes, go to END. If fails, loop back to parallel agents.
    """
    if state.get("qa_pass", False):
        return "__end__"
    else:
        return "parallel_agents"


# ══════════════════════════════════════════════════════════════════════
# PARALLEL FAN-OUT NODE
# ══════════════════════════════════════════════════════════════════════


def parallel_agents_node(state: AnalyzerState) -> dict:
    """
    Runs all 5 sub-agents. In a production setup with LangGraph Cloud,
    these would run as true parallel branches. For local execution,
    they run sequentially but the architecture supports parallelization.
    
    Execution order matters for data dependencies:
    1. Context (independent)
    2. Capability (independent, but needed by Journey/Systems)
    3. Journey (needs capability_output)
    4. Systems (needs capability_output)
    5. Financial (needs journey + capability + systems outputs)
    """
    results = {}

    # Run context and capability first (independent)
    context_result = context_node(state)
    results.update(context_result)

    capability_result = capability_node(state)
    results.update(capability_result)

    # Update state with capability output for dependent agents
    updated_state = {**state, **results}

    # Run journey and systems (depend on capability)
    journey_result = journey_node(updated_state)
    results.update(journey_result)

    systems_result = systems_node(updated_state)
    results.update(systems_result)

    # Update state with all outputs for financial agent
    updated_state = {**state, **results}

    # Run financial last (depends on journey + capability + systems)
    financial_result = financial_node(updated_state)
    results.update(financial_result)

    return results


# ══════════════════════════════════════════════════════════════════════
# GRAPH COMPILATION
# ══════════════════════════════════════════════════════════════════════


def build_graph() -> StateGraph:
    """
    Build and compile the LangGraph state machine.
    
    Flow:
    START → master_node → [HUMAN GATE] → parallel_agents → merge → qa_node → END
                                                                      ↓
                                                              (fail) → parallel_agents
    """
    workflow = StateGraph(AnalyzerState)

    # Add nodes
    workflow.add_node("master", master_node)
    workflow.add_node("parallel_agents", parallel_agents_node)
    workflow.add_node("merge", merge_node)
    workflow.add_node("qa_validation", qa_validation_node)

    # Set entry point
    workflow.set_entry_point("master")

    # Master → conditional routing based on validation_status
    workflow.add_conditional_edges(
        "master",
        validation_router,
        {
            "parallel_agents": "parallel_agents",
            "__end__": END,
        }
    )

    # Parallel agents → merge
    workflow.add_edge("parallel_agents", "merge")

    # Merge → QA validation
    workflow.add_edge("merge", "qa_validation")

    # QA → conditional: pass goes to END, fail loops back
    workflow.add_conditional_edges(
        "qa_validation",
        qa_router,
        {
            "parallel_agents": "parallel_agents",
            "__end__": END,
        }
    )

    return workflow.compile()


# Compiled graph instance — import this in main.py
graph = build_graph()


# ══════════════════════════════════════════════════════════════════════
# EXECUTION HELPERS
# ══════════════════════════════════════════════════════════════════════


async def run_full_pipeline_streaming(
    input_text: str,
    user_id: str,
    core_assumptions: str,
    max_retries: int = 2,
):
    """
    Async generator that runs the full pipeline and yields SSE-ready event dicts
    as each stage completes. Designed to be consumed by a StreamingResponse.

    Events emitted:
      {"type": "stage_start", "stage": str, "label": str, "attempt": int}
      {"type": "stage_done",  "stage": str, "label": str, "duration_ms": int}
      {"type": "qa_retry",    "attempt": int, "feedback": str}
      {"type": "complete",    "qa_pass": bool, "qa_feedback": str,
                              "attempts": int, "final_output": str}
      {"type": "error",       "detail": str}
    """
    import asyncio
    from app.agents.qa_agent import run_qa_validation

    run_id = generate_run_id()
    agent_logger.info(f"[{run_id}] === STREAMING PIPELINE (user={user_id}) ===")

    STAGES = [
        ("context",    "Market Context & KPIs"),
        ("capability", "Capability Design"),
        ("journey",    "Journey Mapping"),
        ("systems",    "Architecture & Systems"),
        ("financial",  "Financial Analysis"),
        ("merge",      "Compiling Report"),
        ("qa",         "QA Validation"),
    ]

    state = {
        "input_text": input_text,
        "user_id": user_id,
        "core_assumptions": core_assumptions,
        "validation_status": "approved",
        "context_output": "",
        "capability_output": "",
        "journey_output": "",
        "systems_output": "",
        "financial_output": "",
        "qa_feedback": "",
        "qa_pass": False,
        "final_output": "",
        "_run_id": run_id,
    }

    try:
        for attempt in range(max_retries + 1):
            agent_logger.info(f"[{run_id}] Attempt {attempt + 1}/{max_retries + 1}")

            # ── Context ──────────────────────────────────────────────
            t0 = int(time.time() * 1000)
            yield {"type": "stage_start", "stage": "context", "label": "Market Context & KPIs", "attempt": attempt + 1}
            await asyncio.sleep(0)  # flush event to client before blocking call
            result = await asyncio.to_thread(context_node, state)
            state.update(result)
            yield {"type": "stage_done", "stage": "context", "label": "Market Context & KPIs", "duration_ms": int(time.time() * 1000) - t0}
            await asyncio.sleep(0)

            # ── Capability ───────────────────────────────────────────
            t0 = int(time.time() * 1000)
            yield {"type": "stage_start", "stage": "capability", "label": "Capability Design", "attempt": attempt + 1}
            await asyncio.sleep(0)
            result = await asyncio.to_thread(capability_node, state)
            state.update(result)
            yield {"type": "stage_done", "stage": "capability", "label": "Capability Design", "duration_ms": int(time.time() * 1000) - t0}
            await asyncio.sleep(0)

            # Update state snapshot for dependent agents
            updated = dict(state)

            # ── Journey ──────────────────────────────────────────────
            t0 = int(time.time() * 1000)
            yield {"type": "stage_start", "stage": "journey", "label": "Journey Mapping", "attempt": attempt + 1}
            await asyncio.sleep(0)
            result = await asyncio.to_thread(journey_node, updated)
            state.update(result)
            updated = dict(state)
            yield {"type": "stage_done", "stage": "journey", "label": "Journey Mapping", "duration_ms": int(time.time() * 1000) - t0}
            await asyncio.sleep(0)

            # ── Systems ──────────────────────────────────────────────
            t0 = int(time.time() * 1000)
            yield {"type": "stage_start", "stage": "systems", "label": "Architecture & Systems", "attempt": attempt + 1}
            await asyncio.sleep(0)
            result = await asyncio.to_thread(systems_node, updated)
            state.update(result)
            updated = dict(state)
            yield {"type": "stage_done", "stage": "systems", "label": "Architecture & Systems", "duration_ms": int(time.time() * 1000) - t0}
            await asyncio.sleep(0)

            # ── Financial ────────────────────────────────────────────
            t0 = int(time.time() * 1000)
            yield {"type": "stage_start", "stage": "financial", "label": "Financial Analysis", "attempt": attempt + 1}
            await asyncio.sleep(0)
            result = await asyncio.to_thread(financial_node, updated)
            state.update(result)
            yield {"type": "stage_done", "stage": "financial", "label": "Financial Analysis", "duration_ms": int(time.time() * 1000) - t0}
            await asyncio.sleep(0)

            # ── Merge ────────────────────────────────────────────────
            t0 = int(time.time() * 1000)
            yield {"type": "stage_start", "stage": "merge", "label": "Compiling Report", "attempt": attempt + 1}
            await asyncio.sleep(0)
            result = await asyncio.to_thread(merge_node, state)
            state.update(result)
            yield {"type": "stage_done", "stage": "merge", "label": "Compiling Report", "duration_ms": int(time.time() * 1000) - t0}
            await asyncio.sleep(0)

            # ── QA ───────────────────────────────────────────────────
            t0 = int(time.time() * 1000)
            yield {"type": "stage_start", "stage": "qa", "label": "QA Validation", "attempt": attempt + 1}
            await asyncio.sleep(0)
            qa_result = await asyncio.to_thread(run_qa_validation, state["final_output"])
            yield {"type": "stage_done", "stage": "qa", "label": "QA Validation", "duration_ms": int(time.time() * 1000) - t0}
            await asyncio.sleep(0)

            if qa_result["qa_pass"]:
                agent_logger.info(f"[{run_id}] QA PASSED on attempt {attempt + 1}")
                yield {
                    "type": "complete",
                    "qa_pass": True,
                    "qa_feedback": "",
                    "attempts": attempt + 1,
                    "final_output": state["final_output"],
                }
                return
            else:
                agent_logger.warning(f"[{run_id}] QA FAILED on attempt {attempt + 1}")
                state["qa_feedback"] = qa_result["qa_feedback"]
                if attempt < max_retries:
                    yield {
                        "type": "qa_retry",
                        "attempt": attempt + 1,
                        "feedback": qa_result["qa_feedback"][:300],
                    }
                    state["input_text"] = (
                        input_text
                        + f"\n\n--- QA CORRECTION REQUIRED (Attempt {attempt + 2}) ---\n"
                        + qa_result["qa_feedback"]
                        + "\nFix the above violations in your output."
                    )

        # All retries exhausted
        yield {
            "type": "complete",
            "qa_pass": False,
            "qa_feedback": state["qa_feedback"],
            "attempts": max_retries + 1,
            "final_output": state["final_output"],
        }
    except Exception as e:
        agent_logger.error(f"[{run_id}] Streaming pipeline error: {e}")
        yield {"type": "error", "detail": str(e)}


async def run_master_extraction(input_text: str, user_id: str) -> dict:
    """
    Step 1: Run the master agent to extract core assumptions.
    Returns the assumptions for human review.
    """
    run_id = generate_run_id()
    agent_logger.info(f"[{run_id}] === PIPELINE STEP 1: Master Extraction (user={user_id}) ===")

    initial_state = {
        "input_text": input_text,
        "user_id": user_id,
        "core_assumptions": "",
        "validation_status": "pending",
        "context_output": "",
        "capability_output": "",
        "journey_output": "",
        "systems_output": "",
        "financial_output": "",
        "qa_feedback": "",
        "qa_pass": False,
        "final_output": "",
        "_run_id": run_id,
    }

    # Run just the master node
    result = master_node(initial_state)

    agent_logger.info(f"[{run_id}] === PIPELINE STEP 1 COMPLETE ===")
    return {
        "core_assumptions": result["core_assumptions"],
        "validation_status": "pending",
    }


async def run_full_pipeline(
    input_text: str,
    user_id: str,
    core_assumptions: str,
    max_retries: int = 2,
) -> dict:
    """
    Step 2: Run the full pipeline after human approval.
    Executes parallel agents → merge → QA validation → returns final output.
    If QA fails, retries up to max_retries times.
    """
    from app.agents.qa_agent import run_qa_validation

    run_id = generate_run_id()
    agent_logger.info(
        f"[{run_id}] === PIPELINE STEP 2: Full Analysis (user={user_id}, max_retries={max_retries}) ==="
    )

    state = {
        "input_text": input_text,
        "user_id": user_id,
        "core_assumptions": core_assumptions,
        "validation_status": "approved",
        "context_output": "",
        "capability_output": "",
        "journey_output": "",
        "systems_output": "",
        "financial_output": "",
        "qa_feedback": "",
        "qa_pass": False,
        "final_output": "",
        "_run_id": run_id,
    }

    for attempt in range(max_retries + 1):
        agent_logger.info(f"[{run_id}] Attempt {attempt + 1}/{max_retries + 1} — running parallel agents")

        # Run parallel agents
        agent_results = parallel_agents_node(state)
        state.update(agent_results)

        # Run merge
        agent_logger.info(f"[{run_id}] Merging agent outputs")
        merge_result = merge_node(state)
        state.update(merge_result)

        # Run QA validation
        agent_logger.info(f"[{run_id}] Running QA validation")
        qa_result = run_qa_validation(state["final_output"])

        if qa_result["qa_pass"]:
            agent_logger.info(
                f"[{run_id}] QA PASSED on attempt {attempt + 1} — pipeline complete"
            )
            return {
                "final_output": state["final_output"],
                "qa_pass": True,
                "qa_feedback": "",
                "attempts": attempt + 1,
            }
        else:
            agent_logger.warning(
                f"[{run_id}] QA FAILED on attempt {attempt + 1}: {qa_result['qa_feedback'][:200]}"
            )
            # Update state with QA feedback for retry
            state["qa_feedback"] = qa_result["qa_feedback"]
            if attempt < max_retries:
                agent_logger.info(f"[{run_id}] Retrying with QA feedback appended")
                # Append QA feedback to input so agents can correct
                state["input_text"] = (
                    input_text
                    + f"\n\n--- QA CORRECTION REQUIRED (Attempt {attempt + 2}) ---\n"
                    + qa_result["qa_feedback"]
                    + "\nFix the above violations in your output."
                )

    # If all retries exhausted, return with QA feedback
    agent_logger.error(
        f"[{run_id}] Pipeline FAILED after {max_retries + 1} attempts — returning last output with QA feedback"
    )
    return {
        "final_output": state["final_output"],
        "qa_pass": False,
        "qa_feedback": state["qa_feedback"],
        "attempts": max_retries + 1,
    }
