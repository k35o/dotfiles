## 目次

1. 基本的なセマンティクスと検証
2. コンテンツのグループ化と帰属
3. リソースの優先順位付けとパフォーマンス
4. ネイティブオーバーレイ: ダイアログとポップオーバー
5. ディスクロージャ: Details と Summary
6. フォーカス境界と可視性
7. HTML APIとフォームのグループ化
8. ネイティブメディア要素
9. 動的スタイルとインタラクティビティ

## 1. 基本的なセマンティクスと検証

### ガイドライン

- 標準のHTML5 doctype `<!DOCTYPE html>` を使用して、クォークレンダリングモードを防いで**ください**。
- スクリーンリーダーの発音と翻訳ツールのために、`<html>` 要素に `lang` 属性を設定して**ください**。
- ページのレスポンシブ性を確保するため、`content` 属性を `"width=device-width, initial-scale=1.0"` に設定した `<meta name="viewport">` 要素を使用して**ください**。
- 主要トピックを表す `<h1>` をページ/ビューごとに1つだけ使用して**ください**。モーダルダイアログは例外として、1つの `<h1>` を使うことができます。
- 順次的でスキップしない見出し階層（`<h2>` から `<h3>` へは可、`<h2>` から `<h4>` への飛びは不可）を維持して**ください**。
- セマンティックなランドマーク（`<header>`、`<nav>`、`<main>`、`<aside>`、`<footer>`）を使用して、支援技術用の領域ナビゲーションを作成して**ください**。
- 検索やフィルタリングのメカニズムを囲うには `<search>` を使用して**ください**（`role="search"` の必要をなくします）。
- トリガーされるアクション（JS、モーダル、フォーム）には `<button>` を、URLナビゲーションには厳密に `<a>` を使用して**ください**。フォーム内の送信しないボタンには、意図しない送信を防ぐため `type="button"` を設定してください。
- リストコンテンツには `<ul>`、`<ol>`、`<dl>` 要素を使用して**ください**。
- リンクやボタンのようなすべてのインタラクティブ要素にアクセシブルな名前があることを確認して**ください**。
- 純粋に装飾的なSVG画像は `aria-hidden="true"` で支援技術から隠して**ください**。装飾的な `<img>` を使う場合は、常に空の `alt` 属性（例: `alt=""`）を含めてください。
- ロゴ、データ可視化、アイコンボタンなどの情報的なSVGには、適切なアクセシブル名があることを確認して**ください**。

- セマンティック要素が存在する場合、汎用の `<div>` や `<span>` を使**わない**でください。例えばインタラクティブ要素、見出し、独立して再利用可能な自己完結型コンテンツなどです。
- 冗長な値を持つ真偽属性を使**わない**でください（例: `disabled="disabled"` ではなく `disabled` を使う）。
- 組み込みのセマンティクスと挙動を持つネイティブ要素が存在するときに、ARIAロールや状態を追加した汎用要素を使**わない**でください。
- それが重要な要件でない限り、ARIAで要素のネイティブセマンティクスを変更し**ない**でください。
- フォーカス可能な要素やその親、祖先で `role="presentation"` や `aria-hidden="true"` を使**わない**でください。
- ページのズーム機能を無効化し**ない**でください。

### コード例

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard | Platform</title>
  </head>
  <body>
    <header>
      <nav>
        <ul>
          <li><a href="#">About</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <h1>Analytics</h1>
      <search>
        <form action="/filter" method="GET">
          <label for="search-input">Scan items:</label>
          <input type="search" id="search-input" name="q" />
          <button type="submit">Search</button>
        </form>
      </search>
      <article>
        <h2>First post</h2>
      </article>
    </main>
  </body>
</html>
```

## 2. コンテンツのグループ化と帰属

### ガイドライン

- 別のソースからの長い引用には `<blockquote>` を使用し、そのソースへの機械可読なURLを提供するために `cite` 属性を使用して**ください**。
- 本文から参照されるが、ドキュメントの意味を損なわずに付録やサイドバーに移動できる自己完結型のコンテンツ（画像、コードスニペット、引用）をグループ化するには `<figure>` を使用して**ください**。
- 人間が読めるキャプションや帰属を提供するには、`<figure>` の最初または最後の子として `<figcaption>` を使用して**ください**。
- キャプションや帰属の中で、作品の**タイトル**（例: 本やウェブサイト名）を特定するために `<cite>` 要素を使用してください。著者名ではありません。
- 短いコンピューターコードのフラグメント（例: 変数名、ファイルパス、インラインスニペット）には `<code>` 要素を使用して**ください**。
- コードブロックを表示する際は、空白や改行を保持するために `<code>` を `<pre>` の中に包んで**ください**。
- `<pre>` がスクロール可能になる場合、`tabindex="0"` を `<pre>` 要素に追加してキーボードユーザーがコンテンツに到達できるようにし、コードブロックがアクセシブルであることを確認して**ください**。

- 非引用テキストの純粋に視覚的なインデントに `<blockquote>` を使**わない**でください。
- すべての画像に `<figure>` を使**わない**でください。キャプションが必要な場合や、コンテンツが独立した参照単位である場合にのみ使ってください。
- コードブロックに `<code>` なしの `<pre>` を使**わない**でください。`<pre>` だけでは整形は保たれますが、コンテンツがコンピューター言語であることが伝わりません。

### コード例

```html
<!-- Quote with attribution using Figure -->
<figure>
  <blockquote cite="https://html.spec.whatwg.org/">
    <p>
      The figure element represents some flow content, optionally with a
      caption, that is self-contained and is typically referenced as a single
      unit from the main flow of the document.
    </p>
  </blockquote>
  <figcaption>
    Definition of the &lt;figure&gt; element from the
    <cite>HTML Living Standard</cite>
  </figcaption>
</figure>

<!-- Image with caption -->
<figure>
  <img
    src="architecture-diagram.webp"
    alt="Diagram showing the flow between Client, API Gateway, and Microservices"
    width="800"
    height="450"
    loading="lazy"
  />
  <figcaption>Figure 1: High-level system architecture overview.</figcaption>
</figure>

<!-- Code block with accessibility and language hint -->
<figure>
  <figcaption>Example configuration:</figcaption>
  <pre tabindex="0"><code class="language-json">
{
  "name": "gemini-cli",
  "version": "1.0.0",
  "private": true
}
  </code></pre>
</figure>

<!-- Inline code -->
<p>To initialize the project, run the <code>npm install</code> command.</p>
```

## 3. リソースの優先順位付けとパフォーマンス

### ガイドライン

- Largest Contentful Paint（LCP）要素（例: ヒーロー画像）には、ネットワーク優先度を上げるために `fetchpriority="high"` を使用して**ください**。
- CSSで定義されたLCP背景画像には、`fetchpriority="high"` を付けた `<link rel="preload" as="image">` を使用して**ください**。
- 画面外の画像やiframeに `loading="lazy"` を適用して、帯域を後回しにして**ください**。
- アスペクト比を保持してレイアウトシフト（CLS）を防ぐため、すべての `<img>` タグに `width` と `height` を指定して**ください**。
- `<img>` で異なるサイズの同じ画像の複数バージョンを追加するには、`srcset` 属性を使用して**ください**。
- 画像形式、画像サイズ、デバイスサイズごとの画像クロッピングを切り替えるなど、より細かい画像制御のためにフォールバックの `<img>` を持つ `<picture>` 要素を使用して**ください**。

- スクロール上部のコンテンツやヒーロー画像に `loading="lazy"` を適用し**ない**でください。これによりLCPが遅延します。
- `fetchpriority="high"` を多用し**ない**でください。優先順位付けはゼロサムの仕組みです。重要でないトラッカーやカルーセル項目を格下げするには `fetchpriority="low"` を使ってください。

### コード例

```html
<!-- High-priority hero image with responsive sizes -->
<img
  src="hero-large.webp"
  srcset="hero-small.webp 480w, hero-medium.webp 800w, hero-large.webp 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 70vw"
  alt="Main product view"
  fetchpriority="high"
  width="1200"
  height="600"
/>

<!-- Art direction and format switching with <picture> -->
<picture>
  <!-- Mobile Art Direction: Different aspect ratio (square) and format (AVIF) -->
  <source
    media="(max-width: 600px)"
    srcset="hero-mobile.avif 1x, hero-mobile-2x.avif 2x"
    type="image/avif"
    width="600"
    height="600"
  />
  <source
    media="(max-width: 600px)"
    srcset="hero-mobile.webp 1x, hero-mobile-2x.webp 2x"
    width="600"
    height="600"
  />

  <!-- Desktop: Modern format for primary layout -->
  <source srcset="hero-desktop.avif" type="image/avif" />

  <!-- Fallback img defines the default aspect ratio (2:1) -->
  <img
    src="hero-desktop.webp"
    alt="Platform dashboard overview"
    width="1200"
    height="600"
    loading="lazy"
  />
</picture>

<!-- Low-priority decorative footer image -->
<img src="footer-art.png" alt="" loading="lazy" width="200" height="100" />
```

## 4. ネイティブオーバーレイ: ダイアログとポップオーバー

### ガイドライン

クロスブラウザでPopover APIを使うためのフォールバック戦略の詳細は、[`declarative-dialog-popover-control`](user-experience/declarative-dialog-popover-control.md)を参照してください。

- モーダルオーバーレイには `<dialog>` を使用して**ください**（JSの `.showModal()` が必要）。これにより、フォーカスのトラップ、背景の暗転、`Esc` での閉じることを自動的にサポートします。`closedby="any"` 属性を使うと、カスタムJavaScriptなしでネイティブの「ライトディスミス」（バックドロップクリックで閉じる）を有効化できます。
- フォーカストラップを必要としない非モーダルUI（メニュー、ツールチップ）には、Popover API（`popover` 属性）を活用して**ください**。
- モーダル背景のスタイリングには `::backdrop` を使用して**ください**。
- 手動のJSハンドラなしでダイアログを閉じるには `<form method="dialog">` を使用して**ください**。`formmethod="dialog"` を持つボタンと組み合わせると、ボタンの値がダイアログの `.returnValue` に渡されます。

- キーボードトラップが期待されるモーダルに `show()` を使**わない**でください（`showModal()` を使ってください）。
- `popover` 属性を持つ要素に対して `showModal()` を呼**ばない**でください（これらは相互排他的なプログラム状態です）。ただし、`<dialog popover="auto">` は、ダイアログのセマンティクスとライトディスミスのメカニクスを組み合わせる有効な宣言的アーキテクチャです。

### コード例

```html
<!-- Popover (No JS required for toggle) -->
<button popovertarget="help-menu">Info</button>
<div id="help-menu" popover="auto">
  <p>Standard help text.</p>
</div>

<!-- Modal Dialog with Form-based closing -->
<button id="show-dialog">Open dialog</button>
<dialog id="fav-modal">
  <!-- method="dialog" closes the dialog natively and sets the returnValue -->
  <form method="dialog">
    <p>Confirm action?</p>
    <button value="cancel">Cancel</button>
    <button value="confirm">Confirm</button>
  </form>
</dialog>

<script>
  const dialog = document.getElementById('fav-modal');
  const openModal = document.getElementById('show-dialog');

  // Show modal dialog
  openModal.addEventListener('click', () => dialog.showModal());

  // Listen for the 'close' event to retrieve the user's choice (returnValue)
  dialog.addEventListener('close', () => {
    console.log(dialog.returnValue); // "confirm" or "cancel"
  });
</script>
```

### ネイティブUIのオーバーレイ&ディスクロージャマトリクス

| 機能            | モダリティ                 | フォーカス               | 閉じる仕組み                     | ユースケース                     |
| :-------------- | :------------------------- | :----------------------- | :------------------------------- | :------------------------------- |
| **`<dialog>`**  | モーダル / 非モーダル      | 自動トラップ（モーダル） | Esc / フォーム / `closedby`      | クリティカルなアクション、設定   |
| **`[popover]`** | 非モーダル                 | 標準的なタブフロー       | ライトディスミス（外側クリック） | メニュー、ツールチップ、トースト |
| **`<details>`** | インラインディスクロージャ | 標準的なタブフロー       | サマリーのトグル                 | アコーディオン、FAQ              |

**ヒューリスティックルール**: ユーザーアクションを必要とする割り込みには `<dialog>`、一時的な情報には `popover`、インラインコンテンツの展開には `<details>` を使います。

## 5. ディスクロージャ: Details と Summary

### ガイドライン

- JSなしのネイティブアコーディオンや展開可能なコンテンツには `<details>` と `<summary>` を使用して**ください**。
- `<summary>` を `<details>` の*最初の*子として配置して**ください**。
- `<summary>` 内で見出しを使う必要がある場合、その見出しがドキュメント構造の理解やナビゲーションに不可欠かを検討してください。不可欠なら、ディスクロージャトリガーを見出しで包むことができる、より堅牢なディスクロージャアプローチ（例: `<h2><button type="button" aria-expanded="false" aria-controls="significant-section-content">Significant section</button></h2>`）を使ってください。これにより、見出しのセマンティクスが失われず、ボタンとその状態がアナウンスされるようになります。
- 展開状態のスタイリングには `details[open]` 属性を使用して**ください**。
- `<details>` 要素のコンテンツのスタイリングには `details::details-content` を使用して**ください**。
- 複数の `<details>` 要素で `name` 属性を使い、排他的なアコーディオン（1つを開くと他が閉じる）を作成して**ください**。

- `<summary>` テキスト内に他のインタラクティブ要素（リンク、ボタン）を直接ネストし**ない**でください。`<summary>` はボタンとして機能し、フォーカスを壊します。
- 明示的な方向の手がかり（`::before`/`::after` 疑似要素経由）を提供せずに `list-style: none` で可視の三角形を隠さ**ない**でください。
- ツールチップ効果を作成するために `title` 属性を使わ**ない**でください。

### コード例

```html
<!-- Exclusive Accordion Set -->
<details name="faq">
  <summary>Item 1</summary>
  <p>Contents...</p>
</details>
<details name="faq">
  <summary>Item 2</summary>
  <p>Contents...</p>
</details>
```

## 6. フォーカス境界と可視性

### ガイドライン

- 隠された全セクション（オフスクリーンメニュー、カスタムモーダルが開いている間の背景）には、グローバルな `inert` 属性を使用して、タブフローとアクセシビリティツリーから取り除いて**ください**。
- 視覚的に非アクティブを示すために、`[inert]` をCSS（`opacity: 0.5`）と組み合わせて**ください**。
- 連続的なナビゲーションには自然なDOM順に頼って**ください**。

- 正の `tabindex` 値（例: `1`、`2`）を使**わない**でください。要素をタブフローに追加するには `0`、JSプログラムフォーカス用には `-1` を使ってください。
- DOM構造を揃えずに、CSSプロパティ（`flex-flow: row-reverse`、`order`）でフォーカスフローを変更し**ない**でください。
- 使い勝手の検証なしに `node.focus({ preventScroll: true })` を使**わない**でください。フォーカスされた要素が画面外に隠れてしまう可能性があります。

### コード例

```html
<!-- De-tabbing a background app shell while custom drawer is open -->
<main id="app-shell" inert>
  <a href="/">Dashboard</a>
</main>
<aside id="drawer">
  <button>Close</button>
</aside>
```

```css
[inert],
[inert] * {
  opacity: 0.5;
  cursor: default;
  user-select: none;
}
```

## 7. HTML APIとフォームのグループ化

### ガイドライン

最新のWebフォームの作成に関する詳細は、[`forms`](forms/forms.md)を参照してください。

- 入力を物理的な `<form>` ツリーから切り離すには、`form="form-id"` 属性を活用して**ください**。
- 軽量なオートサジェストには `<datalist>` を `<input list="id">` と組み合わせて使用して**ください**（注: 視覚的にスタイル不可で、スクリーンリーダーのクセがあります）。
- 資格情報、住所、支払い、連絡先フィールドに `autocomplete="off"` を使**わない**でください。ブラウザとパスワードマネージャは設計上それらを無視します。代わりに特定のトークン（`autocomplete="email"`、`"street-address"`、`"cc-number"` など）を使ってください。
- 高度に機密性の高い追跡トークンを扱う場合を除き、`autocomplete="off"` を使**わない**でください（標準的なパスワードマネージャのオーバーライドに反します）。標準的な入力 `type="email"`、`type="tel"` を使ってください。
- パスワードマネージャが正しいアクションを提供するよう、`autocomplete="current-password"`（サインイン）と `autocomplete="new-password"`（登録/パスワード変更）を区別して**ください**。
- `autocomplete` トークンを適切な `inputmode` と `type` と一致させて**ください**（`type="email"` + `inputmode="email"` + `autocomplete="email"`）。これらは異なるもの（キーボード、検証、オートフィル）を制御し、互いを補強します。

### コード例

```html
<form>
  <fieldset>
    <legend>Address Information</legend>
    <label for="city">City:</label>
    <input type="text" id="city" list="cities" autocomplete="address-level2" />
    <datalist id="cities">
      <option value="New York"></option>
      <option value="London"></option>
    </datalist>
  </fieldset>
</form>
```

## 8. ネイティブメディア要素

### ガイドライン

- `<video>` 要素のレイアウトシフト（CLS）を防ぐために `width` と `height` を設定して**ください**。
- 動画にはフォールバック用の `poster` 画像を提供して**ください**。
- 字幕やキャプションを `<track>` で含めて**ください**。
- 背景動画は `muted` にし、ユーザーに完全な再生制御を提供し、`role="none"` または `aria-hidden="true"` を使用して**ください**。動画がフォーカス可能にならないように、`controls` 属性も省略する必要があります。

- ネイティブの `controls` 属性で十分な場合、基本的な動画コントロールにJSに頼ら**ない**でください。
- フォーカス可能な要素（埋め込み式のインタラクティブな `<iframe>` コンポーネントなど）に `role="none"` や `aria-hidden="true"` を適用し**ない**でください。連続的なキーボードナビゲーションでアクセス可能なまま、支援技術のツリーから要素を隠すことは、コアなアクセシビリティのヒューリスティックに違反します。背景動画の例外は、`controls` 属性を省略することで `<video>` 要素が完全にフォーカス不可能になる場合にのみ当てはまります。

### コード例

```html
<video controls width="800" height="450" poster="poster.webp">
  <source src="intro.webm" type="video/webm" />
  <source src="intro.mp4" type="video/mp4" />
  <track src="caps.vtt" kind="captions" srclang="en" label="English" />
</video>
```

## 9. 動的スタイルとインタラクティビティ

### ガイドライン

- **カスタムプロパティ**経由でCSSに状態を渡すために `style` 属性を使用して**ください**。これにより、視覚ロジックをスタイルシート内に保ち、JavaScriptは生データを提供するだけになります。

- スタイルシートに属する静的なデザイン（色、パディング、マージン）にインラインスタイルを使**わない**でください。
- インラインイベントハンドラ（例: `onclick`）を使**わない**でください。`addEventListener()` を使ってアクションをトリガーしてください。

### コード例

```html
<body>
  <!-- Progress with style-driven color data -->
  <label for="upload-progress">Upload status:</label>
  <progress
    id="upload-progress"
    class="loading-bar"
    value="0"
    max="100"
    style="--brand-hue: 200;"
  ></progress>

  <script>
    const updateProgress = (percent, hue) => {
      const bar = document.querySelector('.loading-bar');
      bar.value = percent;

      // Update dynamic style variable
      if (hue) bar.style.setProperty('--brand-hue', hue);
    };

    // Example: Move to 85% and shift color to green (120)
    setTimeout(() => updateProgress(85, 120), 1000);
  </script>
</body>
```

```css
.loading-bar {
  accent-color: hsl(var(--brand-hue, 200) 80% 50%);
  transition: accent-color 0.3s ease;
}
```
