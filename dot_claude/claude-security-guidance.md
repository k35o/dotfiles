# k8o のセキュリティガイダンス

このファイルは、Claude Code / Codex CLI のセキュリティフック（`~/.claude/security-hooks/`,
`~/.codex/security-hooks/`）と、`/security-review`・`code-review` skill・Codex レビュアー
（`codex-reviewer` skill）から参照される共通の脅威モデル。

レビュアーは「問題を見つけること」だけを役割とする。書いた本人ではなく、別プロセスの
Codex セッションが fresh context で読む前提。

---

## スタックと前提

- TypeScript（strict 前提）、React / Next.js（App Router / RSC / Server Actions）
- ランタイムは Node.js（Edge 含む）
- pnpm、oxc-config 系のツールチェイン
- ライト UI 重視、Server Action と API Route が主な攻撃面

## 高優先で見るべき場所

- `app/**/actions.ts`、`*.action.ts`：Server Action のエントリ
- `app/api/**/route.ts`：API ルートハンドラ
- `middleware.ts`：全リクエストに乗るのでミスると影響範囲が広い
- `.github/workflows/**`：リポジトリ全体の CI 権限に効く
- `next.config.*`：`images.remotePatterns`・`headers()`・`rewrites()`
- `auth.ts` / 認証コールバック実装

---

## ハードルール（違反は必ず指摘）

### シークレットと設定

- `.env*` を含む変更は指摘する（コミット禁止）
- `NEXT_PUBLIC_*` はクライアントに出る。秘密値・API キー・PII を絶対に置かない
- トークン比較は `crypto.timingSafeEqual` などの定数時間比較。`===` は不可
- ハードコードされた API キー（`sk_live_`、`AKIA`、Slack `xoxb-` など）禁止

### 入力検証

- Server Action と API ルートのエントリで、業務ロジックより前に zod 等のスキーマ検証を通す
- ユーザー入力をファイルパスに使うとき、`path.relative` でディレクトリエスケープ（`..`）が
  ないか確認
- SQL は必ずパラメタライズドクエリ／プリペアドステートメント／ORM 経由。文字列連結禁止
- shell コマンド：`child_process.exec`/`execSync` でユーザー入力を渡さない。`execFile`/
  `spawn` に引数配列で渡す形にする

### 認可

- Server Action と API ルートはエントリで `auth()`／セッション取得を明示的に呼ぶ
- リソース所有チェック（IDOR 防止）：ID から引いたレコードが「ログインユーザーのものか」
  を都度確認する
- 管理者専用のパスは `requireRole("admin")` 等のチェックを必ず通す

### DOM / React

- `dangerouslySetInnerHTML` は禁止。例外は DOMPurify などで明示的に sanitize した HTML のみ
- `.innerHTML =`、`document.write` 禁止
- `<a href={...}>` にユーザー入力 URL を渡す場合は `javascript:` スキームを弾く
- `eval`、`new Function(...)` 禁止

### 暗号

- 自前暗号は書かない。`crypto.subtle`、`node:crypto` を使う
- セキュリティ目的の乱数は `crypto.randomUUID()` / `crypto.getRandomValues()`。
  `Math.random()` は不可
- 認証トークンの localStorage 保存禁止（XSS で抜かれる）。httpOnly Cookie を使う

### ログ

- 以下を INFO 以上で出さない：パスワード、トークン、JWT、フルクレカ番号、認証エンドポイント
  のリクエストボディ全体、メールアドレス（PII 扱い）

### GitHub Actions

- `permissions:` ブロックが最小権限になっているか（デフォルトは read のみ）
- `pull_request_target` は信頼境界をまたぐので、PR コードの checkout・実行は禁止
- `${{ github.event.* }}` をシェルに直接埋め込まない（コマンドインジェクション）

---

## ソフトガイドライン（人間レビューに回す）

- 500 行を超えるファイルはセキュリティ問題が紛れやすい。リファクタ提案を添える
- 認証・入力処理での `@ts-expect-error` / `@ts-ignore` はバイパスの匂い。理由がないなら指摘
- セキュリティ関連のパスで `try { ... } catch { /* 黙殺 */ }` パターン
- 依存追加：ランタイム依存を増やす変更は justification を求める。standard library で済む
  ものを優先

---

## スコープ外（指摘しない）

- セキュリティに関係しないコード品質
- 整形・スタイル
- パフォーマンス（DoS につながる場合を除く）
- テストの不足（別のレビューに任せる）

---

## レビュアー出力フォーマット

レビュー結果は以下の形式で出す。問題なければ「No issues found.」のみ。

```
[Severity: HIGH|MEDIUM|LOW] <一行サマリ>
File: <path>:<line>
Rule: <該当するハードルール名 or ガイドライン名>
Why: <なぜ問題か、攻撃シナリオ 1 文>
Fix: <具体的な修正方針 1-2 文>
```

False positive が疑わしい場合は LOW にして「Confidence: low」を併記する。
