---
name: modern-web-guidance
description: |
  モダンなWeb開発のベストプラクティスを検索・参照するスキル。HTML/CSS/クライアントサイドJSの実装タスクでは最初に必ず参照する。Web APIは急速に進化しており、モデルの学習データには時代遅れのパターンが多く含まれているため、本スキルで最新の推奨実装を確認する。

  以下のテーマで即座に利用する：
  - UI/レイアウト：モーダル、ダイアログ、ポップオーバー、テーブル、ダークモード、anchor positioning、コンテナクエリ、`:has()`
  - スクロール/モーション：View Transitions、スクロール駆動アニメーション、パララックス/スクロールリビール
  - パフォーマンス：Core Web Vitals（LCP、INP）、content-visibility、Fetch Priority、画像最適化
  - システム/API：セキュリティ、パスキー、HTMLのサニタイズ、Web Components、日付・タイムゾーン、Built-in AI、WebAssembly
  - フレームワーク：React/Vue/Angular の中で使う標準のHTML/CSS/DOM
  - 一般フロントエンド：フォーム、バリデーション（`:user-valid`）、autofill、アクセシビリティ、カスタムセレクト、スクロールバー

  以下では使用しない：
  - バックエンド：SQL、ORM、API ルート
  - インフラ/スクリプト：CI/CD、Docker、GitHub Actions、Python/Go、Git
  - ツール/些細な作業：Vite、tsconfig、ESLint、テスト、コピーや名前の変更、サードパーティのドキュメント
---

# Modern Web Guidance

[GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) のガイド集。mise で `npm:modern-web-guidance` として入れてあり、ガイドと検索用のモデルを同梱しているので、検索も取り出しも手元で完結する。

上流の手順は `npx -y modern-web-guidance@latest` で呼ぶが、`npx` は deny にしてあるので、入れてある CLI を直接呼ぶ。`DISABLE_TELEMETRY=1` は、使用状況を Google に送らないために毎回付ける。

## 1. 検索する

Web の UI、CSS のレイアウトやアニメーション、クライアントサイドの JS を書く前（UX の不具合を直すときも含む）に検索する。

英語2〜5語で、1つの機能か UI パターンを「動詞＋対象」で書く。フレームワーク名やアプリ固有の名前は入れず、複数の機能にまたがるときは分けて検索する（`"light dismiss dialog"` はよい。`"dialog"` は短すぎ、`"responsive table dark mode"` は2回に分ける）。

```bash
DISABLE_TELEMETRY=1 modern-web-guidance search "light dismiss dialog"
```

結果は `similarity` の数値ではなく `description` で判断する。合うものが無いときは `list` で一度だけ全体を見て、それでも無ければガイドなしで進める。

## 2. 取り出す

合った ID と、関係する分野の総論（`html`・`css`・`forms`・`accessibility`・`performance`・`security` など）をカンマ区切りでまとめて取る。出力が切れたら、ファイルに書き出してから読む。

```bash
DISABLE_TELEMETRY=1 modern-web-guidance retrieve "light-dismiss-a-dialog,html"
```

ガイドはフレームワークに依存しない書き方なので、プロジェクトの構成に合わせて読み替える。書き終えたら、取り出したガイドのパターンとフォールバックを守れているかを見直す。

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
