"""
Structured logging for the Multi-Agent Business Capability Analyzer.

Provides a configured logger that writes to both console and a rotating
log file at logs/agent_runs.log. Each log entry includes a timestamp,
run ID, and event description.
"""

import logging
import os
import uuid
from logging.handlers import RotatingFileHandler

# Ensure logs directory exists
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "agent_runs.log")

# Formatter with timestamp
_formatter = logging.Formatter(
    fmt="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# File handler — rotating, max 5 MB, keep 3 backups
_file_handler = RotatingFileHandler(
    LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
)
_file_handler.setFormatter(_formatter)
_file_handler.setLevel(logging.DEBUG)

# Console handler
_console_handler = logging.StreamHandler()
_console_handler.setFormatter(_formatter)
_console_handler.setLevel(logging.INFO)

# Main logger
agent_logger = logging.getLogger("bc_analyzer.agents")
agent_logger.setLevel(logging.DEBUG)
agent_logger.addHandler(_file_handler)
agent_logger.addHandler(_console_handler)
agent_logger.propagate = False


def generate_run_id() -> str:
    """Generate a short unique run ID for correlating log entries."""
    return uuid.uuid4().hex[:8]
