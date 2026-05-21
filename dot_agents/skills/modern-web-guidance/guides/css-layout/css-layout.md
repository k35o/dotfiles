# CSSレイアウトとレスポンシブデザイン

1. [1 基礎](#1-fundamentals)
   1. [どのレイアウトモードを使うか？](#11-which-layout-mode-to-use)
   2. [作業原則](#12-working-principles)
2. [2 Flexbox](#2-flexbox)
3. [3 グリッドとサブグリッド](#3-grid-and-subgrid)
   1. [コード例: グリッドとサブグリッド](#31-code-example-grid-and-subgrid)
4. [4 コンテナクエリ](#4-container-queries)
   1. [コード例: コンテナクエリ単位を使った流体タイポグラフィ](#41-code-example-fluid-typography-using-container-query-units)
5. [5 ネイティブオーバーレイ、アンカーポジショニング、スタッキングコンテキスト](#5-native-overlays-anchor-positioning-and-stacking-contexts)
6. [6 オーバーフロートラッキングとレイアウトの安定性](#6-overflow-tracking-and-layout-stability)
7. [7 ビューポートの仕組みとトラック配分](#7-viewport-mechanics-and-track-distribution)
8. [8 グリッドレーン（別名 masonry）](#8-grid-lanes-aka-masonry)

## 1 基礎

可能であればパフォーマンス向上のためにブラウザのレイアウトエンジンに頼ってください。ハードコードされた寸法や複雑なメディアクエリに頼る前に、内在的サイジング、論理プロパティ、`aspect-ratio` を活用してください。

### 1.1 どのレイアウトモードを使うか？

判定ツリーを上から下に進み、最初に一致したところで止めてください。レイアウトは互いにネストでき、各判定はそのコンテナのユースケースに基づくことに注意してください。

1. **項目の単純な行または列か？** **flexbox** を使う — 1D、コンテンツ優先、単一の軸に沿ってコンテンツが分布。
2. **ネストされた要素が祖父母のグリッドのトラックに揃う必要があるか？** **subgrid** を使う — 2D、関係性優先、親のトラックを継承して孫が兄弟間で揃う。
3. **行と列の両方を持つ複雑なページまたはコンポーネント構造か？** **grid** を使う — 2D、レイアウト優先、骨組みを定義してコンテンツがそれを満たす。
4. **散文の長い流れで、バランスの取れた列に分けるべきか？** **multi-column** を使う — 1D の流れ、新聞のようなスタイル。
5. **高さが異なる項目を密に詰めたいか？** 今日は `grid-auto-flow: dense` を使った **grid** を使い、ネイティブのmasonry（別名「grid lanes」）はBaselineターゲットでサポートされたときのみ手を出します（[§8](#8-grid-lanes-aka-masonry) 参照）。
6. **要素がページの上に浮かび、DOM境界やスタッキングコンテキストを超えてトリガーに空間的に紐付けられる必要があるか？** **anchor positioning** を使う — トリガーに `anchor-name`、オーバーレイに `position-anchor`（[§5](#5-native-overlays-anchor-positioning-and-stacking-contexts) 参照）。

### 1.2 作業原則

**すること:**

- レイアウトの寸法と間隔には論理プロパティ（`inline-size`、`block-size`、`margin-inline`、`padding-block`、`inset-inline-start`）を使う — 詳しくは [`css`](css/css.md)を参照してください。
- コンテンツ優先 vs レイアウト優先のメンタルモデルを適用する: 項目が流れを決めるならflexbox、骨組みを先に定義するならgrid。
- `place-*` 系のショートハンド（`place-content`、`place-items`、`place-self`）を使い、1つの宣言で両軸を揃える。
- 固定の `width`/`height` よりも内在的サイジング（`min-content`、`max-content`、`fit-content()`）と柔軟なトラック（`fr`、`minmax()`）を活用 — メディアクエリが減り、より復元力のあるレイアウトになる。
- アセットの読み込み前にメディア用のスペースを予約してレイアウトシフトを防ぐには `aspect-ratio` を使う。

```css
.sidebar       { inline-size: max-content; }    /* Size to longest unbreakable token. */
.main-content  { inline-size: fit-content; }    /* Grow to available space, no further. */
.media         { aspect-ratio: 16 / 9; inline-size: 100%; block-size: auto; }
body.centered  { display: grid; place-content: center; min-block-size: 100dvb; }
```

> `calc-size()` と制約を考慮した内在的サイジングについては、[`calculate-with-intrinsic-sizes`](user-experience/calculate-with-intrinsic-sizes.md)を参照してください。

## 2 Flexbox

一次元レイアウト — 項目は単一の**main**軸に沿って流れ、**cross**軸で整列されます。ナビバー、ツールバー、項目行、その他の単一行または単一列の分布に手を伸ばしてください。

**すること:**

- `display: flex` でコンテキストを確立し、`flex-direction` で main 軸を設定する（デフォルトは `row`）。
- オーバーフローの可能性があるときは常に `flex-wrap: wrap` を使う — `overflow: auto/hidden` なしの `nowrap` は狭いビューポートでこぼれます。
- 個別に `flex-grow`/`flex-shrink`/`flex-basis` を設定するのではなく、項目に `flex` ショートハンド `<grow> <shrink> <basis>`（例: `flex: 1 1 250px`）を使う。
- 子のマージンの代わりに、項目間の間隔には `gap`（または `row-gap`/`column-gap` のlonghand）を使う。
- 位置揃えに `safe` を接頭する（例: `align-items: safe center`）。これにより、コンテナがコンテンツより狭いときにフォーカス可能なコンテンツがクリップされません。
- main 軸の端に単一の項目を押し出すには `margin-inline-start: auto`（または `margin-block-start: auto`）を使う — これが標準のエスケープハッチです。
- 項目ごとに cross 軸の整列をオーバーライドするには `align-self` を使う。
- すべての項目を cross 軸で中央揃えにするには `align-items` を使う。単一項目を両軸で独立して中央揃えにするには `margin: auto` を使う。`align-content` は、コンテナが折り返され、行間に余分なスペースがあるときのみ使う。
- 長く分割不能なコンテンツ（URL、コード、長い文字列）を含むflex項目には `min-inline-size: 0`（または `min-width: 0`）を設定する — flex項目はデフォルトでコンテンツサイズを下回って縮小しないため、オーバーフローします。

**しないこと:**

- flex項目に `justify-self` を使わない — グリッド、ブロック、絶対配置レイアウトでのみ動作します。代わりに auto マージンを使います。
- インタラクティブコンテンツの並べ替えに `order` や `flex-direction: *-reverse` を使わない。これらは視覚的な順序のみを変えます。DOMの順序が連続的なフォーカスを駆動するため、キーボードのタブ順がユーザーの見るものと一致しません。
- `space-around`（端で半ギャップ）と `space-evenly`（前、中、後で等ギャップ）を混同しない。
- 軸の反転を忘れない: `flex-direction: column` のとき、`justify-content` は block 軸で整列し、`align-items` は inline 軸で整列します — デフォルトの反対です。
- コンテナと子を互いにフィットするようにサイジングしない — オーバーフローや驚きの結果のよくある原因です。一方に明確なサイズを与えてください。
- 同じ項目に `flex-basis` と `width`/`inline-size` の両方を設定しない — flexコンテキストでは `flex-basis` が優先され、`width` は無視されます。flex項目のサイジングの唯一の真実の源として `flex-basis`（または `flex` ショートハンド）を使ってください。

```css
.card-grid        { display: flex; flex-flow: row wrap; gap: 1rem; }
.card-item        { flex: 1 1 250px; }                  /* grow, shrink, basis */
.card-item-action { margin-inline-start: auto; }        /* Push to main-axis end. */
.toolbar          { display: flex; align-items: safe center; }
```

## 3 グリッドとサブグリッド

SubgridのBaselineステータス: Widely available。2023年9月15日からBaseline入りしました。
サポート: Chrome 117（2023年9月）、Edge 117（2023年9月）、Firefox 71（2019年12月）、Safari 16（2022年9月）。

二次元レイアウト — 行と列の両方を明示的に定義するか、エンジンに導出させます。サブグリッドにより、ネストされたグリッドが親のトラックを継承し、孫が兄弟間で揃うようにできます。

**グリッド機能の選択:**

- 必要な列数が正確に分かっているか？
  - **はい** — 明示的なトラックを使う（`grid-template-columns: 200px 1fr`、`repeat(3, 1fr)` など）
    - 異なる列が異なるサイズを必要とするか（サイドバー + メイン、全列にまたがるヘッダー）？ → 名前付きで読みやすい領域には `grid-template-areas` を使う
    - すべての列が均一、または純粋に行番号で配置されるか？ → `repeat(N, ...)` または名前付きラインを使う
  - **いいえ**（レスポンシブ、項目数不明） — `repeat(auto-fit, minmax(min, 1fr))` を使う
    - 最終行の項目が残りのスペースに伸びるべきか？ → `auto-fit`
    - 空の最終行のトラックが最小サイズを保つべきか（列ゴーストスロットを保持）？ → `auto-fill`
- 項目を特定の場所に配置する必要があるか？
  - **はい** — `grid-column: <start> / <end>` または `grid-area: <name>` を使う
  - **いいえ**（複数のトラックにまたがるだけで、流れの位置は問題ない） — `grid-column: span <n>` を使う
- 子要素が親グリッドのトラックサイズを継承する必要があるか（兄弟間でragged-edgeの揃え）？
  - **はい** — 影響する軸でsubgridを使う
    - セルあたりの子の数が可変か？ → **片方の軸だけ**subgrid、もう一方には `grid-auto-rows`/`grid-auto-columns` を使う
    - 子の数が固定か？ → 両軸でsubgridでOK
  - **いいえ** — 標準のgridでOK、subgridは不要

**すること:**

- `display: grid` でコンテキストを確立する。
- 複雑なページレベルのレイアウトには `grid-template-areas` を使う — 領域名は自己説明的で、宣言を行と列で揃えれば一目で読める。
- レスポンシブなカードグリッドでは、埋まったトラックを伸ばして行を埋めるには `repeat(auto-fit, minmax(200px, 1fr))` を、空の繰り返しトラックを最小サイズで保つには `auto-fill` を使う。
- 比例的なトラック配分には `fr` を、柔軟だが範囲のあるトラックには `minmax(min, max)` を使う。
- トラックにまたがってサイズを取るには `grid-column: span <n>`、特定のラインに配置するには `grid-column: <start> / <end>`、名前付き領域には `grid-area: <name>` で項目を配置する。
- カードリストの「ragged edge」問題を解決するためにsubgrid（`grid-template-columns: subgrid` または `grid-template-rows: subgrid`）を使う — タイトル、メタデータ、CTAなどの内部要素が兄弟間で揃う。
- subgrid 宣言の前に明示的な `grid-template-rows`/`-columns` 宣言を置き、古いブラウザのための同一カスケードフォールバックとして機能させる。

**しないこと:**

- `auto-fit`/`auto-fill` のトラックサイズが項目のコンテンツから来ると期待しない — それは `repeat()` のサイズ引数から来ます。
- インタラクティブコンテンツに `grid-auto-flow: dense` を使わない。項目を効率的に詰めますが視覚的に並べ替え、DOM順のキーボードタブ順を壊します。
- 子の数が可変のときに両軸にsubgridを適用しない。余分なものは最後のトラックに着地するので、暗黙の軸には `grid-auto-rows`/`grid-auto-columns` を使ってください。
- `justify-items`/`align-items`（項目のコンテンツを*そのトラック内で*揃える）と `justify-content`/`align-content`（gridトラックを*コンテナ内で*揃える）を混同しない。間違ったものを使うと黙って効果がありません。
- コンテナに明確な `inline-size` がないときに `repeat(auto-fit/auto-fill, ...)` を使わない — `display: inline-grid` 内やサイズのないflex項目内では、コンテナに分割する幅がないため、トラック数が予測不能になります。

### 3.1 コード例: グリッドとサブグリッド

ページシェル: `<main class="page-layout">` に `<header>`、`<aside>`、`<div class="card">` の子を持つ `<section class="card-grid">`、`<footer>` を含みます。

```css
/* Align grid-template-areas in rows and columns for readability. */
.page-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-areas:
    "header  header  header"
    "sidebar main    main"
    "footer  footer  footer";
  gap: 1.5rem;
}

header  { grid-area: header; }
aside   { grid-area: sidebar; }
footer  { grid-area: footer; }

.card-grid {
  grid-area: main;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  grid-template-rows: auto 1fr; /* title block, body block */
  gap: 1rem;
}

.card {
  grid-row: span 2;
  display: grid;
  /* Same-cascade fallback: ignored when subgrid is supported. */
  grid-template-rows: auto 1fr;
  grid-template-rows: subgrid;
}
```

## 4 コンテナクエリ

Container queriesのBaselineステータス: Widely available。2023年2月14日からBaseline入りしました。
サポート: Chrome 105（2022年9月）、Edge 105（2022年9月）、Firefox 110（2023年2月）、Safari 16（2022年9月）。

ビューポートではなく祖先コンテナのサイズ（または計算済みスタイル）をクエリします。メンタルモデル: コンテナクエリ = コンポーネントのコンテキスト、メディアクエリ = ページ全体のレイアウトとユーザー設定（`prefers-color-scheme`、`prefers-reduced-motion`）。

**すること:**

- 子孫がクエリされる前に、ラッパーに `container-type: inline-size`（幅のみのクエリ）または `container-type: size`（両軸）でコンテインメントコンテキストを確立する。
- ネストされたコンテキストが衝突する可能性がある場合、`container-name`（または `container` ショートハンド: `container: inline-size card`）でコンテナに名前を付ける。
- 流体タイポグラフィや間隔の計算にコンテナクエリ単位を含める: `cqi`/`cqb`（論理 inline/block）、`cqw`/`cqh`（物理）、`cqmin`/`cqmax`。
- `container-type: size` を使う場合は常にコンテナに明確な `block-size` を与える — 与えないと、サイズコンテインメントがコンテナにコンテンツを無視させるため、子孫が潰れます。

**しないこと:**

- `block-size` を `container-type` の値として使わない — 有効ではありません。両軸には `size` を使ってください。
- `container-type` を宣言した後、子の内在的サイズがコンテナに影響すると期待しない。コンテインメントが有効になると、コンテナは子のいないものとして計算されます。
- 適格でない祖先の子孫でコンテナクエリ単位に依存しない。小ビューポート（`svw`/`svh`）にフォールバックします。

### 4.1 コード例: コンテナクエリ単位を使った流体タイポグラフィ

```css
.card-wrapper {
  container: inline-size / card; /* shorthand for container-type + container-name */
}

@container card (inline-size > 400px) {
  .content {
    display: flex;
    gap: 2rem;
  }
}

.title {
  /* Fluid type bound to the container width, not the viewport. */
  font-size: clamp(1rem, 4cqi, 2rem);
}
```

> コンポーネント駆動のレスポンシブスタイリングパターンについては、[`size-aware-styling`](user-experience/size-aware-styling.md)と [`fluid-scaling`](user-experience/fluid-scaling.md)を参照してください。

## 5 ネイティブオーバーレイ、アンカーポジショニング、スタッキングコンテキスト

`<dialog>` のBaselineステータス: Widely available。2022年3月14日からBaseline入りしました。
サポート: Chrome 37（2014年8月）、Edge 79（2020年1月）、Firefox 98（2022年3月）、Safari 15.4（2022年3月）。
PopoverのBaselineステータス: Newly available。2025年1月27日からBaseline入りしました。
サポート: Chrome 116（2023年8月）、Edge 116（2023年8月）、Firefox 125（2024年4月）、Safari 17（2023年9月）、Safari iOS 18.3（2025年1月）。
アンカーポジショニングはどの主要ブラウザでもまだネイティブにサポートされていません。

**各オーバーレイプリミティブをいつ使うか:**

- 一時的で非モーダルなUI（フライアウト、トースト、ツールチップ）には `popover` を使う — トップレイヤーに存在し、`z-index` の管理は不要。
- フォーカストラップと inert なバックドロップを必要とするモーダルなインタラクションには、`.showModal()` 付きの `<dialog>` を使う。
- 同じ要素に `popover` と `.showModal()` を組み合わせない — これらは相互排他的なランタイム状態です。

**アンカーポジショニング（オーバーレイの空間レイアウト）:**

- トリガーに対してオーバーレイを配置・サイジングするには `position-area`（またはインセットに `anchor()`）と `anchor-size()` を使う。
- オーバーレイがビューポートをはみ出すときにブラウザに再配置させるには `position-try-fallbacks: flip-block`（または `flip-inline`）を使う。
- 単一の `position-area` の値に物理キーワードと論理キーワードを混在させない — 1つの座標系を選ぶ。
- `@supports (anchor-name: --x)` で機能検出し、絶対配置のフォールバックを提供する。

> 完全な実装の詳細、ポリフィル戦略、`popover` の値リファレンスについては、[`declarative-dialog-popover-control`](user-experience/declarative-dialog-popover-control.md)と [`position-aware-tooltips`](user-experience/position-aware-tooltips.md)を参照してください。メニューやタブインジケータに適用されるアンカーポジショニングについては、[`resilient-context-menus-and-nested-dropdowns`](user-experience/resilient-context-menus-and-nested-dropdowns.md)と [`anchor-positioning-tab-underline`](user-experience/anchor-positioning-tab-underline.md)を参照してください。

## 6 オーバーフロートラッキングとレイアウトの安定性

scrollbar-gutterのBaselineステータス: Newly available。2024年12月11日からBaseline入りしました。
サポート: Chrome 94（2021年9月）、Edge 94（2021年9月）、Firefox 97（2022年2月）、Safari 18.2（2024年12月）。
line-clampはどの主要ブラウザでもまだネイティブにサポートされていません。

レイアウトシフト、スクロールバー、クリッピングを予測可能に管理します。

**すること:**

- コンテンツが実際にあふれるときだけスクロールバーが現れるよう `overflow: auto` を使う。
- スクロールコンテナを確立**せずに**コンテンツをクリップするには `overflow: clip` を使い、`overflow-clip-margin` でスピルオーバーをオプトインする。
- コンテンツが大きくなったときのレイアウトシフトを防ぐためにスクロールバー用のスペースを予約するには `scrollbar-gutter: stable` を使う。
- スクロール可能なコンテナで `overscroll-behavior: contain`（または `none`）を使い、スクロール連鎖が親やドキュメントに伝播しないようにする。
- 複数行の切り捨てには `-webkit-line-clamp` + `display: -webkit-box` + `-webkit-box-orient: vertical` の3点セットを使う — 接頭辞があるにもかかわらず、このパターンは完全に仕様化されており非推奨ではありません。プレフィックスなしの `line-clamp` ショートハンドも併記してください。まだサポートしていないブラウザはこのプロパティを無害に無視します。
**しないこと:**

- `auto` で済む場合に `overflow: scroll` を使わない — `scroll` はスクロールするものがなくてもスクロールバーを強制します。
- クリップしたいだけのときに `overflow: hidden` に手を出さない — `hidden` はプログラム的にスクロール可能なスクロールコンテナを確立します。

```css
.scrollable-list {
  max-block-size: 400px;
  overflow-y: auto;
  scrollbar-gutter: stable;       /* Reserve scrollbar space. */
  overscroll-behavior: contain;   /* No scroll chaining into the page. */
}

.snippet {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-clamp: 3;                  /* Ignored where unsupported. */
  overflow: clip;
}
```

> `overflow: clip` と `overflow-clip-margin` の詳細については、[`overflow-clipping-control`](user-experience/overflow-clipping-control.md)を参照してください。スクロールバーの色、サイズ、テーマについては、[`customize-scrollbar-color-and-thickness`](user-experience/customize-scrollbar-color-and-thickness.md)、[`dark-mode`](user-experience/dark-mode.md)、[`adapt-scrollbar-to-contrast-preferences`](user-experience/adapt-scrollbar-to-contrast-preferences.md)を参照してください。

## 7 ビューポートの仕組みとトラック配分

Small, large, and dynamic viewport unitsのBaselineステータス: Widely available。2022年12月5日からBaseline入りしました。
サポート: Chrome 108（2022年11月）、Edge 108（2022年12月）、Firefox 101（2022年5月）、Safari 15.4（2022年3月）。

- ブラウザUIのシフト（URLバーの折りたたみ/展開）を考慮する必要があるモバイルレイアウトコンテナには `dvh`/`dvw` を使う。
- 全幅レイアウトに `100vw` を使わない — スクロールバー幅を無視するため水平方向のオーバーフローが発生します。代わりに `100%`、`100dvw`、`100svw` を使ってください。

> 完全なビューポート単位リファレンス（`svh`、`lvh`、`dvi`、`dvb` など）については、[`css`](css/css.md)を参照してください。

## 8 グリッドレーン（別名 masonry）

Masonryはどの主要ブラウザでもまだネイティブにサポートされていません。

仕様は開発中です。現在合意されている名前は「grid lanes」（例: `display: grid-lanes`）です。Firefoxはフラグの裏で `grid-template-rows: masonry` を出荷しています。本稿執筆時点では他のエンジンは安定版で出荷していません。

**すること:**

- 今日は密な詰め込みのためにgridで `grid-auto-flow: dense` を使う、ただしDOMの順序が視覚的な順序と一致しない可能性を受け入れる。
- 項目が等重要なカードではなくドキュメントの断片であるコンテンツ重視のmasonry風フローには、multi-column（`columns: 3; column-gap: 1rem`）を使う。
- `grid-template-rows: masonry` はプログレッシブエンハンスメントとしてのみ扱う — `@supports` で機能検出する。

**しないこと:**

- Baselineターゲットが追いつくまで、`grid-template-rows: masonry` を必須要件として出荷しない。

```css
.gallery       { columns: 3 200px; column-gap: 1rem; }
.gallery > *   { break-inside: avoid; margin-block-end: 1rem; }

@supports (grid-template-rows: masonry) {
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    grid-template-rows: masonry;
    gap: 1rem;
    columns: unset;
  }
}
```
