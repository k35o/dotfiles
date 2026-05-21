# WebGLシェーダーをHTMLコンテンツに適用する

WebGLシェーダーは強力なGPUアクセラレーションによる視覚効果を提供し、動的なリップル歪み、ライティングモデル、カラーグレーディング、カスタムバーテックス変換などの高度な機能を可能にします。HTML-in-Canvas APIにより、開発者はWebGLテクスチャをHTMLコンテンツに適用できます。これにより、ボタン、入力フィールド、リッチテキストなど、完全にインタラクティブなUIコンポーネントに対して、ネイティブのアクセシビリティ、テキスト選択、DOMイベント処理を保ったまま、高性能なフラグメントシェーダーとバーテックスシェーダーをネイティブに適用できます。

## 実装方法

1. HTML-in-Canvasがブラウザでサポートされているかをチェックします:

```
if ('requestPaint' in HTMLCanvasElement.prototype) {
  // Use HTML in Canvas API
} else {
  // Use fallback strategy
}
```

2. `<canvas>` HTML要素に `layoutsubtree` 属性を追加します。
3. `layoutsubtree` 属性を持つ `<canvas>` 要素の中にHTMLコンテンツを配置します。

```html
<canvas id="canvas" layoutsubtree>
  <div id="html-content"></div>
</canvas>
```

4. ぼやけを防ぐため、キャンバスグリッドをデバイスのスケール係数に合わせてスケールします:

```js
const observer = new ResizeObserver(([entry]) => {
  const dpc = entry.devicePixelContentBoxSize;
  canvas.width = dpc
    ? dpc[0].inlineSize
    : Math.round(entry.contentRect.width * window.devicePixelRatio);
  canvas.height = dpc
    ? dpc[0].blockSize
    : Math.round(entry.contentRect.height * window.devicePixelRatio);
});

const supportsDevicePixelContentBox =
  typeof ResizeObserverEntry !== 'undefined' &&
  'devicePixelContentBoxSize' in ResizeObserverEntry.prototype;
const options = supportsDevicePixelContentBox
  ? { box: 'device-pixel-content-box' }
  : {};
observer.observe(canvas, options);
```

5. `canvas.onpaint` イベントハンドラ内で `texElementImage2D` メソッドを使ってHTMLコンテンツをキャンバスにレンダリングします:

```js
canvas.onpaint = () => {
  if (gl.texElementImage2D) {
    gl.texElementImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      uiElement,
    );
  }
};
```

シーンのレンダリングに `requestAnimationFrame` ループを使用する場合、ループ内で `canvas.requestPaint()` を呼び出してHTMLコンテンツがキャンバスにレンダリングされるようにしてください。子孫HTML要素が更新された場合にのみキャンバスを再レンダリングするようにしてください:

```js
function render() {
  // Request to update the canvas
  canvas.requestPaint();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

canvas.onpaint = (event) => {
  if (event.changedElements && event.changedElements.length > 0) {
    // Update the texture with texElementImage2D, and update the CSS transform as shown in step 6
  }
};
```

6. CSSトランスフォームを更新します。

ブラウザは3D座標空間からCSS座標空間へのマッピングをビューポートトランスフォームで行う必要があります。これを容易にするため、次の処理を行います:

- WebGLのMVP行列をDOM行列に変換する。
- HTML要素を正規化する。HTML要素はピクセル単位（例: 200px幅）でサイズ指定されます。一方WebGLでは通常、オブジェクトを「単位正方形」（例: 0から1の範囲）として扱います。正規化しないと、200pxのボタンが200倍の大きさに見えます。
- キャンバスのビューポートにマップする。これは「再スケーリング」フェーズで、その単位空間の数学を画面上の `<canvas>` 要素の実際のピクセル寸法に合わせて引き伸ばします。また、WebGLでは上向きが正、CSSでは下向きが正なので、Y軸を反転します。
- 最終的なトランスフォームを計算する。行列を順に乗算します: Viewport _ MVP _ Normalization。これらを1つの最終トランスフォームに結合することで、HTML要素レイヤーが3D描画と整合する正確な位置をブラウザに示す「マップ」が生まれます。
- そのトランスフォームをHTML要素に適用する。これによりHTML要素レイヤーが、描画されたピクセルの真上に重なります。ユーザーがボタンをクリックしたりテキストを選択したりするとき、実際のHTML要素にヒットすることが保証されます。

```js
if (canvas.getElementTransform) {
  // 1. Convert WebGL MVP Matrix to DOM Matrix
  const mvpDOM = new DOMMatrix(Array.from(htmlElementMVP));

  // 2. Normalize the HTML element (Canvas Grid pixels -> WebGL Model Space)
  const dprX = canvas.width / canvas.clientWidth;
  const dprY = canvas.height / canvas.clientHeight;
  const gridWidth = targetHTMLElement.offsetWidth * dprX;
  const gridHeight = targetHTMLElement.offsetHeight * dprY;

  const toGLModel = new DOMMatrix()
    // Scale pixels to 1 unit, flip Y (as in CSS it points down, and in WebGL it points up)
    .scale(1 / gridWidth, -1 / gridHeight, 1 / gridHeight)
    // Center the origin: (0,0) becomes (-width/2, -height/2) before scaling
    .translate(-gridWidth / 2, -gridHeight / 2);

  // 3. Map to the canvas viewport
  const clipToCanvasViewport = new DOMMatrix()
    // Move center (0,0) to center of canvas
    .translate(canvas.width / 2, canvas.height / 2)
    // Scale normalized clip (-1..1) to viewport size
    .scale(canvas.width / 2, -canvas.height / 2, canvas.height / 2);

  // 4. Multiply: (Clip -> Pixels) * (MVP) * (pixels -> unit square)
  const screenSpaceTransform = clipToCanvasViewport
    .multiply(mvpDOM)
    .multiply(toGLModel);

  // 5. Apply to the transform
  const computedTransform = canvas.getElementTransform(
    targetHTMLElement,
    screenSpaceTransform,
  );
  targetHTMLElement.style.transform = computedTransform.toString();
}
```

7. [トラブルシューティング] CSSトランスフォームを手順5から適用した後でも、3D内のDOM論理レイアウトのミスマッチが発生している場合、Chromium 148以前で発生していないか確認してください。その場合は、3D DOMMatrixに対して `transform.is2D` が正しくfalseになっているかを確認してください。そうでない場合は、DOMMatrixを再初期化して `is2D` をfalseに修正してから、対象のHTML要素にトランスフォームを適用してください。この問題はChromium 149以降で修正されており、新しいChromiumバージョンで発生する場合はis2D値が原因ではありません:

```js
if (transform.is2D) {
  // Workaround for Chromium bug https://crbug.com/512171941
  // affecting Chrome versions under 149 where `transform.is2D`
  // is incorrectly true for a 3D DOMMatrix. The assignment
  // below re-initializes the DOMMatrix which corrects is2D to be false.
  transform = DOMMatrix.fromFloat64Array(transform.toFloat64Array());
}
targetHTMLElement.style.transform = computedTransform.toString();
```

## サンプルコード

```html
<canvas id="canvas" layoutsubtree style="width: 400px; height: 400px;">
  <div id="ui-element">
    <p>WebGL UI Element</p>
    <button>Action</button>
  </div>
</canvas>

<script>
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl');
  const uiElement = document.getElementById('ui-element');

  // Setup WebGL texture...
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  canvas.onpaint = () => {
    // 1. Update texture with HTML content
    if (gl.texElementImage2D) {
      gl.texElementImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        uiElement,
      );
    }

    // ... Render your 3D scene here, calculating htmlElementMVP matrix ...

    // 2. Sync DOM position with 3D scene
    if (canvas.getElementTransform) {
      const mvpDOM = new DOMMatrix(Array.from(htmlElementMVP));

      // Recalculate the DPR compensation mapping
      const dprX = canvas.width / canvas.clientWidth;
      const dprY = canvas.height / canvas.clientHeight;
      const gridWidth = uiElement.offsetWidth * dprX;
      const gridHeight = uiElement.offsetHeight * dprY;

      const cssToUnitSpace = new DOMMatrix()
        .scale(1 / gridWidth, -1 / gridHeight, 1 / gridHeight)
        .translate(-gridWidth / 2, -gridHeight / 2);

      const clipToCanvasViewport = new DOMMatrix()
        .translate(canvas.width / 2, canvas.height / 2)
        .scale(canvas.width / 2, -canvas.height / 2, canvas.height / 2);

      const screenSpaceTransform = clipToCanvasViewport
        .multiply(mvpDOM)
        .multiply(cssToUnitSpace);

      const computedTransform = canvas.getElementTransform(
        uiElement,
        screenSpaceTransform,
      );
      uiElement.style.transform = computedTransform.toString();
    }
  };
</script>
```

## ベストプラクティス

- **MANDATORY**: 使用する前に、HTML-in-Canvas APIのブラウザサポートを確認してください。
- **MANDATORY**: `<canvas>` 要素には常に `layoutsubtree` 属性を追加してください。
- **MANDATORY**: `onpaint` イベントハンドラを使ってHTMLコンテンツをキャンバスにレンダリングしてください。
- **MANDATORY**: `texElementImage2D` メソッドを使ってHTMLコンテンツをキャンバスにレンダリングしてください。
- **MANDATORY**: HTML要素の `style.transform` プロパティを設定して、CSSトランスフォームをレンダリングされたコンテンツのトランスフォームに一致させて更新してください。
- **MANDATORY**: `ResizeObserver` を使って画面サイズを監視し、キャンバスサイズをデバイスピクセルに合わせて更新してください。
- **DO NOT**: クロスオリジンのコンテンツをキャンバスに埋め込まないでください。サポートされていません。
- **DO NOT**: メモリリークの原因となる可能性があるため、`onpaint` イベントハンドラ内で `ResizeObserver` を初期化しないでください。

### フォールバック戦略

HTML in canvasはまだ主要ブラウザのいずれにもネイティブにサポートされていません。

HTML-in-Canvas APIは現状すべての最新ブラウザでサポートされているわけではないため、通常はフォールバック戦略が必要です。

ただし、このAPIによるパフォーマンス上の利点を考慮すると、ブラウザがサポートしている場合はHTML-in-Canvasを使うべきです。

フォールバック戦略はユースケースに依存します。たとえば、インタラクティブなHTMLコンテンツをキャンバスに表示する用途で、HTML-in-Canvasがサポートされていない場合は、CSSを使ってキャンバスの上にHTMLコンテンツを配置します。

### HTML-in-Canvasポリフィル

サポートしないブラウザでHTML-in-Canvas APIを模倣するには、以下のポリフィルスクリプトを使用してください。

1. ライブラリをインストールまたは埋め込みます:

```
# Install
npm install three-html-render
```

```
# Embed
<script src="https://cdn.jsdelivr.net/npm/three-html-render/dist/polyfill.js"></script>
```

2. `installHtmlInCanvasPolyfill()` メソッドを実行してHTML-in-Canvasを変換します。
