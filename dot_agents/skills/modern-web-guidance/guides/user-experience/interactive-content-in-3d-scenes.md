# 3D シーンでインタラクティブな HTML コンテンツを有効にする

HTML-in-Canvas API を使うと、canvas 要素の中に実際の DOM を直接レンダリングできます。WebGL、WebGPU、Three.js のような 3D レンダリングコンテキストに適用する場合、`layoutsubtree` 属性を追加すれば子孫の HTML 要素を 3D シーン内にシームレスに投影できます。重要なのは、これらの HTML 要素はアクティブな DOM レイアウトツリーの一部であり続けるため、完全なインタラクティブ性が保たれることです。複雑なレイキャスティングやカスタムなイベント処理を必要とせず、ユーザーはボタンのクリック、テキストの選択、フォーカス状態のトリガーなどをネイティブに行えます。

## 実装方法

### WebGL と WebGPU
WebGL や WebGPU を使うときは、次の手順に従います。

1. HTML-in-Canvas がブラウザでサポートされているか確認します。

```
if ('requestPaint' in HTMLCanvasElement.prototype) {
  // Use HTML in Canvas API
} else {
  // Use fallback strategy
}
```

2. `<canvas>` HTML 要素に `layoutsubtree` 属性を追加して、子孫の HTML 要素をサポートするように初期化します。`layoutsubtree` 属性付きの `<canvas>` 要素内に HTML コンテンツを配置します。

```html
<canvas id="canvas" layoutsubtree>
  <div id="html-content"></div>
</canvas>
```

3. canvas のグリッドをデバイスのスケールファクタに合わせてスケールし、ぼやけを防ぎます。

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
  typeof ResizeObserverEntry !== "undefined" &&
  "devicePixelContentBoxSize" in ResizeObserverEntry.prototype;
const options = supportsDevicePixelContentBox
  ? { box: "device-pixel-content-box" }
  : {};
observer.observe(canvas, options);
```

4. `canvas.onpaint` イベントハンドラの中で、HTML コンテンツを canvas にレンダリングします。

- WebGL コンテキストでは `texElementImage2D` メソッドを使用します。

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

- WebGPU コンテキストでは `copyElementImageToTexture` メソッドを使用します。

```js
canvas.onpaint = () => {
  root.device.queue.copyElementImageToTexture(valueElement, 512, 128, {
    texture: targetTexture,
  });
};
```

シーンをレンダリングするのに `requestAnimationFrame` ループを使う場合は、HTML コンテンツが canvas にレンダリングされるよう、ループ内で `canvas.requestPaint()` を呼び出します。子孫の HTML 要素に更新があった場合のみ canvas を再描画するようにしてください。

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

6. CSS の transform を更新します。

ブラウザはビューポートトランスフォームを使って 3D 座標空間から CSS 座標空間にマップする必要があります。これを実現するには、以下を行います。

- MVP 行列を DOM 行列に変換します。
- HTML 要素を正規化します。HTML 要素はピクセル単位（例: 200px 幅）でサイズが指定されますが、WebGL では通常オブジェクトを「単位正方形」（例: 0 から 1 の範囲）として扱います。正規化しないと、200px のボタンが 200 倍のサイズに見えてしまいます。
- canvas のビューポートにマッピングします。このステップは「リスケーリング」のフェーズで、単位空間の計算結果を、画面上の `<canvas>` 要素の実際のピクセル寸法に合わせて引き伸ばします。また、WebGL では上方向が正、CSS では下方向が正なので、Y 軸を反転します。
- 最終の transform を計算します。行列を順に掛け算します: Viewport * MVP * Normalization。これらをひとつの最終的な transform にまとめると、その HTML 要素レイヤを 3D 描画に揃えるためにどこに配置すべきかをブラウザに伝える「マップ」が得られます。
- その transform を HTML 要素に適用します。これによって HTML 要素レイヤがレンダリングされたピクセルの真上に配置されます。これにより、ユーザーがボタンをクリックしたりテキストを選択したりするとき、実際の HTML 要素に対する操作になります。

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

7. [トラブルシューティング] 開発者がステップ 5 の CSS transform を適用した後でも 3D 上の DOM 論理レイアウトの不一致を経験している場合、Chromium 148 以前で発生している問題でないかを確認してください。そうであれば、3D の DOMMatrix で `transform.is2D` が正しく false に設定されているかを確認します。そうでない場合は、DOMMatrix を再初期化して `is2D` を false に修正してから、ターゲットの HTML 要素に transform を適用してください。この問題は Chromium 149 以降で修正されており、新しい Chromium バージョンで発生する場合は is2D の値は原因ではありません。

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

### Three.js

1. HTML-in-Canvas がブラウザでサポートされているか確認します。

```
if ('requestPaint' in HTMLCanvasElement.prototype) {
  // Use HTML in Canvas API
} else {
  // Use fallback strategy
}
```

2. HTML コンテンツ用にカスタムの geometry と material を作成します。

3. DOM 要素を THREE.HTMLTexture に渡します。
```js
  material.map = new THREE.HTMLTexture(element);
  mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );
```

## サンプルコード

### WebGL Canvas

```html
<canvas id="canvas" layoutsubtree style="width: 400px; height: 400px;">
  <div id="ui-element">
    <p>WebGL UI Element</p>
    <button>Action</button>
  </div>
</canvas>

<script>
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");
  const uiElement = document.getElementById("ui-element");

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

### WebGPU Canvas

```html
<canvas id="canvas" layoutsubtree style="width: 400px; height: 400px;">
  <div id="ui-element">
    <p>WebGPU UI Element</p>
  </div>
</canvas>

<script>
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("webgpu");
  const uiElement = document.getElementById("ui-element");

  // Setup WebGPU...
  // const device = ...
  // const targetTexture = ...

  canvas.onpaint = () => {
    // 1. Copy HTML content to texture
    if (device.queue.copyElementImageToTexture) {
      device.queue.copyElementImageToTexture(uiElement, width, height, {
        texture: targetTexture,
      });
    }

    // 2. Sync DOM position (same matrix math as WebGL)
    if (canvas.getElementTransform) {
      const mvpDOM = new DOMMatrix(Array.from(htmlElementMVP));

      // Recalculate the DPR compensation mapping
      const dprX = canvas.width / canvas.clientWidth;
      const dprY = canvas.height / canvas.clientHeight;
      const gridWidth = uiElement.offsetWidth * dprX;
      const gridHeight = uiElement.offsetHeight * dprY;

      const cssToUnitSpace = new DOMMatrix()
        .scale(1 / gridWidth, -1 / gridHeight, 1 / gridHeight) // Retain Z scale
        .translate(-gridWidth / 2, -gridHeight / 2);

      const clipToCanvasViewport = new DOMMatrix()
        .translate(canvas.width / 2, canvas.height / 2)
        .scale(canvas.width / 2, -canvas.height / 2, canvas.height / 2); // Retain Z scale

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

### Three.js

```js
// 1. Initialize Three.js camera, scene, renderer, mesh, interactions;

// 2. Ensure HTML-in-Canvas feature support
if (!('requestPaint' in HTMLCanvasElement.prototype)) {
  // Use a fallback strategy
}

// 3. Initialize the source HTML DOM element
const element = document.createElement('div');
element.innerHTML = '<h1>Hello World</h1>';

// 4. Create geometry and material
const geometry = new RoundedBoxGeometry( 100, 100, 100, 10, 10 );
const material = new THREE.MeshStandardMaterial( { roughness: 0, metalness: 0.5 } );

// 5. Pass the DOM element into THREE.HTMLTexture
material.map = new THREE.HTMLTexture(element);

mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );

// 6. Render Loop
function animate() {
  renderer.render(scene, camera);
}
```

## ベストプラクティス

- **必須**: 使用前に HTML-in-Canvas API のブラウザサポートを確認すること。
- **必須**: WebGL や WebGPU を使う際は、`<canvas>` 要素に常に `layoutsubtree` 属性を付けること。
- **必須**: WebGL や WebGPU を使う際は、`onpaint` イベントハンドラで HTML コンテンツを canvas にレンダリングすること。
- **必須**: HTML コンテンツを canvas にレンダリングする際は WebGL では `texElementImage2D`、WebGPU では `copyElementImageToTexture` メソッドを使用すること。
- **必須**: WebGL や WebGPU を使う際は、レンダリングされたコンテンツの transform に合わせて HTML 要素の `style.transform` プロパティを設定し、CSS transform を更新すること。
- **必須**: 画面サイズを監視して canvas サイズをデバイスピクセルに合わせて更新すること。`ResizeObserver` の使用を例として推奨します。
- **禁止**: canvas にクロスオリジンのコンテンツを埋め込まないこと。サポートされていません。
- **禁止**: メモリリークの原因となるため、`onpaint` イベントハンドラ内で `ResizeObserver` を初期化しないこと。

### フォールバック戦略

HTML in canvas は現状どの主要ブラウザでもネイティブにはサポートされていません。

HTML-in-Canvas API は現在すべてのモダンブラウザでサポートされているわけではないため、通常はフォールバック戦略が必要です。

ただし、この API がもたらすパフォーマンス上のメリットを考えると、ブラウザがサポートしている場合は HTML-in-Canvas を使うべきです。

フォールバック戦略はユースケースに依存します。たとえば、canvas 内のインタラクティブな HTML コンテンツの場合、HTML-in-Canvas がサポートされていなければ CSS で HTML コンテンツを canvas の上に重ねて配置します。

### HTML-in-Canvas ポリフィル

サポートしていないブラウザで HTML-in-Canvas API を模倣するには、次のポリフィルスクリプトを使用します。

1. ライブラリをインストールするか埋め込みます。

```
# Install
npm install three-html-render
```

```
# Embed
<script src="https://cdn.jsdelivr.net/npm/three-html-render/dist/polyfill.js"></script>
```

2. `installHtmlInCanvasPolyfill()` メソッドを実行して HTML-in-Canvas を翻訳します。
