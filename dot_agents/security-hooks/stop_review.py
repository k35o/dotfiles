#!/usr/bin/env python3
"""
L2: End-of-turn security review via Codex.

Runs as the Stop hook for both Claude Code and Codex CLI. Computes the diff
of THIS TURN's changes (compared against the baseline captured at
UserPromptSubmit by prompt_submit.py) and sends it to `codex exec` for a
security review using ~/.claude/claude-security-guidance.md.

If the review finds issues, re-prompts the originating runtime with the
findings. Runtime detection drives the response shape (Claude's
`decision=block` vs Codex's `continue=false`).

Design notes:
- Reviewer is always Codex (k8o's choice). Implements writer != reviewer.
- Codex is invoked through `mise exec --` to use the mise-pinned version.
- The child process gets SECURITY_GUIDANCE_DISABLE=1 to prevent the reviewer
  session's hooks from spawning yet another reviewer (infinite recursion).
- Synchronous execution: Stop hooks block the turn end. 120s timeout in
  the hook config gives codex room while staying responsive.
- Caps at 3 invocations per session. Respects stop_hook_active so we don't
  re-prompt twice in a row.
- Fails open: any error path returns exit 0 without disturbing the session.

Disable:
- SECURITY_GUIDANCE_DISABLE=1 (all layers; also propagated to child)
- ENABLE_CODE_SECURITY_REVIEW=0 (all model-backed layers)
- ENABLE_STOP_REVIEW=0 (this layer only)

Tuning env:
- SECURITY_REVIEW_MODEL: codex model slug (default: gpt-5-codex)
- SECURITY_REVIEW_TIMEOUT: seconds (default: 90)
- SECURITY_REVIEW_MAX_RUNS: per-session cap (default: 3)
- SECURITY_REVIEW_MAX_DIFF_BYTES: skip if larger (default: 200000)
- SECURITY_REVIEW_MISE_PATH: absolute path to mise (default: /opt/homebrew/bin/mise)
"""

from __future__ import annotations

import difflib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.common import (  # noqa: E402
    STATE_DIR,
    atomic_write_text,
    detect_runtime,
    emit_reprompt,
    globally_disabled,
    load_guidance,
    log,
    read_payload,
    safe_session_key,
)


DEFAULT_MODEL = "gpt-5-codex"
DEFAULT_TIMEOUT = 90
DEFAULT_MAX_RUNS = 3
DEFAULT_MAX_DIFF_BYTES = 200_000
DEFAULT_MISE_PATH = "/opt/homebrew/bin/mise"


def safe_int_env(name: str, default: int) -> int:
    """Parse an env var as int, return default on any failure (no silent disable)."""
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        log("stop_review", f"bad {name}={raw!r}, using default {default}")
        return default


def runs_state_path(session_id: str) -> Path:
    return STATE_DIR / "stop_runs" / f"{safe_session_key(session_id)}.txt"


def baseline_state_path(session_id: str) -> Path:
    return STATE_DIR / "baseline" / f"{safe_session_key(session_id)}.json"


def untracked_snapshot_root(session_id: str) -> Path:
    return STATE_DIR / "baseline" / f"{safe_session_key(session_id)}.untracked"


def get_run_count(session_id: str) -> int:
    p = runs_state_path(session_id)
    try:
        return int(p.read_text().strip())
    except Exception:
        return 0


def bump_run_count(session_id: str) -> None:
    p = runs_state_path(session_id)
    atomic_write_text(p, str(get_run_count(session_id) + 1))


def load_baseline(session_id: str) -> dict | None:
    p = baseline_state_path(session_id)
    try:
        return json.loads(p.read_text())
    except FileNotFoundError:
        return None
    except Exception as e:
        log("stop_review", f"baseline load failed: {e}")
        return None


def git_diff(cwd: Path, base_ref: str) -> str | None:
    """Diff working tree against base_ref. Returns None on git failure."""
    try:
        r = subprocess.run(
            [
                "git",
                "-C",
                str(cwd),
                "diff",
                base_ref,
                "--no-color",
                "--unified=3",
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if r.returncode != 0:
            log("stop_review", f"git diff {base_ref} failed: {r.stderr.strip()[:200]}")
            return None
        return r.stdout
    except FileNotFoundError:
        log("stop_review", "git not on PATH")
        return None
    except Exception as e:
        log("stop_review", f"git diff error: {e}")
        return None


def list_untracked(cwd: Path) -> list[str]:
    try:
        r = subprocess.run(
            ["git", "-C", str(cwd), "ls-files", "--others", "--exclude-standard"],
            capture_output=True, text=True, timeout=10,
        )
        if r.returncode != 0:
            return []
        return [ln for ln in r.stdout.splitlines() if ln]
    except Exception as e:
        log("stop_review", f"ls-files failed: {e}")
        return []


_NEW_FILE_MAX_BYTES = 64 * 1024


def synthesize_new_file_diff(cwd: Path, rel_path: str) -> str:
    """Build a unified-diff-shaped block for a brand-new file."""
    abs_path = cwd / rel_path
    try:
        st = abs_path.stat()
    except OSError:
        return ""
    if st.st_size > _NEW_FILE_MAX_BYTES:
        return (
            f"\ndiff --git a/{rel_path} b/{rel_path}\n"
            f"new file mode 100644\n--- /dev/null\n+++ b/{rel_path}\n"
            f"@@ NEW FILE TOO LARGE TO INCLUDE ({st.st_size} bytes) @@\n"
        )
    try:
        content = abs_path.read_text(errors="replace")
    except Exception:
        return ""
    body = "".join(f"+{ln}\n" for ln in content.splitlines())
    header = (
        f"\ndiff --git a/{rel_path} b/{rel_path}\n"
        f"new file mode 100644\n--- /dev/null\n+++ b/{rel_path}\n"
        f"@@ -0,0 +1,{len(content.splitlines())} @@\n"
    )
    return header + body


def synthesize_untracked_modified_diff(
    cwd: Path, snapshot_root: Path, rel_path: str
) -> str:
    """
    For a file that was already untracked at baseline time, compare current
    content against the snapshot saved by prompt_submit.py.

    `git diff <stash_sha>` cannot cover this case because the working-tree
    file is still untracked, and `git stash create -u` returns empty when
    only untracked files exist. The on-disk snapshot is the simplest reliable
    source for the baseline content.

    Returns "" if no change, snapshot missing, or file too large.
    """
    abs_now = cwd / rel_path
    abs_snap = snapshot_root / rel_path
    if not abs_snap.is_file():
        # Snapshot missing (oversize at baseline time, or never copied) —
        # cannot produce a precise diff. Fail silently rather than guess.
        return ""
    try:
        st = abs_now.stat()
    except OSError:
        return ""
    if st.st_size > _NEW_FILE_MAX_BYTES:
        return (
            f"\ndiff --git a/{rel_path} b/{rel_path}\n"
            f"--- a/{rel_path}\n+++ b/{rel_path}\n"
            f"@@ UNTRACKED FILE TOO LARGE TO INCLUDE ({st.st_size} bytes) @@\n"
        )

    try:
        before = abs_snap.read_text(errors="replace")
        after = abs_now.read_text(errors="replace")
    except Exception as e:
        log("stop_review", f"read for diff {rel_path} failed: {e}")
        return ""
    if before == after:
        return ""

    diff_iter = difflib.unified_diff(
        before.splitlines(keepends=True),
        after.splitlines(keepends=True),
        fromfile=f"a/{rel_path}",
        tofile=f"b/{rel_path}",
        n=3,
    )
    body = "".join(diff_iter)
    if not body:
        return ""
    return f"\ndiff --git a/{rel_path} b/{rel_path}\n" + body


def compute_turn_diff(
    cwd: Path, baseline: dict | None, session_id: str
) -> str:
    """
    Return the diff of THIS TURN's changes.

    Sources combined:
    - Tracked files: `git diff <baseline_sha>` (or against HEAD as fallback).
    - New untracked files (didn't exist at baseline): synthesized add-file diff.
    - Pre-existing untracked files modified during the turn: synthesized diff
      against the on-disk snapshot recorded by prompt_submit.py.

    If there's no baseline metadata, fall back to `git diff HEAD` plus all
    current untracked files as new-file diffs. Less precise, acceptable as
    a degraded mode.
    """
    if baseline:
        base_ref = baseline.get("sha") or "HEAD"
        baseline_untracked = set(baseline.get("untracked") or [])
    else:
        base_ref = "HEAD"
        baseline_untracked = set()

    diff = git_diff(cwd, base_ref) or ""
    now_untracked = set(list_untracked(cwd))

    new_files = sorted(now_untracked - baseline_untracked)
    for rel in new_files:
        diff += synthesize_new_file_diff(cwd, rel)

    if baseline:
        snap_root = untracked_snapshot_root(session_id)
        still_untracked = sorted(now_untracked & baseline_untracked)
        for rel in still_untracked:
            diff += synthesize_untracked_modified_diff(cwd, snap_root, rel)

    return diff


def find_mise() -> str | None:
    """Locate mise. Prefer absolute path; fall back to PATH search."""
    explicit = os.environ.get("SECURITY_REVIEW_MISE_PATH", DEFAULT_MISE_PATH)
    if Path(explicit).exists():
        return explicit
    p = shutil.which("mise")
    if p:
        return p
    log("stop_review", "mise binary not found")
    return None


def call_codex(diff: str, guidance: str, timeout: int, model: str) -> str | None:
    """
    Run codex exec via `mise exec` so the mise-pinned version is used.
    Sets SECURITY_GUIDANCE_DISABLE=1 on the child to prevent the reviewer
    session from triggering this same hook recursively.
    """
    mise = find_mise()
    if not mise:
        return None

    prompt = (
        "You are a security reviewer. Read the GUIDANCE first, then review the DIFF.\n"
        "Report ONLY security issues that violate the guidance's hard rules or are\n"
        "clearly exploitable. Ignore style, performance, and general code quality.\n"
        "Use the output format specified in the guidance.\n"
        "If there are no security issues, reply with exactly:\n"
        "No issues found.\n\n"
        "=== GUIDANCE ===\n"
        f"{guidance}\n\n"
        "=== DIFF ===\n"
        f"{diff}\n"
    )

    env = os.environ.copy()
    env["SECURITY_GUIDANCE_DISABLE"] = "1"
    # Hint the subprocess that it should not try to act as a writer-with-hooks.
    env.pop("CLAUDE_PROJECT_DIR", None)

    try:
        r = subprocess.run(
            [
                mise,
                "exec",
                "--",
                "codex",
                "exec",
                "--model",
                model,
                "--skip-git-repo-check",
                "--sandbox",
                "read-only",
                prompt,
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
        if r.returncode != 0:
            log("stop_review", f"codex exit {r.returncode}: {r.stderr[:500]}")
            return None
        return r.stdout.strip()
    except subprocess.TimeoutExpired:
        log("stop_review", f"codex timed out after {timeout}s")
        return None
    except Exception as e:
        log("stop_review", f"codex call failed: {e}")
        return None


def is_clean_review(review: str) -> bool:
    """Exact-match check that the reviewer reported no issues."""
    normalized = review.strip().rstrip(".!").lower()
    return normalized == "no issues found"


def main() -> int:
    if globally_disabled():
        return 0
    if os.environ.get("ENABLE_CODE_SECURITY_REVIEW") == "0":
        return 0
    if os.environ.get("ENABLE_STOP_REVIEW") == "0":
        return 0

    payload = read_payload()
    if not payload:
        return 0

    if payload.get("stop_hook_active"):
        # Already re-prompted once via this hook chain.
        return 0

    session_id = str(payload.get("session_id") or "default")
    cwd_raw = payload.get("cwd") or os.getcwd()
    cwd = Path(cwd_raw).resolve()
    runtime = detect_runtime(payload)

    max_runs = safe_int_env("SECURITY_REVIEW_MAX_RUNS", DEFAULT_MAX_RUNS)
    if get_run_count(session_id) >= max_runs:
        log("stop_review", f"max runs ({max_runs}) reached")
        return 0

    baseline = load_baseline(session_id)
    diff = compute_turn_diff(cwd, baseline, session_id)
    if not diff.strip():
        return 0

    max_bytes = safe_int_env("SECURITY_REVIEW_MAX_DIFF_BYTES", DEFAULT_MAX_DIFF_BYTES)
    if len(diff.encode()) > max_bytes:
        log("stop_review", f"diff too large ({len(diff)}B), skipping")
        return 0

    guidance = load_guidance() or "(no guidance file found at ~/.claude/claude-security-guidance.md)"
    timeout = safe_int_env("SECURITY_REVIEW_TIMEOUT", DEFAULT_TIMEOUT)
    model = os.environ.get("SECURITY_REVIEW_MODEL", DEFAULT_MODEL)

    bump_run_count(session_id)
    review = call_codex(diff, guidance, timeout, model)
    if not review:
        return 0

    if is_clean_review(review):
        return 0

    reason = (
        "Codex security review found issue(s) in this turn's changes. "
        "Address each before declaring the turn complete:\n\n"
        f"{review}\n\n"
        "Reference: ~/.claude/claude-security-guidance.md"
    )
    emit_reprompt(reason, runtime)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log("stop_review", f"unhandled: {e}")
        sys.exit(0)
