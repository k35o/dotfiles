#!/usr/bin/env python3
"""
UserPromptSubmit hook: capture the working-tree baseline for L2 diff review.

Runs at the start of each user turn for both Claude Code and Codex CLI.
Saves a baseline SHA representing the working tree state at this moment so
that `stop_review.py` can compute "this turn's changes".

Strategy:
- `git stash create -u` produces a commit object capturing both tracked
  modifications AND untracked files, without touching the working tree.
- If the working tree is clean, fall back to HEAD.
- If not in a git repo, write nothing — stop_review.py falls back to HEAD.

Disable: SECURITY_GUIDANCE_DISABLE=1.

Output: nothing (silent capture). Always exits 0.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.common import (  # noqa: E402
    MAX_FILE_BYTES,
    STATE_DIR,
    atomic_write_text,
    globally_disabled,
    log,
    read_payload,
    safe_session_key,
)


def baseline_path(session_id: str) -> Path:
    return STATE_DIR / "baseline" / f"{safe_session_key(session_id)}.json"


def untracked_snapshot_dir(session_id: str) -> Path:
    return STATE_DIR / "baseline" / f"{safe_session_key(session_id)}.untracked"


def snapshot_untracked_files(cwd: Path, session_id: str, untracked: list[str]) -> None:
    """
    Copy current contents of each untracked path to a per-session snapshot dir.
    stop_review.py uses this to detect modifications to files that were already
    untracked at baseline time (a case `git diff` cannot cover).

    Skips files larger than MAX_FILE_BYTES to bound disk usage.
    """
    snap_root = untracked_snapshot_dir(session_id)
    # Wipe any stale snapshot from a previous turn with the same session_id.
    if snap_root.exists():
        shutil.rmtree(snap_root, ignore_errors=True)
    for rel in untracked:
        src = cwd / rel
        try:
            if not src.is_file():
                continue
            if src.stat().st_size > MAX_FILE_BYTES:
                continue
        except OSError:
            continue
        dst = snap_root / rel
        try:
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(src.read_bytes())
        except Exception as e:
            log("prompt_submit", f"snapshot {rel} failed: {e}")


def capture(cwd: Path) -> dict | None:
    """Return baseline dict {sha, untracked} or None if not a git repo."""
    try:
        r = subprocess.run(
            ["git", "-C", str(cwd), "rev-parse", "--is-inside-work-tree"],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode != 0 or r.stdout.strip() != "true":
            return None
    except Exception as e:
        log("prompt_submit", f"git check failed: {e}")
        return None

    # Try stash create -u first. Returns empty stdout when tree is clean.
    sha = ""
    try:
        r = subprocess.run(
            ["git", "-C", str(cwd), "stash", "create", "-u"],
            capture_output=True, text=True, timeout=15,
        )
        if r.returncode == 0:
            sha = r.stdout.strip()
    except Exception as e:
        log("prompt_submit", f"stash create failed: {e}")

    if not sha:
        # Clean tree — use HEAD.
        try:
            r = subprocess.run(
                ["git", "-C", str(cwd), "rev-parse", "HEAD"],
                capture_output=True, text=True, timeout=5,
            )
            if r.returncode == 0:
                sha = r.stdout.strip()
        except Exception as e:
            log("prompt_submit", f"rev-parse HEAD failed: {e}")

    if not sha:
        return None

    # Record untracked file list at baseline time. New files created during
    # the turn won't appear in this list, which is how we identify them.
    untracked: list[str] = []
    try:
        r = subprocess.run(
            ["git", "-C", str(cwd), "ls-files", "--others", "--exclude-standard"],
            capture_output=True, text=True, timeout=10,
        )
        if r.returncode == 0:
            untracked = [ln for ln in r.stdout.splitlines() if ln]
    except Exception as e:
        log("prompt_submit", f"ls-files failed: {e}")

    return {"sha": sha, "untracked": untracked, "cwd": str(cwd)}


def main() -> int:
    if globally_disabled():
        return 0

    payload = read_payload()
    if not payload:
        return 0

    session_id = str(payload.get("session_id") or "default")
    cwd = Path(payload.get("cwd") or ".").resolve()

    baseline = capture(cwd)
    if baseline is None:
        return 0

    atomic_write_text(baseline_path(session_id), json.dumps(baseline))
    snapshot_untracked_files(cwd, session_id, baseline.get("untracked") or [])
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log("prompt_submit", f"unhandled: {e}")
        sys.exit(0)
