これまで、コンポーネントの内容に応じて異なるレイアウトを適用するには、JavaScriptを使うか、HTMLテンプレート言語の条件付きロジックで修飾子クラス（`.card--has-image` や `.card--text-only` など）を注入する必要がありました。

`:has()` 擬似クラスは親セレクタとして機能し、この必要性を解消します。特定の子孫要素の存在の有無に基づいて、コンテナ要素を条件付きでスタイルできます。

`:has()` を使えば、コンポーネントの実際のDOMコンテンツに基づいて、CSSだけで異なるレイアウトのバリエーションを簡単に定義できます。任意で `:not()` と組み合わせて、コンテンツの*不在*を明示的にターゲットし、デフォルトレイアウトを定義することもできます。

### コンテンツベースのコンテナスタイリングを実装する

**MANDATORY**: コンテナ要素で `:has()` セレクタを使って、特定の子コンテンツの存在を検出する必要があります。

コンテンツに基づいてレイアウトを変えるコンポーネントを構築するには:

1. **デフォルトのスタイリングを定義する**: コンテナ要素にベースのレイアウトスタイル（例: 単一カラムのシンプルなスタック）を適用します。
2. **コンテンツベースのオーバーライドを適用する**: `:has([child-selector])` でコンテナをターゲットし、そのコンテンツが存在する場合の新しいレイアウトスタイル（例: 複数カラムのグリッド）を適用します。

_例: 画像があれば横並びレイアウトに切り替わるカードコンポーネント。_

```css
/* 1. Define the default state on the component container */
/* This applies when there is NO image */
.article-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}

/* 2. Apply styles when a specific child element is present */
/* MANDATORY: Target the container and use :has() to check for the descendant */
.article-card:has(img) {
  /* Change the layout to a row if an image exists */
  flex-direction: row;
  align-items: center;
}

/* Optional: Style the image itself (no :has() needed here) */
.article-card img {
  width: 150px;
  height: auto;
  border-radius: 4px;
}

/* You can also combine :has() and :not() to explicitly target the ABSENCE of content */
/* This selects a card that DOES NOT have an image */
.article-card:not(:has(img)) {
  /* E.g., apply a different background color for text-only cards */
  background-color: #f9f9f9;
}
```

```html
<!-- Assume an <h1> precedes these components in the document layout -->
<!-- A card WITH an image (will use row layout) -->
<article class="article-card">
  <img src="thumbnail.jpg" alt="Article thumbnail" />
  <div class="content">
    <h2>Card With Image</h2>
    <p>This card lays out its content horizontally.</p>
  </div>
</article>

<!-- A card WITHOUT an image (will use default column layout) -->
<article class="article-card">
  <div class="content">
    <h2>Text-Only Card</h2>
    <p>
      This card lays out its content vertically, and gets its background color
      from the :not(:has()) rule.
    </p>
  </div>
</article>
```

**パフォーマンスのヒント**: `:has()` を使う際は、セレクタを可能な限り具体的なコンポーネントコンテナ（例: `.article-card`）にスコープしてください。スタイリングの変化が局所的な場合に、`body:has(img)` のような非常に高レベルな要素にアンカーするのは避けてください。広範な `:has()` クエリはより多くのレイアウト再計算をトリガーする可能性があります。

### フォールバック戦略

:has() のBaselineステータス: Newly available。2023-12-19からBaselineです。
対応ブラウザ: Chrome 105 (Sep 2022)、Edge 105 (Sep 2022)、Firefox 121 (Dec 2023)、Safari 15.4 (Mar 2022)。

コンテンツに基づくレイアウトスタイリングがユーザー体験やページデザインに不可欠な場合は、`:has()` セレクタをサポートしないブラウザ向けにフォールバックを提供する必要があります。純粋に装飾的なエフェクトであれば、`:has()` はフォールバックなしのプログレッシブエンハンスメントとして使えます。

**MANDATORY**: クリティカルなレイアウトのフォールバックを実装する際は、CSSで `@supports not selector(:has(*))` を使って、従来のクラスベースのフォールバック（例: `.has-image`）を定義する必要があります。

インタラクティブな状態ベースのスタイリングとは異なり、コンテンツの存在はレンダリング時に通常分かっています。最も堅牢なフォールバックは、子要素（画像など）がデータに存在する場合、サーバーサイドのテンプレートエンジン（または静的サイトジェネレータ）でコンテナに `.has-image` のようなクラスを注入することです。

サーバーサイドレンダリングが選択肢でない場合は、`CSS.supports()` を使う小さなスクリプトで、ロード時または動的なコンテンツ注入後にコンテンツを検出してクラスを追加してください。

```css
/* Fallback CSS for older browsers */
/* We check if the browser DOES NOT support the :has() selector */
@supports not selector(:has(*)) {
  /* Define a traditional modifier class that applies the exact same layout overrides */
  .article-card.has-image {
    flex-direction: row;
    align-items: center;
  }

  .article-card:not(.has-image) {
    background-color: #f9f9f9;
  }
}
```

```javascript
/* Fallback JavaScript for older browsers (if not using SSR to add the class) */
/* Check for support before running the script to avoid unnecessary work in modern browsers */
if (!CSS.supports('selector(:has(*))')) {
  // Find all components that need checking
  const cards = document.querySelectorAll('.article-card');

  cards.forEach((card) => {
    // If the critical content exists, manually add the fallback class
    if (card.querySelector('img')) {
      card.classList.add('has-image');
    }
  });
}
```
