# スクロールバーの色や太さをカスタマイズする

標準のCSSプロパティ `scrollbar-color` と `scrollbar-width` を使って、スクロールバーの見た目をカスタマイズできます。

*   **`scrollbar-color`**: 2つの `<color>` 値を受け取ります。最初はサム（動く部分）、2番目はトラック（固定の背景）に適用されます。
*   **`scrollbar-width`**: `auto`（デフォルト）、`thin`（細いバリアント）、または `none`（スクロール機能を維持しつつスクロールバーを完全に非表示）を受け取ります。

## `scrollbar-color` と `scrollbar-width` の適用

MANDATORY: `scrollbar-color` と `scrollbar-width` はスクロール可能なコンテナで使用してください。

`scrollbar-color` を使う際は、可読性と保守性（特にフォールバックを使う場合）のため、サムとトラックの色を別々のCSS変数に分けてください。

```css
.scroller {
  --scrollbar-thumb: var(--color-neutral-70);
  --scrollbar-track: var(--color-neutral-90);

  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}
```

## フォールバック戦略

scrollbar-width のBaselineステータス: Newly available。2024-12-11からBaselineです。
対応ブラウザ: Chrome 121 (Jan 2024)、Edge 121 (Jan 2024)、Firefox 64 (Dec 2018)、Safari 18.2 (Dec 2024)。

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
