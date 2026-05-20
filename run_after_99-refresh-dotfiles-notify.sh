#!/usr/bin/env bash
set -uo pipefail

if [ -x "$HOME/.local/bin/dotfiles-check.sh" ]; then
  "$HOME/.local/bin/dotfiles-check.sh" refresh >/dev/null 2>&1 || true
fi
