# ダークモード

`color-scheme` プロパティは、ページがサポートするカラースキーム（ライト、ダークなど）をブラウザに伝えます。これによりブラウザは、ネイティブUI要素（スクロールバー、フォームコントロール、デフォルトのキャンバス背景など）を自動的にサイトのデザインに合わせてテーマ設定でき、初期読み込み時の白いフラッシュを最小化するのに役立ちます。

## 実装

### 1. HTMLでサポートするスキームを宣言する

MANDATORY: 「フラッシュ・オブ・アンスタイルド・コンテンツ」（FOUC）を防ぐため、`<head>` に `<meta>` タグを配置して、ブラウザがレンダリングを開始する前にサポートするテーマを把握できるようにしてください。この `<meta>` タグは初期キャンバスの色を早期に設定することでFOUCを回避するのに役立ちますが、すべてのブラウザや読み込み条件でフラッシュを完全に排除できるわけではありません。

```html
<!-- MANDATORY: Declare support for both light and dark themes -->
<meta name="color-scheme" content="light dark" />
```

### 2. ページ全体のカラースキームをCSS :root または html に適用する

MANDATORY: `color-scheme` プロパティを `html` 要素または `:root` 擬似クラスに適用してください。ブラウザは特にルート要素を見て、ビューポート全体（ルートのスクロールバーや初期の「キャンバス」背景を含む）のテーマを決定します。`body` のみに適用すると、`body` はウィンドウのレンダリングコンテキストを制御しないため、これらのグローバルなUIサーフェスはライトモードのままになる可能性があります。

```css
/* MANDATORY: Apply color-scheme to :root or html for viewport-wide theming */
:root {
  /* MANDATORY: Automatically adapt native UI to user system preferences */
  color-scheme: light dark;
}
```

### 3. ライトとダークのカラートークンを定義する

`light-dark()` 関数を使って、異なる `color-scheme` 値に自動適応するカラートークンを定義できます。

生の色値は別のカスタムプロパティに保持することが推奨されます。これにより、異なる方法で組み合わせやすくなり（必要に応じてフォールバック動作も容易になります）。

`accent-color` や `scrollbar-color` のようなビルトインUIの色をより細かく制御するため、作者はカスタムプロパティや `light-dark()` 関数を使って独自のダイナミックカラーを**任意で**追加できます。この関数は要素の計算済み `color-scheme` に基づいて正しい色を自動的に選び、冗長なメディアクエリを不要にしますが、基本的な実装には必須ではありません。

```css
:root {
  --color-brand-light: oklch(45% 0.23 270);
  --color-brand-dark: oklch(85% 0.15 210);
  --color-brand-text-light: white;
  --color-brand-text-dark: oklch(40% 0.23 270);

  --color-brand: light-dark(var(--color-brand-light), var(--color-brand-dark));
  --color-brand-text: light-dark(
    var(--color-brand-text-light),
    var(--color-brand-text-dark)
  );

  /* MANDATORY: Automatically adapt native UI to user system preferences */
  color-scheme: light dark;
}

button.primary {
  /* These automatically adapt to color scheme */
  background-color: var(--color-brand);
  color: var(--color-brand-text);
}
```

OPTIONAL: 使用するカラースキーム（や強制色などのカラーモード）に自動適応するシステムカラーがいくつか利用できます。たとえば `canvas`、`canvastext`、`accentcolor`（サポートを確認）、`buttonborder` などです。これらは通常、特定のデフォルトのブラウザUIに正確に一致させたい場合や、フォールバック・デフォルトとして使う非常に特定のケース以外では制限が大きく、有用ではありません。

#### OPTIONAL: コンテキストに応じてカラーペアを調整する

システムデフォルトを上書きする場合でも、`prefers-color-scheme` メディアクエリを使って、ページ周囲のブラウザとOSクロームの色（またはページがiframeとして使われている場合の周囲ページの色）を考慮した**異なる**カラーペアを定義することは有用です。

たとえば、システム設定が `dark` のときは少し暗めのライトテーマを使い、システム設定が `light` のときはよりコントラストの強いダークテーマを使うことで、ページが周囲のUIに視覚的に圧倒されないようにできます。

## 細かなブラウザUIのカスタマイズ

`color-scheme` の設定だけでブラウザUIは使用するカラースキームに適応しますが、OSデフォルトやシステムカラーが使われ、ウェブサイトのデザインに完全には合わない場合があります。
最新のブラウザは、これらに対していくつかの細かなカスタマイズフックを公開しています。
最新ブラウザが提供するカスタマイズフックを使い切らずに、見た目をカスタマイズするためだけにネイティブコントロールを再実装しないでください。

### アクセントカラーの設定

一部のブラウザUI（チェックされたチェックボックスやスライダーなど）はアクセントカラーを使用します。
これはデフォルトではOS設定に解決されますが、`accent-color` プロパティでページに合わせた色（たとえばページのブランドカラー）に設定できます。

```css
html {
  accent-color: light-dark(var(--color-accent-light), var(--color-accent-dark));
}
```

### accent-color 使用時の注意点

- アクセントカラーの上に視覚要素（例: チェックボックスのチェックマーク）を配置する場合、ChromeとSafariは自動的にコントラストカラーを選択しますが、Safariはアクセントカラーを変更し、適切なコントラストを維持しないことがあります。

### スクロールバーの色

`scrollbar-color` を `light-dark()` と組み合わせて使うと、使用するカラースキームに適応するカスタムスクロールバーカラーを設定できます。

```css
:root {
  --color-scrollbar-track: light-dark(#eee, #222);
  --color-scrollbar-thumb: light-dark(#999, #666);
  scrollbar-color: var(--color-scrollbar-thumb) var(--color-scrollbar-track);
}
```

### scrollbar-color 使用時の注意点

- `scrollbar-color` をアニメーションまたはトランジションさせてはいけません。[WebKitのバグ](https://bugs.webkit.org/show_bug.cgi?id=311752)により、`scrollbar-color` が変化するたびにスクロールバーがちらつきます。
- macOSでは、`scrollbar-color`（標準）と `::-webkit-scrollbar`（レガシー）プロパティはデフォルトで無視されます。macOSはネイティブの「オーバーレイ」スクロールバーを使うためです。macOSでこれらを描画させるには、カスタムカラーと `scrollbar-width`（例: `thin` または `auto`）を必ず併用してください。
- `scrollbar-width` を適用しても、macOSのオーバーレイスクロールバーはデフォルトでトラック（ガター）を透明として描画します。macOSでトラックに見える背景色をデザインで要求する場合、スクロール可能なコンテナに `scrollbar-gutter: stable;` を適用しなければなりませんが、ユーザーがスクロールバーにホバーしたあとにのみ表示される点に注意してください。
- `scrollbar-gutter: stable` を指定してもmacOSではトラックが透明になることがあります。サムはトラックの色に依存して見えないようにしてはいけません。

### さらなるカスタマイズ

ほとんどのブラウザUIは、外観を完全にカスタマイズするための擬似要素を公開しています。たとえば:

- `::placeholder`
- `::spelling-error`
- `::grammar-error`
- `::selection`
- `::search-text`
- `::target-text`
- `::file-selector-button`

これらのいずれにも `light-dark()` の色を使って、使用するカラースキームに適応する色を適用できます。

## OPTIONAL: カラースキーム切替の実装

**DO NOT**: ルート要素にデフォルトで `color-scheme: light` や `color-scheme: dark` を設定しないでください。
デフォルトのcolor-schemeはユーザーのシステム設定でなければならず、これは `color-scheme` を `light dark` に設定すれば自動的に実現されます。

ウェブサイト固有のカスタマイズとして、ライト・ダーク・システムデフォルトのモードをユーザーが選べる手動の切り替えを提供できます。

ユーザー向けのオーバーライド切替を提供する場合、以下を行うべきです:

- 選択されたテーマを反映するように `<meta name="color-scheme">` 要素を更新する（システムデフォルトは `light dark`、ライトは `light`、ダークは `dark`）。
- 色以外の値で分岐したい場合、`<html>` にテーマ設定に合致するクラスを設定し、子孫セレクタを使用する。`:root:has(> head > meta[name="color-scheme"][content="dark"])` は技術的には機能しますが、すでに `<meta>` 要素を更新するためにJSを使っているので、より遅く、利点がありません。
- ユーザーの選択を `localStorage` に永続化する。
- **重要**: CSSはシステム設定をデフォルトとし、ユーザーが指定したcolor-schemeでのオーバーライドを書くべきです。これにより、JSの実行に失敗してもサイトはシステムのcolor-schemeにデフォルトされます。
- システムレベルのOSテーマはいつでも変わる可能性があります。JSで `matchMedia("(prefers-color-scheme: dark)").matches` を読む場合は、`addEventListener("change", fn)` で変更にも反応する必要があります。CSSは自動的に変更に適応します。
- **重要**: システムデフォルトと異なるカラースキームを固定したユーザー向けにFOUCを避けるため、インラインスクリプト（`type=module` ではなく、`defer` でもない）を使ってページ読み込み時に設定してください:

```html
<meta name="color-scheme" content="light dark" />
<script>
  {
    const colorScheme = localStorage.getItem('color-scheme');
    if (colorScheme) {
      document.querySelector('meta[name="color-scheme"]').content = colorScheme;
    }
  }
</script>
```

### UXの考慮事項

2つの状態のコントロールを使用してください:

1. システム設定。
2. その反対（例: システム設定がダークならライト、システム設定がライトならダーク）。この設定を選ぶと、その正確なカラースキームを固定しなければならず、動的に計算される「システム設定の反対」値ではいけません。シナリオ例:
   1. OSがライトモードに設定されている。
   2. ユーザーがこのウェブサイトで反対設定（ダーク）を選択する。
   3. ユーザーがシステム設定をダークに変更する。
   4. ウェブサイトはダークのままであるべき。

**DON'T**: 3つの状態（システム、ライト、ダーク）をすべて公開しないでください。理屈は妥当でも—「システムに従う（現在はダーク）」と「常にダーク」はユーザーの異なる意図です—UXとして次善です:

- ユーザーは現在抱えていない問題に対して意図を意味あるかたちで表現できません。手動切替は一時的な快適性の調整（「いまは眩しすぎる」）であり、長期的な好み（「絶対に変わらないようにして」）ではありません。
- 3つのオプションのうち2つが常に同じ視覚的結果を生み、フィードバックの原則に反します。

## コンポーネント固有のオーバーライド

特定の要素に `color-scheme` を設定することで、グローバルテーマを上書きできます。
これは、ライトテーマのサイト内の「ダークモード」セクション（コードブロックやメディアプレイヤーなど）に有用です。

```css
pre,
code {
  /* Forces element and its children to use dark themed UI */
  color-scheme: dark;
}
```

コンポーネント固有のオーバーライドとその落とし穴の詳細については、[`component-specific-light-dark-theme`](component-specific-light-dark-theme.md)を参照してください。

## 注意すべき既知の問題

### color-scheme 使用時の注意点

- ChromeとFirefoxはiframeに対して `color-scheme` を尊重します。埋め込まれたページを正しいカラースキームでレンダリングし、埋め込みコンテキストの `color-scheme` を反映するように埋め込みページの `prefers-color-scheme` メディアクエリを調整します。Safariはこれを行わず、iframe内でも `prefers-color-scheme` をシステム設定に解決します。
  - **親とiframeの両方を制御する場合:** 親のカラースキームを明示的にiframeに渡してください。iframe構築時のURLパラメータ（`?theme=dark`）経由、または `postMessage()` 経由（実行時の変更にも反応できます）です。iframe側では、`prefers-color-scheme` に頼るのではなく、その信号から `<html>` にクラスを設定（または `:root` に `color-scheme` を設定）してください。
  - **埋め込みページのみを制御する場合:** Safariでは、iframe内から埋め込みコンテキストの `color-scheme` を確実に検出する方法はありません。埋め込みAPIに明示的なテーマパラメータ（例: クエリ文字列や `postMessage` プロトコル）を公開し、埋め込み側に文書化してください。

## フォールバック戦略

### color-scheme のフォールバックとブラウザサポート

color-scheme のBaselineステータス: Widely available。2022-02-03からBaselineです。
対応ブラウザ: Chrome 98 (Feb 2022)、Edge 98 (Feb 2022)、Firefox 96 (Jan 2022)、Safari 13 (Sep 2019)。

`color-scheme` プロパティは**プログレッシブエンハンスメント**です。
サポートしないブラウザはこのプロパティを無視し、デフォルトのライトモードUIを使用します。

古いブラウザでユーザーの設定に適応するには、`prefers-color-scheme` メディアクエリを使って、ダークモードが優先される場合に異なる色を提供してください。

- DO: `:root` または `html` のカスタムプロパティを切り替えるためにメディアクエリを使用してください。
- 色以外の非常に特殊なダークモードカスタマイズが必要なコンポーネントを除いて、個々のコンポーネントでメディアクエリを使うのは避けてください。

```css
:root {
  /* Define brand colors for each mode */
  --color-brand-light: #0056b3;
  --color-brand-dark: #00e5ff;
  --color-brand: var(--color-brand-light);

  /* MANDATORY: Fallback for browsers without light-dark support */
  @media (prefers-color-scheme: dark) {
    --color-brand: var(--color-brand-dark);
  }

  /* Ignored in older browsers */
  color-scheme: light dark;
}

button.primary {
  background-color: var(--color-brand);
}
```

### light-dark() のフォールバックとブラウザサポート

light-dark() のBaselineステータス: Newly available。2024-05-13からBaselineです。
対応ブラウザ: Chrome 123 (Mar 2024)、Edge 123 (Mar 2024)、Firefox 120 (Nov 2023)、Safari 17.5 (May 2024)。

`color-scheme` をサポートするが `light-dark()` をまだサポートしないブラウザでは、まずカスタムプロパティとしてライトとダークのバージョンの色を定義し、以下の例のように `prefers-color-scheme` メディアクエリを使って対応するモードの色を設定してください:

```css
:root {
  /* Define browser UI accent color for each mode */
  --brand-accent-light: #0056b3;
  --brand-accent-dark: #00e5ff;
  --accent-color: var(--brand-accent-light);

  /* MANDATORY: Fallback for browsers without light-dark support */
  @media (prefers-color-scheme: dark) {
    --accent-color: var(--brand-accent-dark);
  }

  /* OPTIONAL: use light-dark() for more control of built-in UI colors */
  @supports (color: light-dark(white, black)) {
    --accent-color: light-dark(
      var(--brand-accent-light),
      var(--brand-accent-dark)
    );
  }

  /* MANDATORY: Automatically adapt native UI to user system preferences */
  color-scheme: light dark;

  /* Example inherited color property */
  accent-color: var(--accent-color);
}

pre,
code {
  color-scheme: dark;

  /* **Mandatory**: any inherited color properties must be set again, even if to the same design tokens */
  accent-color: var(--accent-color);
}
```

### scrollbar-color のフォールバックとブラウザサポート

scrollbar-color のBaselineステータス: Newly available。2025-12-12からBaselineです。
対応ブラウザ: Chrome 121 (Jan 2024)、Edge 121 (Jan 2024)、Firefox 64 (Dec 2018)、Safari 26.2 (Dec 2025)。

この機能はプログレッシブエンハンスメントであり、必ずしもフォールバックは必要ありません。

スタイリングが重要で、ユーザーのBaselineターゲットが「Baseline Widely Available」以前である場合、非標準の `::-webkit-scrollbar` 擬似要素をフォールバックとして含めるべきです。

レガシーなフォールバックは `@supports not (scrollbar-color: auto)` ブロックで囲み、両方をネイティブにサポートするブラウザで標準プロパティとレガシーWebKitセレクタが衝突するのを防いでください。

色をカスタムプロパティで定義している場合、それらは自動的にレガシーWebKitセレクタへカスケードします。重複して定義する必要はありません。

```css
/* Legacy fallback for WebKit/Blink browsers */
@supports not (scrollbar-color: auto) {
  .scroller::-webkit-scrollbar {
    /* Must define base size in WebKit for custom colors to be visual */
    width: 12px;
    height: 12px;
  }

  .scroller::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
  }

  .scroller::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }
}
```

### accent-color のフォールバックとブラウザサポート

accent-color は limited availability。
対応ブラウザ: Chrome 93 (Aug 2021)、Edge 93 (Sep 2021)、Firefox 92 (Sep 2021)。
非対応: Safari。

`accent-color` プロパティはプログレッシブエンハンスメントです。
サポートしないブラウザはこのプロパティを無視し、デフォルトのUIカラーを使用します。
