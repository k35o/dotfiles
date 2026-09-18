# Kiro chat は既定で全ツールを信頼して起動する。
# --trust-tools / --trust-all-tools を明示した場合はその指定を優先する。
# 承認付きで起動したい場合は `command kiro-cli chat` でこのwrapperを迂回できる。
_kiro-cli-chat() {
  local arg
  for arg in "$@"; do
    case "$arg" in
      -a|--trust-all-tools|--trust-tools|--trust-tools=*)
        command kiro-cli chat "$@"
        return
        ;;
    esac
  done

  command kiro-cli chat --trust-all-tools "$@"
}

# claude -w 相当。git worktree を <repo>/.kiro/worktrees/<name> に作って kiro-cli chat を起動する。
# -wr だと chat 終了後に worktree を削除する（未コミットの変更が残っていればスキップ）。
kiro-cli() {
  local rm_on_exit=0
  case "$1" in
    -wr) rm_on_exit=1 ;;
    -w|--worktree) ;;
    chat)
      shift
      _kiro-cli-chat "$@"
      return
      ;;
    -r|--resume|--resume-id|--resume-picker)
      _kiro-cli-chat "$@"
      return
      ;;
    "")
      _kiro-cli-chat
      return
      ;;
    *)
      command kiro-cli "$@"
      return
      ;;
  esac
  shift

  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "kiro-cli -w: gitリポジトリ内で実行してください" >&2
    return 1
  }

  local name="$1"
  [[ -n "$name" ]] && shift
  [[ -z "$name" ]] && name="kiro-$(date +%Y%m%d-%H%M%S)"

  local worktree_path="$repo_root/.kiro/worktrees/$name"

  if [[ ! -d "$worktree_path" ]]; then
    git -C "$repo_root" worktree add -b "$name" "$worktree_path" HEAD || return 1
  fi

  cd "$worktree_path" || return 1
  _kiro-cli-chat "$@"
  local exit_code=$?

  if (( rm_on_exit )); then
    cd "$repo_root" || return $exit_code
    local rm_err
    if rm_err="$(git -C "$repo_root" worktree remove "$worktree_path" 2>&1)"; then
      echo "kiro-cli -w: worktreeを削除しました: $worktree_path" >&2
    else
      echo "kiro-cli -w: 未コミットの変更が残っているためworktreeを削除しませんでした: $worktree_path" >&2
      echo "$rm_err" >&2
    fi
  fi

  return $exit_code
}
