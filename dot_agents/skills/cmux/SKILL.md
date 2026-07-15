---
name: cmux
description: cmuxターミナル内での操作スキル。CMUX_*環境変数が存在する場合、cmuxのCLIコマンドを使う前に必ずこのスキルを読む。ペイン分割、コマンド送信、ブラウザ自動化、通知、Markdown/diffのプレビュー、cmux設定の変更など、cmux操作全般で使用する。「別ペインで開いて」「横に表示して」「ブラウザで確認して」「プレビューして」「diffを見せて」などのときにも使用する。
---

# cmux

cmuxはAIコーディングエージェント向けのmacOSネイティブターミナル。`CMUX_SOCKET_PATH`か`CMUX_WORKSPACE_ID`が設定されていればcmux内で実行中。CLIはcmuxが自セッションのPATHに自動で通している。

## 基本

```bash
cmux identify --json    # 現在の位置（window, workspace, pane, surface）
cmux tree               # トポロジー全体
cmux capabilities       # このバージョンで使える機能
```

**階層:** Window → Workspace（サイドバータブ） → Pane（分割） → Surface（ペイン内のタブ。ターミナル/ブラウザ）

**Ref形式:** `workspace:2`, `pane:1`, `surface:7`（UUIDより優先して使う）。フラグ省略時は`CMUX_WORKSPACE_ID` / `CMUX_SURFACE_ID`（＝呼び出し元）がデフォルトになる。

## ユーザーを邪魔しない

ユーザーは別のworkspaceや別アプリを見ていることがある。フォーカスを奪う操作はクリックと同等のユーザー操作なので、明示的に頼まれない限り呼ばない: `select-workspace` / `focus-pane` / `focus-panel`。

レイアウトは1コマンドで完結させ、`--focus false`が使えるコマンドでは必ず付ける:

```bash
# ペイン作成と中身の指定を1回で行う（作ってから移動・フォーカスの連鎖をしない）
cmux new-pane --type terminal --direction down --focus false
cmux new-pane --type browser --direction right --url http://localhost:3000 --focus false

# 既に補助ペインがあるなら、ペインを増やさずそこにsurfaceを足す
cmux list-panes --json
cmux new-surface --pane pane:2 --type terminal --focus false
```

補助的な出力（プレビュー、ログ、一時シェル）は呼び出し元の右隣の補助ペイン1つに集約し、繰り返しの「開いて」はそのペインのタブとして追加する。

## コマンド送信と画面の読み取り

長時間タスクやサブエージェントの隔離実行に使う。数秒で終わるコマンドには不要。

```bash
cmux send --surface surface:5 "command\n"          # \nで実行される
cmux send-key --surface surface:5 <key>
cmux read-screen --surface surface:5 --lines 50    # --scrollbackで履歴も読む
```

## ブラウザ自動化

**基本フロー:** open → `get url`で確認 → wait → snapshot（ref取得） → refで操作 → 再snapshot

```bash
cmux --json browser open https://example.com    # 返ってきたsurface refを以後使う
cmux browser surface:7 get url                  # 空/about:blankならwaitせず先にnavigate
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 snapshot --interactive   # 常に--interactiveでelement refを取得

cmux browser surface:7 click e2 --snapshot-after
cmux browser surface:7 fill e3 "text"           # 空文字でクリア
cmux browser surface:7 select e7 "value"
cmux browser surface:7 press Enter

cmux browser surface:7 wait --selector "#loaded" --timeout-ms 10000
cmux browser surface:7 wait --text "Success"
cmux browser surface:7 wait --url-contains "/dashboard"

cmux browser surface:7 get text e3
cmux browser surface:7 eval 'document.title'
cmux browser surface:7 screenshot --out shot.png
```

- ナビゲーションやDOM変化の後はrefが無効になるので再snapshotする。CSSセレクタではなくelement refを使う。
- `snapshot --interactive`や`eval`が`js_error`を返すページでは`get text body` / `get html body`にフォールバックする。
- WKWebViewベースなのでviewport偽装・ネットワークモック・トレース記録は`not_supported`。高レベルコマンド（click/fill/wait/snapshot）で代替する。

## Markdownプレビュー

計画やレポートをターミナル横に整形表示する。ファイル変更で自動再描画されるため、進捗を追記していく使い方ができる。

```bash
cmux markdown open plan.md
```

## Diffビューア

git diffやパッチを専用ビューアのペインで開く。ユーザーは変更行にレビューコメントを付けてTextBox経由でエージェントに渡せるので、変更を見せてフィードバックをもらう場面で使う。

```bash
cmux diff                      # リポジトリのdiffを開く（ベースはスマート推定）
git diff main... | cmux diff   # 任意のパッチをstdinから渡す
cmux diff --layout split       # unified | split
```

## 通知とサイドバー

| 用途                               | コマンド                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| cmux内の通知（ペインリング）       | `cmux notify --title "T" --body "B"`                     |
| システム通知（他アプリにいるとき） | `osascript -e 'display notification "B" with title "T"'` |
| 注意を引くフラッシュ               | `cmux trigger-flash --surface surface:7`                 |

長時間タスクではサイドバーに進捗を出せる:

```bash
cmux set-status build "compiling" --color "#5eead4"
cmux set-progress 0.4 --label "3/7 done"
cmux log --level info -- "step 3 finished"
cmux clear-status build && cmux clear-progress
```

## 設定

- ターミナル描画（フォント・配色・scrollback・透過）: `~/.config/ghostty/config`
- cmux本体（サイドバー・通知・ブラウザ・ショートカット・ペイン枠色）: `~/.config/cmux/cmux.json`（JSONC可）
- どちらもchezmoi管理（dotfilesの`dot_config/ghostty/config`と`dot_config/cmux/cmux.json`）。`~/.config`を直接編集するとchezmoi applyで戻るので、dotfiles側を編集して適用する。
- 適用は保存で自動反映される（`cmux reload-config`でも両方を再読込できる）。アプリの再起動は不要。
- スキーマURLと設定ドキュメントは`cmux docs settings`が出力する。
