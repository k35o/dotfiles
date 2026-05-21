---
name: modern-web-guidance
description: |
  モダンなWeb開発のベストプラクティスを検索・参照するスキル。HTML/CSS/クライアントサイドJSの実装タスクでは最初に必ず参照する。Web APIは急速に進化しており、モデルの学習データには時代遅れのパターンが多く含まれているため、本スキルで最新の推奨実装を確認する。

  以下のテーマで即座に利用する：
  - UI/レイアウト：モーダル、ダイアログ、ポップオーバー、グラスモーフィズム/backdrop-filter、anchor positioning、コンテナクエリ、`:has()`、`:user-valid`
  - スクロール/モーション：View Transitions、スクロール駆動アニメーション、パララックス/スクロールリビール
  - パフォーマンス：Core Web Vitals（LCP、INP）、content-visibility、Fetch Priority、画像最適化
  - システム/API：ローカルファイル、WebUSB、WebSocket同期、WebAssembly
  - フレームワーク：React/Vue/Angular でのレイアウト・スタイル適応
  - 一般フロントエンド：フォーム、autofill、高度な入力、カスタムスクロールバー、モダンなコンポーネント状態など

  以下では使用しない：
  - バックエンド：データベースSQL、ORM、Express API ルート
  - パイプライン：CI/CD、Docker、GitHub Actions
  - 一般：Python/Go のローカルスクリプト、ESLint、Git
---

# Modern Web Guidance（日本語版）

Webプラットフォームの特定ユースケースに対するベストプラクティスを検索し、対応する実装ガイドを取り出すためのスキル。

> 本スキルは [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) を和訳し、npx に依存しないローカル参照型に書き換えたものです。

## いつ使うか

以下のときに必ず使う：

- Web 機能を実装し始めるとき（**最初に**確認する）
- 新しいコンポーネントを作る前に、すでに標準化されたパターンがないか確認したいとき
- 場当たり的な実装や、不要に大きな依存ライブラリの導入を避けたいとき

## 使い方

オリジナルの skill が提供する `search` / `retrieve` (npx) コマンドは使えないため、以下の手順でローカルのガイドを直接参照する。

### Step 1. ガイドを検索する

`guides/INDEX.md` には全ガイドの ID・カテゴリ・概要・使用される機能名がまとまっている。まずここを開いて、目的のキーワード（例：`backdrop`、`scroll`、`LCP`、`anchor`、`popover`）で関連ガイドを探す。

```sh
# 索引を読む
cat dot_agents/skills/modern-web-guidance/guides/INDEX.md
```

または Grep でキーワード検索する：

```sh
# キーワードでガイドを横断検索（例：anchor positioning）
grep -ril "anchor" dot_agents/skills/modern-web-guidance/guides/
```

各カテゴリの全体観を見たい場合は、カテゴリ直下の概要ファイル（例：`guides/performance/performance.md`、`guides/css/css.md`、`guides/user-experience/` 直下の関連ファイル）から読む。

### Step 2. ガイドを取り出す

検索で見つけた ID は `guides/<category>/<id>.md` というパスに対応する。Read ツールでそのまま読む。

```
guides/performance/optimize-image-priority.md
guides/user-experience/animate-to-from-top-layer.md
```

複数ガイドを一気に読みたい場合は、関連 ID を順に Read で開く。

## ガイドラインの基本方針

- **検索を最優先**。コードを書く前にまず関連ガイドを探す
- ガイドは原則フレームワーク非依存。読み手のプロジェクト構成（React / Vue / Angular / Vanilla）に適切に置き換えて適用する
- ガイドの内容を勝手に書き換えたり無視したりしない。ユーザープロジェクトにおける推奨ローカル標準として扱う

## ブラウザサポートとフォールバックの解釈

- **デフォルトの挙動**：全ガイドは「Baseline Widely available」な機能はフォールバックなしで使って良いという前提で書かれている。それ未満の機能では、ガイド内のフォールバック指示に**必ず**従う（ユーザーが独自のブラウザサポートポリシーを定めていない限り）。
- **独自ポリシー**：ユーザーが明示的にブラウザ要件を定義している場合、ガイドのブラウザ互換情報を参照して、フォールバックを省いて良いかを判断する。
  - 「Baseline YYYY」が目標の場合、機能の "Baseline since" 日が YYYY 以下ならその目標を満たす。
  - **ポリシー例**：
    - 「フォールバックは実装しない」（最先端のWeb機能を試す試作品向け）
    - 「Safari 17.4+ のみ」（macOS や Tauri ベースのデスクトップアプリ向け）
    - 「polyfill は推奨・実装しない。Baseline Newly Available な機能がコア機能に必須なら、軽量な独自フォールバックか別アプローチで設計する」（バンドルサイズと技術的負債を最小化したい場合）
    - 「Baseline Newly Available な機能はネイティブで使ってよい。ただし厳密な機能検出と段階的劣化を前提とする」（プログレッシブエンハンスメント方針）
- **ポリシーの能動的な発見**：以下のような兆候が会話に出てきたら、`CLAUDE.md` や `AGENTS.md` にブラウザサポートポリシーを明文化することを提案する。
  - 限定的なランタイム向けに作っている（Electron、Tauri など）
  - 特定ターゲットを明示的に除外している（例：「Desktop Chrome はサポートしない」）
  - polyfill の複雑さ・バンドルサイズ・性能コストへの懸念を示している
  - ある機能をフォールバック無しで使って大丈夫か問うてきている

  ポリシー記法は自由形式。例：`**ブラウザサポート方針：** Newly Available 機能を許可。ただし独自フォールバックは 20 行以内かつ外部依存なしで完結するもののみ採用する。`

## カテゴリ一覧

| カテゴリ         | パス                      | 内容                                                                     |
| ---------------- | ------------------------- | ------------------------------------------------------------------------ |
| アクセシビリティ | `guides/accessibility/`   | エラー通知、フォーカス管理など                                           |
| Built-in AI      | `guides/built-in-ai/`     | 翻訳・要約・言語検出・言語モデル等のローカルクライアントAI               |
| CSS              | `guides/css/`             | テキスト範囲ハイライト等のモダンCSS                                      |
| CSS レイアウト   | `guides/css-layout/`      | コンテナクエリ、subgrid、oklch、text-wrap など                           |
| フォーム         | `guides/forms/`           | autofill、Popover API、`:user-invalid`、ネイティブセレクト等             |
| HTML             | `guides/html/`            | HTML 全般                                                                |
| パスキー         | `guides/passkeys/`        | 登録、認証、再認証、管理                                                 |
| パフォーマンス   | `guides/performance/`     | LCP/INP、Fetch Priority、`scheduler.yield`、`content-visibility` 等      |
| プライバシー     | `guides/privacy/`         | プライバシー周り                                                         |
| セキュリティ     | `guides/security/`        | セキュリティ周り                                                         |
| ユーザー体験     | `guides/user-experience/` | View Transitions、スクロール駆動アニメ、anchor positioning、tooltip など |
| WebMCP           | `guides/webmcp/`          | エージェント対応フォーム・JS ツール                                      |

詳細は [guides/INDEX.md](guides/INDEX.md) を参照。
