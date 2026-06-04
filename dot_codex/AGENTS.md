# シークレット（fnox）

`NODE_AUTH_TOKEN`（npm / GitHub Packages 認証）などの秘密は環境変数に常駐していない。
秘密が必要なコマンドは fnox MCP の exec ツール経由で実行する。

- 例: exec ツールに `["pnpm", "install"]`
- ターミナルから直接叩く場合: `fnox exec -- <command>`
