# 一貫したクロスドキュメントトランジション

## 課題

クロスドキュメントView Transitionsは、同一オリジンのナビゲーション中に2つのページ間で要素をアニメーションさせます。ブラウザは古いページのスナップショットを取り、ナビゲートしてから、スナップショットから新しいページへアニメーションします。新しいページがスタイルシート、レイアウトスクリプト、または重要なDOM要素などのクリティカルリソースの読み込みを終えていない場合、トランジションは不完全またはスタイルが適用されていない状態へアニメーションします。これにより、要素が間違った位置に変化したり、アニメーションの途中でコンテンツがリフローしたり、トランジション完了後にフォールバックフォントからWebフォントへフラッシュするなどの視覚的なグリッチが生じます。

## 解決策

新しいページの `<head>` で重要な `<link>` および `<script>` 要素に `blocking="render"` を使用し、`<link rel="expect">` を使って特定のDOM要素がパースされるまでレンダリングをブロックします。これにより、新しいページの視覚状態が安定するまでブラウザがView Transitionsアニメーションを開始しないことが保証されます。ブラウザはバックグラウンドでHTMLのパースを続け、ペイントのみが延期されます。

### 実装戦略

1. **MANDATORY:** 両ページで `@view-transition` CSSアットルールを使ってクロスドキュメントView Transitionsをオプトインしてください。
2. **MANDATORY:** 重要なスタイルシートが `<head>` にあることを確認してください。`<head>` 内のスタイルシートはデフォルトでレンダーブロッキングです。動的に注入されたスタイルシートには明示的に `blocking="render"` が必要です。
3. **DO**: トランジションがアニメーションする前に実行する必要がある `<script>` 要素（例: テーマを適用したりレイアウトに影響するスクリプト）には `blocking="render"` を使用してください。
4. **DO**: `<link rel="expect" href="#element-id" blocking="render">` を使って、above-the-fold（ファーストビュー）のコンテンツがパースされるまでレンダリングをブロックしてください。これはすべてのトランジションタイプに適用されます: 全ページのクロスフェード（空白ページへのアニメーションを避けるため）、モーフアニメーション（名前付き要素がDOMに存在することを保証するため）、スクリプト依存レイアウト（スタイル付きコンテンツがパースされていることを保証するため）。
5. **DO NOT**: クリティカルではないコンテンツでレンダリングをブロックしないでください。初期ビューポートに影響するリソースと要素のみブロックしてください。多すぎるコンテンツをブロックするとトランジションが遅延し、体感パフォーマンスが低下します。

## 実装ガイド

### 手順1: クロスドキュメントView Transitionsへのオプトイン

MANDATORY: ソースページとデスティネーションページの両方に `@view-transition` アットルールを含める必要があります。これがないとクロスドキュメントトランジションは発生しません。

```css
/*
  MANDATORY: Include this rule in every page that participates
  in cross-document view transitions.
  `navigation: auto` enables transitions for standard navigations
  (link clicks, form submissions, back/forward).
*/
@view-transition {
  navigation: auto;
}

/* MANDATORY Copy-Paste Safety: Disable cross-document view transitions for users requesting reduced motion */
@media (prefers-reduced-motion: reduce) {
  @view-transition {
    navigation: none;
  }
}
```

### 手順2: クリティカルなスクリプトが実行されるまでレンダリングをブロックする

`<head>` 内のノンブロッキングスクリプトがトランジションのアニメーション前に実行される必要がある場合（例: テーマクラスを適用したりレイアウトに影響する場合）、`blocking="render"` でマークしてください。これがないと、`async`、`defer`、`type="module"` のスクリプトはトランジションがすでに開始した後に実行される可能性があります。

```html
<head>
  <!--
    DO: Mark layout-critical scripts with blocking="render".
  -->
  <script type=module blocking="render">
    // Example: apply a stored theme before the page renders,
    // so the transition snapshot reflects the correct theme.
    document.documentElement.dataset.theme =
      localStorage.getItem('theme') || 'light';
  </script>
</head>
```

### 手順3: 主要なDOM要素がパースされるまでレンダリングをブロックする

`<head>` 内のスタイルシートと `blocking="render"` スクリプトは、`<head>` が完全に処理されたことを保証するだけです。`<body>` のコンテンツがパースされるのを待つわけでは**ありません**。追加のブロッキングがないと、ブラウザはabove-the-foldの要素がDOMに存在する前に新しいページのスナップショットを取り、空白または部分的にレンダリングされたページへアニメーションする結果になりかねません。

`<link rel="expect">` は、特定の要素（`id` で識別）がパースされるまでレンダリングをブロックすることでこれを解決します。`href` 値はターゲット要素の `id` 属性に一致するフラグメント識別子（例: `#hero`）でなければなりません。その要素の閉じタグがパースされると、レンダーブロックは解除されます。

**DO**: 以下のすべてのシナリオで `<link rel="expect">` を使用してください:

#### ユースケース 1: 全ページのクロスフェード

`view-transition-name` を持つ個々の要素がなくても、デフォルトの `root` トランジションがページ全体をクロスフェードします。新しいページのスナップショットがabove-the-foldコンテンツのパース前に取られると、クロスフェードは古いページから空白または不完全なページへとアニメーションします。可視のabove-the-foldコンテンツの終端をマークする要素でレンダリングをブロックしてください。

```html
<head>
  <link rel="stylesheet" href="/css/styles.css">

  <!--
    DO: Block rendering until the main content area is parsed,
    even for a simple cross-fade. Without this, the browser may
    snapshot the page before visible content exists in the DOM,
    causing the cross-fade to reveal a blank or partial page.
  -->
  <link rel="expect" href="#main-content" blocking="render">
</head>
<body>
  <header>...</header>
  <main id="main-content">
    <h1>Page Title</h1>
    <p>Above-the-fold content the user should see immediately.</p>
  </main>
  <!-- Content below the fold does NOT need to be blocked on -->
  <section>...</section>
</body>
```

#### ユースケース 2: 特定要素間のモーフアニメーション

両ページの要素が同じ `view-transition-name` を共有すると、ブラウザはナビゲーション間でそれらをスムーズにモーフします。トランジション開始時にターゲット要素がまだパースされていない場合、ブラウザはそれを見つけられず、モーフは別々の退場・入場アニメーションへ劣化します。`view-transition-name` を持つ要素がパースされるまでレンダリングをブロックしてください。

```html
<head>
  <link rel="stylesheet" href="/css/styles.css">

  <!--
    DO: Block rendering until the element participating in the
    morph animation has been parsed. Without this, the browser
    may start the transition before #hero exists, causing the
    morph to degrade to a fade-out/fade-in.
  -->
  <link rel="expect" href="#hero" blocking="render">

  <!--
    When multiple blocking="render" resources are present,
    rendering is blocked until ALL of them are satisfied.
    Here, the browser waits for both the script to execute
    AND the #hero element to be parsed — whichever comes last.
  -->
  <script async blocking="render" src="/js/transition-setup.js"></script>
</head>
<body>
  <header>...</header>
  <section id="hero">
    <h1 style="view-transition-name: page-title">Product Name</h1>
    <img style="view-transition-name: hero-image" src="/img/product.webp" alt="Product">
  </section>
</body>
```

### 手順4: レスポンシブなレンダーブロッキングにメディアクエリを使う

ビューポートサイズによってabove-the-foldに表示されるコンテンツ量は異なります。`<link rel="expect">` の `media` 属性を使って、特定のビューポート幅で表示されるコンテンツに対してのみレンダリングをブロックしてください。

```html
<head>
  <!--
    DO: Use media queries to conditionally block rendering.
    On wide screens, both the hero and the sidebar are visible,
    so block until both are parsed. On narrow screens, only the
    hero is visible initially.
  -->
  <link
    rel="expect"
    href="#hero"
    blocking="render"
    media="screen and (width <= 768px)"
  >
  <link
    rel="expect"
    href="#sidebar"
    blocking="render"
    media="screen and (width > 768px)"
  >
</head>
```

### 手順5: コンテキスト依存トランジションに pagereveal を使う（任意）

`pagereveal` イベントはコアのレンダーブロッキング戦略には**必須ではありません**。`view-transition-name` 値を、ユーザーがどこからナビゲートしてきたかに基づいて動的に割り当てる必要がある場合のみ必要です。たとえば、特定のリスト項目を詳細ページの見出しへモーフするような場合です。

`view-transition-name` 値をCSSで静的に割り当てている場合、またはデフォルトの全ページクロスフェードのみを使う場合は、この手順を完全にスキップしてください。

```html
<head>
  <!--
    MANDATORY: The pagereveal listener must be registered before
    the page renders. Use an async script with blocking="render"
    so the listener is registered early without blocking parsing.
    If the listener is registered too late (e.g., in a deferred
    script), the event may have already fired.
  -->
  <script async blocking="render" src="/js/transition-setup.js"></script>
</head>
```

```javascript
// transition-setup.js
window.addEventListener('pagereveal', async (event) => {
  if (!event.viewTransition) return;

  const from = navigation.activation?.from;
  if (!from) return;

  const fromUrl = new URL(from.url);

  // DO: Assign view-transition-name based on navigation context.
  // This enables a morph animation from the product card on the
  // list page to the heading on the detail page.
  if (fromUrl.pathname === '/products/') {
    const heading = document.querySelector('main h1');
    if (heading) {
      heading.style.viewTransitionName = 'product-title';
    }

    // MANDATORY: Remove the temporary name after the transition
    // finishes. Stale names interfere with subsequent navigations
    // and prevent the page from entering the bfcache.
    await event.viewTransition.finished;
    heading.style.viewTransitionName = '';
  }
});
```

## ベストプラクティス

- **DO**: 可能な限りCSSで `view-transition-name` を割り当ててください。JavaScriptによる割り当て（`pagereveal` 経由）は、名前がナビゲーションコンテキストに依存する場合のみに留めてください。
- **DO**: レンダーブロッキングスクリプトは小さく高速に保ってください。ブラウザにはビルトインのタイムアウト（約4秒）があり、それを超えるとトランジションは `TimeoutError` で完全にスキップされます。
- **DO NOT**: 初期ビューポートに表示されない深い場所の要素に `<link rel="expect">` を使わないでください。視覚的な利益なしにトランジションが遅延します。
- **DO NOT**: 同一ページで複数の要素に同じ `view-transition-name` を割り当てないでください。重複する名前はトランジション全体をスキップさせます。
- **支援技術のタイミングへの影響**: `blocking="render"` の使用は視覚的な更新と初期ペイントを遅延させます。これは見えるユーザーには視覚的なグリッチを防ぎますが、レンダリングされたアクセシビリティツリーに依存するスクリーンリーダーや他の支援技術では処理の遅延や初期化の遅れを引き起こす可能性があります。視覚的連続性の利点を、視覚に依存しないユーザーの初期読み込み遅延と比較検討し、レンダーブロッキングのスクリプトは最小限かつ高度に最適化されるようにしてください。

## フォールバック戦略

クロスドキュメントView Transitionsは limited availability。
対応ブラウザ: Chrome 126 (Jun 2024)、Edge 126 (Jun 2024)、Safari 18.2 (Dec 2024)。
非対応: Firefox。

クロスドキュメントView Transitionsはプログレッシブエンハンスメントに最適な機能です。サポートしないブラウザでは `@view-transition` ルールは無視され、標準の同一オリジンナビゲーションがこの機能がない場合と同じように実行されます。対応ブラウザはスムーズなトランジションを得て、それ以外は標準ナビゲーションになります。限られたブラウザサポートは導入を避ける理由にはなりません。

クロスドキュメントView Transitionsをサポートするすべてのブラウザは `blocking="render"` と `<link rel="expect">` もサポートするため、このガイドで説明したレンダーブロッキング機能に別のフォールバックは不要です。

## その他の考慮事項

1. **パフォーマンスへの影響**: レンダーブロッキングリソースはView Transitionsアニメーションの開始を遅延させます。レンダーブロッキングスクリプトの数を最小化し、`<link rel="expect">` はabove-the-foldの要素にのみ使用してください。Speculation Rules APIを使って遷移先ページをプリレンダリングすると、読み込み遅延を完全に排除できます。
2. **タイムアウト動作**: 合計のレンダーブロッキング時間が約4秒を超えると、ブラウザは `TimeoutError` でトランジションをスキップします。クリティカルリソースがこのウィンドウ内で十分に読み込まれるようにしてください。
3. **bfcache互換性**: トランジション後にクリーンアップされない一時的な `view-transition-name` の割り当てはページのbfcache入りを妨げる可能性があります。動的に割り当てた名前は `finished` コールバックで必ず削除してください。
