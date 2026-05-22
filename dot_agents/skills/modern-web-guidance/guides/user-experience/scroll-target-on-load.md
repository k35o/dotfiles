# 初期描画時のスクロールターゲットを設定する

CSSプロパティ `scroll-initial-target` は、スクロールコンテナがレンダリングされた直後に、その子孫要素の特定のものを表示領域に表示させる、宣言的でCSSのみの方法を提供します。これまで開発者は JavaScript(`Element.scrollIntoView()`)やURLのフラグメント識別子(`#item-id`)に頼っていましたが、どちらにも制約があり実装も難しいものでした。

## 実装方法

実装を成功させるには次の手順に従います。

1. **スクロールコンテナを確保する:** ターゲット要素はスクロールコンテナ(`overflow: auto` のようにスクロール可能な overflow を持つ要素)の中に含まれている必要があります。これはルートの `<html>` 要素を含めて、どの祖先要素でも構いません。
2. **アイテムをターゲットにする:** 表示させたい特定の子孫要素に `scroll-initial-target: nearest` を適用します。

## サンプルコード: 垂直メディアフィード

この例では、リストの先頭ではなく、特定の「注目」アイテムにスクロールされた状態でフィードが始まります。

```css
/** 
 * TARGET: The item that should be visible on initial load.
 */
.item.target {
  scroll-initial-target: nearest;
}
```

## 戦略的実装とベストプラクティス

- **DO** カレンダーが当日から始まる、ギャラリーが特定の画像から始まる、といった「途中から始まる」体験には `scroll-initial-target` を使用してください。
- **DO NOT** これをアクセシビリティのフォーカス移動と混同しないでください。このプロパティは **視覚的** なビューポートを移動させるだけで、キーボードフォーカスは移動しません。キーボード利用者向けの起点としてターゲットを使う場合は、`element.focus()` を手動で管理する必要があります。
- **DO NOT** ロード時にスムーズな「スクロール」アニメーションが必要な場合はこのプロパティを使わないでください。このプロパティは離散的で、レイアウトフェーズ中にスクロール位置を即座に設定します。
- **DO NOT** 同じスクロール可能コンテナ内の複数の要素に `scroll-initial-target` を設定しないでください。複数の要素が `scroll-initial-target: nearest` を指定すると、ブラウザはDOMツリー順で最初に現れる要素を選択します。
- **DO** メディアにはサイズを指定してください。スクロール位置は初期レイアウト時に計算されるため、画像や動画には `aspect-ratio` または固定の `height`/`width` を指定し、メディアの読み込み後にターゲット位置がずれるのを防いでください。
- **DO** **優先順位の階層** を考慮してください。URLフラグメント(例: `example.com/#top`)とコンテナレベルの `scroll-start` プロパティはどちらも `scroll-initial-target` より優先されます。

## フォールバック戦略

scroll-initial-target は限定的に利用可能です。
対応ブラウザ: Chrome 133 (2025年2月)、Edge 133 (2025年2月)。
未対応: Firefox、Safari。

このAPIをまだサポートしていないブラウザ向けには、JavaScriptフォールバックを使用します。`DOMContentLoaded` イベントを使用して、HTMLパースが完了するとすぐに要素を表示させることで、すべての画像やリソースの読み込みを待つよりも高速な体験を提供できます。あるいは、スクリプトを `<body>` 要素の末尾に置く方法でも構いません。その場合はイベントリスナーを使う必要がありません。

```javascript
/**
 * Progressive Enhancement Fallback
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check for native CSS support
  if (!CSS.supports('scroll-initial-target', 'nearest')) {
    const feedTarget = document.querySelector('.item.target');
    if (feedTarget) {
      // 'block: center' ensures the featured media is centered in view
      feedTarget.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  }
});
```
