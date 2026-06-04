#!/usr/bin/env bash
set -uo pipefail

command -v claude >/dev/null 2>&1 || exit 0
claude mcp get fnox >/dev/null 2>&1 || claude mcp add -s user fnox -- fnox mcp
