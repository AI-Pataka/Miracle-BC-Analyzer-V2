# BC-Analyzer Agent Prompts — v1.0.0

**Version:** 1.0.0
**Date:** 2026-04-10
**Source:** `backend/app/agents/prompts.py`

## Changelog
- **v1.0.0** (2026-04-10): Initial release with 6 agent prompts for Telecom industry

---

## 1. Master Orchestrator Agent
- **Persona:** Lead Enterprise Architect
- **Task:** Extract exactly 5 core assumptions from the Opportunity Canvas
- **Output:** Numbered list (1-5) of core assumptions
- **Source:** `prompts.py` — `MASTER_ORCHESTRATOR_PROMPT`

## 2. Context Sub-Agent
- **Persona:** Senior Business Strategist
- **Assigned Slides:** 1, 2, 7, 8, 10, 11
- **Key Formats:** SWOT as 2x2 Markdown table, Porter's Five Forces as 2-column table
- **Source:** `prompts.py` — `CONTEXT_AGENT_PROMPT`

## 3. Capability Sub-Agent
- **Persona:** Expert Capability Mapper (BIZBOK L1-L4 Taxonomy)
- **Assigned Slides:** 3, 4, Appendix A
- **Tool:** `search_capability_kb(query, user_id)` — flags unmapped as "(New)"
- **Source:** `prompts.py` — `CAPABILITY_AGENT_PROMPT`

## 4. Journey Sub-Agent
- **Persona:** Customer Experience (CX) Architect
- **Assigned Slides:** 5, 9
- **Tool:** `get_journey_steps(journey_name, user_id)`
- **Effort Scoring:** 0-2000 days per capability
- **Source:** `prompts.py` — `JOURNEY_AGENT_PROMPT`

## 5. Systems Sub-Agent
- **Persona:** IT Systems Architect
- **Assigned Slides:** 6, 12
- **Tool:** `get_product_owner(action_keyword, user_id)` — uses "NA" if no owner
- **Source:** `prompts.py` — `SYSTEMS_AGENT_PROMPT`

## 6. Financial Sub-Agent
- **Persona:** Rigorous Financial Analyst
- **Assigned Outputs:** Appendices B, C, D
- **Critical Rule:** Capex/Opex Exclusion Protocol — NEVER include dollar amounts
- **Sizing:** Independent calculation from accumulated effort days only
- **Classifications:** 6 initiative types + BA 360 Candidacy (Yes/No)
- **Appendix D:** 15-column Initiative Tracker table
- **Source:** `prompts.py` — `FINANCIAL_AGENT_PROMPT`

## 7. QA Validation Agent
- **Task:** Validate compiled output against business constraints
- **Check 1:** No Capex/Opex figures in financial sections (regex + LLM)
- **Check 2:** All unmapped capabilities include "(New)" flag
- **Retry:** Cyclic routing back to agents on failure (max 3 attempts)
- **Source:** `qa_agent.py` — `QA_VALIDATION_PROMPT`
