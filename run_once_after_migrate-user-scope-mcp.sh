#!/usr/bin/env bash
set -uo pipefail

# 一度きりの移行: plugin(mcp@k8o) が同名 MCP を提供するため、旧 user-scope 登録を除去する。
# 全端末で移行が済んだら本スクリプトごと削除してよい。
command -v claude >/dev/null 2>&1 || exit 0

for s in fnox mdn cloudflare-api cloudflare-docs; do
  claude mcp remove "$s" -s user >/dev/null 2>&1 || true
done
