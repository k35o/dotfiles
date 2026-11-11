---
name: modern-web-guidance
description: HTML、CSS、クライアントサイドJSでWebのUIを実装する、直すときに最初に使う。モーダルやポップオーバー、レイアウト、ダークモード、View Transitionsやスクロールアニメーション、Core Web Vitals、フォームとバリデーション、アクセシビリティ、パスキーなどで、学習データの古いパターンではなく最新の推奨実装を確かめる。React内で使う標準のHTML、CSS、DOMも対象。バックエンド、インフラ、ビルドツールの設定、テストには使わない。
---

# Modern Web Guidance

[GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) のガイド集。mise で `npm:modern-web-guidance` として入れてあり、ガイドと検索用のモデルを同梱しているので、検索も取り出しも手元で完結する。

上流の手順は `npx -y modern-web-guidance@latest` で呼ぶが、`npx` は deny にしてあるので、入れてある CLI を直接呼ぶ。`DISABLE_TELEMETRY=1` は、使用状況を Google に送らないために毎回付ける。

## 1. 検索する

Web の UI、CSS のレイアウトやアニメーション、クライアントサイドの JS を書く前（UX の不具合を直すときも含む）に検索する。

英語2〜5語で、1つの機能か UI パターンを「動詞＋対象」で書く。フレームワーク名やアプリ固有の名前は入れず、複数の機能にまたがるときは分けて検索する（`"light dismiss dialog"` はよい。`"dialog"` は短すぎ、`"responsive table dark mode"` は2回に分ける）。

依頼が意図だけで UI 部品を名指ししていないときは、その意図が指す部品や仕組みの名前に直す（「削除前に確認」は `"confirm destructive action"` ではなく `"confirmation modal dialog"`、「日付を選ぶ」は `"date picker input"`）。

```bash
DISABLE_TELEMETRY=1 modern-web-guidance search "light dismiss dialog"
```

結果は `description` で判断する。空か的外れなら、具体的な部品の名詞（`dialog`、`popover`、`table`、`form` など）で一度だけ言い換えて検索し直す。それでも合わなければ `list` で一度だけ全体を見て、無ければガイドなしで進める。

## 2. 取り出す

合った ID と、関係する分野の総論（`html`・`css`・`forms`・`accessibility`・`performance`・`security` など）をカンマ区切りでまとめて取る。出力が大きいと CLI が一時ファイルに保存してそのパスを返すので、そのファイルを最後まで読む。

```bash
DISABLE_TELEMETRY=1 modern-web-guidance retrieve "light-dismiss-a-dialog,html"
```

ガイドはフレームワークに依存しない書き方なので、プロジェクトの構成に合わせて読み替える。書き終えたら、取り出したガイドのパターンとフォールバックを守れているかを見直す（この見直しに `legacy-scan` は使わない）。

## コードベース全体を今風にする

対象を名指ししない「全体を今風にして」「古い書き方を洗い出して」という依頼のときだけ、`legacy-scan` から始める。特定の機能や部品の追加・修正・監査では走らせず、上の検索から入る。

```bash
DISABLE_TELEMETRY=1 modern-web-guidance legacy-scan <path> --json
```

1. 検出された各項目を、出力の `verifierRubric` にある `keepWhen` と `dropWhen` に照らし、誤検出（フォールバックとして残してあるコード、ベンダーのコード、見かけが似ているだけのもの）を落とす。
2. 残った項目をユーザーに報告する。検出できるのは決定的なルールを持つガイド（全体の約2割）だけなので、その旨を添える。
3. 洗い出しではなく書き換えまで頼まれているときは、各項目の `guideId` を `retrieve` して置き換え、変更したファイルにもう一度 `legacy-scan` をかけて確かめる。

落とした項目や残したフォールバックは再スキャンでも検出される。検出を0件にするために安全なコードを書き換えない。

## Gotcha

- `retrieve` が volatile な機能（単一エンジンでしか出ていない、まだ変わりうるもの）や Origin Trial のガイドを拒否したら、自分で解除しない（`set-allow-volatile-features` を実行しない、`.mwgrc` を編集しない、ガイドの `.md` を直接読まない）。ユーザーがその API を名指ししていなければ、クロスブラウザで動く標準的な実装にする。名指ししているなら、プロジェクトのルートで `modern-web-guidance set-allow-volatile-features`（Origin Trial は `set-allow-origin-trials`）を実行して解除するかをユーザーに尋ねる。拒否メッセージは `npx` での実行を案内するが、`npx` は deny なのでこの形に読み替える。

## ブラウザサポートとフォールバックの解釈

- **デフォルトの挙動**：全ガイドは「Baseline Widely available」な機能はフォールバックなしで使って良いという前提で書かれている。それ未満の機能では、ガイド内のフォールバック指示に**必ず**従う（ユーザーが独自のブラウザサポートポリシーを定めていない限り）。
- **独自ポリシー**：ユーザーが明示的にブラウザ要件を定義している場合、ガイドのブラウザ互換情報を参照して、フォールバックを省いて良いかを判断する。
  - 「Baseline YYYY」が目標の場合、機能の "Baseline since" 日が YYYY 以下ならその目標を満たす。
  - **ポリシー例**：
    - 「フォールバックは実装しない」（最先端のWeb機能を試す試作品向け）
    - 「Safari 17.4+ のみ」（macOS や Tauri ベースのデスクトップアプリ向け）
    - 「polyfill は推奨・実装しない。Baseline Newly Available な機能がコア機能に必須なら、軽量な独自フォールバックか別アプローチで設計する」（バンドルサイズと技術的負債を最小化したい場合）
    - 「Baseline Newly Available な機能はネイティブで使ってよい。ただし厳密な機能検出と段階的劣化を前提とする」（プログレッシブエンハンスメント方針）
- **ポリシーの能動的な発見**：以下のような兆候が会話に出てきたら、`CLAUDE.md` にブラウザサポートポリシーを明文化することを提案する。
  - 限定的なランタイム向けに作っている（Electron、Tauri など）
  - 特定ターゲットを明示的に除外している（例：「Desktop Chrome はサポートしない」）
  - polyfill の複雑さ・バンドルサイズ・性能コストへの懸念を示している
  - ある機能をフォールバック無しで使って大丈夫か問うてきている

  ポリシー記法は自由形式。例：`**ブラウザサポート方針：** Newly Available 機能を許可。ただし独自フォールバックは 20 行以内かつ外部依存なしで完結するもののみ採用する。`
