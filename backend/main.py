"""
Main FastAPI Application — Multi-Agent Business Capability Analyzer

Phase 6 Prompt: "Update main.py to wire the LangGraph orchestrator into the
/api/initiate and /api/approve endpoints. POST /api/initiate accepts the
Opportunity Canvas text as JSON, runs the Master Agent to extract 5 core
assumptions, and returns them for human review. POST /api/approve accepts
the human's approval along with the original input and assumptions, triggers
the full parallel fan-out pipeline with QA validation, and returns the final
verified Markdown presentation. Both endpoints require authentication via
the existing get_current_user dependency."

Run with: uvicorn main:app --reload
"""

import os
import re
import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

from app.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserInfo,
    get_current_user,
    register_user,
    login_user,
)
from app.database import (
    add_capabilities,
    get_all_capabilities,
    add_products,
    get_all_products,
    add_journeys,
    get_all_journeys,
    add_value_streams,
    get_all_value_streams,
)

load_dotenv()

app = FastAPI(
    title="Multi-Agent Business Capability Analyzer",
    version="1.0.0",
    description="LangGraph-powered multi-agent system for enterprise capability analysis.",
)

# CORS — allow frontend to connect (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS — No authentication required
# ══════════════════════════════════════════════════════════════════════


@app.get("/")
async def root():
    return {"status": "running", "app": "Multi-Agent Business Analyzer"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ══════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS — Registration & Login
# ══════════════════════════════════════════════════════════════════════


@app.post("/api/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    """Register a new user with email and password."""
    return await register_user(req)


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Log in an existing user and return an ID token."""
    return await login_user(req)


@app.get("/api/auth/me")
async def get_me(user: UserInfo = Depends(get_current_user)):
    """Return the authenticated user's info (tests token verification)."""
    return {"user_id": user.user_id, "email": user.email}


# ══════════════════════════════════════════════════════════════════════
# CONFIG ENDPOINTS — User-specific knowledge base data
# These accept web form JSON payloads and write to Firestore
# ══════════════════════════════════════════════════════════════════════


class CapabilitiesPayload(BaseModel):
    capabilities: list[dict]


class ProductsPayload(BaseModel):
    products: list[dict]


class JourneysPayload(BaseModel):
    journeys: list[dict]

class ValueStreamsPayload(BaseModel):
    value_streams: list[dict]


# ── Capabilities ─────────────────────────────────────────────────────


@app.post("/api/config/capabilities")
async def upload_capabilities(
    payload: CapabilitiesPayload,
    user: UserInfo = Depends(get_current_user),
):
    """Upload capability records to the user's Firestore knowledge base."""
    count = add_capabilities(user.user_id, payload.capabilities)
    return {"message": f"{count} capabilities saved.", "user_id": user.user_id}


@app.get("/api/config/capabilities")
async def list_capabilities(user: UserInfo = Depends(get_current_user)):
    """Retrieve all capabilities for the authenticated user."""
    caps = list(get_all_capabilities(user.user_id))
    return {"capabilities": [c.to_dict() | {"id": c.id} for c in caps], "count": len(caps)}


# ── Products ─────────────────────────────────────────────────────────


@app.post("/api/config/products")
async def upload_products(
    payload: ProductsPayload,
    user: UserInfo = Depends(get_current_user),
):
    """Upload product/system records to the user's Firestore knowledge base."""
    count = add_products(user.user_id, payload.products)
    return {"message": f"{count} products saved.", "user_id": user.user_id}


@app.get("/api/config/products")
async def list_products(user: UserInfo = Depends(get_current_user)):
    """Retrieve all products for the authenticated user."""
    prods = list(get_all_products(user.user_id))
    return {"products": [p.to_dict() | {"id": p.id} for p in prods], "count": len(prods)}


# ── Journeys ─────────────────────────────────────────────────────────


@app.post("/api/config/journeys")
async def upload_journeys(
    payload: JourneysPayload,
    user: UserInfo = Depends(get_current_user),
):
    """Upload journey framework records to the user's Firestore knowledge base."""
    count = add_journeys(user.user_id, payload.journeys)
    return {"message": f"{count} journeys saved.", "user_id": user.user_id}


@app.get("/api/config/journeys")
async def list_journeys(user: UserInfo = Depends(get_current_user)):
    """Retrieve all journeys for the authenticated user."""
    journeys = list(get_all_journeys(user.user_id))
    return {"journeys": [j.to_dict() | {"id": j.id} for j in journeys], "count": len(journeys)}


# ══════════════════════════════════════════════════════════════════════

# ─── Value Streams ────────────────────────────────────────────────────────

@app.post("/api/config/value_streams")
async def upload_value_streams(
    payload: ValueStreamsPayload,
    user: UserInfo = Depends(get_current_user),
):
    """Upload value stream records to the user's Firestore knowledge base."""
    count = add_value_streams(user.user_id, payload.value_streams)
    return {"message": f"{count} value streams saved.", "user_id": user.user_id}


@app.get("/api/config/value_streams")
async def list_value_streams(user: UserInfo = Depends(get_current_user)):
    """Retrieve all value streams for the authenticated user."""
    streams = list(get_all_value_streams(user.user_id))
    return {"value_streams": [s.to_dict() for s in streams], "count": len(streams)}

# ── Token Error Helper ─────────────────────────────────────────────

def _parse_token_error(e: Exception) -> dict | None:
    """
    Detect Anthropic token-limit errors and return token counts.
    Handles: 'prompt is too long: 205819 tokens > 200000 maximum'
    """
    error_str = str(e)
    lower = error_str.lower()
    if not any(kw in lower for kw in ['too long', 'context_length', 'context_window', 'prompt is too']):
        return None
    # "prompt is too long: 205819 tokens > 200000 maximum"
    match = re.search(r'(\d[\d,]*)\s+tokens?\s*[>≥]\s*(\d[\d,]*)', error_str)
    if match:
        return {
            "used": int(match.group(1).replace(',', '')),
            "limit": int(match.group(2).replace(',', '')),
        }
    return {"used": None, "limit": None}


# LANGGRAPH ENDPOINTS — Analysis pipeline
# ══════════════════════════════════════════════════════════════════════


class InitiateRequest(BaseModel):
    """Request body for starting an analysis."""
    input_text: str  # The Opportunity Canvas text


class InitiateResponse(BaseModel):
    """Response with core assumptions for human review."""
    core_assumptions: str
    validation_status: str
    user_id: str
    message: str


class ApproveRequest(BaseModel):
    """Request body for approving assumptions and running full pipeline."""
    input_text: str          # Original Opportunity Canvas text
    core_assumptions: str    # The 5 assumptions (can be edited by user)
    approved: bool = True    # Human approval flag


class ApproveResponse(BaseModel):
    """Response with the final compiled presentation."""
    final_output: str
    qa_pass: bool
    qa_feedback: str
    attempts: int
    message: str


@app.post("/api/initiate", response_model=InitiateResponse)
async def initiate_analysis(
    req: InitiateRequest,
    user: UserInfo = Depends(get_current_user),
):
    """
    Step 1: Submit Opportunity Canvas text.
    The Master Agent extracts 5 core assumptions for human review.
    """
    from app.orchestrator import run_master_extraction
    import os

    if not req.input_text.strip():
        raise HTTPException(status_code=400, detail="input_text cannot be empty.")

    # Use mock mode if MOCK_MODE=1 env var is set (for demo/testing)
    if os.getenv("MOCK_MODE") == "1":
        mock_assumptions = """1. Verizon has real-time API access to its OSS/BSS systems for network slice management
2. Network slicing APIs from RAN vendors (Samsung, Nokia, Ericsson) are available and production-ready
3. Enterprise customers will prioritize custom 5G slices for mission-critical workloads
4. Current sales cycle bottleneck is primarily due to lack of self-service quoting tools
5. The total addressable market (TAM) for 5G enterprise slices is at least $2B annually"""
        return InitiateResponse(
            core_assumptions=mock_assumptions,
            validation_status="preliminary",
            user_id=user.user_id,
            message="Core assumptions extracted (MOCK MODE). Review and approve to proceed.",
        )

    try:
        result = await run_master_extraction(
            input_text=req.input_text,
            user_id=user.user_id,
        )

        return InitiateResponse(
            core_assumptions=result["core_assumptions"],
            validation_status=result["validation_status"],
            user_id=user.user_id,
            message="Core assumptions extracted. Review and approve to proceed.",
        )
    except Exception as e:
        token_info = _parse_token_error(e)
        if token_info:
            msg = "Token limit exceeded. Your input text is too long for the AI model."
            if token_info["used"] and token_info["limit"]:
                msg += f" Tokens used: {token_info['used']:,}, Model limit: {token_info['limit']:,}."
            msg += " Please shorten your problem statement and try again."
            raise HTTPException(status_code=413, detail=msg)
        raise HTTPException(
            status_code=500,
            detail=f"Master agent extraction failed: {str(e)}",
        )


@app.post("/api/approve", response_model=ApproveResponse)
async def approve_and_generate(
    req: ApproveRequest,
    user: UserInfo = Depends(get_current_user),
):
    """
    Step 2: Approve the assumptions and trigger the full pipeline.
    Runs 5 sub-agents in parallel, merges output, runs QA validation,
    and returns the final Markdown presentation.
    """
    from app.orchestrator import run_full_pipeline

    if not req.approved:
        return ApproveResponse(
            final_output="",
            qa_pass=False,
            qa_feedback="User rejected the assumptions.",
            attempts=0,
            message="Analysis cancelled by user.",
        )

    if not req.input_text.strip() or not req.core_assumptions.strip():
        raise HTTPException(
            status_code=400,
            detail="Both input_text and core_assumptions are required.",
        )

    import os
    # Use mock mode if MOCK_MODE=1 env var is set (for demo/testing)
    if os.getenv("MOCK_MODE") == "1":
        mock_report = """# Verizon 5G Enterprise Slicing — Business Capability Analysis

## Executive Summary

Verizon can unlock a significant new B2B revenue stream by enabling rapid provisioning of custom 5G network slices. This capability requires orchestrating existing OSS/BSS investments with new network slicing controllers and sales enablement tools.

## Key Capabilities Required

### 1. Slice Configuration & Provisioning (NEW)
- **Owner:** Network Operations
- **Maturity:** Initial → Managed
- **Effort:** Medium (16–45 dev days)
- **Cost:** $200K–$500K (Capex + OpEx)
- Automate slice creation based on customer SLA templates
- Real-time APIs to RAN vendors (5G cores, edge compute)
- Policy enforcement (bandwidth, latency, jitter limits)

### 2. Enterprise Customer Lifecycle Management (ENHANCE)
- **Owner:** Sales Operations + Customer Mgmt
- **Current State:** Fragmented across Salesforce, legacy systems
- **Maturity:** Managed → Defined
- New stages: Assess → Quote → Provision → Monitor → Optimize
- Self-service portal for SMB customers, managed service for enterprise

### 3. Real-Time Billing & Slice Costing (NEW)
- **Owner:** Finance + OSS/BSS
- **Maturity:** Initial
- **Effort:** Large (46–90 dev days)
- Usage-based billing triggered by network slice events
- Cost allocation per slice, per customer, per service tier

### 4. Network Performance Analytics (NEW)
- **Owner:** Network Analytics + Customer Success
- **Dashboard:** Real-time slice health, SLA attainment, forecasted costs
- Data pipeline: Kafka → Snowflake → BI tools (Tableau, Looker)

## Journey Map: Sales → Operations → Billing

### Awareness Stage
- Marketing campaigns for 5G slice benefits to enterprise segments
- Industry analyst engagement (Gartner, Forrester)

### Request Stage
- Sales rep uses online configurator to quote slice options (lead time: < 5 min)
- Customer specifies: bandwidth (1–1000 Mbps), latency (5–100ms), coverage region

### Provision Stage
- Approve → Automated slice creation via OSS/BSS APIs (< 2 hours)
- Network team monitors slice activation health

### Optimize Stage
- Customer success team reviews SLA attainment and upsell opportunities monthly

## Technical Architecture

**High-level Integration Points:**
```
Sales Portal (Salesforce)
  ↓
Slice Configuration Service (Spring Boot / Python)
  ↓
Ericsson RAN Slice APIs, Nokia Core, Samsung vRAN
  ↓
OSS Event Streaming (Kafka)
  ↓
Real-time Analytics (Spark / Flink → Snowflake)
  ↓
Billing Engine (Oracle, SAP) + Customer Portal
```

**Key Technology Decisions:**
- Event-driven architecture for slice lifecycle (provisioning, monitoring, deprovisioning)
- Separate billing microservice to avoid coupling with OSS/BSS legacy system
- Multi-cloud deployment (5G core redundancy) with RAN vendor support agreements

## Financial Impact

| Metric | Assumption | Year 1 | Year 2 | Year 3 |
|--------|-----------|--------|--------|--------|
| New Customers | 50/quarter | 200 | 400 | 600 |
| ARPU per Slice | $2,500/month | $6M | $12M | $18M |
| CAC (Customer Acq. Cost) | $5K | -$1M | -$2M | -$3M |
| Gross Margin | 65% | $3.9M | $7.8M | $11.7M |
| OpEx Savings | 25% automation | $250K | $500K | $750K |
| **Net Incremental Profit** | | **$3.15M** | **$8.3M** | **$12.45M** |

## Implementation Roadmap

**Phase 1 (Months 1–3): Foundation**
- Proof of concept with one RAN vendor (e.g., Samsung for 5G core slicing)
- Sales configurator UI for slice options
- Cost: $500K (Capex), 2 squads (8–10 engineers)

**Phase 2 (Months 4–9): Scale**
- Multi-vendor support (Ericsson, Nokia)
- Automated billing integration
- Real-time analytics dashboard
- Cost: $1.2M, 3 squads

**Phase 3 (Months 10–12): Go-to-Market**
- Full customer portal launch
- 50+ enterprise customer pilot
- Cost: $600K, 2 squads + sales enablement

**Total Investment:** ~$2.3M over 12 months
**Expected ROI:** 2:1 by month 18, 5:1 by year 2

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|---|---|---|
| RAN vendor API delays | Medium | High | Multi-vendor strategy, fallback to CLI provisioning |
| Customer adoption slow | Medium | High | Co-sell model with network partner, free trial tier |
| Billing complexity | High | Medium | Dedicated billing team, Eurostar/Aria platform trial |
| Churn (if SLAs missed) | Low | High | SLA credits, 24/7 NOC, auto-remediation for slice issues |

## Success Metrics (12-Month KPIs)

- ✅ 200+ enterprise slice customers acquired
- ✅ < 2-hour provisioning time (vs. current 6–8 weeks)
- ✅ 95% SLA attainment (uptime + latency compliance)
- ✅ $6M new recurring revenue
- ✅ Sales cycle reduced to 3 weeks (vs. 8 weeks)

---

**Generated by:** Multi-Agent Business Capability Analyzer
**Date:** 2026-04-10
**Status:** ✅ QA PASS — All assumptions validated, architecture sound, ROI realistic"""

        return ApproveResponse(
            final_output=mock_report,
            qa_pass=True,
            qa_feedback="",
            attempts=1,
            message="Analysis complete (MOCK MODE).",
        )

    try:
        result = await run_full_pipeline(
            input_text=req.input_text,
            user_id=user.user_id,
            core_assumptions=req.core_assumptions,
        )

        return ApproveResponse(
            final_output=result["final_output"],
            qa_pass=result["qa_pass"],
            qa_feedback=result.get("qa_feedback", ""),
            attempts=result.get("attempts", 1),
            message="Analysis complete." if result["qa_pass"] else "Analysis complete with QA warnings.",
        )
    except Exception as e:
        token_info = _parse_token_error(e)
        if token_info:
            msg = "Token limit exceeded. The combined input is too long for the AI model."
            if token_info["used"] and token_info["limit"]:
                msg += f" Tokens used: {token_info['used']:,}, Model limit: {token_info['limit']:,}."
            msg += " Please shorten your problem statement or assumptions and try again."
            raise HTTPException(status_code=413, detail=msg)
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline execution failed: {str(e)}",
        )


@app.post("/api/approve/stream")
async def approve_and_stream(
    req: ApproveRequest,
    user: UserInfo = Depends(get_current_user),
):
    """
    Streaming variant of /api/approve.
    Returns a Server-Sent Events stream — each agent stage emits an event
    as it completes so the frontend can display live progress.
    """
    from app.orchestrator import run_full_pipeline_streaming

    if not req.approved:
        async def rejected():
            yield f"data: {json.dumps({'type': 'complete', 'qa_pass': False, 'qa_feedback': 'User rejected the assumptions.', 'attempts': 0, 'final_output': ''})}\n\n"
        return StreamingResponse(rejected(), media_type="text/event-stream")

    if not req.input_text.strip() or not req.core_assumptions.strip():
        raise HTTPException(status_code=400, detail="Both input_text and core_assumptions are required.")

    async def event_stream():
        try:
            async for event in run_full_pipeline_streaming(
                input_text=req.input_text,
                user_id=user.user_id,
                core_assumptions=req.core_assumptions,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            token_info = _parse_token_error(e)
            if token_info:
                detail = "Token limit exceeded. Your input is too long for the AI model."
                if token_info["used"] and token_info["limit"]:
                    detail += f" Tokens used: {token_info['used']:,}, Model limit: {token_info['limit']:,}."
            else:
                detail = f"Pipeline execution failed: {str(e)}"
            yield f"data: {json.dumps({'type': 'error', 'detail': detail})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ══════════════════════════════════════════════════════════════════════
# IDEA SUMMARIZATION — AI-generated structured summary
# ══════════════════════════════════════════════════════════════════════


class SummarizeRequest(BaseModel):
    input_text: str
    core_assumptions: str


class SummarizeResponse(BaseModel):
    summary: str


@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_idea(
    req: SummarizeRequest,
    user: UserInfo = Depends(get_current_user),
):
    """Generate a short structured summary of the user's idea and assumptions."""
    import os

    if os.getenv("MOCK_MODE") == "1":
        return SummarizeResponse(summary=(
            "**Objective:** Evaluate the feasibility of launching a new enterprise "
            "capability for the client organization.\n\n"
            "**Core Problem:** The client faces operational inefficiencies and market "
            "pressure that require a strategic technology-driven transformation. Current "
            "systems lack the integration and automation needed to compete effectively.\n\n"
            "**Key Gaps:**\n"
            "- No unified digital platform for end-to-end process management\n"
            "- Limited real-time analytics and decision support\n"
            "- Fragmented customer lifecycle management\n"
            "- Outdated billing and revenue assurance systems\n"
            "- Insufficient self-service capabilities for enterprise customers\n\n"
            "**Proposed Solution:** Implement a multi-capability transformation program "
            "that modernizes core systems, enables real-time analytics, and delivers "
            "self-service portals for enterprise customers."
        ))

    if not req.input_text.strip():
        raise HTTPException(status_code=400, detail="input_text cannot be empty.")

    from app.orchestrator import invoke_with_retry, get_llm
    from langchain_core.prompts import ChatPromptTemplate

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a senior business analyst. Given an opportunity canvas and core "
            "assumptions, produce a concise structured summary in EXACTLY this format:\n\n"
            "**Objective:** one sentence\n\n"
            "**Core Problem:** 2-3 sentences\n\n"
            "**Key Gaps:**\n"
            "- gap 1\n"
            "- gap 2\n"
            "- gap 3\n"
            "(3-5 bullet items)\n\n"
            "**Proposed Solution:** 1-2 sentences\n\n"
            "Do NOT include any other text, headings, or preamble. Output ONLY the structured summary."
        )),
        ("human", "Opportunity Canvas:\n{input_text}\n\nCore Assumptions:\n{core_assumptions}"),
    ])

    try:
        llm = get_llm(temperature=0.2)
        chain = prompt | llm
        response = invoke_with_retry(chain, {
            "input_text": req.input_text,
            "core_assumptions": req.core_assumptions,
        })
        return SummarizeResponse(summary=response.content.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


# ══════════════════════════════════════════════════════════════════════
# FILE TEXT EXTRACTION — PDF, DOCX, XLSX
# ══════════════════════════════════════════════════════════════════════


class ExtractTextRequest(BaseModel):
    file_data: str  # base64-encoded file content
    filename: str


@app.post("/api/extract-text")
async def extract_text(req: ExtractTextRequest, user: UserInfo = Depends(get_current_user)):
    """Extract text from uploaded binary files (PDF, DOCX, XLSX/XLS)."""
    import base64
    import tempfile

    ext = req.filename.rsplit(".", 1)[-1].lower() if "." in req.filename else ""
    if ext not in ("pdf", "docx", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

    try:
        file_bytes = base64.b64decode(req.file_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 file data.")

    try:
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        text = ""
        if ext == "pdf":
            import pdfplumber
            with pdfplumber.open(tmp_path) as pdf:
                text = "\n\n".join(page.extract_text() or "" for page in pdf.pages)
        elif ext == "docx":
            import docx
            doc = docx.Document(tmp_path)
            text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        elif ext in ("xlsx", "xls"):
            import openpyxl
            wb = openpyxl.load_workbook(tmp_path, read_only=True, data_only=True)
            rows = []
            for sheet in wb.worksheets:
                rows.append(f"--- Sheet: {sheet.title} ---")
                for row in sheet.iter_rows(values_only=True):
                    rows.append("\t".join(str(c) if c is not None else "" for c in row))
            text = "\n".join(rows)
            wb.close()

        # Clean up temp file
        os.unlink(tmp_path)

        if not text.strip():
            raise HTTPException(status_code=422, detail="No text could be extracted from the file.")

        return {"text": text}

    except HTTPException:
        raise
    except Exception as e:
        # Clean up on error
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


# ══════════════════════════════════════════════════════════════════════
# PERSISTED ANALYSES — Background jobs, progressive streaming, history
# ══════════════════════════════════════════════════════════════════════


from fastapi import Query, Request, Response
from fastapi.responses import Response as FastResponse

from app import analysis_store, job_manager, export as export_mod, agent_config as agent_cfg
from app.firebase_config import verify_firebase_token


class AnalyzeStartRequest(BaseModel):
    input_text: str
    core_assumptions: str
    industry: str = ""
    consulting_company: str = ""
    client_company: str = ""
    problem_statement: str = ""


class AnalyzeStartResponse(BaseModel):
    analysis_id: str


async def _user_from_query_or_header(
    request: Request,
    token: Optional[str] = Query(default=None),
) -> UserInfo:
    """
    SSE-friendly auth: EventSource can't set headers, so we accept the Firebase
    token either in the `Authorization: Bearer` header (preferred) or as a
    `?token=` query parameter (fallback for browser EventSource).
    """
    raw = None
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        raw = auth_header.split(" ", 1)[1].strip()
    elif token:
        raw = token
    if not raw:
        raise HTTPException(status_code=401, detail="Missing auth token.")
    try:
        decoded = verify_firebase_token(raw)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    return UserInfo(user_id=decoded["uid"], email=decoded.get("email", ""))


@app.post("/api/analyze/start", response_model=AnalyzeStartResponse)
async def analyze_start(
    req: AnalyzeStartRequest,
    user: UserInfo = Depends(get_current_user),
):
    """Create a persisted analysis doc and kick off a background task."""
    if not req.input_text.strip() or not req.core_assumptions.strip():
        raise HTTPException(status_code=400, detail="Both input_text and core_assumptions are required.")

    analysis_id = analysis_store.create_analysis(
        user.user_id,
        input_text=req.input_text,
        core_assumptions=req.core_assumptions,
        industry=req.industry,
        consulting_company=req.consulting_company,
        client_company=req.client_company,
        problem_statement=req.problem_statement or req.input_text,
    )
    job_manager.start_background_analysis(
        user_id=user.user_id,
        analysis_id=analysis_id,
        input_text=req.input_text,
        core_assumptions=req.core_assumptions,
    )
    return AnalyzeStartResponse(analysis_id=analysis_id)


@app.get("/api/analyses/{analysis_id}/stream")
async def analyze_stream(
    analysis_id: str,
    request: Request,
    user: UserInfo = Depends(_user_from_query_or_header),
):
    """
    SSE stream of analysis events. Replays persisted events from Firestore
    first, then tails the in-process JobBus. Works for fresh-start and
    reconnect-after-navigation equally.
    """
    doc = analysis_store.get_analysis(user.user_id, analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    replay = doc.get("events") or []

    async def event_stream():
        async for event in job_manager.stream_events(
            user_id=user.user_id,
            analysis_id=analysis_id,
            replay=replay,
        ):
            if await request.is_disconnected():
                return
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/analyses")
async def analyses_list(
    q: str = "",
    industry: str = "",
    client_company: str = "",
    initiative: str = "",
    date_from: str = "",
    date_to: str = "",
    limit: int = 100,
    offset: int = 0,
    user: UserInfo = Depends(get_current_user),
):
    rows = analysis_store.list_analyses(
        user.user_id,
        q=q, industry=industry, client_company=client_company,
        initiative=initiative, date_from=date_from, date_to=date_to,
        limit=limit, offset=offset,
    )
    return {"analyses": rows, "count": len(rows)}


@app.get("/api/analyses/{analysis_id}")
async def analyses_get(analysis_id: str, user: UserInfo = Depends(get_current_user)):
    doc = analysis_store.get_analysis(user.user_id, analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return doc


@app.delete("/api/analyses/{analysis_id}")
async def analyses_delete(analysis_id: str, user: UserInfo = Depends(get_current_user)):
    doc = analysis_store.get_analysis(user.user_id, analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    analysis_store.delete_analysis(user.user_id, analysis_id)
    return {"deleted": analysis_id}


def _export_meta(doc: dict) -> dict:
    return {
        "initiative_name": doc.get("initiative_name", ""),
        "industry": doc.get("industry", ""),
        "client_company": doc.get("client_company", ""),
        "consulting_company": doc.get("consulting_company", ""),
        "created_at": doc.get("created_at", ""),
    }


def _export_filename(doc: dict, ext: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_-]+", "_", (doc.get("initiative_name") or "analysis")).strip("_") or "analysis"
    return f"{base[:60]}.{ext}"


@app.get("/api/analyses/{analysis_id}/export/markdown")
async def export_markdown(
    analysis_id: str,
    request: Request,
    user: UserInfo = Depends(_user_from_query_or_header),
):
    doc = analysis_store.get_analysis(user.user_id, analysis_id)
    if not doc or not doc.get("final_output"):
        raise HTTPException(status_code=404, detail="Analysis or output not found.")
    data = export_mod.render_markdown(doc["final_output"])
    return Response(
        content=data,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{_export_filename(doc, "md")}"'},
    )


@app.get("/api/analyses/{analysis_id}/export/html")
async def export_html(
    analysis_id: str,
    request: Request,
    user: UserInfo = Depends(_user_from_query_or_header),
):
    doc = analysis_store.get_analysis(user.user_id, analysis_id)
    if not doc or not doc.get("final_output"):
        raise HTTPException(status_code=404, detail="Analysis or output not found.")
    data = export_mod.render_html(doc["final_output"], _export_meta(doc))
    return Response(
        content=data,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{_export_filename(doc, "html")}"'},
    )


@app.get("/api/analyses/{analysis_id}/export/pdf")
async def export_pdf(
    analysis_id: str,
    request: Request,
    user: UserInfo = Depends(_user_from_query_or_header),
):
    doc = analysis_store.get_analysis(user.user_id, analysis_id)
    if not doc or not doc.get("final_output"):
        raise HTTPException(status_code=404, detail="Analysis or output not found.")
    try:
        data = export_mod.render_pdf(doc["final_output"], _export_meta(doc))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_export_filename(doc, "pdf")}"'},
    )


# ══════════════════════════════════════════════════════════════════════
# AGENT CONFIG ENDPOINTS — Per-agent LLM + Skills.md
# ══════════════════════════════════════════════════════════════════════


class AgentConfigPayload(BaseModel):
    provider: str
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: float = 0.1
    max_tokens: int = 8192
    skills_md: str = ""
    clear_api_key: bool = False


@app.get("/api/agent-configs")
async def list_agent_configs(user: UserInfo = Depends(get_current_user)):
    return {"agents": agent_cfg.list_agent_configs(user.user_id)}


@app.get("/api/agent-configs/{agent_name}")
async def get_agent_config(agent_name: str, user: UserInfo = Depends(get_current_user)):
    if agent_name not in agent_cfg.ALL_AGENTS:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_name}")
    cfg = agent_cfg.load_agent_config(user.user_id, agent_name)  # type: ignore[arg-type]
    return cfg.to_public_dict()


@app.put("/api/agent-configs/{agent_name}")
async def put_agent_config(
    agent_name: str,
    payload: AgentConfigPayload,
    user: UserInfo = Depends(get_current_user),
):
    if agent_name not in agent_cfg.ALL_AGENTS:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_name}")
    if payload.provider not in ("anthropic", "openai", "google", "custom"):
        raise HTTPException(status_code=400, detail=f"Unknown provider: {payload.provider}")
    cfg = agent_cfg.save_agent_config(
        user.user_id, agent_name,  # type: ignore[arg-type]
        provider=payload.provider,  # type: ignore[arg-type]
        model=payload.model,
        api_key=payload.api_key,
        base_url=payload.base_url,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        skills_md=payload.skills_md,
        clear_api_key=payload.clear_api_key,
    )
    return cfg.to_public_dict()


# ══════════════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("APP_HOST", "0.0.0.0"),
        port=int(os.getenv("APP_PORT", 8000)),
        reload=bool(os.getenv("APP_DEBUG", True)),
    )