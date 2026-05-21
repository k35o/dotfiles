# canvas から HTML コンテンツをエクスポートする

Web アプリケーションでは、カスタマイズされたダッシュボード、スタイリング済みのドキュメント、インタラクティブなチャートなどのリッチな HTML コンテンツを、静止画や動画として記録・エクスポートしたいケースが頻繁にあります。歴史的にはこれを実現するため、DOM ノードと CSS プロパティを手動で解析し、視覚的なコピーを canvas に再構築するような重厚なサードパーティライブラリが必要でした。このアプローチは計算コストが高く、エラーが発生しやすく、モダンな CSS レイアウト機能をサポートできないことが多々ありました。HTML-in-Canvas API を使うと、開発者は実際の DOM 要素を canvas のコンテキストに直接レンダリングできます。ブラウザのネイティブレンダリングエンジンが HTML サブツリーをピクセルパーフェクトに描画するため、`toDataURL()`、`toBlob()`、`captureStream()` のような組み込みの canvas メソッドを使えば、見た目どおりの出力を画像や動画ストリームとして高効率にキャプチャできます。

## 実装方法

1. HTML-in-Canvas がブラウザでサポートされているか確認します。

```
if ('requestPaint' in HTMLCanvasElement.prototype) {
  // Use HTML in Canvas API
} else {
  // Use fallback strategy
}
```

2. canvas が子孫の HTML 要素をレンダリングできるように初期化します。`<canvas>` HTML 要素に `layoutsubtree` 属性を追加してください。`layoutsubtree` 属性のついた `<canvas>` 要素内に HTML コンテンツを配置します。

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

- 2D コンテキストでは `drawElementImage` メソッドを使用します。

```js
canvas.onpaint = () => {
  ctx.reset();
  // Draw the form element at x:0, y:0
  let transform = ctx.drawElementImage(form_element, 0, 0);
};
```

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
      // Update the texture with drawElementImage, texElementImage2D, or copyElementImageToTexture, and update the CSS transform as shown in step 5
    }
  };
  ```

5. CSS の transform を更新します。

- 2D コンテキストの場合、レンダリング呼び出しから返された transform を `style.transform` プロパティに適用します。

```js
canvas.onpaint = () => {
  ctx.reset();
  // Draw the form element at x:0, y:0
  let transform = ctx.drawElementImage(form_element, 0, 0);

  // Sync the DOM location with the drawn location
  form_element.style.transform = transform.toString();
};
```

- WebGL や WebGPU を使う 3D の場合、ブラウザはビューポートトランスフォームを使って 3D の座標空間から CSS の座標空間にマップする必要があります。これを実現するには、以下を行います。
  - WebGL の MVP 行列を DOM 行列に変換します。
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

6. [トラブルシューティング] 開発者がステップ 5 の CSS transform を適用した後でも 3D 上の DOM 論理レイアウトの不一致を経験している場合、Chromium 148 以前で発生している問題でないかを確認してください。そうであれば、3D の DOMMatrix で `transform.is2D` が正しく false に設定されているかを確認します。そうでない場合は、DOMMatrix を再初期化して `is2D` を false に修正してから、ターゲットの HTML 要素に transform を適用してください。この問題は Chromium 149 以降で修正されており、新しい Chromium バージョンで発生する場合は is2D の値は原因ではありません。

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

7. `toDataURL()`、`toBlob()`、`captureStream()` といった通常の canvas エクスポートメソッドを使用します。エクスポートされたデータにはレンダリング済みの HTML コンテンツが含まれます。

## サンプルコード

```html
<body>
    <canvas id="canvas" style="width: 400px; height: 200px;" layoutsubtree>
        <input id="element">
    </canvas>
    
    <button id="download">Download Image</button>

    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const element = document.getElementById('element');
        const download = document.getElementById('download');

        canvas.onpaint = (event) => {
            ctx.reset();
            // Draw the element into the canvas
            const transform = ctx.drawElementImage(element, 10, 10);
            // Synchronize DOM position for hit testing (typing)
            element.style.transform = transform.toString();
        };

        download.onclick = () => {
            // Export the canvas content as an image
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'exported-canvas.png';
            link.href = dataURL;
            link.click();
        };

        // Re-initialize canvas size on screen resize
        const observer = new ResizeObserver(([entry]) => {
            const dpc = entry.devicePixelContentBoxSize;
            canvas.width = dpc ? dpc[0].inlineSize : Math.round(entry.contentRect.width * window.devicePixelRatio);
            canvas.height = dpc ? dpc[0].blockSize : Math.round(entry.contentRect.height * window.devicePixelRatio);
            canvas.requestPaint();
        });
        const supportsDevicePixelContentBox = 
            typeof ResizeObserverEntry !== 'undefined' && 
            'devicePixelContentBoxSize' in ResizeObserverEntry.prototype;
        const options = supportsDevicePixelContentBox ? { box: 'device-pixel-content-box' } : {};
        observer.observe(canvas, options);
    </script>
</body>
```

## ベストプラクティス

- **必須**: 使用前に HTML-in-Canvas API のブラウザサポートを確認すること。
- **必須**: `<canvas>` 要素には常に `layoutsubtree` 属性を付けること。
- **必須**: HTML コンテンツを canvas にレンダリングするには `onpaint` イベントハンドラを使用すること。
- **必須**: HTML コンテンツを canvas にレンダリングする際は `drawElementImage`、`texElementImage2D`、`copyElementImageToTexture` のいずれかのメソッドを使用すること。
- **必須**: HTML 要素の `style.transform` プロパティを設定して、レンダリングされたコンテンツの transform に合わせて HTML 要素の CSS transform を更新すること。
- **必須**: `ResizeObserver` で画面サイズを監視し、canvas サイズをデバイスピクセルに合わせて更新すること。
- **禁止**: canvas にクロスオリジンのコンテンツを埋め込まないこと。サポートされていません。
- **禁止**: メモリリークの原因となるため、`onpaint` イベントハンドラ内で `ResizeObserver` を初期化しないこと。

## フォールバック戦略

HTML in canvas は現状どの主要ブラウザでもネイティブにはサポートされていません。

HTML-in-Canvas API は現在すべてのモダンブラウザでサポートされているわけではないため、通常はフォールバック戦略が必要です。ただし、この API がもたらすパフォーマンス上のメリットを考えると、ブラウザがサポートしている場合は HTML-in-Canvas を使うべきです。

canvas から HTML コンテンツをエクスポートしたい場合は、`html2canvas`、`dom-to-image`、`snapdom` などのライブラリを使用してください。

ストリーミングなどで HTML のインタラクションをフレーム単位でキャプチャしたい場合は、`rrweb` のようなライブラリで DOM の変更をキャプチャしてください。

それ以外の場合は、HTML-in-Canvas に対応していないため、ブラウザでは HTML メディアのエクスポートをサポートしていない旨の警告を実装することもできます。
