alias ds='mise self-update --yes && claude update && chezmoi update --apply && mise install && mise prune --tools --yes && { ! colima status &>/dev/null || colima update; }'
# npm パッケージをネットワークと書き込みを許可しない deno のサンドボックスで動かすため、mise ではなく deno run で起動する
alias ccusage='deno run -E -R -S=homedir npm:ccusage@20.0.43 --offline'

mise-activate() {
  eval "$(MISE_OFFLINE=1 mise activate zsh)"
}

fnox-activate() {
  eval "$(fnox activate zsh)"
}

# トークンをシェルに常駐させず、CLI を実行するときだけそのサービスの分を渡す
wrangler() { fnox exec -P cloudflare -- command wrangler "$@"; }
vercel() { fnox exec -P vercel -- command vercel "$@"; }
turso() { fnox exec -P turso -- command turso "$@"; }
