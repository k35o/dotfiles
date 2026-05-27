#!/usr/bin/env python3
"""
L1: Per-edit security pattern check.

Runs as PostToolUse hook for:
- Claude Code: matcher = "Edit|Write|NotebookEdit"
- Codex CLI:   matcher = "^apply_patch$"

Reads the edited file from disk (after the edit lands) and matches the new
content against the patterns declared in ~/.claude/security-patterns.json.
On hit, injects a warning into the model's context via JSON output.

Pure regex / substring — no model call, no cost.

Disable:
- SECURITY_GUIDANCE_DISABLE=1 (all layers)
- ENABLE_PATTERN_RULES=0 (this layer only)

Output:
- JSON to stdout with `systemMessage` and (for Claude) `hookSpecificOutput`
- Exits 0 always (fail open — never break the tool because of a hook bug)
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.common import (  # noqa: E402
    STATE_DIR,
    atomic_write_text,
    emit_inject,
    extract_edited_paths,
    globally_disabled,
    load_patterns,
    log,
    matches_any_glob,
    read_file_capped,
    read_payload,
    safe_session_key,
)


# Cap each reminder appended into context to keep the systemMessage polite.
MAX_REMINDER_BYTES = 1024


def session_state_path(session_id: str) -> Path:
    return STATE_DIR / "seen" / f"{safe_session_key(session_id)}.json"


def load_seen(session_id: str) -> set[str]:
    p = session_state_path(session_id)
    try:
        return set(json.loads(p.read_text()))
    except FileNotFoundError:
        return set()
    except Exception as e:
        log("pattern_check", f"load_seen failed: {e}")
        return set()


def save_seen(session_id: str, seen: set[str]) -> None:
    atomic_write_text(session_state_path(session_id), json.dumps(sorted(seen)))


def match_rule(content: str, path: Path, rule: dict) -> bool:
    """Return True if `rule` fires on `content` of file `path`."""
    paths_filter = rule.get("paths") or []
    if paths_filter and not matches_any_glob(paths_filter, path):
        return False
    exclude = rule.get("exclude_paths") or []
    if exclude and matches_any_glob(exclude, path):
        return False

    if rule.get("regex"):
        try:
            if re.search(rule["regex"], content, flags=re.MULTILINE):
                return True
        except re.error as e:
            log("pattern_check", f"bad regex in {rule.get('rule_name')}: {e}")

    if rule.get("substrings"):
        if any(s in content for s in rule["substrings"]):
            return True

    return False


def main() -> int:
    if globally_disabled():
        return 0
    if os.environ.get("ENABLE_PATTERN_RULES") == "0":
        return 0

    payload = read_payload()
    if not payload:
        return 0

    session_id = str(payload.get("session_id") or "default")
    paths = extract_edited_paths(payload)
    if not paths:
        return 0

    rules = load_patterns()
    if not rules:
        return 0

    seen = load_seen(session_id)
    findings: list[str] = []

    for path in paths:
        content = read_file_capped(path)
        if content is None:
            continue

        for rule in rules:
            name = str(rule.get("rule_name") or "unnamed")
            if not match_rule(content, path, rule):
                continue
            key = f"{name}::{path}"
            if key in seen:
                continue
            seen.add(key)
            reminder = str(rule.get("reminder") or "")[:MAX_REMINDER_BYTES]
            findings.append(f"- [{name}] {path}\n  {reminder}")

    if not findings:
        return 0

    save_seen(session_id, seen)

    text = (
        "Security pattern(s) matched in just-edited file(s). "
        "Review and remediate before continuing this turn:\n\n"
        + "\n".join(findings)
        + "\n\nReference: ~/.claude/claude-security-guidance.md"
    )
    emit_inject(text, event="PostToolUse")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log("pattern_check", f"unhandled: {e}")
        sys.exit(0)
