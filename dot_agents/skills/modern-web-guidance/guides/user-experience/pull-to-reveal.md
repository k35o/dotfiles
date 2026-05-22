# プルトゥリビール

「プルトゥリビール」は、初回読み込み時にスクロール可能領域の上端より上にコンテンツ（検索バーやリフレッシュコントロールなど）を隠しておき、ユーザーが下に引っ張る（上方向にスクロールする）ことでそれを表示できるUIパターンです。このパターンはモバイルアプリやWebアプリでよく見られ、検索バーやフィルターなどアクセスできるべきだが最初は見せたくない補助的なコントロールに使われます。

CSSプロパティ`scroll-initial-target`は、このパターンを宣言的にCSSのみで実装する方法を提供します。メインのコンテンツ要素に`scroll-initial-target: nearest`を指定すれば、スクロールコンテナは隠したいコンテンツを画面外にスクロールした状態でレンダリングされます。これまでは、JavaScript（`Element.scrollIntoView()`）かURLフラグメント識別子（`#content-id`）に頼る必要があり、いずれにも制約があり実装も難しいものでした。

## 実装方法

プルトゥリビールパターンを実装するには:

1. **スクロールコンテナを用意する:** 対象要素はスクロールコンテナ（`overflow: auto`などスクロールを許可するオーバーフロー設定の要素）の内側にある必要があります。これは祖先要素ならどれでも構わず、ルートの`<html>`要素も含みます。
2. **隠す要素を定義する:** 隠したいコンテンツ（例: 検索バー）を、スクロールコンテナ内の最初の子孫として配置します。この要素が初回読み込み時に画面外にスクロールされます。
3. **メインコンテンツを定義する:** 隠した要素の直後にメインコンテンツ要素を配置します。これはユーザーが最初に目にする要素です。
4. **メインコンテンツをターゲットにする:** メインコンテンツ要素に`scroll-initial-target: nearest`を適用すると、スクロールコンテナはその要素をスクロール表示した状態でレンダリングされ、その上の要素は隠れます。
5. **スクロールスナップを追加する:** 隠す要素が常に完全に見えるか完全に隠れるかのいずれかの状態（部分的にスクロールされた状態にならない）にするため、スクロールコンテナに`scroll-snap-type: y mandatory`を追加し、隠す要素とメインコンテンツの両方に`scroll-snap-align: start`を追加します。

## コード例: プルトゥリビールの検索

```css
/**
 * ANCESTOR: Define the scroll container.
 * Scroll snapping ensures the search bar is always
 * either fully visible or fully hidden.
 */
.scroll-container {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
}

/**
 * HIDDEN ELEMENT: The search bar hidden above the fold on load.
 * It has scroll-snap-align so it snaps into place when pulled down.
 */
.search-bar {
  height: 60px;
  scroll-snap-align: start;
}

/**
 * MAIN CONTENT + TARGET: The element the user sees first.
 * scroll-snap-align makes it a valid snap point.
 * scroll-initial-target tells the browser to scroll here on
 * initial render, hiding the search bar above it.
 */
.main-content {
  scroll-snap-align: start;
  scroll-initial-target: nearest;
}
```

## 戦略的な実装とベストプラクティス

- **DO** スクロール可能領域の特定の部分に読み込み時にユーザーの注意を引き、検索バーのような周辺UI要素を意図的に最上部に隠したいときに、`scroll-initial-target: nearest`を使ってください。
- **DO NOT** これをアクセシビリティのフォーカスと混同しないでください。このプロパティは**視覚的な**ビューポートのみを移動し、キーボードフォーカスは移動しません。ターゲットがキーボードユーザーの開始点である場合は、`element.focus()`を手動で管理する必要があります。
- **DO NOT** 読み込み時にスムーズな「スクロール」アニメーションが必要な場合は使わないでください。このプロパティは離散的で、レイアウト段階で位置を即座に設定します。
- **DO NOT** 同じスクロール可能なコンテナ内の複数の要素に`scroll-initial-target`を設定しないでください。複数の要素が`scroll-initial-target: nearest`を指定した場合、ブラウザはDOMツリー順で最初に現れるものを選びます。
- **DO** **優先順位の階層**を考慮してください: URLフラグメント（例: `example.com/#top`）とコンテナレベルの`scroll-start`プロパティはどちらも`scroll-initial-target`より優先されます。

## フォールバック戦略

scroll-initial-target has limited availability.
Supported by: Chrome 133 (Feb 2025) and Edge 133 (Feb 2025).
Unsupported in: Firefox and Safari.

このAPIをまだサポートしないブラウザでは、JavaScriptフォールバックを使ってください。なお、コンテンツを引っ張って表示する用途では、メインコンテンツをコンテナの`start`（上端）にバインドしたいはずです。

```javascript
/**
 * Progressive Enhancement Fallback
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check for native CSS support
  if (!CSS.supports('scroll-initial-target', 'nearest')) {
    const targetContent = document.querySelector('.main-content.target');
    if (targetContent) {
      // Use behavior: "instant" to mimic the native CSS behavior
      // 'block: start' should match your CSS 'scroll-snap-align' (or expected top position)
      targetContent.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }
});
```
