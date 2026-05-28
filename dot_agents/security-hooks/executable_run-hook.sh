#!/bin/bash
# Wrapper that hooks invoke to run the actual Bun script.
#
# Why: Claude Code and Codex CLI may spawn hooks from environments where
# Homebrew's /opt/homebrew/bin and mise's shim dir are NOT on PATH (GUI launch,
# daemon mode, login-less subprocess). Resolving mise / bun via a fixed,
# wrapper-controlled PATH is more robust than relying on the bare `mise`
# command resolving correctly.
#
# Usage:
#   run-hook.sh <runtime> <script> [extra args...]
# where <runtime> is "claude" or "codex" — exported as SECURITY_HOOK_RUNTIME
# so detectRuntime() picks it up deterministically.

set -u

RUNTIME="${1:-}"
SCRIPT="${2:-}"

if [[ -z "$RUNTIME" || -z "$SCRIPT" ]]; then
  # Nothing to do — fail open to keep the originating tool unblocked.
  exit 0
fi

shift 2

# Prepend /opt/homebrew/bin so `mise` resolves on macOS ARM. Also include the
# user's PATH-as-it-was in case the wrapper is being run from a shell that
# already has things set up.
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-/usr/bin:/bin}"

# Hint to common.detectRuntime which originating tool we're under.
export SECURITY_HOOK_RUNTIME="$RUNTIME"

# Find mise. Fall back gracefully so a missing mise doesn't break the hook.
MISE_BIN=""
if [[ -x /opt/homebrew/bin/mise ]]; then
  MISE_BIN=/opt/homebrew/bin/mise
elif command -v mise >/dev/null 2>&1; then
  MISE_BIN="$(command -v mise)"
fi

if [[ -n "$MISE_BIN" ]]; then
  exec "$MISE_BIN" exec bun -- bun "$SCRIPT" "$@"
fi

# Last resort: any bun on PATH. Scripts only need a working bun.
if command -v bun >/dev/null 2>&1; then
  exec bun "$SCRIPT" "$@"
fi

# Bun is required for TS execution — no fallback available.
# Silently exit 0 to keep the originating tool unblocked.
exit 0
