---
name: agent-browser
description: agent-browser（Rust製ヘッドレスブラウザCLI）を使ったブラウザ自動化。Webページの操作、スクレイピング、フォーム入力、スクリーンショット取得、E2Eテスト的な操作を行うときに使用する。
---

# agent-browser

mise で入れてある。コマンドは記憶に頼らず、最初に CLI に同梱されたガイドを読む。CLI と同じ版なので、書き方が変わっても食い違わない。

```bash
agent-browser skills get core          # 基本の流れ（snapshot と @ref、操作、待機、スクリーンショット）
agent-browser skills get core --full   # 全コマンドのリファレンスとテンプレート
agent-browser skills list              # Electron・dogfood など用途別のガイド
```

## Claude Code での注意

core は最初に `export AGENT_BROWSER_SESSION=...` で専用のセッションを決めるよう求めるが、Bash の呼び出しをまたぐと環境変数は消える。毎回のコマンドに `--session` を付ける。ID は worktree ごとに同じ値になるので、そのつど作り直してよい:

```bash
agent-browser --session "$(agent-browser session id --scope worktree --prefix task)" open <url>
```
