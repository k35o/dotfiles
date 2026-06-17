#!/usr/bin/env bash
set -uo pipefail

command -v claude >/dev/null 2>&1 || exit 0
claude mcp get mdn >/dev/null 2>&1 || claude mcp add --transport http -s user mdn https://mcp.mdn.mozilla.net/
