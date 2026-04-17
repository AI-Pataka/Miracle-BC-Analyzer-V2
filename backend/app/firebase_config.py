"""
Firebase initialization module.
Dev-mode: uses direct REST API calls for Firestore to bypass gRPC SSL issues.
"""

import os
import ssl
import json
import httpx
import urllib3
import requests
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from dotenv import load_dotenv
from google.oauth2 import service_account as sa
from google.auth.transport.requests import Request

load_dotenv()

# ── SSL bypass (dev/corporate-proxy environments) ──────────────────────────
# The Firebase Admin SDK verifies tokens by fetching Google's public keys via
# the `requests` library. On machines with corporate proxies or missing root
# CAs, this fails with SSLCertVerificationError.  We disable SSL verification
# globally for requests/urllib3 here (development only).
os.environ["PYTHONHTTPSVERIFY"] = "0"
ssl._create_default_https_context = ssl._create_unverified_context
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Patch requests.Session so every request (including firebase_admin's internal
# calls to googleapis.com) skips SSL certificate verification.
_original_request = requests.Session.request

def _no_verify_request(self, method, url, **kwargs):
    kwargs.setdefault("verify", False)
    return _original_request(self, method, url, **kwargs)

requests.Session.request = _no_verify_request

_firebase_app = None
_credentials = None


def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")
        if not os.path.exists(service_account_path):
            raise FileNotFoundError(
                f"Firebase service account file not found at: '{service_account_path}'. "
                "Download it from Firebase Console → Project Settings → Service Accounts → "
                "Generate new private key, and place it in the backend/ directory as "
                "'firebase-service-account.json'."
            )
        cred = credentials.Certificate(service_account_path)
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def _get_access_token():
    """Get a valid access token for Firestore REST API calls."""
    global _credentials
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")
    if _credentials is None:
        _credentials = sa.Credentials.from_service_account_file(
            service_account_path,
            scopes=["https://www.googleapis.com/auth/datastore"]
        )
    if not _credentials.valid:
        _credentials.refresh(Request())
    return _credentials.token


class FirestoreRESTClient:
    """Lightweight Firestore client using REST API instead of gRPC."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        database_id = os.getenv("FIREBASE_DATABASE_ID", "(default)")
        self.base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/{database_id}/documents"

    def _headers(self):
        return {
            "Authorization": f"Bearer {_get_access_token()}",
            "Content-Type": "application/json",
        }

    def _encode_value(self, value):
        """Convert a Python value to Firestore REST API value format."""
        # Check bool before int since bool is a subclass of int in Python
        if isinstance(value, bool):
            return {"booleanValue": value}
        elif isinstance(value, str):
            return {"stringValue": value}
        elif isinstance(value, int):
            return {"integerValue": str(value)}
        elif isinstance(value, float):
            return {"doubleValue": value}
        elif isinstance(value, list):
            return {"arrayValue": {"values": [self._encode_value(v) for v in value]}}
        elif isinstance(value, dict):
            return {"mapValue": {"fields": {k: self._encode_value(v) for k, v in value.items()}}}
        elif value is None:
            return {"nullValue": None}
        else:
            return {"stringValue": str(value)}

    def _decode_value(self, value: dict):
        """Convert a Firestore REST API value back to Python."""
        if "stringValue" in value:
            return value["stringValue"]
        elif "integerValue" in value:
            return int(value["integerValue"])
        elif "doubleValue" in value:
            return value["doubleValue"]
        elif "booleanValue" in value:
            return value["booleanValue"]
        elif "nullValue" in value:
            return None
        elif "arrayValue" in value:
            return [self._decode_value(v) for v in value["arrayValue"].get("values", [])]
        elif "mapValue" in value:
            return {k: self._decode_value(v) for k, v in value["mapValue"].get("fields", {}).items()}
        elif "timestampValue" in value:
            return value["timestampValue"]
        return None

    def _decode_document(self, doc: dict) -> dict:
        """Decode a full Firestore document into a Python dict."""
        fields = doc.get("fields", {})
        result = {}
        for key, value in fields.items():
            result[key] = self._decode_value(value)
        # Extract document ID from the name path
        name = doc.get("name", "")
        doc_id = name.split("/")[-1] if name else ""
        result["id"] = doc_id
        return result

    def collection(self, path: str):
        return CollectionRef(self, path)

    def document(self, path: str):
        return DocumentRef(self, path)


class CollectionRef:
    def __init__(self, client: FirestoreRESTClient, path: str):
        self.client = client
        self.path = path

    def add(self, data: dict):
        """Add a document with auto-generated ID."""
        url = f"{self.client.base_url}/{self.path}"
        fields = {k: self.client._encode_value(v) for k, v in data.items()}
        with httpx.Client(verify=False) as http:
            resp = http.post(url, headers=self.client._headers(), json={"fields": fields})
            resp.raise_for_status()
        return resp.json()

    def document(self, doc_id: str):
        """Return a DocumentRef for a specific child document ID."""
        return DocumentRef(self.client, f"{self.path}/{doc_id}")

    def stream(self):
        """List all documents in the collection (no pagination)."""
        url = f"{self.client.base_url}/{self.path}"
        with httpx.Client(verify=False) as http:
            resp = http.get(url, headers=self.client._headers())
            resp.raise_for_status()
        data = resp.json()
        return [self.client._decode_document(doc) for doc in data.get("documents", [])]


class DocumentRef:
    def __init__(self, client: FirestoreRESTClient, path: str):
        self.client = client
        self.path = path

    def set(self, data: dict):
        """Create or overwrite a document."""
        url = f"{self.client.base_url}/{self.path}"
        fields = {k: self.client._encode_value(v) for k, v in data.items()}
        with httpx.Client(verify=False) as http:
            resp = http.patch(url, headers=self.client._headers(), json={"fields": fields})
            resp.raise_for_status()
        return resp.json()

    def get(self):
        """Fetch the document; returns decoded dict or None if not found."""
        url = f"{self.client.base_url}/{self.path}"
        with httpx.Client(verify=False) as http:
            resp = http.get(url, headers=self.client._headers())
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
        return self.client._decode_document(resp.json())

    def update(self, data: dict):
        """
        Merge top-level fields into the existing document using updateMask.
        Only the keys in `data` are touched; other fields remain unchanged.
        """
        fields = {k: self.client._encode_value(v) for k, v in data.items()}
        mask_params = "&".join(f"updateMask.fieldPaths={k}" for k in data.keys())
        url = f"{self.client.base_url}/{self.path}?{mask_params}"
        with httpx.Client(verify=False) as http:
            resp = http.patch(url, headers=self.client._headers(), json={"fields": fields})
            resp.raise_for_status()
        return resp.json()

    def delete(self):
        """Delete the document. No-op if it doesn't exist."""
        url = f"{self.client.base_url}/{self.path}"
        with httpx.Client(verify=False) as http:
            resp = http.delete(url, headers=self.client._headers())
            if resp.status_code == 404:
                return
            resp.raise_for_status()

    def collection(self, name: str):
        return CollectionRef(self.client, f"{self.path}/{name}")


_firestore_client = None


def get_firestore_client():
    """Return the REST-based Firestore client."""
    global _firestore_client
    if _firestore_client is None:
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        _firestore_client = FirestoreRESTClient(project_id)
    return _firestore_client


def verify_firebase_token(id_token: str) -> dict:
    get_firebase_app()
    decoded = firebase_auth.verify_id_token(id_token)
    return decoded