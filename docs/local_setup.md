# BC-Analyzer — Local Development Setup Guide

> **Project:** Multi-Agent Business Capability Analyzer
> **Last Updated:** 2026-04-13

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Backend Setup (Python / FastAPI)](#3-backend-setup-python--fastapi)
4. [Frontend Setup (React / Vite)](#4-frontend-setup-react--vite)
5. [Firebase Configuration](#5-firebase-configuration)
6. [Running the Application](#6-running-the-application)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Verifying the Setup](#8-verifying-the-setup)
9. [Common Issues & Troubleshooting](#9-common-issues--troubleshooting)
10. [Project Structure Overview](#10-project-structure-overview)

---

## 1. Prerequisites

Ensure the following are installed on your machine:

| Tool       | Version   | Check Command           | Download                         |
|------------|-----------|-------------------------|----------------------------------|
| Node.js    | >= 18.x   | `node --version`        | https://nodejs.org               |
| npm        | >= 9.x    | `npm --version`         | Included with Node.js            |
| Python     | >= 3.10   | `python --version`      | https://python.org               |
| pip        | >= 23.x   | `pip --version`         | Included with Python             |
| Git        | >= 2.x    | `git --version`         | https://git-scm.com              |

You will also need:

- An **Anthropic API key** (for Claude Sonnet LLM calls)
- A **Firebase project** with Authentication and Firestore enabled
- A **Firebase service account JSON** file (for the backend Admin SDK)

---

## 2. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

The project root contains two main directories:

```
├── backend/    # Python FastAPI + LangGraph
├── frontend/   # React 19 + Vite 6 + TypeScript
└── docs/       # Documentation
```

---

## 3. Backend Setup (Python / FastAPI)

### 3.1 Create a Virtual Environment

```bash
cd backend
python -m venv venv
```

### 3.2 Activate the Virtual Environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (cmd):**
```cmd
venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 3.3 Install Dependencies

```bash
pip install -r requirements.txt
```

This installs: FastAPI, Uvicorn, LangGraph, LangChain, langchain-anthropic, Firebase Admin SDK, httpx, Pydantic, pandas, and python-dotenv.

### 3.4 Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# backend/.env

# Required
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
FIREBASE_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxx
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Optional
GOOGLE_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxx
MOCK_MODE=0                # Set to 1 for hardcoded mock responses (no LLM calls)
APP_HOST=0.0.0.0           # Default: 0.0.0.0
APP_PORT=8000              # Default: 8000
APP_DEBUG=True             # Default: True
```

### 3.5 Add Firebase Service Account

Place your Firebase service account JSON file at:

```
backend/firebase-service-account.json
```

To download this file:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Settings (gear icon) → Project Settings → Service accounts
4. Click "Generate new private key"
5. Save the downloaded JSON as `firebase-service-account.json` in the `backend/` directory

### 3.6 Create Logs Directory

The logging system writes to `backend/logs/`. This directory is created automatically on first run, but you can create it manually:

```bash
mkdir -p logs
```

---

## 4. Frontend Setup (React / Vite)

### 4.1 Install Dependencies

```bash
cd frontend
npm install
```

### 4.2 Configure Firebase Client

The Firebase client configuration lives in `frontend/src/firebase.ts`. Verify the config values match your Firebase project:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 4.3 Deploy Firestore Security Rules

The security rules file is at `frontend/firestore.rules`. Deploy them to your Firebase project:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login and deploy rules
firebase login
firebase deploy --only firestore:rules
```

---

## 5. Firebase Configuration

### 5.1 Enable Authentication

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable **Email/Password** provider

### 5.2 Create Firestore Database

1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. Choose production mode (security rules will be deployed separately)
4. Select a Cloud Firestore location

### 5.3 Create an Admin User

After starting the app (see section 6), register a new user through the `/register` page. To make them an admin, manually update their Firestore document:

1. Go to Firebase Console → Firestore
2. Find the user document at `users/{uid}`
3. Change the `role` field from `"user"` to `"admin"`

Alternatively, the admin dashboard at `/admin/dashboard` allows existing admins to create new users.

---

## 6. Running the Application

You need **two terminals** running simultaneously.

### Terminal 1: Backend (FastAPI)

```bash
cd backend
source venv/bin/activate    # or .\venv\Scripts\Activate.ps1 on Windows
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process
```

### Terminal 2: Frontend (Vite + Express)

```bash
cd frontend
npm run dev
```

Expected output:
```
Express + Vite server running on http://localhost:3000
```

### Access the Application

Open your browser to: **http://localhost:3000**

### Architecture of Dev Servers

```
Browser → Express (:3000) → Vite (HMR + static)
                           → /api/admin/* (handled by Express directly)
                           → /api/* (proxied to FastAPI :8000)
```

The Express server (`server.ts`) serves as the frontend entry point. It:
- Runs Vite as middleware for HMR and static file serving
- Handles `/api/admin/*` routes directly using Firebase Admin SDK
- Proxies all other `/api/*` requests to the FastAPI backend on port 8000

---

## 7. Environment Variables Reference

### Backend (`backend/.env`)

| Variable                         | Required | Default     | Description                                 |
|----------------------------------|----------|-------------|---------------------------------------------|
| `ANTHROPIC_API_KEY`              | Yes      | —           | Claude API key for LLM calls                |
| `FIREBASE_API_KEY`               | Yes      | —           | Firebase REST API key                       |
| `FIREBASE_PROJECT_ID`            | Yes      | —           | Firebase project identifier                 |
| `FIREBASE_SERVICE_ACCOUNT_PATH`  | Yes      | —           | Path to service account JSON                |
| `GOOGLE_API_KEY`                 | No       | —           | Google API key (optional)                   |
| `MOCK_MODE`                      | No       | `0`         | `1` = skip LLM calls, return mock data      |
| `APP_HOST`                       | No       | `0.0.0.0`  | FastAPI bind host                           |
| `APP_PORT`                       | No       | `8000`      | FastAPI bind port                           |
| `APP_DEBUG`                      | No       | `True`      | FastAPI debug mode                          |

### Frontend

Firebase config is hardcoded in `frontend/src/firebase.ts` (not read from env vars at runtime).

---

## 8. Verifying the Setup

### 8.1 Backend Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy"}
```

### 8.2 Frontend Loading

Navigate to http://localhost:3000. You should see the login page.

### 8.3 End-to-End Test

1. Register a new account at `/register`
2. Log in at `/login`
3. Navigate to `/idea-entry`
4. Enter an industry (e.g., Telecommunications), company (e.g., Verizon), and a problem statement
5. Click "Analyze" — the master agent should extract 5 assumptions
6. Review and approve assumptions — the full pipeline runs and returns a report

### 8.4 Check Logs

After running an analysis, verify logs are being written:

```bash
cat backend/logs/agent_runs.log
```

You should see entries with run ID correlation, e.g.:
```
2026-04-13 14:32:01 | INFO    | [a3f7c1b2] === PIPELINE STEP 1: Master Extraction (user=abc123) ===
```

### 8.5 Mock Mode (No API Key Required)

To test without an Anthropic API key, set `MOCK_MODE=1` in `backend/.env`. This returns hardcoded sample data instead of calling the LLM.

---

## 9. Common Issues & Troubleshooting

### "ANTHROPIC_API_KEY not set"

Ensure the `.env` file exists in `backend/` (not the project root) and contains a valid key.

### "Firebase service account not found"

Verify `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env` points to the correct file. The default expects `./firebase-service-account.json` relative to the `backend/` directory.

### "Missing or Insufficient Permissions" on Firestore

This typically means the Firestore security rules are not deployed or are out of date. Deploy the latest rules:

```bash
cd frontend
firebase deploy --only firestore:rules
```

Also ensure the user document in Firestore has the expected fields. The `isValidUser()` rule in `firestore.rules` validates that only allowed fields are present.

### Port 8000 or 3000 Already in Use

Kill existing processes:

```bash
# Find process on port 8000
lsof -i :8000    # macOS/Linux
netstat -ano | findstr :8000    # Windows

# Kill it
kill <PID>    # macOS/Linux
taskkill /PID <PID> /F    # Windows
```

### Frontend Proxy Errors (502 / ECONNREFUSED)

The frontend proxies `/api/*` requests to `http://localhost:8000`. If the backend isn't running, you'll see 502 errors. Start the backend first.

### "Module not found" in Python

Ensure you're running from the `backend/` directory and the virtual environment is activated. The app uses relative imports (`from app.agents.prompts import ...`) that require the working directory to be `backend/`.

### TypeScript Errors

Run the type checker to catch issues:

```bash
cd frontend
npx tsc --noEmit
```

---

## 10. Project Structure Overview

```
project-root/
├── backend/
│   ├── main.py                      # FastAPI app + all endpoints
│   ├── requirements.txt             # Python dependencies
│   ├── langgraph.json               # LangGraph config
│   ├── .env                         # Environment variables (not committed)
│   ├── firebase-service-account.json # Firebase Admin key (not committed)
│   ├── logs/
│   │   └── agent_runs.log           # Structured execution logs
│   └── app/
│       ├── auth.py                  # Auth + token verification
│       ├── database.py              # Firestore CRUD helpers
│       ├── firebase_config.py       # Firebase Admin init
│       ├── logger.py                # Structured logging config
│       ├── orchestrator.py          # LangGraph state machine
│       ├── agents/
│       │   ├── prompts.py           # Agent system prompts
│       │   └── qa_agent.py          # QA validation
│       └── tools/
│           └── firestore_tools.py   # Agent Firestore tools
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Router + route definitions
│   │   ├── main.tsx                 # React entry
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # Auth state
│   │   ├── components/
│   │   │   ├── Layout.tsx           # App shell
│   │   │   ├── ProtectedRoute.tsx   # Route guard
│   │   │   └── ReportDashboard.tsx  # Report viewer
│   │   ├── pages/                   # All page components
│   │   └── lib/                     # Utilities + types
│   ├── server.ts                    # Express dev server
│   ├── vite.config.ts               # Vite build config
│   ├── firestore.rules              # Firestore security rules
│   └── package.json
│
├── docs/
│   ├── architecture.md              # System architecture document
│   ├── local_setup.md               # This file
│   └── PROMPTS_v1.0.0.md            # Agent prompt documentation
│
├── ARCHITECTURE.md                  # Root architecture reference
└── README.md
```
