#!/usr/bin/env bash
# Refresh the dotfiles update notification cache consumed by starship.
# Subcommands:
#   refresh           Force fetch + recount.
#   refresh-if-stale  Run refresh only when the cache is older than CHECK_INTERVAL.

set -uo pipefail

readonly CHECK_INTERVAL=3600
readonly UPSTREAM_REF="origin/main"

cache_dir() { printf '%s\n' "${XDG_CACHE_HOME:-$HOME/.cache}/dotfiles-notify"; }
count_file() { printf '%s\n' "$(cache_dir)/count"; }
last_check_file() { printf '%s\n' "$(cache_dir)/last_check"; }

is_stale() {
  local now="$1" last_check
  local file
  file="$(last_check_file)"
  [[ ! -f "$file" ]] && return 0
  last_check="$(<"$file")"
  [[ ! "$last_check" =~ ^[0-9]+$ ]] && return 0
  (( now - last_check >= CHECK_INTERVAL ))
}

refresh() {
  command -v chezmoi >/dev/null 2>&1 || return 0
  chezmoi git -- fetch -q >/dev/null 2>&1 || return 0

  local count
  count="$(chezmoi git -- rev-list --count "HEAD..${UPSTREAM_REF}" 2>/dev/null)" || return 0
  [[ "$count" =~ ^[0-9]+$ ]] || return 0

  mkdir -p "$(cache_dir)" || return 0

  if (( count == 0 )); then
    rm -f "$(count_file)"
  else
    printf '%s\n' "$count" > "$(count_file)"
  fi
  printf '%s\n' "$(date +%s)" > "$(last_check_file)"
}

refresh_if_stale() {
  local now
  now="$(date +%s)"
  is_stale "$now" && refresh
  return 0
}

case "${1:-}" in
  refresh) refresh ;;
  refresh-if-stale) refresh_if_stale ;;
  *)
    printf 'usage: %s {refresh|refresh-if-stale}\n' "${0##*/}" >&2
    exit 1
    ;;
esac
