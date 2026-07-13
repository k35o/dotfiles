#!/usr/bin/env bash
# Claude Code statusLine: モデル / cwd / git ブランチ / dotfiles更新の遅れを1行表示する。
# 頻繁に呼ばれるため fetch などの重い処理はせず、dotfiles-check.sh が維持する
# キャッシュ (~/.cache/dotfiles-notify/count) を読むだけにする。
set -uo pipefail

export PATH="$HOME/.local/share/mise/shims:/opt/homebrew/bin:/usr/local/bin:$PATH"

input="$(cat)"
command -v jq >/dev/null 2>&1 || exit 0

model="$(jq -r '.model.display_name // empty' <<<"$input" 2>/dev/null)"
dir="$(jq -r '.workspace.current_dir // .cwd // empty' <<<"$input" 2>/dev/null)"

out="$model"

if [[ -n "$dir" ]]; then
  out="${out:+$out }${dir/#$HOME/~}"
  branch="$(git -C "$dir" --no-optional-locks branch --show-current 2>/dev/null)"
  [[ -n "$branch" ]] && out="$out ($branch)"
fi

count_file="${XDG_CACHE_HOME:-$HOME/.cache}/dotfiles-notify/count"
if [[ -f "$count_file" ]]; then
  count="$(<"$count_file")"
  if [[ "$count" =~ ^[0-9]+$ ]] && ((count > 0)); then
    out="${out:+$out }dotfiles⇣${count}"
  fi
fi

printf '%s' "$out"
