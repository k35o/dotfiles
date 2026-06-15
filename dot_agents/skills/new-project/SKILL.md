---
name: new-project
description: 新しい k8o プロジェクト/リポジトリを立ち上げる一連の手順。@k8o/create で雛形生成 → GitHub リポジトリ作成 → ブランチ保護 ruleset とマージ設定 → リリース用 secret(fnox経由) → npm 初回 publish と Renovate 有効化まで。「新しい repo を作る」「プロジェクトを立ち上げる」「リポジトリの初期設定をする」ときに使用する。
---

# new-project — k8o リポジトリ立ち上げ手順

`@k8o/create`（Vite+ ジェネレーター, repo: [k35o/templates](https://github.com/k35o/templates)）で雛形を作り、GitHub リポジトリを @k8o 標準（ブランチ保護・リリース・Renovate）で立ち上げる runbook。`<name>` は scope を除いたパッケージ名（例: `@k8o/foo` → `foo`）。

## 1. 雛形生成

`vp create @k8o` / `pnpm create @k8o` / `npm create @k8o` はどれも同一 bin を実行する（3 入口とも有効）。

```sh
vp create @k8o            # 対話: library / web を選び、パッケージ名 @k8o/foo を入力
# 非対話:
vp create @k8o -- --kind library --name @k8o/foo --description "..." --directory ./foo
```

- `kind=library`: 単一 TS ライブラリ（`vp pack`）。`kind=web`: React monorepo（`packages/<name>` + `apps/playground`, @k8o/arte-odyssey 利用）。
- ⚠️ 自分のマシンは `minimumReleaseAge`(7日) のため、@k8o/create の **当日公開版は約7日間ローカルで引けない**（古いキャッシュを掴む）。即使うなら一時的に `npm_config_before=` を解除して実行。

## 2. ローカル初期化

```sh
cd foo
mise trust
pnpm install
git init -b main && git add -A
git commit -m "feat: ..."   # 署名コミット (ruleset で必須)
```

## 3. GitHub リポジトリ作成

```sh
gh repo create k35o/<name> --public --source=. --remote=origin --push \
  --description "..."
```

## 4. マージ設定（merge commit のみ + マージ後ブランチ削除）

```sh
gh api repos/k35o/<name> -X PATCH \
  -F allow_squash_merge=false -F allow_rebase_merge=false -F delete_branch_on_merge=true
```

## 5. ブランチ保護 ruleset（main）

oxc-config 流: 削除/force-push 禁止・署名必須・PR 必須(承認1 / CODEOWNERS / merge のみ)・CI green 必須・Admin は bypass。

```sh
gh api repos/k35o/<name>/rulesets -X POST --input - <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_signatures" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": true,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge"]
    } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "Lint / Format / Types" },
          { "context": "Tests" },
          { "context": "Changeset" }
        ]
    } }
  ],
  "bypass_actors": [ { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" } ]
}
JSON
```

- `required_status_checks` の `context` は **ci.yml の job `name:` と完全一致**させる。library 雛形は `Lint / Format / Types` / `Tests` / `Changeset`、web 雛形は `Build / Lint / Types` / `Tests` / `Changeset`。
- CI ゲートが不要なら `required_status_checks` ルールを省く（oxc-config の初期はこれ）。

## 6. リリース用 secret（GitHub App token, fnox 経由）

release.yml は `client-id`（`app-id` は legacy）+ private-key を使う。secret は **repo ごと**に必要。値は fnox にグローバル登録済み（`K35O_BOT_CLIENT_ID` / `K35O_BOT_PRIVATE_KEY`）。

```sh
fnox exec -- gh secret set K35O_BOT_CLIENT_ID   -R k35o/<name> --body "$K35O_BOT_CLIENT_ID"
fnox exec -- gh secret set K35O_BOT_PRIVATE_KEY -R k35o/<name> --body "$K35O_BOT_PRIVATE_KEY"
```

- ⚠️ Claude の **fnox MCP サーバは起動時スナップショット**で、後から `fnox set` した値を見えないことがある（空値が入る）。その場合は Bash の `fnox exec`(CLI は都度読込) か、非機密の値は直接 `gh secret set` で。

## 7. npm 公開（trusted publishing / OIDC）

- CI は OIDC trusted publishing（`NPM_TOKEN` 不要・provenance 付き）。npmjs.com で対象パッケージの **trusted publisher** を `k35o/<name>` の release workflow に設定する。
- ⚠️ **新規パッケージ名の初回は OIDC でブートストラップ不可**（`PUT ... 404`）。初回だけ:
  - npmjs で trusted publisher を事前登録できれば CI で初回 publish、または
  - **手動初回 publish** で名前を取得（要 `npm login`・2FA OTP。ローカルは provenance 不可なので無効化）:
    ```sh
    npm_config_provenance=false pnpm publish --access public --no-git-checks
    ```
- 以降は `pnpm changeset` → main マージ → Release ワークフローが自動 publish。

## 8. Renovate 有効化

- renovate.json は雛形に同梱（`github>k35o/renovate-config` を extends）。
- Renovate は **Mend のホスト GitHub App**（自前 runner なし）。新規 repo を App のアクセス対象に追加する:
  - https://github.com/settings/installations → **Renovate** → Configure → リポジトリに `k35o/<name>` を追加。
  - インストールが "All repositories" なら自動でオンボード（Dependency Dashboard issue が立つ）。

## ハマりどころ（学習済み）

- **生 TS の bin は node_modules 配下で動かない**（`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`）。CLI/ジェネレーター系パッケージは必ず `vp pack` で JS にビルドし `dist/*.mjs` を `bin` にする（@k8o/create 対応済み）。
- `minimumReleaseAge`(7日) で自分の当日公開版がローカルで引けない。
- ruleset で署名コミット必須 → `git config commit.gpgsign true` 等を確認（詰まったら Admin bypass）。
