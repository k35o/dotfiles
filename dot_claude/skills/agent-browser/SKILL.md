---
name: agent-browser
description: ブラウザを自動で操作するときに使う。Webページの操作、スクレイピング、フォーム入力、スクリーンショットの取得、E2Eテストのような確認をagent-browser（Rust製のヘッドレスブラウザCLI）で行う。「画面を確認して」「スクショを撮って」と言われたときにも使う。
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
