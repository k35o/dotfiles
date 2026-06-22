alias ds='chezmoi update --apply'

if [[ -z "$CLAUDECODE" && -x "$HOME/.local/bin/dotfiles-check.sh" ]]; then
  ("$HOME/.local/bin/dotfiles-check.sh" refresh-if-stale &>/dev/null &) 2>/dev/null
fi

mise-activate() {
  eval "$(MISE_OFFLINE=1 mise activate zsh)"
}

fnox-activate() {
  export FNOX_AGE_KEY="$(security find-generic-password -s fnox -a age-key -w 2>/dev/null)"
  eval "$(fnox activate zsh)"
}

# codex は Sakana プロバイダの SAKANA_API_KEY(fnox 管理) を必要とする。
# 秘密はシェルに常駐させず、fnox 経由で codex プロセスにだけ都度注入して起動する
# （CLAUDE.md の「fnox exec -- <command>」方針）。fnox は PATH 上の実体を exec するため再帰しない。
codex() {
  fnox exec -- codex "$@"
}
