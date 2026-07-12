# dotfiles

k8o の macOS 環境設定。[chezmoi](https://www.chezmoi.io/) で管理する。

## 構成

| ディレクトリ / ファイル          | 展開先          | 内容                                                                                            |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `dot_agents/`                    | `~/.agents/`    | Claude Code / Codex 共有の資産。スキル集と security-hooks（TypeScript 製フック）                |
| `dot_claude/`                    | `~/.claude/`    | Claude Code 設定。`settings.json`、`CLAUDE.md`、statusline、security-hooks とスキルへの symlink |
| `dot_codex/`                     | `~/.codex/`     | Codex CLI 設定。`config.toml`（テンプレート）、`AGENTS.md`、プロファイル別設定                  |
| `dot_config/`                    | `~/.config/`    | mise / fnox / zsh / ghostty / starship / pnpm                                                   |
| `dot_local/bin/`                 | `~/.local/bin/` | `dotfiles-check.sh`（更新通知キャッシュの維持）                                                 |
| `run_once_*.sh` `run_after_*.sh` | —               | `chezmoi apply` 時に実行されるスクリプト                                                        |

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

## 更新の仕組み

- `ds` エイリアス = `chezmoi update --apply`（リポジトリを pull して適用）
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
