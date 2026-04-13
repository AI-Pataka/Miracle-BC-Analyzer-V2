# BC-Analyzer — Full Architecture Document

> **Project:** Multi-Agent Business Capability Analyzer
> **Last Updated:** 2026-04-10
> **Author:** Miracle Adeoye, Incedo Technology Solutions

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Request Flow (End-to-End)](#3-request-flow-end-to-end)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Agentic AI Pipeline (LangGraph)](#6-agentic-ai-pipeline-langgraph)
7. [Agent Specifications](#7-agent-specifications)
8. [Agent Tools (Firestore Knowledge Base)](#8-agent-tools-firestore-knowledge-base)
9. [QA Validation Agent](#9-qa-validation-agent)
10. [Firebase & Firestore Schema](#10-firebase--firestore-schema)
11. [Authentication Flow](#11-authentication-flow)
12. [Configuration & Environment Variables](#12-configuration--environment-variables)
13. [Logging & Observability](#13-logging--observability)
14. [Key Dependencies](#14-key-dependencies)

---

## 1. Technology Stack

### Frontend

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Framework          | React 19 + TypeScript               |
| Build Tool         | Vite 6                              |
| Styling            | Tailwind CSS v4                     |
| Routing            | React Router v7                     |
| Auth               | Firebase JS SDK (Auth + Firestore)  |
| Icons              | Lucide React                        |
| Animations         | Motion (Framer Motion)              |
| Report Rendering   | react-markdown                      |
| Server             | Express (dev proxy + admin API)     |

### Backend

| Layer              | Technology                                          |
|--------------------|-----------------------------------------------------|
| Web Framework      | FastAPI (Python)                                    |
| ASGI Server        | Uvicorn                                             |
| AI Orchestration   | LangGraph (state machine)                           |
| LLM Framework      | LangChain + langchain-anthropic                     |
| LLM Model          | Claude Sonnet 4 (`claude-sonnet-4-20250514`)     |
| Auth               | Firebase Admin SDK                                  |
| Database Client    | httpx (Firestore REST API)                          |
| Data Validation    | Pydantic v2                                         |
| Data Processing    | pandas                                              |
| Environment        | python-dotenv                                       |

### Infrastructure

| Service            | Provider                            |
|--------------------|-------------------------------------|
| Authentication     | Firebase Authentication (email/pw)  |
| Database           | Cloud Firestore                     |
| LLM API            | Anthropic (Claude)                  |
| Hosting            | Local development (localhost)       |

---

## 2. High-Level Architecture

```
┌─────────────────── FRONTEND ────────────────────┐    ┌─────────────────── BACKEND ────────────────────┐
│                                                  │    │                                                │
│  React 19 + TypeScript                           │    │  Python FastAPI + LangGraph                    │
│  Vite 6 (build + dev server)                     │    │  Uvicorn (ASGI server)                         │
│  Tailwind CSS v4                                 │    │  LangChain + langchain-anthropic                │
│  React Router v7                                 │    │  Claude Sonnet 4                               │
│  Firebase JS SDK (Auth + Firestore)              │    │  Firebase Admin SDK                            │
│  Lucide React (icons)                            │    │  httpx (async HTTP for Firestore REST)         │
│  Motion (animations)                             │    │  Pydantic v2 (validation)                      │
│  react-markdown (report rendering)               │    │  pandas (data processing)                      │
│                                                  │    │                                                │
└──────────────────────┬───────────────────────────┘    └────────────────────┬───────────────────────────┘
                       │                                                     │
                       └────────────────┐  ┌─────────────────────────────────┘
                                        ▼  ▼
                          ┌──────────────────────────────┐
                          │   Firebase (Google Cloud)     │
                          │  • Authentication (email/pw)  │
                          │  • Firestore Database         │
                          │    - users/{uid}              │
                          │    - users/{uid}/capabilities │
                          │    - users/{uid}/products     │
                          │    - users/{uid}/journeys     │
                          │    - users/{uid}/value_streams│
                          └──────────────────────────────┘
```

---

## 3. Request Flow (End-to-End)

```
 Browser (React SPA on :3000)
    │
    │  Authorization: Bearer <Firebase ID Token>
    ▼
 Express Server (server.ts :3000)
    │
    ├── /api/admin/*  ──→  Handled directly by Express (Firebase Admin SDK)
    │     • POST   /api/admin/create-user
    │     • DELETE  /api/admin/delete-user/:uid
    │     • POST   /api/admin/reset-password
    │
    └── /api/*  ────────→  Proxied to FastAPI backend (:8000)
                              │
                              ▼
                       FastAPI (main.py :8000)
                         │
                         ├── GET  /health
                         ├── POST /api/auth/register
                         ├── POST /api/auth/login
                         ├── GET  /api/auth/me
                         │
                         ├── POST /api/config/{capabilities|products|journeys|value_streams}
                         ├── GET  /api/config/{capabilities|products|journeys|value_streams}
                         │
                         ├── POST /api/initiate   ←── Step 1: Extract core assumptions
                         └── POST /api/approve    ←── Step 2: Run full agentic pipeline
                                   │
                                   ▼
                            LangGraph Orchestrator
```

### Two-Step Pipeline Flow

**Step 1 — `/api/initiate`**
The user submits an Opportunity Canvas (industry, company, problem statement). The Master Agent extracts 5 core assumptions and returns them for human review.

**Step 2 — `/api/approve`**
The user reviews, optionally edits, and approves the assumptions. This triggers the full multi-agent pipeline: 5 specialist agents run, outputs are merged into a Markdown report, and QA validates the result (with automatic retry on failure).

---

## 4. Frontend Architecture

### Pages & Routing

| Route               | Component             | Access         | Purpose                                          |
|---------------------|-----------------------|----------------|--------------------------------------------------|
| `/login`            | Login                 | Public         | Firebase email/password login                    |
| `/register`         | Register              | Public         | New user registration                            |
| `/dashboard`        | UserDashboard         | Authenticated  | Profile management + project context setup       |
| `/idea-entry`       | IdeaEntry             | Authenticated  | 2-step analysis pipeline + report output         |
| `/capabilities`     | CapabilityDashboard   | Authenticated  | BIZBOK L1-L4 capability matrix editor            |
| `/journeys`         | JourneyDashboard      | Authenticated  | Customer journey mapping (30 seed journeys)      |
| `/strategy`         | StrategyDashboard     | Authenticated  | Value streams (LBGUPS) + sizing + rules          |
| `/admin/dashboard`  | AdminDashboard        | Admin only     | User management (create/delete/reset)            |
| `/`                 | Redirect              | —              | Redirects to `/dashboard`                        |

All routes except `/login` and `/register` are wrapped in `<ProtectedRoute>`.
The `/admin/*` route uses `adminOnly=true`.

### Key Components

| Component        | File                                  | Purpose                                             |
|------------------|---------------------------------------|-----------------------------------------------------|
| Layout           | `components/Layout.tsx`               | App shell: collapsible sidebar + top bar + content   |
| ProtectedRoute   | `components/ProtectedRoute.tsx`       | Auth guard, redirects unauthenticated to `/login`    |
| ReportDashboard  | `components/ReportDashboard.tsx`      | Structured report rendering (sections, nav pills)    |

### State Management

| Context       | File                        | State                                                  |
|---------------|-----------------------------|--------------------------------------------------------|
| AuthContext    | `contexts/AuthContext.tsx`  | `user` (Firebase), `profile` (Firestore), `isAdmin`, `getIdToken()` |

- Firebase Auth state is watched via `onAuthStateChanged`
- User profile is loaded from Firestore via `onSnapshot` (real-time updates)
- `last_login_at` is updated on every auth state change

### Key Frontend Files

```
frontend/
├── src/
│   ├── App.tsx                          # Router setup + route definitions
│   ├── main.tsx                         # React entry point
│   ├── contexts/
│   │   └── AuthContext.tsx              # Auth state provider
│   ├── components/
│   │   ├── Layout.tsx                  # Sidebar + header shell
│   │   ├── ProtectedRoute.tsx          # Route guard
│   │   └── ReportDashboard.tsx         # Report viewer
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── UserDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── IdeaEntry.tsx               # Main pipeline UI
│   │   ├── CapabilityDashboard.tsx
│   │   ├── JourneyDashboard.tsx
│   │   └── StrategyDashboard.tsx
│   ├── lib/
│   │   ├── firebase.ts                 # Firebase client init
│   │   ├── error-handler.ts            # Firestore error logger
│   │   ├── reportParser.ts             # Markdown → structured sections
│   │   ├── utils.ts                    # cn() class name utility
│   │   └── types.ts                    # TypeScript type definitions
│   └── index.css                       # Tailwind imports
├── server.ts                            # Express dev server + admin API
├── vite.config.ts                       # Vite build config + proxy
├── firebase-applet-config.json          # Firebase client config
├── firestore.rules                      # Firestore security rules
└── package.json
```

---

## 5. Backend Architecture

### API Endpoints

#### Health

| Method | Path      | Auth     | Description       |
|--------|-----------|----------|-------------------|
| GET    | `/`       | None     | Root health check |
| GET    | `/health` | None     | Health status     |

#### Authentication

| Method | Path                | Auth     | Description                |
|--------|---------------------|----------|----------------------------|
| POST   | `/api/auth/register`| None     | Create account             |
| POST   | `/api/auth/login`   | None     | Login (returns tokens)     |
| GET    | `/api/auth/me`      | Bearer   | Get authenticated user info|

#### Configuration (Knowledge Base Upload)

| Method | Path                          | Auth     | Description                    |
|--------|-------------------------------|----------|--------------------------------|
| POST   | `/api/config/capabilities`    | Bearer   | Upload capabilities            |
| GET    | `/api/config/capabilities`    | Bearer   | List user's capabilities       |
| POST   | `/api/config/products`        | Bearer   | Upload products/systems        |
| GET    | `/api/config/products`        | Bearer   | List user's products           |
| POST   | `/api/config/journeys`        | Bearer   | Upload journeys                |
| GET    | `/api/config/journeys`        | Bearer   | List user's journeys           |
| POST   | `/api/config/value_streams`   | Bearer   | Upload value streams           |
| GET    | `/api/config/value_streams`   | Bearer   | List user's value streams      |

#### LangGraph Pipeline

| Method | Path             | Auth     | Description                                      |
|--------|------------------|----------|--------------------------------------------------|
| POST   | `/api/initiate`  | Bearer   | Step 1: Master agent extracts 5 core assumptions |
| POST   | `/api/approve`   | Bearer   | Step 2: Full pipeline execution → final report   |

### Key Backend Files

```
backend/
├── main.py                              # FastAPI app + all endpoint definitions
├── requirements.txt                     # Python dependencies
├── langgraph.json                       # LangGraph configuration
├── .env                                 # Environment variables (API keys)
├── firebase-service-account.json        # Firebase Admin service account
└── app/
    ├── auth.py                          # Auth models + Firebase token verification
    ├── database.py                      # CRUD helpers for Firestore sub-collections
    ├── firebase_config.py               # Firebase Admin init + Firestore REST client
    ├── orchestrator.py                  # LangGraph state machine + all agent nodes
    ├── agents/
    │   ├── prompts.py                   # All agent system prompts
    │   └── qa_agent.py                  # QA validation (rule-based + LLM)
    └── tools/
        └── firestore_tools.py           # Firestore-backed tools for agents
```

---

## 6. Agentic AI Pipeline (LangGraph)

### Pipeline State (TypedDict)

```python
class AnalyzerState(TypedDict):
    input_text: str              # Original opportunity canvas
    user_id: str                 # Authenticated user ID
    core_assumptions: str        # 5 extracted assumptions
    validation_status: str       # "pending" | "approved" | "rejected"
    context_output: str          # Context Agent output
    capability_output: str       # Capability Agent output
    journey_output: str          # Journey Agent output
    systems_output: str          # Systems Agent output
    financial_output: str        # Financial Agent output
    qa_feedback: str             # QA validation feedback
    qa_pass: bool                # QA pass/fail
    final_output: str            # Merged Markdown report
```

### Full Pipeline Flow Diagram

```
                             ┌─────────────────────┐
                             │   POST /api/initiate │
                             └──────────┬──────────┘
                                        ▼
                            ┌───────────────────────┐
                            │     MASTER AGENT       │
                            │  Extract 5 core        │
                            │  assumptions from      │
                            │  Opportunity Canvas    │
                            └───────────┬───────────┘
                                        ▼
                             ┌──────────────────┐
                             │  Human Review UI  │  ← User reads, edits, approves
                             └────────┬─────────┘
                                      │
                                      │  POST /api/approve (approved=true)
                                      ▼
                 ┌────────────────────────────────────────────┐
                 │      PARALLEL AGENTS (5 specialists)       │
                 │                                            │
                 │  WAVE 1 — Independent                      │
                 │  ┌──────────────┐  ┌────────────────────┐  │
                 │  │ Context      │  │ Capability Agent   │  │
                 │  │ Agent        │  │ Tool:              │  │
                 │  │              │  │  search_capability  │  │
                 │  │ Slides:      │  │  _kb()             │  │
                 │  │ 1, 2, 7, 8, │  │ Slides: 3, 4,      │  │
                 │  │ 10, 11      │  │ Appendix A         │  │
                 │  └──────────────┘  └─────────┬──────────┘  │
                 │                              │             │
                 │               capability_output            │
                 │                       │                    │
                 │  WAVE 2 — Depend on capability output      │
                 │  ┌──────────────┐  ┌────────────────────┐  │
                 │  │ Journey      │  │ Systems Agent      │  │
                 │  │ Agent        │  │ Tool:              │  │
                 │  │ Tool:        │  │  get_product_      │  │
                 │  │  get_journey │  │  owner()           │  │
                 │  │  _steps()   │  │ Slides: 6, 12      │  │
                 │  │ Slides: 5, 9│  │                     │  │
                 │  └──────┬──────┘  └──────────┬──────────┘  │
                 │         │                    │             │
                 │  WAVE 3 — Depends on all above             │
                 │  ┌──────────────────────────────────────┐  │
                 │  │ Financial Agent                       │  │
                 │  │ No tools — synthesizes from other     │  │
                 │  │ agent outputs                         │  │
                 │  │ Appendices: B, C, D                   │  │
                 │  └──────────────────────────────────────┘  │
                 └────────────────────┬───────────────────────┘
                                      ▼
                            ┌──────────────────┐
                            │   MERGE NODE      │
                            │  Compile all 5    │
                            │  outputs into a   │
                            │  single Markdown  │
                            │  report           │
                            └────────┬─────────┘
                                     ▼
                          ┌────────────────────┐
                          │  QA VALIDATION     │
                          │  1. Rule-based     │── regex for $, Capex/Opex leakage
                          │     pre-check      │
                          │  2. LLM validator  │── checks (New) flags, quality
                          └────────┬───────────┘
                                   │
                        ┌──────────┴──────────┐
                        │                     │
                     QA PASS              QA FAIL
                        │                     │
                        ▼                     ▼
                   ┌─────────┐      Append feedback to input
                   │  DONE   │      & RETRY entire pipeline
                   │  Return │      (max 2 retries = 3 total attempts)
                   │  report │              │
                   └─────────┘              └──→ back to PARALLEL AGENTS
```

### LangGraph State Machine Definition

```python
# Graph nodes
START → master_node → [validation_router]
                          ↓ (approved)
                      parallel_agents_node
                          ↓
                        merge_node
                          ↓
                      qa_validation_node
                          ↓
                      [qa_router]
                    ↙ (fail)     ↘ (pass)
          parallel_agents_node    END
                    ↓
                 merge_node
                    ↓
              qa_validation_node
```

---

## 7. Agent Specifications

### Master Agent

| Property       | Value                                                       |
|----------------|-------------------------------------------------------------|
| Role           | Lead Enterprise Architect                                   |
| Purpose        | Extract exactly 5 core assumptions from Opportunity Canvas  |
| Input          | `input_text` (raw user submission)                          |
| Output         | `core_assumptions` (numbered list 1-5)                      |
| Tools          | None                                                        |
| Node Function  | `master_node()` in `orchestrator.py`                        |

### Context Agent

| Property       | Value                                                       |
|----------------|-------------------------------------------------------------|
| Role           | Senior Business Strategist                                  |
| Purpose        | Business context, KPIs, impact, strategy                    |
| Slides         | 1 (Problem Statement), 2 (KPIs), 7 (Business Impact), 8 (Strategic Recommendations), 10 (SWOT), 11 (Porter's Five Forces) |
| Tools          | None                                                        |
| Node Function  | `context_node()` in `orchestrator.py`                       |

### Capability Agent

| Property       | Value                                                       |
|----------------|-------------------------------------------------------------|
| Role           | Capability Mapper (Telco BIZBOK specialization)             |
| Purpose        | Map capabilities to BIZBOK taxonomy L1-L4                   |
| Slides         | 3 (Value Stream Analysis), 4 (Capability Design Matrix), Appendix A (Rationale) |
| Tools          | `search_capability_kb(query, user_id)` — fuzzy search user's capability knowledge base |
| Key Rule       | MUST call tool for every capability; mark non-matched with "(New)" |
| Node Function  | `capability_node()` in `orchestrator.py`                    |

### Journey Agent

| Property       | Value                                                       |
|----------------|-------------------------------------------------------------|
| Role           | Customer Experience (CX) Architect                          |
| Purpose        | Customer journey mapping and optimization                   |
| Slides         | 5 (Customer Journey Map), 9 (Journey Optimization)         |
| Tools          | `get_journey_steps(journey_name, user_id)` — fetch journey frameworks |
| Node Function  | `journey_node()` in `orchestrator.py`                       |

### Systems Agent

| Property       | Value                                                       |
|----------------|-------------------------------------------------------------|
| Role           | Systems Architect                                           |
| Purpose        | Technical architecture and implementation mapping           |
| Slides         | 6 (Technical Architecture), 12 (Implementation Architecture) |
| Tools          | `get_product_owner(action_keyword, user_id)` — find system/product owners |
| Node Function  | `systems_node()` in `orchestrator.py`                       |

### Financial Agent

| Property       | Value                                                       |
|----------------|-------------------------------------------------------------|
| Role           | Financial Analyst                                           |
| Purpose        | Financial analysis without explicit dollar figures          |
| Appendices     | B (Capex/Opex), C (ROI/Break-even), D (Tracker)           |
| Tools          | None — synthesizes from journey, capability, systems outputs |
| Key Constraint | No explicit dollar amounts in independent evaluation        |
| Node Function  | `financial_node()` in `orchestrator.py`                     |

---

## 8. Agent Tools (Firestore Knowledge Base)

All tools query the authenticated user's Firestore sub-collections using fuzzy matching (`difflib.SequenceMatcher`, threshold 0.4).

### Tool: `search_capability_kb`

```
Agent:          Capability Agent
Firestore Path: users/{uid}/capabilities
Input:          query (string), user_id (string)
Output:         Matched capability with name, description, confidence score
                OR "(New)" instruction if no match found
Matching:       Fuzzy (exact substring → sequence matcher, threshold 0.4)
```

### Tool: `get_journey_steps`

```
Agent:          Journey Agent
Firestore Path: users/{uid}/journeys
Input:          journey_name (string), user_id (string)
Output:         Journey name, total steps, formatted step list
Matching:       Fuzzy (exact substring → sequence matcher, threshold 0.4)
```

### Tool: `get_product_owner`

```
Agent:          Systems Agent
Firestore Path: users/{uid}/products
Input:          action_keyword (string), user_id (string)
Output:         Product, Owner, Product Group, Product Area, Description, confidence
Matching:       Fuzzy search by name first, then description
```

### Data Isolation

Every tool requires a `user_id` parameter. All Firestore paths are scoped to `users/{user_id}/{collection}`, ensuring complete data isolation between users.

---

## 9. QA Validation Agent

**File:** `backend/app/agents/qa_agent.py`

### Two-Phase Validation

**Phase 1 — Rule-Based Pre-Check (fast, regex)**

Checks for financial data leakage in Appendices B, C, D:

| Pattern                                | Example Match              |
|----------------------------------------|----------------------------|
| `\$[\d,]+\.?\d*\s*[KMBkmb]?`          | `$1,500`, `$2.5M`         |
| `(?:USD\|EUR\|GBP)\s*[\d,]+`           | `USD 1000`                 |
| `(?:capex\|opex)\s*[:=]\s*\$?[\d,]+`   | `Capex: $1M`              |
| `(?:capital\|operating expenditure)[:=]`| `Capital expenditure: ...` |
| `\$\d+(?:\.\d+)?\s*(?:million\|...)`   | `$1.5 million`             |

**Phase 2 — LLM Validator (if rule-based passes)**

The LLM checks for:
1. **CAPEX/OPEX LEAKAGE** — No explicit dollar figures in financial appendices
2. **MISSING (New) FLAGS** — Unmapped capabilities must have `(New)` in the L4 column

Returns `VERDICT: PASS` or `VERDICT: FAIL` with specific violations.

### QA Retry Loop

- If QA fails, the feedback is appended to the input and the entire parallel agent pipeline re-runs
- Maximum 2 retries (3 total attempts)
- Final output is returned regardless of QA status after max attempts

---

## 10. Firebase & Firestore Schema

### Firebase Project

```
Project ID:   gen-lang-client-0472422448
Auth Domain:  gen-lang-client-0472422448.firebaseapp.com
Database ID:  ai-studio-5dd07549-3a83-4a5a-9150-94234033a05e
```

### Firestore Collections

```
users/                                     # Top-level collection
  └── {userId}/                            # Document per user
        ├── email: string
        ├── display_name: string
        ├── role: "user" | "admin"
        ├── created_at: timestamp
        ├── last_login_at: timestamp       # Optional
        ├── industry: string               # Optional (from profile setup)
        ├── client_company: string         # Optional
        ├── consultant_name: string        # Optional
        │
        ├── capabilities/                  # Sub-collection
        │     └── {docId}/
        │           ├── name: string
        │           ├── description: string
        │           ├── level: "L1" | "L2" | "L3" | "L4"
        │           └── ...
        │
        ├── products/                      # Sub-collection
        │     └── {docId}/
        │           ├── name: string
        │           ├── owner: string
        │           ├── product_group: string
        │           ├── product_area: string
        │           └── description: string
        │
        ├── journeys/                      # Sub-collection
        │     └── {docId}/
        │           ├── name: string
        │           ├── steps: array
        │           └── ...
        │
        └── value_streams/                 # Sub-collection
              └── {docId}/
                    ├── name: string
                    ├── stages: array
                    └── ...
```

### Firestore Security Rules Summary

| Collection     | Read           | Create         | Update          | Delete    |
|----------------|----------------|----------------|-----------------|-----------|
| `users/{uid}`  | Owner or Admin | Owner or Admin | Owner (limited) or Admin (full) | Admin only |

- Admin check: `role == 'admin'` OR `email == "miracle.adeoye@incedoinc.com"` with `email_verified`
- Regular users can only update: `display_name`, `last_login_at`, `industry`, `client_company`, `consultant_name`

---

## 11. Authentication Flow

```
┌───────────┐     1. Login (email/pw)      ┌──────────────────┐
│  Browser   │ ──────────────────────────→  │ Firebase Auth     │
│  (React)   │ ←──────────────────────────  │ (Google Cloud)    │
│            │     2. Firebase ID Token     │                   │
│            │                              └──────────────────┘
│            │
│            │     3. API request + Bearer token
│            │ ──────────────────────────→  ┌──────────────────┐
│            │                              │ Express Server    │
│            │                              │ (server.ts :3000) │
│            │                              └────────┬─────────┘
│            │                                       │
│            │                              4. Proxy to FastAPI
│            │                                       │
│            │                                       ▼
│            │                              ┌──────────────────┐
│            │                              │ FastAPI (:8000)   │
│            │                              │                   │
│            │                              │ get_current_user()│
│            │                              │ verifies token    │
│            │                              │ via Firebase      │
│            │     5. Response              │ Admin SDK         │
│            │ ←──────────────────────────  │                   │
└───────────┘                              └──────────────────┘
```

### Token Flow

1. User logs in via Firebase JS SDK → receives `idToken`
2. Frontend stores token in Firebase Auth state (auto-refreshed)
3. Every API call includes `Authorization: Bearer {idToken}` header
4. Backend `get_current_user()` dependency extracts and verifies token
5. Token verification returns `UserInfo(user_id, email)` used to scope all data access

---

## 12. Configuration & Environment Variables

### Backend `.env`

| Variable                         | Purpose                                 |
|----------------------------------|-----------------------------------------|
| `FIREBASE_API_KEY`               | Firebase REST API key (auth endpoints)  |
| `FIREBASE_PROJECT_ID`            | Firebase project identifier             |
| `FIREBASE_SERVICE_ACCOUNT_PATH`  | Path to service account JSON            |
| `GOOGLE_API_KEY`                 | Google API key                          |
| `ANTHROPIC_API_KEY`              | Claude API key for LLM calls            |
| `MOCK_MODE` (optional)           | Set to `1` for hardcoded mock responses |
| `APP_HOST` (optional)            | FastAPI host (default: `0.0.0.0`)       |
| `APP_PORT` (optional)            | FastAPI port (default: `8000`)          |
| `APP_DEBUG` (optional)           | FastAPI debug mode (default: `True`)    |

### Frontend `.env.local`

| Variable         | Purpose                     |
|------------------|-----------------------------|
| `GEMINI_API_KEY` | Google Gemini API key       |
| `APP_URL`        | Application URL placeholder |

### Vite Configuration (`vite.config.ts`)

- Plugin: `@tailwindcss/vite` for Tailwind CSS v4
- Alias: `@` → project root
- Dev proxy: `/api` → `http://localhost:8000`
- HMR: disabled if `DISABLE_HMR=true`

### LangGraph Configuration (`langgraph.json`)

```json
{
  "dependencies": ["."],
  "graphs": {
    "bc_analyzer": "./app/orchestrator.py:build_graph"
  },
  "env": ".env"
}
```

---

## 13. Logging & Observability

### Backend Structured Logging

The backend uses Python's `logging` module with a centralized logger defined in `backend/app/logger.py`.

**Logger name:** `bc_analyzer.agents`

| Handler            | Destination                         | Level | Max Size          |
|--------------------|-------------------------------------|-------|-------------------|
| RotatingFileHandler| `backend/logs/agent_runs.log`       | DEBUG | 5 MB, 3 backups   |
| StreamHandler      | Console (stdout)                    | INFO  | —                 |

**Log format:** `YYYY-MM-DD HH:MM:SS | LEVEL   | message`

**Run ID correlation:** Each pipeline invocation generates an 8-character hex run ID (`uuid4().hex[:8]`). All log entries for that run are prefixed with `[run_id]`, enabling log filtering per execution.

#### What Is Logged

| Component                  | Events Logged                                                   |
|----------------------------|-----------------------------------------------------------------|
| `run_master_extraction()`  | Pipeline Step 1 start/complete, run ID, user ID                |
| `run_full_pipeline()`      | Pipeline Step 2 start, attempt number, QA pass/fail, retry events, final status |
| `master_node()`            | Agent start/finish                                              |
| `context_node()`           | Agent start/finish                                              |
| `capability_node()`        | Agent start/finish                                              |
| `journey_node()`           | Agent start/finish                                              |
| `systems_node()`           | Agent start/finish                                              |
| `financial_node()`         | Agent start/finish                                              |

**Example log output:**
```
2026-04-13 14:32:01 | INFO    | [a3f7c1b2] === PIPELINE STEP 2: Full Analysis (user=abc123, max_retries=2) ===
2026-04-13 14:32:01 | INFO    | [a3f7c1b2] Attempt 1/3 — running parallel agents
2026-04-13 14:32:01 | INFO    | [a3f7c1b2] [context_agent] Starting context analysis
2026-04-13 14:32:05 | INFO    | [a3f7c1b2] [context_agent] Finished context analysis
2026-04-13 14:32:10 | INFO    | [a3f7c1b2] Merging agent outputs
2026-04-13 14:32:11 | INFO    | [a3f7c1b2] Running QA validation
2026-04-13 14:32:13 | INFO    | [a3f7c1b2] QA PASSED on attempt 1 — pipeline complete
```

### Frontend Logging (Browser Console Only)

| File                   | What's Logged                                    | Method          |
|------------------------|--------------------------------------------------|-----------------|
| `IdeaEntry.tsx`        | Pipeline flow: token, request, response, errors  | `console.log` / `console.error` |
| `AuthContext.tsx`      | Token failures, login errors, profile errors     | `console.error` |
| `error-handler.ts`    | Firestore operation errors (JSON)                | `console.error` |
| `server.ts`           | Proxy errors, server startup                     | `console.error` / `console.log` |

**Limitation:** All frontend logs vanish when the browser tab closes. No persistence.

### Remaining Gaps

| Gap                              | Impact                                          | Recommendation                             |
|----------------------------------|--------------------------------------------------|---------------------------------------------|
| No tool call logging             | Cannot see what agents queried                   | Log tool name, input, result in tools       |
| No QA decision logging           | Cannot see why QA passed/failed                  | Log violations and verdicts in qa_agent.py  |
| No error aggregation             | Errors scattered across console/stdout           | Consider centralized error tracking         |
| Frontend logs are ephemeral      | Lost on tab close                                | Consider sending critical errors to backend |

---

## 14. Key Dependencies

### Frontend (`package.json`)

| Package                   | Version  | Purpose                           |
|---------------------------|----------|-----------------------------------|
| react                     | 19.0.0   | UI framework                      |
| react-dom                 | 19.0.0   | React DOM renderer                |
| react-router-dom          | 7.14.0   | Client-side routing               |
| firebase                  | 12.11.0  | Firebase client SDK               |
| firebase-admin            | 10.3.0   | Firebase Admin (Express server)   |
| tailwindcss               | 4.1.14   | Utility-first CSS                 |
| @tailwindcss/vite         | 4.1.14   | Tailwind Vite plugin              |
| lucide-react              | 0.546.0  | Icon library                      |
| motion                    | 12.23.24 | Animation library                 |
| react-markdown            | 10.1.0   | Markdown rendering                |
| vite                      | 6.2.0    | Build tool                        |
| @vitejs/plugin-react      | 5.0.4    | React Vite plugin                 |
| clsx                      | 2.1.1    | Class name utility                |
| tailwind-merge            | 3.5.0    | Tailwind class merging            |
| xlsx                      | 0.18.5   | Excel file processing             |
| express                   | 4.21.2   | Node.js server                    |
| http-proxy-middleware      | 3.0.5    | API proxy                         |
| dotenv                    | 17.2.3   | Environment variables             |

### Backend (`requirements.txt`)

| Package                   | Version  | Purpose                           |
|---------------------------|----------|-----------------------------------|
| langgraph                 | >=0.2.0  | State machine orchestration       |
| langchain                 | >=0.3.0  | LLM chain interfaces              |
| langchain-google-genai    | >=2.0.0  | Google Gemini integration          |
| langchain-anthropic       | >=1.0.0  | Claude LLM integration            |
| fastapi                   | >=0.115.0| Web framework                     |
| uvicorn                   | >=0.30.0 | ASGI server                       |
| firebase-admin            | >=6.0.0  | Firebase Admin SDK                |
| httpx                     | >=0.27.0 | Async HTTP client                 |
| pydantic[email]           | >=2.0.0  | Data validation                   |
| python-dotenv             | >=1.0.0  | Environment variables             |
| pandas                    | >=2.0.0  | Data processing                   |

---

## Appendix: Report Output Structure

The final merged report is a single Markdown document with the following slide structure:

| Slide | Title                             | Agent           |
|-------|-----------------------------------|-----------------|
| 1     | Problem Statement                 | Context         |
| 2     | Key Performance Indicators (KPIs) | Context         |
| 3     | Value Stream Analysis             | Capability      |
| 4     | High-Level Capability Matrix      | Capability      |
| 5     | Customer Journey Map              | Journey         |
| 6     | Technical Architecture            | Systems         |
| 7     | Business Impact Assessment        | Context         |
| 8     | Strategic Recommendations         | Context         |
| 9     | Journey Optimization              | Journey         |
| 10    | SWOT Analysis                     | Context         |
| 11    | Porter's Five Forces              | Context         |
| 12    | Implementation Architecture       | Systems         |
| A     | Capability Rationale (Appendix)   | Capability      |
| B     | Capex / Opex Estimates            | Financial       |
| C     | ROI / Break-even Analysis         | Financial       |
| D     | Implementation Tracker            | Financial       |
