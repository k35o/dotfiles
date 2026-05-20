alias nf='nano $(fzf)'
alias ds='chezmoi update --apply'

if [[ -z "$CLAUDECODE" && -x "$HOME/.local/bin/dotfiles-check.sh" ]]; then
  ("$HOME/.local/bin/dotfiles-check.sh" refresh-if-stale &>/dev/null &) 2>/dev/null
fi
