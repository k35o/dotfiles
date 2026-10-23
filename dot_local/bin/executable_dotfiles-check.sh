#!/usr/bin/env bash
# Keep the dotfiles healthy: count pending upstream updates and detect drift from
# what mise / chezmoi declare.
# Subcommands:
#   refresh  Fetch and recount upstream commits (cache consumed by the zsh prompt / statusline).
#   check    refresh, then detect drift and send a macOS notification when its kinds change.
#   doctor   Print the detected drift.

set -uo pipefail

readonly UPSTREAM_REF="origin/main"
# ~/.local/bin に置いてよいもの。claude は公式インストーラを例外として使う
readonly LOCAL_BIN_ALLOWED="claude dotfiles-check.sh mise"
# mise には許可リストの設定がなく disable_backends で止めるしかないため、新しく増えた backend をここで拾う
readonly MISE_ALLOWED_BACKENDS="aqua core github npm packslip"
STRAY_DIRS=(
  "/opt/homebrew"
  "$HOME/.vite-plus"
  "$HOME/.turso"
  "$HOME/.rd"
  "$HOME/.cargo"
  "$HOME/.rustup"
  "$HOME/.bun/bin"
  "$HOME/.deno/bin"
  "$HOME/go/bin"
)

cache_dir() { printf '%s\n' "${XDG_CACHE_HOME:-$HOME/.cache}/dotfiles-notify"; }
count_file() { printf '%s\n' "$(cache_dir)/count"; }
notified_file() { printf '%s\n' "$(cache_dir)/notified"; }

refresh() {
  command -v chezmoi >/dev/null 2>&1 || return 0
  chezmoi git -- fetch -q >/dev/null 2>&1 || return 0

  local count
  count="$(chezmoi git -- rev-list --count "HEAD..${UPSTREAM_REF}" 2>/dev/null)" || return 0
  [[ "$count" =~ ^[0-9]+$ ]] || return 0

  mkdir -p "$(cache_dir)" || return 0

  if ((count == 0)); then
    rm -f "$(count_file)"
  else
    printf '%s\n' "$count" >"$(count_file)"
  fi
}

check_source() {
  local src
  src="$(chezmoi source-path 2>/dev/null)" || return 0
  if [[ -d "$src/.git/rebase-merge" || -d "$src/.git/rebase-apply" || -f "$src/.git/MERGE_HEAD" ]]; then
    printf 'chezmoi ソース\t%s が rebase / merge の途中で止まっている\n' "$src"
  fi
  if [[ -n "$(git -C "$src" status --porcelain 2>/dev/null)" ]]; then
    printf 'chezmoi ソース\t%s に未コミットの変更がある\n' "$src"
  fi
  local ahead
  ahead="$(git -C "$src" rev-list --count "${UPSTREAM_REF}..HEAD" 2>/dev/null)"
  if [[ "$ahead" =~ ^[0-9]+$ ]] && ((ahead > 0)); then
    printf 'chezmoi ソース\t%s に push されていないコミットが %s 件ある\n' "$src" "$ahead"
  fi
}

check_pending() {
  local count=0
  [[ -f "$(count_file)" ]] && count="$(<"$(count_file)")"
  if [[ "$count" =~ ^[0-9]+$ ]] && ((count > 0)); then
    printf '未反映の更新\t%s 件（ds で反映）\n' "$count"
  fi
  local diffs
  diffs="$(chezmoi status --exclude=scripts 2>/dev/null | awk '{print $2}' | paste -sd ' ' -)"
  if [[ -n "$diffs" ]]; then
    printf '未反映の更新\tホームとの差分: %s（chezmoi diff で確認）\n' "$diffs"
  fi
}

check_mise() {
  local missing prunable disabled backend undecided=""
  missing="$(mise ls --global --missing 2>/dev/null | awk '{print $1 "@" $2}' | paste -sd ' ' -)"
  if [[ -n "$missing" ]]; then
    printf 'mise\t宣言どおりに入っていない: %s（mise install）\n' "$missing"
  fi
  prunable="$(mise prune --tools --dry-run 2>&1 | awk '/ is prunable/ {print $2}' | paste -sd ' ' -)"
  if [[ -n "$prunable" ]]; then
    printf 'mise\t宣言外のバージョン: %s（mise prune --tools）\n' "$prunable"
  fi
  disabled=" $(mise settings get disable_backends 2>/dev/null | tr -d '[]",') "
  for backend in $(mise backends ls 2>/dev/null); do
    [[ " $MISE_ALLOWED_BACKENDS " == *" $backend "* || "$disabled" == *" $backend "* ]] && continue
    undecided="${undecided:+$undecided }$backend"
  done
  if [[ -n "$undecided" ]]; then
    printf 'mise\t使うか決めていない backend: %s（disable_backends に足すか、許可に加える）\n' "$undecided"
  fi
}

check_stray() {
  local dir entry name target
  for dir in "${STRAY_DIRS[@]}"; do
    [[ -e "$dir" ]] && printf '管理外のインストール\t%s\n' "$dir"
  done
  for entry in "$HOME/.local/bin"/*; do
    [[ -e "$entry" || -L "$entry" ]] || continue
    name="${entry##*/}"
    [[ " $LOCAL_BIN_ALLOWED " == *" $name "* ]] || printf '管理外のインストール\t%s\n' "$entry"
  done
  # cask のアプリが置くリンク（Docker Desktop の docker など）だけを許す
  for entry in /usr/local/bin/*; do
    [[ -e "$entry" || -L "$entry" ]] || continue
    target="$(readlink "$entry")"
    if [[ ! -e "$entry" || "$target" != /Applications/*.app/* ]]; then
      printf '管理外のインストール\t%s\n' "$entry"
    fi
  done
}

check_enclave_keys() {
  command -v sc_auth >/dev/null 2>&1 || return 0
  local label valid_to expires identities
  identities="$(sc_auth list-ctk-identities 2>/dev/null)"
  for label in git-signing ssh-auth; do
    valid_to="$(printf '%s\n' "$identities" | awk -v l="$label" '$4 == l {print $(NF - 2), $(NF - 1)}')"
    if [[ -z "$valid_to" || ! -f "$HOME/.local/share/$label/id_ecdsa_sk_rk_$label" ]]; then
      printf 'Secure Enclave の鍵\t%s の鍵か参照ファイルがない（README の手順で作る）\n' "$label"
      continue
    fi
    expires="$(date -j -f '%Y/%m/%d %H:%M' "$valid_to" +%s 2>/dev/null)" || continue
    if ((expires - $(date +%s) < 30 * 24 * 3600)); then
      printf 'Secure Enclave の鍵\t%s の期限が %s に切れる（README の手順で作り直す）\n' "$label" "$valid_to"
    fi
  done
}

check_secret_age() {
  local src config="dot_config/fnox/config.toml" name changed stale="" now
  src="$(chezmoi source-path 2>/dev/null)" || return 0
  [[ -f "$src/$config" ]] || return 0
  now="$(date +%s)"
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    changed="$(git -C "$src" log -1 --format=%ct -G "^$name *=" -- "$config" 2>/dev/null)"
    [[ "$changed" =~ ^[0-9]+$ ]] || continue
    ((now - changed > 365 * 24 * 3600)) && stale="${stale:+$stale }$name"
  done <<<"$(grep -oE '^[A-Z0-9_]+ *=' "$src/$config" | sed -E 's/ *=$//')"
  if [[ -n "$stale" ]]; then
    printf '秘密の入れ替え\t1年以上書き換えていない: %s（発行し直して fnox set する）\n' "$stale"
  fi
}

check_oss_sandbox() {
  local dir unsandboxed=""
  for dir in "$HOME/oss"/*/; do
    [[ -d "$dir.git" || -f "$dir.git" ]] || continue
    jq -e '.sandbox.enabled == true' "$dir.claude/settings.local.json" >/dev/null 2>&1 && continue
    unsandboxed="${unsandboxed:+$unsandboxed }$(basename "$dir")"
  done
  if [[ -n "$unsandboxed" ]]; then
    printf 'サンドボックス\t~/oss で無効: %s（.claude/settings.local.json に sandbox.enabled: true を入れる）\n' "$unsandboxed"
  fi
}

collect_issues() {
  check_source
  check_pending
  check_mise
  check_stray
  check_enclave_keys
  check_secret_age
  check_oss_sandbox
}

notify_if_changed() {
  local issues="$1" kinds last=""
  kinds="$(printf '%s' "$issues" | cut -f1 | sort -u | paste -sd '/' -)"
  [[ -f "$(notified_file)" ]] && last="$(<"$(notified_file)")"
  [[ "$kinds" == "$last" ]] && return 0

  mkdir -p "$(cache_dir)" || return 0
  printf '%s\n' "$kinds" >"$(notified_file)"
  [[ -z "$kinds" ]] && return 0

  osascript \
    -e 'on run argv' \
    -e 'display notification (item 1 of argv) with title "dotfiles" subtitle "dotfiles-check.sh doctor で内訳を確認"' \
    -e 'end run' \
    "$kinds" >/dev/null 2>&1
}

check() {
  refresh
  notify_if_changed "$(collect_issues)"
}

doctor() {
  local issues
  issues="$(collect_issues)"
  if [[ -z "$issues" ]]; then
    printf '問題なし\n'
    return 0
  fi
  printf '%s\n' "$issues" | awk -F '\t' '{printf "[%s] %s\n", $1, $2}'
  return 1
}

case "${1:-}" in
  refresh) refresh ;;
  check) check ;;
  doctor) doctor ;;
  *)
    printf 'usage: %s {refresh|check|doctor}\n' "${0##*/}" >&2
    exit 1
    ;;
esac
