# dotfiles

k8o の macOS 環境設定。[chezmoi](https://www.chezmoi.io/) で管理する。

## 構成

| ディレクトリ / ファイル                              | 展開先                           | 内容                                                                                                                |
| ---------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `dot_agents/`                                        | `~/.agents/`                     | エージェント向けの資産。スキル集と security-hooks（TypeScript 製フック）                                            |
| `dot_claude/`                                        | `~/.claude/`                     | Claude Code 設定。`settings.json`、`CLAUDE.md`、statusline、スラッシュコマンド、security-hooks とスキルへの symlink |
| `dot_kiro/`                                          | `~/.kiro/`                       | Kiro CLI のグローバル設定。`settings/cli.json`をprivate JSONとして全面管理                                          |
| `dot_config/`                                        | `~/.config/`                     | mise / fnox / zsh / ghostty / starship / pnpm                                                                       |
| `dot_local/bin/`                                     | `~/.local/bin/`                  | `dotfiles-check.sh`（更新通知キャッシュの維持）                                                                     |
| `dot_local/share/capslock-awake/`                    | `~/.local/share/capslock-awake/` | CapsLock でスリープを抑止する常駐プロセスのソース                                                                   |
| `private_Library/`                                   | `~/Library/`                     | pnpm の設定への symlink、LaunchAgent                                                                                |
| `run_once_*.sh` `run_after_*.sh` `run_onchange_*.sh` | —                                | `chezmoi apply` 時に実行されるスクリプト                                                                            |

`.chezmoiignore` に載っているファイル（この README、`package.json` などリポジトリ運用専用のファイル）はホームに展開されない。

## 新しいマシンのセットアップ

1. Homebrew を入れて、chezmoi と mise を導入する。

   ```sh
   brew install chezmoi mise
   ```

2. chezmoi を初期化し、マシンのプロファイルを設定する。

   ```sh
   chezmoi init k35o/dotfiles
   ```

   `~/.config/chezmoi/chezmoi.toml` を作成する（`profile` はテンプレートの分岐に使う。個人機は `personal`）:

   ```toml
   [data]
   profile = "personal"
   ```

3. 適用してグローバルツールを入れる。

   ```sh
   chezmoi apply
   mise install
   ```

4. fnox の age 秘密鍵を macOS キーチェーンに登録する（シークレット復号に必須）:

   ```sh
   security add-generic-password -s fnox -a age-key -w '<AGE-SECRET-KEY>'
   ```

   鍵をファイル（`age.txt`）として置かない。万一生成されても `.chezmoiignore` が commit を防ぐ。

5. zsh の起動ファイル（`~/.zshrc` など）は現状 chezmoi 管理外。`~/.zshrc` に以下を追記して管理下の設定を読み込む:

   ```sh
   source ~/.config/zsh/aliases.zsh
   ```

## シークレット管理（fnox）

秘密は [fnox](https://github.com/jdx/fnox) で管理し、エージェントのシェルには常駐させない。

- tier1（`[secrets]`: 日常使う API キー）: `fnox exec -- <command>`。個人機の対話シェルでは起動時に自動ロードされる
- tier2（`[profiles.bot]`: GitHub App 秘密鍵などの機密）: `fnox exec -P bot -- <command>`

age の identity はキーチェーン（service `fnox` / account `age-key`）から `fnox-activate` が読み出す。

## CapsLock でスリープ抑止

CapsLock をオンにしている間、蓋を閉じても Mac がスリープしない。オフにすると通常のスリープに戻る。CapsLock の LED が抑止中の目印になる。

- LaunchAgent `io.github.k35o.capslock-awake` がログイン時に起動し、CapsLock の状態に合わせて `pmset -a disablesleep` を切り替える
- `pmset` の実行には root 権限が要るため、`chezmoi apply` が `/etc/sudoers.d/capslock-awake` を設置する（設置時にパスワードを求められる）。パスワードなしで許可するのは `/usr/bin/pmset -a disablesleep 0` と `/usr/bin/pmset -a disablesleep 1` だけ
- ビルドに `swiftc`（Xcode Command Line Tools）を使う
- CapsLock をスリープ抑止の専用スイッチにするため、キー入力から大文字化の効果を取り除く。これにはアクセシビリティの許可が要る

アクセシビリティの許可は「システム設定 > プライバシーとセキュリティ > アクセシビリティ」で `capslock-awake` を有効にする。ビルドし直すと許可が外れるので、`main.swift` が変わったあとは一度オフにしてからオンに戻す。許可がない間もスリープ抑止は動き、大文字化だけが残る。

パスワード欄などセキュア入力の間はキー入力に割り込めないため、CapsLock がオンだと大文字になる。

抑止中は発熱とバッテリー消費が増える。オンのままカバンに入れない。

スリープ抑止が解除されなくなったときは手動で戻す:

```sh
sudo pmset -a disablesleep 0
```

`pmset` の失敗は統合ログに残る（zsh の組み込み `log` と衝突するためフルパスで呼ぶ）:

```sh
/usr/bin/log show --last 1h --predicate 'subsystem == "io.github.k35o.capslock-awake"'
```

## 更新の仕組み

- `ds` エイリアス = `chezmoi update --apply && mise install`（リポジトリを pull して適用し、更新されたツールを入れる）
- `dotfiles-check.sh` が1時間ごとに upstream との差分コミット数を `~/.cache/dotfiles-notify/count` にキャッシュし、starship のプロンプトと Claude Code の statusline に `dotfiles ⇣N` として表示される

## 開発

```sh
pnpm install
pnpm check        # lint + format (vite-plus)
cd dot_agents/security-hooks && bun test
```

CI（PR 時）: `pnpm check` / security-hooks の `bun test` / shellcheck / zizmor / `chezmoi apply --dry-run`。

## License

[MIT](./LICENSE)
