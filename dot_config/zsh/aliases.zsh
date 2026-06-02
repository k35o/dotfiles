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
