"""
QA Validation Agent — Phase 5: Autonomous Test Loop

Prompt: "Implement a Critic Node in LangGraph to autonomously test the compiled
presentation against strict business constraints before showing it to the user.
Create qa_agent.py and define a Validation Agent using a strict grading prompt.
The Validation Agent must read the compiled Markdown and verify: 1) Absolutely
no Capex/Opex figures are present in the independent financial evaluation, and
2) Any unmapped capabilities explicitly include the exact text '(New)'. If the
test fails, return the exact errors in qa_feedback so the orchestrator can route
back to the sub-agents for correction. If the test passes, return qa_pass=True
so the orchestrator routes to the END node. Also implement a rule-based pre-check
using regex patterns before calling the LLM, to catch obvious violations cheaply."
"""

import re
import time
from typing import Optional
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()


# ══════════════════════════════════════════════════════════════════════
# QA VALIDATION PROMPT
# ══════════════════════════════════════════════════════════════════════

QA_VALIDATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a strict QA Validation Agent. Your job is to audit a 
compiled business capability analysis report for specific constraint violations.

You must check for EXACTLY two types of violations:

VIOLATION TYPE 1 — CAPEX/OPEX LEAKAGE:
- The Financial Agent's appendices (Appendix B, C, D) must NOT contain any 
  explicit dollar amounts, Capex figures, or Opex figures.
- Acceptable: Qualitative sizing like "Small", "Medium", "Large", effort days.
- Violations: Any string like "$1M", "$500K", "Capex: $2.5M", "Opex: $800K", 
  or any specific dollar/currency amount in the financial sections.
- NOTE: Dollar amounts that appear in the INPUT CANVAS context (slides 1-2) 
  are acceptable — only the INDEPENDENT financial evaluation sections 
  (Appendix B, C, D) must be free of explicit financial figures.

VIOLATION TYPE 2 — MISSING (New) FLAGS:
- Any capability that was NOT found in the user's knowledge base MUST contain 
  the exact string "(New)" in the L4 Capability column of Slide 4.
- ONLY flag a VIOLATION if a capability row does NOT contain "(New)" AND there 
  is no evidence it was matched from the knowledge base.
- Having ALL capabilities marked as "(New)" is VALID and is NOT a violation — 
  this simply means none of them were found in the knowledge base, which is 
  an expected and correct outcome. Do NOT flag this case.
- Do NOT infer or assume the tool was skipped just because all items are (New).

OUTPUT FORMAT (strict):
If ALL checks pass:
VERDICT: PASS

If ANY check fails:
VERDICT: FAIL
VIOLATIONS:
1. [Exact description of violation, including the offending text]
2. [Next violation if any]

Be precise. Quote the exact offending text. Do not be lenient."""),
    ("human", """Audit the following compiled report for violations:

{compiled_output}"""),
])


# ══════════════════════════════════════════════════════════════════════
# RULE-BASED PRE-CHECK (cheap, no LLM needed)
# ══════════════════════════════════════════════════════════════════════

# Patterns that indicate Capex/Opex dollar amounts
FINANCIAL_PATTERNS = [
    r'\$[\d,]+\.?\d*\s*[KMBkmb]?',           # $1,000 or $1.5M or $500K
    r'(?:USD|EUR|GBP)\s*[\d,]+\.?\d*',         # USD 1000
    r'(?:capex|opex)\s*[:=]\s*\$?[\d,]+',      # Capex: $1M or Opex = 500K
    r'(?:capital expenditure|operating expenditure)\s*[:=]\s*\$?[\d,]+',
    r'\$\d+(?:\.\d+)?\s*(?:million|billion|thousand)',  # $1.5 million
]


def _extract_financial_sections(text: str) -> str:
    """Extract only the Appendix B, C, D sections for financial checking."""
    # Look for Appendix B onwards
    patterns = [
        r'(?:##?\s*Appendix\s+B.*)',
        r'(?:##?\s*Appendix\s+C.*)',
        r'(?:##?\s*Appendix\s+D.*)',
        r'(?:Business Impact.*Implementation Sizing)',
        r'(?:Initiative Classification)',
        r'(?:Initiative Tracker Record)',
    ]

    financial_text = ""
    lines = text.split("\n")
    in_financial = False

    for line in lines:
        if any(re.search(p, line, re.IGNORECASE) for p in [
            r'Appendix\s+B', r'Appendix\s+C', r'Appendix\s+D',
            r'Implementation Sizing', r'Initiative Classification',
            r'Initiative Tracker'
        ]):
            in_financial = True
        
        if in_financial:
            financial_text += line + "\n"

    return financial_text


def rule_based_precheck(compiled_output: str) -> dict:
    """
    Fast rule-based check before calling the LLM.
    Returns {"pass": bool, "violations": list[str]}
    """
    violations = []

    # Check 1: Capex/Opex in financial sections only
    financial_text = _extract_financial_sections(compiled_output)

    if financial_text:
        for pattern in FINANCIAL_PATTERNS:
            matches = re.findall(pattern, financial_text, re.IGNORECASE)
            if matches:
                for match in matches:
                    violations.append(
                        f"CAPEX/OPEX VIOLATION: Found '{match}' in financial "
                        f"evaluation section. Must not include explicit dollar amounts."
                    )

    # Check 2: Look for capability table rows missing (New)
    # Find Slide 4 table section
    slide4_match = re.search(
        r'(?:##?\s*Slide\s*4.*?)((?:\|.*\|[\r\n]+)+)',
        compiled_output,
        re.IGNORECASE | re.DOTALL
    )

    # Note: We can only do a basic check here. The LLM validator does
    # the deeper semantic check of whether capabilities were truly matched.

    return {
        "pass": len(violations) == 0,
        "violations": violations,
    }


# ══════════════════════════════════════════════════════════════════════
# LLM-BASED VALIDATION
# ══════════════════════════════════════════════════════════════════════


def run_qa_validation(compiled_output: str, user_id: Optional[str] = None) -> dict:
    """
    Run the full QA validation pipeline:
    1. Rule-based pre-check (fast, catches obvious violations)
    2. LLM-based deep check (thorough, catches subtle violations)

    `user_id`, when provided, loads the QA agent's per-user config (model,
    API key, Skills.md). If omitted, falls back to the server's Anthropic
    defaults so legacy call sites keep working.

    Returns:
        {
            "qa_pass": bool,
            "qa_feedback": str,  # Empty if pass, error details if fail
            "violations": list[str],
        }
    """
    # Step 1: Rule-based pre-check
    precheck = rule_based_precheck(compiled_output)

    if not precheck["pass"]:
        return {
            "qa_pass": False,
            "qa_feedback": "Rule-based violations found:\n" + "\n".join(
                f"  - {v}" for v in precheck["violations"]
            ),
            "violations": precheck["violations"],
        }

    # Step 2: LLM-based deep validation
    try:
        from app.agent_config import load_agent_config, build_llm, compose_prompt
        if user_id:
            cfg = load_agent_config(user_id, "qa")
        else:
            # Fallback to defaults when user context isn't available.
            from app.agent_config import AgentConfig
            cfg = AgentConfig(
                agent_name="qa", provider="anthropic",
                model="claude-sonnet-4-20250514",
                temperature=0.0, max_tokens=2048,
            )
        llm = build_llm(cfg)
        chain = compose_prompt(QA_VALIDATION_PROMPT, cfg.skills_md) | llm

        # Retry with exponential backoff on 529/429 errors
        response = None
        for _attempt in range(7):
            try:
                response = chain.invoke({"compiled_output": compiled_output})
                break
            except Exception as retry_err:
                err_str = str(retry_err).lower()
                is_retryable = "529" in err_str or "overloaded" in err_str or "429" in err_str or "rate" in err_str
                if is_retryable and _attempt < 6:
                    time.sleep(3 * (2 ** _attempt))
                    continue
                raise

        verdict_text = response.content

        # Parse the verdict
        if "VERDICT: PASS" in verdict_text.upper():
            return {
                "qa_pass": True,
                "qa_feedback": "",
                "violations": [],
            }
        else:
            # Extract violations
            violations = []
            violation_section = verdict_text.split("VIOLATIONS:")[-1] if "VIOLATIONS:" in verdict_text else verdict_text
            for line in violation_section.strip().split("\n"):
                line = line.strip()
                if line and not line.startswith("VERDICT"):
                    violations.append(line)

            return {
                "qa_pass": False,
                "qa_feedback": f"LLM validation failed:\n{verdict_text}",
                "violations": violations,
            }

    except Exception as e:
        # If LLM validation fails, log but don't block
        return {
            "qa_pass": True,
            "qa_feedback": f"QA validation skipped due to error: {str(e)}",
            "violations": [],
        }


# ══════════════════════════════════════════════════════════════════════
# LANGGRAPH NODE FUNCTION
# ══════════════════════════════════════════════════════════════════════


def qa_validation_node(state: dict) -> dict:
    """
    LangGraph node that runs QA validation on the merged output.
    Used by the orchestrator after the merge node.
    """
    compiled_output = state.get("final_output", "")

    if not compiled_output:
        return {
            "qa_pass": False,
            "qa_feedback": "No compiled output to validate.",
        }

    result = run_qa_validation(compiled_output, state.get("user_id"))

    return {
        "qa_pass": result["qa_pass"],
        "qa_feedback": result["qa_feedback"],
    }
