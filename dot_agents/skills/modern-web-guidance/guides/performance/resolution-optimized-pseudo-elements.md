CSSの擬似要素（`::before` や `::after` など）で解像度最適化された画像を使うと、HTMLに余分なDOMノードを増やすことなく、装飾アイコンや構造グラフィックを追加できます。擬似要素を `image-set()` CSS関数と組み合わせることで、ブラウザに複数のフォーマット（AVIFやWebPなど）と解像度（`1x` や `2x` など）を提供できます。ブラウザはユーザーのデバイス性能に最適な画像を自動的に選択します。

### 実装

`image-set()` 関数は、擬似要素の `content` プロパティ内で直接使うこともでき、`content: ""` を設定した上で `background-image` プロパティ内で使うこともできます。`type()` による画像フォーマットの指定と、解像度（`1x` や `2x` など）の両方を指定するのが最良の結果を生みますが、これらの引数はどちらもオプションであることに注意してください。

```css
.icon-button::before {
  /* Using image-set directly in the content property */
  /* MANDATORY: Always order your formats from most optimized (AVIF) to least optimized (JPEG/PNG). 
     The browser will stop at the first supported format. */
  content: image-set(
    url("icon.avif") type("image/avif") 1x,
    url("icon-2x.avif") type("image/avif") 2x,
    url("icon.webp") type("image/webp") 1x,
    url("icon-2x.webp") type("image/webp") 2x,
    url("icon.png") type("image/png") 1x,
    url("icon-2x.png") type("image/png") 2x
  );
  
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
}
```

### フォールバック戦略

image-set() のBaselineステータス: Widely available。2023年9月18日からBaselineです。
対応ブラウザ: Chrome 113（2023年5月）、Edge 113（2023年5月）、Firefox 89（2021年6月）、Safari 17（2023年9月）。

`image-set()` 関数をサポートしない古いブラウザのために、`image-set()` のルールの *前に* 標準の画像宣言を提供 **しなければなりません**。このプログレッシブエンハンスメント戦略はCSSのカスケードの性質に依存します。サポートされないルールは無視されます。

```css
.icon-button::before {
  /* MANDATORY: Fallback for browsers that do not support image-set() */
  content: url("icon.png");
  
  /* Modern browsers will apply this and override the fallback */
  content: image-set(
    url("icon.avif") type("image/avif") 1x,
    url("icon-2x.avif") type("image/avif") 2x,
    url("icon.png") type("image/png") 1x,
    url("icon-2x.png") type("image/png") 2x
  );
}
```
