#!/usr/bin/env bash
set -uo pipefail

command -v claude >/dev/null 2>&1 || exit 0
claude mcp get context7 >/dev/null 2>&1 || claude mcp add --transport http -s user context7 https://mcp.context7.com/mcp
