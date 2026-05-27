"""
Claude Code / Codex CLI 両対応のフック共通ユーティリティ。

設計方針:
- 標準ライブラリのみ使用（追加 pip install 不要）
- 例外で hook を落とさない（fail open）。エラーは log() に流す
- ツール検出は環境変数で行い、出力フォーマットを切り替える
- 個人情報や秘密値をログに出さない
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable

HOME = Path.home()
LOG_FILE = HOME / ".cache" / "security-hooks" / "log.txt"
STATE_DIR = HOME / ".cache" / "security-hooks"
GUIDANCE_FILE = HOME / ".claude" / "claude-security-guidance.md"
PATTERNS_FILE = HOME / ".claude" / "security-patterns.json"

# 巨大ファイルの全文 regex を避けるためのサイズ上限（バイト）。
MAX_FILE_BYTES = 512 * 1024

# 怪しい正規表現（catastrophic backtracking 候補）を弾く簡易チェック。
# (a) ネストした無制限量化子: (foo+)+, (bar*)*, (a|b)+ など
# (b) 3 個以上の貪欲ワイルドカード (.* / .+) を含む式（多項式爆発）
_RISKY_NESTED = re.compile(r"\([^)]*[+*][^)]*\)[+*]")
_GREEDY_WILDCARD = re.compile(r"\.[*+]")


def log(component: str, msg: str) -> None:
    """Append to log file. Must not raise."""
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a") as f:
            f.write(f"[{component}] {msg}\n")
    except Exception:
        pass


def globally_disabled() -> bool:
    return os.environ.get("SECURITY_GUIDANCE_DISABLE") == "1"


def read_payload() -> dict:
    """Parse JSON from stdin. Returns {} on failure."""
    try:
        return json.load(sys.stdin)
    except Exception as e:
        log("common", f"stdin parse failed: {e}")
        return {}


def detect_runtime(payload: dict) -> str:
    """
    Return 'claude' or 'codex'. Priority:
    1. SECURITY_HOOK_RUNTIME env (set by wrapper scripts — most reliable).
    2. Claude Code env vars (CLAUDECODE / CLAUDE_PROJECT_DIR).
    3. Codex env vars (CODEX_HOME / CODEX_SANDBOX_ENV_VAR).
    4. transcript_path heuristic.
    5. 'claude' default (safer because Claude is more frequent for this user).
    """
    explicit = os.environ.get("SECURITY_HOOK_RUNTIME", "").lower()
    if explicit in ("claude", "codex"):
        return explicit
    if os.environ.get("CLAUDECODE") or "CLAUDE_PROJECT_DIR" in os.environ:
        return "claude"
    if "CODEX_HOME" in os.environ or os.environ.get("CODEX_SANDBOX_ENV_VAR"):
        return "codex"
    tp = (payload.get("transcript_path") or "").lower()
    if "/.codex/" in tp:
        return "codex"
    return "claude"


def emit_inject(text: str, *, event: str) -> None:
    """
    Inject `text` into the model's context as a non-blocking hint.
    Used for L1 per-edit warnings — should not stop or re-prompt.

    Both Claude Code and Codex pass through `systemMessage`. Claude also
    supports `hookSpecificOutput.additionalContext` for PostToolUse.
    """
    output: dict = {"systemMessage": text}
    if event == "PostToolUse":
        output["hookSpecificOutput"] = {
            "hookEventName": "PostToolUse",
            "additionalContext": text,
        }
    json.dump(output, sys.stdout)


def emit_reprompt(reason: str, runtime: str) -> None:
    """
    Re-prompt the model with `reason`. Used for L2 Stop hook.

    Claude Code: {"decision": "block", "reason": ...} re-prompts the model.
    Codex: {"continue": false, "stopReason": ...} signals the same intent.
    These semantics are different enough that we must emit per-runtime.
    """
    if runtime == "codex":
        output = {
            "continue": False,
            "stopReason": reason,
            "systemMessage": reason,
        }
    else:
        output = {
            "decision": "block",
            "reason": reason,
            "systemMessage": reason,
        }
    json.dump(output, sys.stdout)


def matches_any_glob(globs: Iterable[str], path: Path) -> bool:
    s = str(path)
    return any(fnmatch.fnmatch(s, g) for g in globs)


def is_risky_regex(pattern: str) -> bool:
    """Reject patterns that look prone to catastrophic backtracking."""
    if _RISKY_NESTED.search(pattern):
        return True
    if len(_GREEDY_WILDCARD.findall(pattern)) >= 3:
        return True
    return False


def load_patterns() -> list[dict]:
    try:
        data = json.loads(PATTERNS_FILE.read_text())
        raw = list(data.get("patterns") or [])[:50]
    except FileNotFoundError:
        log("common", f"patterns file not found: {PATTERNS_FILE}")
        return []
    except Exception as e:
        log("common", f"patterns parse failed: {e}")
        return []

    # 危険な regex を持つルールはここで弾く（hook そのものの DoS を避ける）。
    safe: list[dict] = []
    for rule in raw:
        rx = rule.get("regex")
        if rx and is_risky_regex(rx):
            log("common", f"skipping risky regex rule: {rule.get('rule_name')}")
            continue
        safe.append(rule)
    return safe


def load_guidance() -> str:
    try:
        return GUIDANCE_FILE.read_text()[:8192]
    except FileNotFoundError:
        return ""
    except Exception as e:
        log("common", f"guidance read failed: {e}")
        return ""


def atomic_write_text(path: Path, text: str) -> bool:
    """
    Write text via tmp + rename. Returns True on success, False on failure.
    Never raises — state writes must not break hooks.
    """
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(text)
        tmp.replace(path)
        return True
    except Exception as e:
        log("common", f"atomic_write {path} failed: {e}")
        return False


def safe_session_key(session_id: str) -> str:
    """
    Derive a filesystem-safe key from session_id. Hook payloads are normally
    trusted, but hashing avoids path traversal and length oddities.
    """
    sid = session_id or "default"
    return hashlib.sha256(sid.encode("utf-8", errors="replace")).hexdigest()[:16]


def extract_edited_paths(payload: dict) -> list[Path]:
    """
    Return list of files that the just-completed tool call wrote to.

    Handles:
    - Claude Code: Edit / Write -> tool_input.file_path
                   NotebookEdit  -> tool_input.notebook_path
    - Codex CLI:   apply_patch  -> tool_input.input (parse patch envelope)
    """
    tool = payload.get("tool_name", "")
    inp = payload.get("tool_input") or {}
    cwd = Path(payload.get("cwd") or ".").resolve()

    if tool in ("Edit", "Write", "MultiEdit"):
        # MultiEdit batches multiple ranged edits into one file; the resulting
        # file path is in tool_input.file_path same as Edit/Write.
        p = inp.get("file_path")
        return [_abs(p, cwd)] if p else []
    if tool == "NotebookEdit":
        p = inp.get("notebook_path") or inp.get("file_path")
        return [_abs(p, cwd)] if p else []
    if tool == "apply_patch":
        return _parse_codex_patch(inp.get("input") or "", cwd)
    return []


def _abs(p: str, cwd: Path) -> Path:
    path = Path(p)
    return path if path.is_absolute() else cwd / path


_CODEX_FILE_HEADER = re.compile(
    r"^\*\*\*\s+(?:Update|Add)\s+File:\s+(.+?)\s*$"
)
_CODEX_MOVE_HEADER = re.compile(
    r"^\*\*\*\s+Move\s+to:\s+(.+?)\s*$"
)


def _parse_codex_patch(patch: str, cwd: Path) -> list[Path]:
    """
    Parse Codex apply_patch envelope and return paths whose content we should
    scan after the patch lands.

    Handles:
        *** Add File: foo.ts
        *** Update File: bar.ts
        *** Update File: old.ts
        *** Move to: new.ts          (rename: scan the new path)

    Delete File entries are intentionally ignored — there is nothing to scan.
    """
    paths: list[Path] = []
    for line in patch.splitlines():
        m = _CODEX_FILE_HEADER.match(line)
        if m:
            paths.append(_abs(m.group(1).strip(), cwd))
            continue
        m = _CODEX_MOVE_HEADER.match(line)
        if m and paths:
            # The preceding `*** Update File: old` was the rename source.
            # Replace it with the destination — that's what exists on disk now.
            paths[-1] = _abs(m.group(1).strip(), cwd)
    return paths


def read_file_capped(path: Path) -> str | None:
    """
    Read a file but skip if it exceeds MAX_FILE_BYTES. Returns None on failure
    or oversize. Truncating would risk missing tail-end patterns AND distorting
    line counts, so we skip entirely instead.
    """
    try:
        st = path.stat()
    except OSError:
        return None
    if st.st_size > MAX_FILE_BYTES:
        log("common", f"skip oversize {path} ({st.st_size}B)")
        return None
    try:
        return path.read_text(errors="replace")
    except Exception as e:
        log("common", f"read {path} failed: {e}")
        return None
