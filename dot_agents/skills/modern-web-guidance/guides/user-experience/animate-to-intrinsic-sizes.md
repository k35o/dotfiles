# 内在サイズへのアニメーション

`block-size: auto` や `inline-size: max-content` のような動的なサイズへ要素をアニメーションさせるには、これまでJavaScriptや脆い「max-height」のハックが必要でした。`interpolate-size` プロパティと `calc-size()` 関数により、ブラウザは固定長と内在サイズキーワードの間を自然に補間できるようになります。

## 実装手順

1.  **キーワード補間をオプトインする**: 親要素（通常は `:root`）に `interpolate-size: allow-keywords` を適用して、内在キーワードを使うプロパティのトランジションを有効化します。
2.  **トランジションを定義する**: 対象要素にサイズプロパティ（例: `block-size`、`inline-size`）の `transition` を設定します。
3.  **内在キーワードを使う**: インタラクション（例: `:hover` や状態クラス）の際に、サイズプロパティをサポートされている内在キーワード—`auto`、`min-content`、`max-content`、`fit-content`、もしくは（flex-basis向けに）`content`—に変更します。
4.  **計算を行う（任意）**: 内在サイズに対して計算（例: `auto + 2rem`）が必要な場合は `calc-size()` を使います。`calc-size()` は基準に依存しない計算のために `any` キーワードもサポートします。

## 例: 汎用的な展開パターン

このパターンは、任意のコンテナ（「もっと見る」セクションやナビゲーションメニューなど）に適用して、制限された高さと要素の自然なサイズの間でトランジションさせることができます。

```css
/* Opt-in globally for all children */
:root {
  /* MANDATORY: Transitions to intrinsic keywords are disabled by default for compatibility */
  interpolate-size: allow-keywords;
}

.expandable-container {
  /* 1. Define a fixed initial size (or 0) and hide overflow */
  block-size: 100px;
  overflow: hidden;

  /* 2. Transition the sizing property */
  transition: block-size 0.4s ease-out;
}

.expandable-container.is-expanded {
  /* 3. Smoothly animate to the intrinsic natural height */
  block-size: auto;
}
```

## 例: 計算された内在 inline-size

```css
.badge {
  inline-size: 40px;
  overflow: hidden;
  white-space: nowrap;
  transition: inline-size 0.3s ease;
}

.badge:hover {
  /* calc-size(basis, calculation) */
  /* 'size' refers to the evaluated basis (max-content in this case) */
  inline-size: calc-size(max-content, size + 20px);
}
```

## 例: 内在サイズから固定サイズへのトランジション

逆方向のアニメーション—自然なサイズから始めて特定の長さへ縮小する—も可能です。「dismissible」コンポーネントに有用です。

```css
.collapsible-alert {
  /* 1. Start with the natural content height */
  block-size: auto;
  overflow: hidden;
  transition:
    block-size 0.5s ease-in-out,
    opacity 0.5s ease;
}

.collapsible-alert.is-dismissed {
  /* 2. Smoothly collapse to zero */
  block-size: 0;
  opacity: 0;
  pointer-events: none;
}

/* MANDATORY Copy-Paste Safety: Disable sizing animations for sensitive users */
@media (prefers-reduced-motion: reduce) {
  .expandable-container,
  .badge,
  .collapsible-alert {
    transition: none !important;
  }
}
```

```javascript
// MANDATORY Accessibility Synchronization: Ensure elements collapsed to zero dimensions are removed from the assistive technology tree, and sync aria-expanded states on triggers.
const alertElement = document.querySelector('.collapsible-alert');
alertElement.addEventListener('transitionend', (e) => {
  if (
    e.propertyName === 'block-size' &&
    alertElement.classList.contains('is-dismissed')
  ) {
    alertElement.hidden = true;
  }
});

// Example trigger syncer
const triggerBtn = document.querySelector('.accordion-trigger');
triggerBtn?.addEventListener('click', () => {
  const isExpanded = triggerBtn.getAttribute('aria-expanded') === 'true';
  triggerBtn.setAttribute('aria-expanded', !isExpanded);
});
```

## 主な制約

- **キーワード同士の制限**: 2つの異なるキーワード間（例: `min-content` から `max-content`）を直接アニメーションさせることはできません。トランジションの一方は固定長またはパーセンテージである必要があります（例: `0` から `auto`）。
- **calc-size 構文**: `calc-size()` の中で、同じ式内に異なる内在キーワードを混ぜることはできません。第1引数（基準）が `size` の意味を定義します。
- **オプトイン要件**: 内在キーワードへのトランジションは後方互換性のためにデフォルトで無効（`numeric-only`）です。要素または祖先に `interpolate-size: allow-keywords` を適用する必要があります。`calc-size()` は使用されると自動的に補間を有効化するため、プロパティごとのオーバーライドとして機能します。

## フォールバック戦略

interpolate-size は limited availability。
対応ブラウザ: Chrome 129 (Sep 2024)、Edge 129 (Sep 2024)。
非対応: Firefox、Safari。
calc-size() は limited availability。
対応ブラウザ: Chrome 129 (Sep 2024)、Edge 129 (Sep 2024)。
非対応: Firefox、Safari。

`interpolate-size` と `calc-size()` はプログレッシブエンハンスメントです。サポートしないブラウザでは目標サイズへ瞬時にジャンプします。

- **グレースフルデグラデーション**: 単純な `block-size: auto` のトランジションでは、標準ブラウザは即座にサイズを切り替えるだけで、機能はしますが洗練さに欠けます。
- **手動キーワードフォールバック**: `calc-size()` を使う場合は、古いブラウザが `calc-size()` 宣言全体を破棄するため、必ず標準のキーワードフォールバックを提供してください。

```css
.card {
  block-size: auto; /* Fallback for older browsers */
  block-size: calc-size(auto, size); /* Modern browsers use this */
  transition: block-size 0.3s ease;
}
```
