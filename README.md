# BC-Analyzer — Multi-Agent Business Capability Analyzer

A full-stack application that uses a multi-agent LLM system (LangGraph + Claude Sonnet) to generate comprehensive business capability analyses from opportunity canvases.

## Architecture

```
Frontend (React + Express)          Backend (FastAPI + LangGraph)
port 3000                           port 8000
+--------------------------+        +----------------------------+
| React 19 + Tailwind CSS  |        | FastAPI                    |
| React Router 7           |  /api  | Firebase Auth (verify)     |
| Firebase Auth (client)   |------->| LangGraph Orchestrator     |
| Express (admin routes)   |        |   Master Agent             |
| Vite dev server          |        |   Context Agent            |
+--------------------------+        |   Capability Agent + tools  |
                                    |   Journey Agent + tools     |
                                    |   Systems Agent + tools     |
                                    |   Financial Agent           |
                                    |   QA Validation Agent       |
                                    | Firestore REST Client       |
                                    +----------------------------+
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, React Router 7 |
| Frontend Server | Express, Vite (dev middleware) |
| Backend | Python, FastAPI, Uvicorn |
| LLM | Claude Sonnet 4 (Anthropic) via LangChain |
| Orchestration | LangGraph StateGraph |
| Auth | Firebase Authentication (client + Admin SDK) |
| Database | Firestore (REST API client) |

## Project Structure

```
bc-analyzer/
  backend/
    main.py                     # FastAPI app + API endpoints
    app/
      auth.py                   # Firebase auth dependency
      firebase_config.py        # Firebase init + Firestore REST client
      database.py               # Firestore CRUD operations
      orchestrator.py           # LangGraph state machine
      agents/
        prompts.py              # All 6 agent prompt templates
        qa_agent.py             # QA validation agent
      tools/
        firestore_tools.py      # LangChain @tool functions
    langgraph.json              # LangGraph Studio config
    requirements.txt
    .env                        # API keys (not committed)
  frontend/
    server.ts                   # Express server + Vite middleware
    src/
      pages/                    # Login, Register, Dashboard, IdeaEntry, etc.
      components/               # Layout, ProtectedRoute, etc.
      contexts/                 # AuthContext
      firebase.ts               # Firebase client init
    vite.config.ts
  docs/
    PROMPTS_v1.0.0.md           # Versioned prompt documentation
  package.json                  # Root: runs both servers via concurrently
```

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Firebase project with Auth + Firestore enabled

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Place your Firebase service account JSON at `backend/firebase-service-account.json`.

### 2. Frontend

```bash
cd frontend
npm install
```

### 3. Run (both servers)

```bash
npm run dev    # from project root — starts both via concurrently
```

Or run individually:
```bash
# Backend (port 8000)
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (port 3000)
npx tsx frontend/server.ts
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Login, get token |
| GET | /api/config/capabilities | Bearer | List user capabilities |
| POST | /api/config/capabilities | Bearer | Add capabilities |
| GET | /api/config/products | Bearer | List user products |
| POST | /api/config/products | Bearer | Add products |
| GET | /api/config/journeys | Bearer | List user journeys |
| POST | /api/config/journeys | Bearer | Add journeys |
| GET | /api/config/value_streams | Bearer | List value streams |
| POST | /api/config/value_streams | Bearer | Add value streams |
| POST | /api/initiate | Bearer | Extract 5 core assumptions |
| POST | /api/approve | Bearer | Run full analysis pipeline |

## Agent Pipeline

1. **Master Agent** — Extracts 5 core assumptions from input
2. **Human Review** — User approves/edits/rejects assumptions
3. **Parallel Agents** — 5 sub-agents generate slides:
   - Context (Slides 1,2,7,8,10,11)
   - Capability (Slides 3,4, Appendix A)
   - Journey (Slides 5,9)
   - Systems (Slides 6,12)
   - Financial (Appendices B,C,D)
4. **Merge Node** — Combines into single Markdown document
5. **QA Validation** — Checks for Capex/Opex leaks + "(New)" flags
6. **Retry Loop** — If QA fails, feeds back to agents (max 3 attempts)

## Roles

- **user** — Access to Dashboard, Idea Entry, Capabilities, Journeys, Strategy
- **admin** — All user access + Admin Panel (create/delete users, reset passwords)
