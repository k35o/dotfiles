# dotfiles

k8o の macOS 環境設定。[chezmoi](https://www.chezmoi.io/) で管理する。

## 構成

| ディレクトリ / ファイル                                          | 展開先              | 内容                                                                                                                    |
| ---------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `dot_agents/`                                                    | `~/.agents/`        | エージェント向けの資産。スキル集と security-hooks（TypeScript 製フック）                                                |
| `dot_claude/`                                                    | `~/.claude/`        | Claude Code 設定。`settings.json`、`CLAUDE.md`、statusline、セキュリティガイダンス、security-hooks とスキルへの symlink |
| `dot_zshrc` `dot_zshenv` `dot_gitconfig` `dot_npmrc.tmpl`        | `~/`                | シェル・git・npm の設定                                                                                                 |
| `empty_dot_zprofile` `empty_dot_bashrc` `empty_dot_bash_profile` | `~/`                | 空のまま管理する。インストーラが PATH などを書き足すと `chezmoi status` に差分として出る                                |
| `private_dot_ssh/`                                               | `~/.ssh/`           | `config`（github.com で Secure Enclave の鍵を使う）                                                                     |
| `dot_config/`                                                    | `~/.config/`        | mise / fnox / zsh / git / ghostty / cmux / pnpm                                                                         |
| `dot_docker/`                                                    | `~/.docker/`        | compose と buildx のプラグイン（mise の shims へのリンク）と、`config.json` のうち認証情報の保存先だけ                  |
| `dot_local/bin/`                                                 | `~/.local/bin/`     | `dotfiles-check.sh`（更新の件数と、宣言外のインストールの検出）                                                         |
| `dot_local/libexec/`                                             | `~/.local/libexec/` | `gh-auth-token`（pnpm の `tokenHelper` が呼ぶ）                                                                         |
| `private_Library/`                                               | `~/Library/`        | pnpm の設定（`config.yaml` への symlink と空の `auth.ini`）、LaunchAgent、VS Code の設定                                |
| `run_once_*.sh` `run_after_*.sh` `run_onchange_*.sh`             | —                   | `chezmoi apply` 時に実行されるスクリプト                                                                                |

`.chezmoiignore` に載っているファイル（この README、`package.json` などリポジトリ運用専用のファイル）はホームに展開されない。

## 新しいマシンのセットアップ

1. Xcode Command Line Tools を入れる（git のため）。

   ```sh
   xcode-select --install
   ```

2. mise を公式のインストーラで `~/.local/bin` に入れる。中身を確かめてから実行する。以降の更新は `mise self-update`（`ds` に含まれる）。

   ```sh
   curl -fsSL https://mise.run -o /tmp/mise-install.sh
   less /tmp/mise-install.sh
   sh /tmp/mise-install.sh
   ```

3. コミット署名用（`git-signing`）と GitHub への push・取得用（`ssh-auth`）の鍵を Secure Enclave に作り、GitHub に登録する。このリポジトリは private なので、clone より先に済ませる。鍵はチップの外に出せず、使うたびの認証はしない。`ssh-keygen -K` は Secure Enclave の鍵の参照ファイルをまとめて書き出すので、それぞれのディレクトリには自分の名前のものだけを残す。gh はまだ入っていないので、mise で一時的に動かしてログインする:

   ```sh
   sc_auth create-ctk-identity -l git-signing -k p-256-ne -t none
   sc_auth create-ctk-identity -l ssh-auth -k p-256-ne -t none
   for label in git-signing ssh-auth; do
     mkdir -p ~/.local/share/$label && (cd ~/.local/share/$label && ssh-keygen -w /usr/lib/ssh-keychain.dylib -K -N "")   # PIN を聞かれたら空のまま Enter
   done
   gh() { ~/.local/bin/mise exec gh@latest -- gh "$@"; }
   gh auth login -h github.com -p ssh --skip-ssh-key
   gh auth refresh -h github.com -s admin:ssh_signing_key,admin:public_key
   gh ssh-key add ~/.local/share/git-signing/id_ecdsa_sk_rk_git-signing.pub --type signing --title "<マシン名> git-signing"
   gh ssh-key add ~/.local/share/ssh-auth/id_ecdsa_sk_rk_ssh-auth.pub --type authentication --title "<マシン名> ssh-auth"
   gh auth refresh -h github.com -r admin:ssh_signing_key,admin:public_key
   ```

   鍵の証明書は1年で切れる。期限の30日前から dotfiles-check が通知するので、`sc_auth list-ctk-identities` で古い鍵のハッシュを調べて `sc_auth delete-ctk-identity -h <hash>` で消し、同じ手順で作り直す（`gh` の関数と `gh auth login` は要らない。GitHub の古い公開鍵も消す）。

4. chezmoi を SSH で初期化して適用し、グローバルツールを入れる。`~/.ssh/config` は適用するまで無いので、clone に使う鍵を `GIT_SSH_COMMAND` で渡す:

   ```sh
   GIT_SSH_COMMAND='ssh -i ~/.local/share/ssh-auth/id_ecdsa_sk_rk_ssh-auth -o IdentitiesOnly=yes -o SecurityKeyProvider=/usr/lib/ssh-keychain.dylib' \
     ~/.local/bin/mise exec chezmoi@latest -- chezmoi init --apply --ssh k35o/dotfiles
   mise install
   ```

5. fnox の age 秘密鍵を macOS キーチェーンに登録する（シークレット復号に必須）。`-T ""` を付けて、どのアプリにも確認なしの読み取りを許さない:

   ```sh
   security add-generic-password -s fnox -a age-key -T "" -w '<tier1 の AGE-SECRET-KEY>'
   security add-generic-password -s fnox -a age-key-bot -T "" -w '<tier2 の AGE-SECRET-KEY>'
   ```

   fnox が初めて読むときにキーチェーンの確認が出る。`age-key` は「常に許可」、`age-key-bot` は「許可」を選ぶ。`age-key-bot` で「常に許可」を選ぶと、tier2 を分けた意味がなくなる。mise で fnox を更新するとパスが変わるので、`age-key` の確認がもう一度出る。

   鍵をファイル（`age.txt`）として置かない。万一生成されても `.chezmoiignore` が commit を防ぐ。

## シークレット管理（fnox）

秘密は [fnox](https://github.com/jdx/fnox) で管理し、シェルには常駐させない。CLI のログイン状態（トークンを平文で持つファイル）も残さない。

|       | profile                                       | 復号に使う鍵                                  | 使い方                                                                  |
| ----- | --------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| tier1 | サービスごと（`cloudflare` `vercel` `turso`） | `age-key`（fnox だけが確認なしで読める）      | `wrangler` `vercel` `turso` の zsh 関数が実行時にそのサービスの分を渡す |
| tier2 | `bot`（GitHub App 秘密鍵）                    | `age-key-bot`（読むたびにキーチェーンの確認） | `fnox exec -P bot -- <command>`                                         |

- 秘密の追加は、このリポジトリの設定に直接書き込んで PR で入れる: `fnox -c dot_config/fnox/config.toml set -P <profile> <NAME> --provider age`（tier2 は `--provider age-bot`）
- プロジェクトのスクリプト経由で CLI を動かすときは zsh 関数を通らないので、`fnox exec -P cloudflare -- pnpm run deploy` のように包む
- 1年以上書き換えていない秘密は、点検が「秘密の入れ替え」として知らせる（fnox の設定の git 履歴で判断する）。期限のない Turso のトークンや GitHub App の鍵を、発行し直すきっかけにする
- npm・pnpm のレジストリにはトークンを保存しない。GitHub Packages は `~/.npmrc` の `tokenHelper` が、そのつど gh のトークンを渡す。pnpm の `auth.ini` は空のまま管理し、`pnpm login` などで平文のトークンが書き込まれたら点検で気づく

## この Mac だけの git 設定

`~/.gitconfig` の末尾で `~/.config/git/local.inc` を読む。このファイルは chezmoi の管理外で、無ければ git は無視する。この Mac 固有の設定はここに書く。

## コンテナ

コンテナは、mise で入れた colima が lima の VM の中で docker エンジンを動かす。使う前に VM を起動する:

```sh
colima start
```

## 他人のリポジトリ

`~/oss` の下の他人のリポジトリでは、Claude Code のサンドボックスを有効にする。エージェントの shell が書き込める場所と通信先を OS のレベルで絞り、リポジトリに仕込まれた指示で外に持ち出されるのを防ぐ。設定はリポジトリごとの `.claude/settings.local.json`（git には入らない）:

```json
{ "sandbox": { "enabled": true } }
```

## 更新の仕組み

- `ds` エイリアスで、mise 自身と Claude Code を更新し、リポジトリを pull して適用し、宣言どおりにツールを入れ、使われなくなったバージョンを消す。colima が動いていれば、VM の中の docker エンジンも更新する
- LaunchAgent `io.github.k35o.dotfiles-check` が1時間ごとに `dotfiles-check.sh check` を実行する
  - upstream との差分コミット数を `~/.cache/dotfiles-notify/count` にキャッシュし、zsh のプロンプトと Claude Code の statusline に `dotfiles ⇣N` として表示する
  - 宣言と手元のずれ（chezmoi ソースの rebase 詰まりや未 push のコミット、未反映の差分、mise の宣言外のものと判断していない backend、管理外のインストール先、Secure Enclave の鍵の有無と期限、1年以上書き換えていない秘密、`~/oss` でサンドボックスが無効なリポジトリ）を点検し、種類が変わったときに macOS の通知を出す。内訳は `dotfiles-check.sh doctor`
- chezmoi のソース（`~/.local/share/chezmoi`）では直接コミットしない。変更は開発用の clone から PR で入れる

### mise の外にあるもの

Homebrew は使わない。mise で入れられないものは配布元から直接入れ、次の表のとおりに更新する。

| もの        | 入れ方と更新                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------- |
| git         | Xcode Command Line Tools。ソフトウェアアップデートで更新される                                  |
| Claude Code | 公式インストーラ（`run_once_install-claude-code.sh`）で入れ、`ds` の `claude update` で更新する |
| Mac アプリ  | 配布元から入れ、アプリ自身の自動更新に任せる。何を入れるかは端末ごとに決める                    |

## 開発

```sh
pnpm install
pnpm check        # lint + format (vite-plus)
cd dot_agents/security-hooks && bun test
```

CI（PR 時）: `pnpm check` / security-hooks の `bun test` / shellcheck / zizmor / `chezmoi apply --dry-run`。

## License

[MIT](./LICENSE)
