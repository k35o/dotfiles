スクロール可能なコンテナのスナップ位置とUIの状態を同期するには、従来は複雑なスクロールイベントリスナー、スクロールオフセットの手動計算、Intersection Observer が必要でした。`scrollsnapchange` イベントは、スクローラーが新しいスナップ対象に落ち着いたことを検出するためのネイティブで効率的な方法を提供し、サイドバーの同期や目次内のアクティブセクションのハイライトに有用です。

## 実装

### 1. CSSでスクロールスナップを構成する

コンテナに `scroll-snap-type` を定義し、子要素に `scroll-snap-align` を設定して、ブラウザがスナップ対象を追跡できるようにする必要があります。目次付きの長い記事では、これを使ってセクション見出しをビューポートの上端にスナップさせることができます。

```css
main {
  /* Enable scroll snapping on the container */
  scroll-snap-type: y proximity;
  overflow-y: auto;
}

h2 {
  /* Define how headers align when snapped */
  scroll-snap-align: start;
}
```

### 2. スナップの変化をリッスンする

スクロールコンテナに `scrollsnapchange` イベントを使い、ユーザーがスクロールを終えてブラウザが新しい要素にスナップしたタイミングで反応します。本ドキュメントの目次デモではこれを使ってサイドバーのアクティブリンクをハイライトしています。

```html
<!-- MANDATORY: 目次のリンクは適切なナビゲーションランドマークで囲むこと -->
<nav aria-label="Table of contents">
  <ul>
    <li><a href="#section-1" aria-current="location">Section 1</a></li>
    <li><a href="#section-2">Section 2</a></li>
  </ul>
</nav>
```

```javascript
const main = document.getElementById('main');
const links = document.querySelectorAll('nav a');

// The event fires when the scroller settles on a new snap target
main.addEventListener('scrollsnapchange', (event) => {
  // Use snapTargetBlock for vertical or snapTargetInline for horizontal
  const snappedHeader = event.snapTargetBlock;

  if (snappedHeader) {
    setSelectedParagraph(snappedHeader.id);
  }
});
```

## アクセシビリティ

注意: スクロールスナップイベントを使えばスクローラーの状態に視覚的に他のコンテンツを同期させることはできますが、その情報がプログラム的に自動で公開されるわけではありません。要素間の関係、アクティブ状態、ライブコンテンツはアクセシビリティツリーに反映する必要があります。

目次の場合、サイドバーのリンクがアクティブな時には `aria-current="true"` か `aria-current="location"` を使うようにしてください。

加えて、`scroll-snap-type` に `mandatory` 値を使う場合は、スナップポイント間のコンテンツが画面より長いときにそのコンテンツへアクセスできなくなる可能性があるため注意してください。

## フォールバック戦略

スクロールスナップイベントは限定的に利用可能です。
対応ブラウザ: Chrome 129 (2024年9月)、Edge 129 (2024年9月)。
未対応: Firefox、Safari。

`scrollsnapchange` がサポートされていない場合は、`IntersectionObserver` を使ってスクローラーの上端にある要素を検出します。これは `scrollsnapchange` とは挙動が異なり、スクロールが落ち着いたタイミングだけでなくスクロール中も発火する点に注意してください。

```javascript
// Feature detect support for scroll snap events
if (!('onscrollsnapchange' in HTMLElement.prototype)) {
  const observer = new IntersectionObserver(
    () => {
      // Each time the set of intersecting headers changes, find the top
      // header that is visible.
      const topEntry = [...headers].reduce((currentTop, header) => {
        // Use the bottom to handle scrolling up, when the top is still offscreen
        const {bottom} = header.getBoundingClientRect();
        // Don't match if the header's bottom is aboce the scrollport
        if (bottom < 0) return;
        if (!currentTop) return header;
        return bottom <
          currentTop.getBoundingClientRect().bottom
          ? header
          : currentTop;
      }, undefined);
      if (topEntry) setSelectedParagraph(topEntry.id);
    },
    { root: main, threshold: 0.9 // Adjust based on your use case },
  );

  // Observe all snap targets (e.g., section headers)
  document.querySelectorAll('h2').forEach(header => observer.observe(header));
}
```
