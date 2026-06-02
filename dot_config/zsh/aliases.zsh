alias ds='chezmoi update --apply'

if [[ -z "$CLAUDECODE" && -x "$HOME/.local/bin/dotfiles-check.sh" ]]; then
  ("$HOME/.local/bin/dotfiles-check.sh" refresh-if-stale &>/dev/null &) 2>/dev/null
fi

# --- activation (opt-in) ---------------------------------------------------
# シェル起動は軽量に保つ方針。必要なときに手動で有効化する。

# mise: ディレクトリ単位の env / ツール切り替えを有効化する。
mise-activate() {
  eval "$(MISE_OFFLINE=1 mise activate zsh)"
}

# fnox: keychain の age 秘密鍵を FNOX_AGE_KEY に注入し、age 暗号化された
# 環境変数の自動ロードを有効化する。
fnox-activate() {
  export FNOX_AGE_KEY="$(security find-generic-password -s fnox -a age-key -w 2>/dev/null)"
  eval "$(fnox activate zsh)"
}
