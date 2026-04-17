"""
Per-agent LLM configuration and Skills.md storage.

Each user can override the default LLM and persona for each of the 7 agents
(master, context, capability, journey, systems, financial, qa). Configuration
lives in Firestore at `users/{uid}/agent_configs/{agent_name}`. API keys are
encrypted with Fernet using the AGENT_CONFIG_SECRET env var; users who don't
set a custom key fall back to the server defaults from `.env`.

Skills.md is user-editable markdown that gets appended to the hardcoded system
prompt at runtime, letting users inject persona/behavior tweaks without editing
the codebase.
"""

import os
from dataclasses import dataclass, field
from typing import Literal, Optional

from cryptography.fernet import Fernet, InvalidToken
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

from app.firebase_config import get_firestore_client
from app.logger import agent_logger


AgentName = Literal["master", "context", "capability", "journey", "systems", "financial", "qa"]
Provider = Literal["anthropic", "openai", "google", "custom"]

ALL_AGENTS: tuple[AgentName, ...] = (
    "master", "context", "capability", "journey", "systems", "financial", "qa",
)


# ── Default configs per agent ─────────────────────────────────────────
# These mirror the values that were previously hardcoded in orchestrator.get_llm()
# so behavior is unchanged for users who haven't customized anything.

_DEFAULTS: dict[str, dict] = {
    "master":     {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "temperature": 0.2, "max_tokens": 8192},
    "context":    {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "temperature": 0.1, "max_tokens": 8192},
    "capability": {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "temperature": 0.1, "max_tokens": 8192},
    "journey":    {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "temperature": 0.1, "max_tokens": 8192},
    "systems":    {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "temperature": 0.1, "max_tokens": 8192},
    "financial":  {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "temperature": 0.1, "max_tokens": 8192},
    "qa":         {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "temperature": 0.0, "max_tokens": 2048},
}


@dataclass
class AgentConfig:
    agent_name: AgentName
    provider: Provider = "anthropic"
    model: str = "claude-sonnet-4-20250514"
    api_key: Optional[str] = None   # plaintext in memory only; never serialize
    base_url: Optional[str] = None
    temperature: float = 0.1
    max_tokens: int = 8192
    skills_md: str = ""

    def to_public_dict(self) -> dict:
        """Safe dict for API responses — never includes the plaintext key."""
        return {
            "agent_name": self.agent_name,
            "provider": self.provider,
            "model": self.model,
            "has_custom_key": bool(self.api_key),
            "base_url": self.base_url or "",
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "skills_md": self.skills_md,
        }


# ── Fernet encryption ─────────────────────────────────────────────────

def _get_fernet() -> Fernet:
    secret = os.getenv("AGENT_CONFIG_SECRET")
    if not secret:
        raise RuntimeError(
            "AGENT_CONFIG_SECRET env var is not set. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(secret.encode() if isinstance(secret, str) else secret)


def _encrypt(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def _decrypt(ciphertext: str) -> Optional[str]:
    if not ciphertext:
        return None
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        agent_logger.warning("Failed to decrypt agent API key — ignoring and using server default.")
        return None


# ── Firestore persistence ─────────────────────────────────────────────

def _config_ref(user_id: str, agent_name: str):
    db = get_firestore_client()
    return db.document(f"users/{user_id}/agent_configs/{agent_name}")


def load_agent_config(user_id: str, agent_name: AgentName) -> AgentConfig:
    """
    Load a user's config for one agent. Falls back to the hardcoded defaults
    when no override exists.
    """
    if agent_name not in ALL_AGENTS:
        raise ValueError(f"Unknown agent: {agent_name}")

    defaults = _DEFAULTS[agent_name]
    cfg = AgentConfig(
        agent_name=agent_name,
        provider=defaults["provider"],
        model=defaults["model"],
        temperature=defaults["temperature"],
        max_tokens=defaults["max_tokens"],
    )

    try:
        doc = _config_ref(user_id, agent_name).get()
    except Exception as e:
        agent_logger.warning(f"load_agent_config failed for {user_id}/{agent_name}: {e}")
        return cfg

    if not doc:
        return cfg

    cfg.provider = doc.get("provider", cfg.provider)
    cfg.model = doc.get("model", cfg.model)
    cfg.base_url = doc.get("base_url") or None
    cfg.temperature = float(doc.get("temperature", cfg.temperature))
    cfg.max_tokens = int(doc.get("max_tokens", cfg.max_tokens))
    cfg.skills_md = doc.get("skills_md", "") or ""

    encrypted = doc.get("api_key_encrypted")
    if encrypted:
        cfg.api_key = _decrypt(encrypted)

    return cfg


def save_agent_config(
    user_id: str,
    agent_name: AgentName,
    *,
    provider: Provider,
    model: str,
    api_key: Optional[str],
    base_url: Optional[str],
    temperature: float,
    max_tokens: int,
    skills_md: str,
    clear_api_key: bool = False,
) -> AgentConfig:
    """
    Upsert a user's config for one agent.

    - If `clear_api_key` is True, any existing stored key is removed (revert to server default).
    - If `api_key` is a non-empty string, it is encrypted and stored.
    - If `api_key` is None (and clear_api_key is False), the existing stored key is preserved.
    """
    if agent_name not in ALL_AGENTS:
        raise ValueError(f"Unknown agent: {agent_name}")

    ref = _config_ref(user_id, agent_name)
    existing = {}
    try:
        existing = ref.get() or {}
    except Exception:
        pass

    if clear_api_key:
        api_key_encrypted = ""
    elif api_key:
        api_key_encrypted = _encrypt(api_key)
    else:
        api_key_encrypted = existing.get("api_key_encrypted", "") or ""

    payload = {
        "provider": provider,
        "model": model,
        "api_key_encrypted": api_key_encrypted,
        "base_url": base_url or "",
        "temperature": float(temperature),
        "max_tokens": int(max_tokens),
        "skills_md": skills_md or "",
    }
    ref.set(payload)

    return load_agent_config(user_id, agent_name)


def list_agent_configs(user_id: str) -> list[dict]:
    """Return a public-safe list of all 7 agent configs for a user."""
    return [load_agent_config(user_id, a).to_public_dict() for a in ALL_AGENTS]


# ── LLM factory ───────────────────────────────────────────────────────

def build_llm(cfg: AgentConfig):
    """
    Instantiate a LangChain chat model from an AgentConfig. Falls back to the
    server's env-var API key when the user hasn't supplied one.
    """
    if cfg.provider == "anthropic":
        key = cfg.api_key or os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("No Anthropic API key available (user or ANTHROPIC_API_KEY env).")
        return ChatAnthropic(
            model=cfg.model,
            anthropic_api_key=key,
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
            max_retries=3,
        )

    if cfg.provider == "openai":
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as e:
            raise RuntimeError(
                "langchain-openai not installed. Run `pip install langchain-openai`."
            ) from e
        key = cfg.api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("No OpenAI API key available (user or OPENAI_API_KEY env).")
        return ChatOpenAI(
            model=cfg.model,
            api_key=key,
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
            max_retries=3,
        )

    if cfg.provider == "google":
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
        except ImportError as e:
            raise RuntimeError(
                "langchain-google-genai not installed."
            ) from e
        key = cfg.api_key or os.getenv("GOOGLE_API_KEY")
        if not key:
            raise RuntimeError("No Google API key available (user or GOOGLE_API_KEY env).")
        return ChatGoogleGenerativeAI(
            model=cfg.model,
            google_api_key=key,
            temperature=cfg.temperature,
            max_output_tokens=cfg.max_tokens,
            max_retries=3,
        )

    if cfg.provider == "custom":
        # OpenAI-compatible endpoint (e.g. Together, Groq, local vLLM).
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as e:
            raise RuntimeError("langchain-openai required for custom providers.") from e
        if not cfg.base_url:
            raise RuntimeError("Custom provider requires a base_url.")
        key = cfg.api_key or os.getenv("OPENAI_API_KEY") or "dummy"
        return ChatOpenAI(
            model=cfg.model,
            api_key=key,
            base_url=cfg.base_url,
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
            max_retries=3,
        )

    raise ValueError(f"Unknown provider: {cfg.provider}")


# ── Prompt composition with user Skills.md ────────────────────────────

_SKILLS_HEADER = "\n\n---\n## User-Supplied Skills & Instructions\n\nThe following instructions were added by the user and must be followed in addition to the rules above:\n\n"


def compose_prompt(base_prompt: ChatPromptTemplate, skills_md: str) -> ChatPromptTemplate:
    """
    If the user has defined skills.md content, append it to every system message
    in the base ChatPromptTemplate. Returns the base prompt unchanged when
    skills_md is empty.
    """
    if not skills_md or not skills_md.strip():
        return base_prompt

    addendum = _SKILLS_HEADER + skills_md.strip()

    new_messages = []
    for msg in base_prompt.messages:
        role = getattr(msg, "role", None) or getattr(getattr(msg, "__class__", None), "__name__", "").lower()
        is_system = "system" in role.lower() if isinstance(role, str) else False
        if is_system and hasattr(msg, "prompt") and hasattr(msg.prompt, "template"):
            # Build a new system message with the template extended.
            new_template = msg.prompt.template + addendum
            new_messages.append(("system", new_template))
        else:
            new_messages.append(msg)

    return ChatPromptTemplate.from_messages(new_messages)
