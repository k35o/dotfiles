# シークレット（fnox）

`NODE_AUTH_TOKEN`（npm / GitHub Packages 認証）などの秘密は環境変数に常駐していない。
秘密が必要なコマンドは `mcp__fnox__exec` 経由で実行する。

- 例: `mcp__fnox__exec` に `{"command": ["pnpm", "install"]}`
- ターミナルから直接叩く場合: `fnox exec -- <command>`
