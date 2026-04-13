"""
Authentication module.
Provides FastAPI dependency for extracting and verifying Firebase user tokens.
Handles user registration via Firebase REST API and token verification.
"""

import os
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

from app.firebase_config import verify_firebase_token, get_firestore_client

load_dotenv()

# Security scheme - expects "Bearer <token>" in Authorization header
security = HTTPBearer()

FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
FIREBASE_SIGNUP_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}"
FIREBASE_SIGNIN_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"


# ── Request/Response Models ──────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user_id: str
    email: str
    id_token: str
    refresh_token: str
    message: str


class UserInfo(BaseModel):
    """Decoded user info extracted from a verified Firebase token."""
    user_id: str
    email: str


# ── Core Auth Dependency ─────────────────────────────────────────────


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserInfo:
    """
    FastAPI dependency that verifies the Firebase ID token from the
    Authorization header and returns the authenticated user's info.

    Usage in endpoints:
        @app.get("/protected")
        async def protected_route(user: UserInfo = Depends(get_current_user)):
            return {"user_id": user.user_id}
    """
    token = credentials.credentials
    try:
        decoded = verify_firebase_token(token)
        return UserInfo(
            user_id=decoded["uid"],
            email=decoded.get("email", ""),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Registration & Login ─────────────────────────────────────────────


async def register_user(req: RegisterRequest) -> AuthResponse:
    """
    Register a new user via Firebase REST API.
    Creates the user in Firebase Auth and initializes their Firestore document.
    """
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.post(
            FIREBASE_SIGNUP_URL,
            json={
                "email": req.email,
                "password": req.password,
                "returnSecureToken": True,
            },
        )

    data = response.json()

    if response.status_code != 200:
        error_msg = data.get("error", {}).get("message", "Registration failed")
        raise HTTPException(status_code=400, detail=error_msg)

    user_id = data["localId"]

    # Initialize user document in Firestore with empty config collections
    db = get_firestore_client()
    user_ref = db.collection("users").document(user_id)
    user_ref.set({
        "email": req.email,
        "display_name": req.display_name,
        "created_at": firestore_server_timestamp(),
    })

    return AuthResponse(
        user_id=user_id,
        email=req.email,
        id_token=data["idToken"],
        refresh_token=data["refreshToken"],
        message="User registered successfully.",
    )


async def login_user(req: LoginRequest) -> AuthResponse:
    """
    Authenticate an existing user via Firebase REST API.
    Returns an ID token for subsequent authenticated requests.
    """
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.post(
            FIREBASE_SIGNIN_URL,
            json={
                "email": req.email,
                "password": req.password,
                "returnSecureToken": True,
            },
        )

    data = response.json()

    if response.status_code != 200:
        error_msg = data.get("error", {}).get("message", "Login failed")
        raise HTTPException(status_code=400, detail=error_msg)

    return AuthResponse(
        user_id=data["localId"],
        email=req.email,
        id_token=data["idToken"],
        refresh_token=data["refreshToken"],
        message="Login successful.",
    )


def firestore_server_timestamp():
    """Return a Firestore server timestamp sentinel."""
    from google.cloud.firestore_v1 import SERVER_TIMESTAMP
    return SERVER_TIMESTAMP