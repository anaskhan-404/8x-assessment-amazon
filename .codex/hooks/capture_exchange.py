#!/usr/bin/env python3
"""Append Codex prompt/response hook events to the assignment session log."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = PROJECT_ROOT / ".agent-logs"
TOOL_NAME = "codex-vscode"
AUTHOR = "anaskhan-404"
PROJECT_NAME = PROJECT_ROOT.name


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def transcript_records(path_value: Any) -> list[dict[str, Any]]:
    if not isinstance(path_value, str) or not path_value:
        return []
    path = Path(path_value)
    if not path.is_file():
        return []

    records: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                try:
                    item = json.loads(line)
                except (json.JSONDecodeError, TypeError):
                    continue
                if isinstance(item, dict):
                    records.append(item)
    except OSError:
        return []
    return records


def session_start(records: list[dict[str, Any]], fallback: str) -> datetime:
    for item in records:
        if item.get("type") != "session_meta":
            continue
        payload = item.get("payload")
        if not isinstance(payload, dict):
            continue
        parsed = parse_timestamp(payload.get("timestamp") or item.get("timestamp"))
        if parsed:
            return parsed.astimezone(timezone.utc)
    return parse_timestamp(fallback) or datetime.now(timezone.utc)


def configured_model() -> str | None:
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    config_path = codex_home / "config.toml"
    try:
        config = config_path.read_text(encoding="utf-8")
    except OSError:
        return None
    match = re.search(r'^\s*model\s*=\s*["\']([^"\']+)["\']', config, re.MULTILINE)
    return match.group(1) if match else None


def event_model(records: list[dict[str, Any]], turn_id: Any) -> str:
    latest: str | None = None
    for item in records:
        if item.get("type") != "turn_context":
            continue
        payload = item.get("payload")
        if not isinstance(payload, dict):
            continue
        model = payload.get("model")
        if isinstance(model, str) and model:
            latest = model
            if turn_id and payload.get("turn_id") == turn_id:
                return model
    return latest or configured_model() or "unknown"


def yaml_value(body: str, key: str) -> str | None:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*(.*)$", body)
    return match.group(1).strip() if match else None


def replace_yaml_value(body: str, key: str, value: str) -> str:
    pattern = rf"(?m)^({re.escape(key)}:\s*).*$"
    return re.sub(pattern, lambda match: f"{match.group(1)}{value}", body, count=1)


def git_author() -> str:
    try:
        value = subprocess.run(
            ["git", "config", "github.user"],
            cwd=PROJECT_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        value = ""
    return value or AUTHOR


def create_log(
    path: Path, session_id: str, started: datetime, timestamp: str, model: str
) -> str:
    started_text = started.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    date_text = started.strftime("%Y-%m-%d")
    short_session = session_id[:8]
    return (
        "---\n"
        f"session_id: {session_id}\n"
        f"date: {date_text}\n"
        f"author: {git_author()}\n"
        f"model: {model}\n"
        f"tool: {TOOL_NAME}\n"
        f"project: {PROJECT_NAME}\n"
        "total_exchanges: 0\n"
        f"first_prompt_time: {timestamp}\n"
        f"last_prompt_time: {timestamp}\n"
        "---\n\n"
        f"# Session Log - {date_text}\n\n"
        f"Session: `{short_session}` | Project: `{PROJECT_NAME}` | "
        f"Author: `{git_author()}`\n\n"
        "---\n"
    )


def main() -> int:
    try:
        raw_input = sys.stdin.buffer.read()
        event = json.loads(raw_input.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError, TypeError):
        return 0
    if not isinstance(event, dict):
        return 0

    event_name = event.get("hook_event_name")
    if event_name not in {"UserPromptSubmit", "Stop"}:
        return 0

    session_id = str(event.get("session_id") or "unknown-session")
    timestamp = utc_now()
    records = transcript_records(event.get("transcript_path"))
    started = session_start(records, timestamp)
    model = event_model(records, event.get("turn_id"))

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    matching = sorted(LOG_DIR.glob(f"*_{session_id}.md"))
    if matching:
        log_path = matching[0]
        body = log_path.read_text(encoding="utf-8")
    else:
        filename = f"{started.strftime('%Y-%m-%d_%H-%M-%S')}_{session_id}.md"
        log_path = LOG_DIR / filename
        body = create_log(log_path, session_id, started, timestamp, model)

    prompt_count = len(re.findall(r"(?m)^\[LOG_ENTRY type=PROMPT ", body))
    response_count = len(re.findall(r"(?m)^\[LOG_ENTRY type=RESPONSE ", body))

    if event_name == "UserPromptSubmit":
        number = prompt_count + 1
        content = event.get("prompt")
        if not isinstance(content, str):
            content = ""
        entry_type = "PROMPT"
        body = replace_yaml_value(body, "total_exchanges", str(number))
        body = replace_yaml_value(body, "last_prompt_time", timestamp)
        if prompt_count == 0:
            body = replace_yaml_value(body, "first_prompt_time", timestamp)
    else:
        number = response_count + 1
        content = event.get("last_assistant_message")
        if not isinstance(content, str):
            content = ""
        entry_type = "RESPONSE"

    entry = (
        f"\n[LOG_ENTRY type={entry_type} num={number} session={session_id[:8]}]\n"
        f"timestamp: {timestamp}\n"
        f"model: {model}\n\n"
        f"{content}\n"
    )
    body += entry

    temporary = log_path.with_suffix(log_path.suffix + ".tmp")
    temporary.write_text(body, encoding="utf-8", newline="\n")
    temporary.replace(log_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
