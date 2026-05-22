# CSS: モダンアーキテクチャとパフォーマンス

このガイドラインは、保守しやすく、パフォーマンスが高く、標準に準拠したCSSを書くための高密度なリファレンスを提供します。

1. [1. 基礎](#1-foundations)
2. [2. 継承とカスケード](#2-inheritance-and-the-cascade)
3. [3. セレクタとスコープ](#3-selectors-and-scoping)
   1. [複雑な要素のターゲット指定にはJSよりもCSSセレクタを優先する](#prefer-css-selectors-over-js-for-complex-element-targeting)
   2. [フォールバック用のCSSルール重複の代わりに `:is()`（または `:where()`）を使う](#use-is-or-where-instead-of-css-rule-duplication-for-fallbacks)
   3. [オーバーマッチを避ける](#avoid-overmatching)
   4. [ネストとスコープ](#nesting-and-scoping)
4. [4. インタラクティビティ](#4-interactivity)
   1. [フォーカス管理](#focus-management)
   2. [タッチターゲット](#touch-targets)
5. [5. デザイントークンとテーマ](#5-design-tokens-and-theming)
   1. [ダークモード](#dark-mode)
   2. [Forced Colors モード](#forced-colors-mode)
   3. [ティントの生成](#generating-tints)
   4. [ブラウザ生成UIのテーマ](#theming-browser-generated-ui)
6. [6. レスポンシブデザイン](#6-responsive-design)
   1. [レスポンシブタイポグラフィ](#responsive-typography)
7. [7. タイポグラフィ](#7-typography)
   1. [テキストの折り返し](#text-wrapping)
8. [8. ビジュアル効果](#8-visual-effects)
   1. [奥行きと質感](#depth-and-texture)
   2. [形状](#shapes)
   3. [グラデーションと `color-mix()`](#gradients-and-color-mix)
   4. [パターン](#patterns)
9. [9. トランジションとアニメーション](#9-transitions--animations)
   1. [パフォーマンス](#performance)
   2. [アクセシビリティ](#accessibility)
10. [10. 生成コンテンツ](#10-generated-content)

## 1. 基礎

知識の重複に対してアレルギーを持ってください。繰り返しよりも変数を優先しますが、可能な限りビルトインの規約を優先してください。例えば:

- 変数を定義して `color` に設定する代わりに `currentColor`
- 親で変数を定義し、親と子の同じプロパティでそれを使う代わりに `inherit` キーワード
- `font-size: var(--size)` の代わりに `em` 単位
- ボックスモデルの値を繰り返す代わりに `cqw`/`cqh`（またはそれらの論理版である `cqi`/`cqb`）単位
- コードの重複は知識の重複ではありません。目標は堅牢性と保守性であり、文字数を節約することではありません。
- **論理プロパティと論理値**を物理的なものよりも優先する（例: `margin-left` ではなく `margin-inline-start`）。これにより、書字方向や向きの違いにスタイルが適応します。ページの著者がローカライズを予定していなくても、外部の翻訳ツールはしばしば翻訳されたテキストを文脈上に表示します。
- 論理プロパティを無差別に使わないでください。「RTLで反転してほしいか？」と自問し、答えがノーなら物理プロパティを使ってください。
- 異なる表示モード（ダークモード、ハイコントラストモード）、異なるビューポートサイズ、異なる入力モード（タッチ、キーボード、ポインタ）を考慮してください。

## 2. 継承とカスケード

特異度を管理するためにBEMの命名規約を導入することは**避けて**ください。
代わりに、カスケードレイヤーや `:where()` のような最新のCSS機能を使い、カスケードの挙動を予測可能にし、著者の意図に従わせます。

カスケードレイヤー（`@layer`）を使って明示的な優先度ゾーン（例: `reset`、`base`、`theme`、`components`、`utilities`）を定義し、その順序を最初に宣言します（例: `@layer reset, base, theme, components, utilities;`）。
各レイヤー内では、`:where()` を使ってセレクタが偶発的なフィルタ（`:not()` のエッジケース、遠い祖先など）ではなく意味のあるシグナルのみで競合するようにし、または容易に上書きできる単発のデフォルト用に使います。

明示的な値の代わりに `inherit`、`initial`、`unset`、`revert` などのキーワードを使い、保守性を向上させ意図をよりよく表現します。
例:

- 親の `transition-*` プロパティに一致させたい子要素にトランジションを指定する場合、子要素でトランジションプロパティを繰り返す代わりに `transition: inherit` を使う（重複を減らし、保守性を向上）
- プロパティを初期値にリセットする場合、値を明示的に指定する代わりに `initial` を使う（意図のより明確な表現）

## 3. セレクタとスコープ

最新のブラウザネイティブセレクタは、プリプロセッサやJSでの複雑な状態追跡の必要性を減らします。

### 複雑な要素のターゲット指定にはJSよりもCSSセレクタを優先する

- JSでクラスを管理する代わりに、`:has()` を使って子の状態に基づいて親をスタイリング**する**（例: 手動の `label.has-checked` クラスの代わりに `label:has(:checked)`）。詳しくは [`child-state-based-styling`](../user-experience/child-state-based-styling.md)と [`content-based-styling`](../user-experience/content-based-styling.md)のガイドを参照してください。
- `:has()` をネストしたり、その中で疑似要素を使ったり**しない**（ブラウザAPIの制限）
- 特定の種類の要素のn番目ごとにスタイルを当てたい場合は `:nth-child(<An+B> of <selector>)` を使う。例えば、`details:nth-child(1 of [open])` は、見つけた最初の開いている `<details>` 要素にスタイルを適用しますが、`details[open]:first-child` は、最初の子であってかつ開いている場合のみスタイルを適用します。

### フォールバック用のCSSルール重複の代わりに `:is()`（または `:where()`）を使う

サポートされていない可能性のある疑似クラスのフォールバックを提供するためにCSSルールを重複させることは**避けて**ください。代わりに `:is()` または `:where()` を使い、それらの寛容なパースルールを活用してください。

```css
/* BAD: duplicate rules instead of using `:where()` */
[popover]:popover-open {
  /* styles for native popovers */
}
[popover].\:popover-open {
  /* same styles again, for polyfilled popovers */
}

/* GOOD */
[popover]:where(:popover-open, .\:popover-open) {
  /* same styles in one rule */
}
```

これを疑似要素に対しては使わないでください。`:is()` や `:where()` ではサポートされていません。

### オーバーマッチを避ける

セレクタは*意図*を表現する形で書きましょう。

#### 無関係な状態やターゲットを除外するためには、オーバーライドの代わりに `:not()` を使う

特定の状態や本質的に無関係な要素を除外する意図がある場合は、`:not()` を使ってください。

例えば、リスト項目の間に下ボーダーを適用するには、こうしてはいけません:

```css
.fancy-list li {
  border-bottom: 1px solid silver;
}

.fancy-list li:last-child {
  border-bottom: none;
}
```

これは別のルールから設定された望ましい `border-bottom` を意図せず上書きする可能性があります。
本来の意図は、最後ではない `li` にのみ下ボーダーを適用することでした。上記コードはこの意図を不十分に表現する回避策です。代わりに、こうすると意図がより明確になります:

```css
.fancy-list li:not(:last-child) {
  border-bottom: 1px solid silver;
}
```

同様に、こうしてはいけません:

```css
button:hover {
  background: var(--color-blue);
}

button:disabled {
  background: var(--color-neutral);
}
```

2つのルールを並べ替えると、無効化されたボタンにホバー時の背景がついてしまいます！
代わりに、こうしてください:

```css
button:hover:not(:disabled) {
  background: var(--color-blue);
}

button:disabled {
  background: var(--color-neutral);
}
```

これは並べ替えても機能します。最初のルールがオーバーマッチしないからです。

#### （潜在的に深くネストされた）サブツリーを除外するには `:not()` よりも `@scope` を優先する

`:not()` + 子孫セレクタでサブツリーを除外することはできますが、深くネストされた構造では機能が不十分です。
例えば、`.card :not(.content *)` はネストされたカードに対して期待通りに動作しません。
`@scope` は階層的な近接性を考慮するためこれを解決します:

```css
@scope (.card) to (.content) {
  /* styles for elements inside .card but not inside .content */
}
```

これはネストされたカードでも期待通りに動作します。

#### 特殊化のためのオーバーライドは問題ない

これは問題ありません:

```css
button {
  background: var(--color-neutral);
}

button.primary {
  background: var(--color-blue);
}
```

両方のルールが正当な _意図_ を表現しています。ボタンは一般的にニュートラルですが、主要なものは青いです。

#### グローバルリセットは禁止

グローバルリセット（`*` へのスタイル）は、Webコンポーネントや優先度の低いカスケードレイヤーから（`!important` なしでは）上書きできないため、使わ**ない**でください。代わりに、特定の要素タイプや条件にリセットスタイルを適用します。

### ネストとスコープ

関連するスタイルをグループ化し、保守性と可読性を向上させる範囲でネイティブCSSネストを使います。

純粋な特異度よりも近接性が重要な場合は、ネストよりも `@scope` を優先してください。これは、任意の順序でネストできるが、最も近いマッチ（要素から祖先への順）が勝つべきセレクタ、例えばテーマクラスでよく使われます。

例えば、これは期待通りに動作しません:

```css
.dark .invert {
  color-scheme: light;
}
.light .invert {
  color-scheme: dark;
}
```

`.invert` が `.dark` と `.light` の _両方_ にネストされている場合、両方のルールが同じ特異度を持つため、常にダークモードに解決されます。
`@scope` を使うとこれが解決されます:

```css
@scope (.dark) {
  .invert {
    color-scheme: light;
  }
}

@scope (.light) {
  .invert {
    color-scheme: dark;
  }
}
```

## 4. インタラクティビティ

### フォーカス管理

- カスタムフォーカスリングを定義するには `:focus` ではなく `:focus-visible` を使います。
- 代替の可視フォーカススタイルを提供せずにブラウザのデフォルトのフォーカスリングを（`outline: none` で）削除しないでください。
- フォーカスリングには他のプロパティ（例: `box-shadow`）よりも `outline` を優先してください。`box-shadow` に頼らざるを得ない場合は、`forced-colors` メディアクエリを使って High Contrast Mode 用の `outline` ベースのフォールバックを提供してください。
- フォーカスアウトラインを `outline-offset` と組み合わせ、リングを要素から視覚的に分離してください。

### タッチターゲット

- インタラクティブ要素は最低でも24×24 CSSピクセル（WCAG 2.5.8 AA）にする必要があります。`width` / `height` ではなく `min-block-size` / `min-inline-size` またはパディングで強制し、コンテンツがターゲットを大きくできても小さくならないようにしてください。
- 粗いポインタではターゲットを大きく: `@media (pointer: coarse) { ... }`。
- カスタムジェスチャに `touch-action: none` を使**わない**でください — これは要素を通じたページスクロールを無効化します。実際に必要な軸にスコープしてください: 水平スワイプには `pan-y`（ページは縦にスクロール可能）、縦スワイプには `pan-x`。`none` は、ネイティブのタッチ動作が意味をなさない要素（描画キャンバスなど）のために確保してください。

## 5. デザイントークンとテーマ

`:root` 上のCSSカスタムプロパティを使って、デザイン全体で使われるコアなデザイン変数（色、フォント、サイズなど）を定義します。これにより視覚的な一貫性を保ち、チーム間でUIデザインをスケールできます。
非自明なスタイリング値をインラインで指定**しない**でください。例えば `background: transparent` や `padding: 0` は問題ないですが、`background: #f06` や `padding: .3em` はダメです。
例外として、テストケースのように長期的な保守性や進化よりもコードを小さく単純に保つことが遥かに重要なユースケースがあります。

通常、これらは階層に整理され、各階層は前の階層の上に構築されます。例えば:

1. ティア1: リテラルデザイントークン（例: `--color-blue-10`、`--color-gray-90`、`--font-sans-serif`、`--size-xl` など）
2. ティア2: セマンティックデザイントークン（例: `--color-accent`、`--color-neutral`、`--font-body`、`--font-heading` など）
3. ティア3: 一般的なUIデザイントークン（例: `--ui-border`、`--surface-bg-subtle` など）
4. ティア4: コンポーネント固有のデザイントークン（例: `--button-bg-primary-hover`、`--button-border-color-secondary` など）

ユースケースのスコープが小さいほど、必要な階層は少なくなります。例えば、簡易デモやおもちゃのアプリは1階層で十分です。過剰設計しないでください。
独自のものを発明する前に、命名や階層に関する既存の規約がないか確認してください。

### ダークモード

- システム設定に自動的に適応するダークモードサポートを有効にするには、`:root` で `color-scheme: light dark` を使います。サブツリーで異なる値を強制するために、個々の要素で `color-scheme` を指定することもできます（`light`/`dark` または `light dark` でシステムデフォルト）。
- 要素の `color-scheme` に基づいて自動的に解決される代替を提供するには `light-dark()` を使います。
  通常これはティア2かティア3のトークンで行います。
- 重要: 継承される `<color>` プロパティで `light-dark()` を使うと、その要素の `color-scheme` に基づいて特定の色に解決され、`light-dark()` 値ではなくその解決された色として継承されます。子孫の `color-scheme` オーバーライドには適応しません。`light-dark()` カラートークンを動的に保つには、登録されていないカスタムプロパティとしてのみ渡すことで可能な限り遅く解決し、`color-scheme` 境界をまたぐ継承された色値への依存を避けてください。

ダークモード切り替えのサポートに関するヒントとベストプラクティスは [`dark-mode`](../user-experience/dark-mode.md)を、特定の要素にページ全体の設定と異なる `color-scheme` モードを適用する詳細は [`component-specific-light-dark-theme`](../user-experience/component-specific-light-dark-theme.md)を参照してください。

### Forced Colors モード

Forced Colors モード（WindowsのHigh Contrast）では、ブラウザは著者の色をシステムキーワードで上書きし、`background-image`、`box-shadow`、`border-image` を取り除きます。

- `@media (forced-colors: active)` を使ってカラートークンのシステムカラーフォールバックを定義します。
- ボーダー、セパレータ、状態を伝えるために `background-image`、`box-shadow`、`border-image` に頼ら**ない**でください — これらはforced colorsで消えます（印刷でもしばしば消えます）。どうしても必要なら、システムカラーキーワード（`CanvasText`、`LinkText`、`ButtonText`、`Highlight`、`GrayText` など）を使った `outline` や `border` のようなforced colorsモードでの代替を確保してください。
- 色が本質的な情報である場所（シンタックスハイライタ、カラーピッカーのスウォッチ）には `forced-color-adjust: none` を使います。美的見栄えを保つだけのために `forced-color-adjust: none` を使**わない**でください。

### ティントの生成

ティントを動的に生成する前に、既存の事前定義されたデザイントークンが使えないか確認してください。これにより、デザイナーがより制御でき、一貫性が確保されます。

明るい色や暗い色を動的に生成する必要がある場合:

- `oklch`/`oklab` や `lch`/`lab` の明度チャネルだけを調整**しない**でください、例えば `oklab(from var(--primary) 0.9 a b)`。これは理論的には正しい方法ですが、ブラウザはまだガモットマッピングを実装していないため、結果の色が予測不能になります。
- `color-mix()` を使って白または黒と混ぜることができます（できれば `oklab` で）。これは色を安全に色域内に保ちますが、色を過度に脱彩度化し、洗いざらしのティントとシェードを生成しがちです。
- 明度調整を他のメソッドのいずれかと組み合わせる（例: `color-mix(in oklab, oklch(from var(--primary) 0.9 c h), white 30%)`）ことで、両者のバランスを取ることができますが、明度調整は30%を超えないようにしてください。

### ブラウザ生成UIのテーマ

ほとんどのブラウザ生成UIは、CSSである程度カスタマイズできます。
最新の機能を必要とする場合でも、古いブラウザでは優雅にデグレードされるため、しばしばポリフィルやフォールバックを必要としません。

ブラウザUI（フォームコントロール、スクロールバー、選択、エラーメッセージなど）を再作成する前に、まず次のことを確認してください:

1. 最新のCSSを使ってもブラウザUIを十分にカスタマイズできない、
2. 望ましいカスタマイズが、ビルトインUIを再作成するトレードオフを正当化するほど十分に重要である — 特に、ネイティブUIが無償で提供するアクセシブルなセマンティクス、キーボードハンドリング、IME、AT統合を失うこと。

可能なカスタマイズの例:

- ハイライトされたテキストの色をカスタマイズするには `::selection` を使います。
- 本文テキストに `user-select: none` を適用**しない**でください — コピーペースト、翻訳ツール、ATの「ここから読む」ジェスチャを壊します。クローム（ドラッグハンドル、ツールバー、冗長なボタンラベル）に限定してください。
- ページのアクセントカラーをブラウザ生成UIに適用するには `accent-color` を使います。
- ブラウザUIをライト/ダークモードに適応させるには `color-scheme` を使います。
- スクロールバーの色をカスタマイズするには `scrollbar-color` を、スクロールバーの太さを制御するには `scrollbar-width` を使います — つまみをトラックから視覚的に区別できるようにし（≥3:1）、スクロール可能領域には `scrollbar-width: none` を設定しないでください（スクロールが別のアフォーダンスで完全に置き換えられている場合のみ使用）。
- 妥当性のスタイリングには `:invalid` / `:valid` ではなく `:user-invalid` / `:user-valid` を使います — これらはユーザーがフィールドを操作してからのみマッチするため、ページ読み込み時に必須の空フィールドをエラーとしてマークする敵対的なデフォルトを回避します。
- ボタンとテキストフィールド（`<textarea>` を含む）は一般に通常の要素としてスタイリングできます。
- スケーリングには `font-size` を、タイポグラフィを制御するためにその他のテキストプロパティを使います。

#### テキストフィールド（`<input>` と `<textarea>`）のスタイリング

ほとんどのスタイリング目的（色、ボーダー、背景、タイポグラフィなど）では、これらの要素を通常のテキストコンテナとして扱ってください。

- 入力のプレースホルダーをスタイリングするには `:placeholder-shown` と `::placeholder` を使います。
- テキストフィールドをコンテンツに合わせてサイズ変更するには `field-sizing: content` を使います。
- `<textarea>` 要素では、水平リサイズを無効にするには `resize: vertical`、すべてのリサイズを無効にするには `resize: none` を使います。

#### 複数選択コントロール（select、ラジオ、チェックボックス）

- ドロップダウンで提示された多くのオプションから1つを選択する場合: `<select>` + `appearance: base-select` + `::picker(select)` を使います。詳細は [`branded-select-styling`](../forms/branded-select-styling.md)を参照してください。
- ページ内にインラインで配置された複数のオプションから1つまたは複数を選択する場合: 各オプションに対して `<label>` の中に `<input type=checkbox>` または `<input type=radio>` を使います。`label:has(:checked)` でスタイリングします。
- チェックボックス、ラジオ、スイッチを `appearance: none` + 生成コンテンツ（`::before`/`::after`）または背景画像でスタイリングして、チェック状態を描画します。
<!-- Customizable select listbox version currently buggy + this has much better browser support -->

#### 非テキストの `<input>`（ボタン、スライダー、ファイル入力など）

- ファイル入力: ボタンをスタイリングするには `::file-selector-button` を使います。
- `type` が `button`、`submit`、`reset` の `<input>` を使用しないでください。代わりに `<button>` を使い、通常の要素としてスタイリングしてください。
- スライダー: より細かい制御のために `appearance: none` + つまみ疑似要素（`::-webkit-slider-thumb`、`::-moz-range-thumb` など）とトラック疑似要素（`::-webkit-slider-runnable-track`、`::-moz-range-track` など）を使います。

## 6. レスポンシブデザイン

- ビューポートではなく親コンテナのサイズに適応するコンポーネント駆動のレスポンシブレイアウトを作成するには、`@container` クエリを使います。
- モバイルブラウザのUI要素（アドレスバーなど）が表示・非表示になったときのレイアウト崩れを防ぐため、`vh`/`vw` の代わりに動的ビューポート単位（`dvh`、`dvw`）を使います。
- メディア要素（`<img>` や `<video>` など）に `aspect-ratio` を使って、読み込み中にスペースを予約し、Cumulative Layout Shift（CLS）を防ぎます。

### レスポンシブタイポグラフィ

- ビューポートサイズに応じてスケールしながらも望ましい範囲内に収まるフォントサイズには、`clamp()` 内でビューポート相対単位とフォント相対単位を組み合わせて**ください**。例えば `clamp(2rem, 1rem + 5vw, 4rem)`。ビューポート相対単位とフォント相対単位の比率を調整して、フォントサイズの変化の速さを制御します。
- `clamp()` なしの `vw` 単独はフォントサイズに使用**しない**でください。極端なスクリーンでテキストが小さすぎたり大きすぎたりスケールする可能性があります。

## 7. タイポグラフィ

- `line-height` には単位なしの数値（例: `1.5`）を使って、font-size の継承時に相対的にスケールするようにします。
- 長いURLを収めるには `overflow-wrap: break-word`（または `anywhere`）を使います。
- font-size に `px` を使**わない**でください。ユーザーのブラウザのフォントサイズ設定（ルートフォントサイズ）を尊重するには `rem` を、コンテキスト的なサイジングには `em` を優先してください。

### テキストの折り返し

- バランスの取れた見出しや見出しのようなコンテンツ（例: `<th>`）には `text-wrap: balance` を使います。
- 長文の本文テキスト（段落、引用ブロックなど）には `text-wrap: pretty` を使います。
- `text-wrap: balance` や `text-wrap: pretty` は意図的に使い、`*` に適用**しない**でください。パフォーマンスコストがあります。
- 背景、ボーダー、シャドウなど見える箱を持つ要素では `text-wrap: balance` を避けてください。これはコンテナの幅を変えるわけではなく、その幅の*中*でテキストがどう折り返されるかにだけ影響します。そのため、コンテナの末尾に空白スペースが残ることがあり、通常は望ましくありません。

## 8. ビジュアル効果

### 奥行きと質感

- リアルなソフトな奥行き効果のために複数のシャドウを重ねます。
- 非長方形の形状や透過PNGには `box-shadow` ではなく `filter: drop-shadow()` を使います。
- ライティングオーバーレイには `mix-blend-mode` と `background-blend-mode` を使います（`isolation: isolate` でスコープを制限してください）。

```css
.hero {
  background-image: url('texture.png'), linear-gradient(to bottom, #fff, #eee);
  background-blend-mode: soft-light;
}
```

### 形状

- 通常の角丸へのプログレッシブエンハンスメントとして、より美しい曲線のために `corner-shape: squircle` を使います。
- 追加要素なしで比例した曲線を得るには、楕円の `border-radius`（例: `10px / 20px`）を使います。

### グラデーションと `color-mix()`

グラデーションや `color-mix()` の補間色空間を明示的に指定するには `in oklch` または `in oklab` を使います。

- `in oklch` は彩度をよりよく保ちますが、特に色同士の差が大きい場合、デバイスのガモットを外れやすくなります。
- `in oklab` は（端点がガモット内なら）ガモット内に留まりやすいですが、特に反対の色相を補間する場合、中間に洗いざらしの脱彩度色を作りがちです。
- 特別な理由がない限り（例: srgbで補間する必要のあるカラーピッカーを構築する場合など）、`in srgb` を使*わない*でください。

#### フォールバック

2024年以前の一部のブラウザはグラデーションカラー補間空間をサポートしていません。
これらのブラウザをサポートするには、変数を定義してその使用が安全な場合にのみトークンを使います:

```css
:root {
  --in-oklab: ;
  --in-oklch: ;
}

@supports (linear-gradient(in oklab, white, black)) {
  :root {
    --in-oklab: in oklab;
    --in-oklch: in oklch;
  }
}
```

そして次のように使います:

```css
.card {
  background: linear-gradient(
    to bottom var(--in-oklab),
    var(--accent-color),
    var(--darker)
  );
}
```

- **重要:** この手法を使う場合、それなしでも空でないグラデーションのプリアンブルが常にあることを確認してください。さもないと、古いブラウザで構文エラーになります。
- `color-mix()` ではこれは必要ありません。ブラウザが `color-mix()` をサポートしている場合、その `in <color-space>` 引数もサポートしています。

### パターン

多くのパターンはCSSグラデーション + ハードストップで作成でき、これらはSVGや外部画像よりも柔軟でパフォーマンスが高い場合があります。周囲のコンテキストのCSS変数と長さにアクセスできるからです。
位置を二度繰り返す必要はありません — `0` または `0%` を使えば、グラデーションの自動修正が調整します。

以下に例を示します。

幅 `1em` の縦縞:

```css
background: linear-gradient(to right, var(--color-1) 50%, var(--color-2) 0) 0 /
  2em;
```

幅 `1em` の斜め縞:

```css
background: repeating-linear-gradient(
  -45deg,
  var(--color-1) 0 1em,
  var(--color-2) 0 2em
);
```

`1em` の正方形によるチェッカーボードパターン:

```css
background: repeating-conic-gradient(var(--color-1) 0 25%, var(--color-2) 0 50%)
  0 / 2em 2em;
```

半径 `.5em` のドットを `2em` 間隔で（水平/垂直に — 斜めの距離は `sqrt(2)` を掛けます）配置した水玉:

```css
--distance: 2em;
--radius: 0.5em;
--polka: radial-gradient(
  circle,
  var(--color-1) var(--radius),
  transparent calc(var(--radius) + 1px)
);
background:
  var(--polka) 0 0,
  var(--polka) var(--distance) var(--distance) var(--color-2);
background-size: calc(var(--distance) * 2) calc(var(--distance) * 2);
```

シンプルな円グラフ:

```css
.pie {
  --p: 80%;
  width: 60px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: conic-gradient(var(--color-1) var(--p), transparent 0%)
    var(--color-2);
}
```

**重要:** グラデーションを使ってチャートを描画する場合、スクリーンリーダー向けのテキストフォールバックを確保してください。必須: [`accessibility`](../accessibility/accessibility.md)の代替テキストとメディアのガイドラインで詳述されているように、アクセシブルな代替としてセマンティックなデータテーブルを提供する必要があります。

## 9. トランジションとアニメーション

- カスタムな幾何学的なリビールと滑らかなフェードアウトには `clip-path` と `mask-image` を使います。
- JSリスナーの代わりに、非必須のスクロール連動効果には**スクロール駆動アニメーション**（`animation-timeline: scroll()`）を使います。
- 複雑なレイアウト状態間をシームレスにアニメーションするには**View Transitions**を使います。

### パフォーマンス

レンダリングパフォーマンスは、特に重いDOMツリーで、スムーズなユーザー体験のために重要です。

- アニメーションがコンポジターのスレッドに留まるよう、`opacity` と `transform`（個別のtransformプロパティ、例えば `left/right/top/bottom` ではなく `translate` を含む）をアニメーションすることを優先します。
- `display` や `<dialog>` の状態のようなレイアウトプロパティをネイティブにアニメーションするには、`transition-behavior: allow-discrete` + `@starting-style` を使います。
- スクロールバージャンプ（CLS）を防ぐため、`content-visibility` は常に `contain-intrinsic-size` と組み合わせてください。
- `contain-intrinsic-size` を設定する際は、`auto` キーワードと、コンテンツについて分かっていること（テキストサイズ、間隔、グラフィックスのサイズ、文字数）から導出された値を使います。可能であれば、コンテンツ内の要素に使われる値と一致する `rem`、`lh`、`cap`、`ch` などの単位を `px` より優先してください。グループ内の項目のコンテンツが一貫したサイズでない場合は、平均サイズを使用します。
- コンポーネントのレンダリング更新を分離するには `contain: layout style paint` を使います。

#### コード例: レンダリング最適化

```css
.large-section {
  content-visibility: auto;
  contain-intrinsic-block-size: auto 800px;
}

.row {
  --row-gap: 0.4rem;
  --title-height: 1lh;
  --description-height: 0.85lh;

  display: grid;
  row-gap: var(--row-gap);
  content-visibility: auto;
  /* The sum of the title height, row gap, and description height should be the size of the contents when skipped for rendering. */
  contain-intrinsic-block-size: auto
    calc(var(--title-height) + var(--row-gap) + var(--description-height));
}

.popover-reveal {
  /* Allow discrete animations for display transitions */
  transition: display 0.2s allow-discrete;
}
```

### アクセシビリティ

`prefers-reduced-motion` メディアクエリを使って、それを好むユーザー向けに重いモーションをオフにします。

`animation-duration: 0.01ms;` をグローバルに適用**しない**でください。特定のアニメーションがより不快になることがあります。
個別にケースバイケースで reduced motion バージョンを適用するか、次のようなカスタムプロパティを使ってください:

```css
@property --animation-reduced {
  syntax: '*';
  inherits: false;
  initial-value: none;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: var(--animation-reduced) !important;
  }
}
```

すると、reduced motion バージョンを元のアニメーションと一緒に保つことができます:

```css
progress:not([value]) {
  animation: slide 1s infinite linear;
  --animation-reduced: slide 20s infinite linear;
}
```

## 10. 生成コンテンツ

- 意味のあるテキスト（ラベル、状態、指示）を伝えるために `content` を使用**しない**でください — それらはDOMに残してください（WCAG F87）。代替テキスト引数は、装飾が偶然意味を持ってしまうケースのための被害軽減策であり、ライセンスではありません。
- スクリーンリーダー向けに代替テキストを提供するには、`content` の代替テキスト引数を使います。例: `content: url(cloud.svg) / "Save";`
- 純粋に装飾的なテキストがスクリーンリーダーにアナウンスされないようにするには `content: "text" / "";` を使います。
- 画像に空の代替テキスト引数を使**わない**でください — デフォルトですでに装飾的です。例えばこれは間違いです: `content: url(cloud.svg) / "";`。
- 絵文字の説明がその公式絵文字名と異なる場合を除き、代替テキスト引数で絵文字を説明**しない**でください。例えば `content: "🎉" / "celebration";` はしてはいけませんが、`content: "🎉" / "Yay!";` は問題ありません。

代替テキスト引数は、テキストが主要な値と異なり、すでにDOMに存在しない場合に**のみ**使用してください。つまり、これは間違いです:

HTML:

```html
<button class="save">Save</button>
```

CSS:

```css
button.save::before {
  content: url(cloud.svg) / 'Save';
}
```

スクリーンリーダーはこれを「Save save」と読み上げてしまいます。
