# 効率的なバックグラウンド処理

コンポーネントがブラウザによってレンダリングされていないときに重いバックグラウンドタスクを一時停止し、システムリソースとバッテリーを節約します。

## 概要

`content-visibility: auto` プロパティは、ビューポートから大きく外れた要素のレンダリング計算をブラウザがスキップできるようにします。ブラウザが要素のレンダリングをスキップしたり再開したりすることを決定すると、その要素上で `contentvisibilityautostatechange` イベントを発火させます。

このイベントを購読することで、`<canvas>` のアニメーション、WebGLレンダリング、高頻度のWebSocketデータポーリングなどの高コストな処理を、不要なときに一時停止し、ブラウザがコンテンツを表示する準備をするタイミングでジャストインタイムで再開できます。

### `contentvisibilityautostatechange` と `IntersectionObserver` の使い分け

どちらのAPIをいつ使うかを理解することが重要です。

- **`IntersectionObserver` はアプリケーションロジック向け** で、要素のビューポート内での正確な視覚的可視性に紐づくロジック（例: データの遅延読み込み、無限スクロールのトリガー）に使います。
- **`contentvisibilityautostatechange` はレンダリングが重い作業向け** で、複雑な canvas 更新や重いDOM変更などに使います。このイベントはブラウザの内部レンダリングライフサイクルに直接結びついています。ブラウザは要素が実際に画面に現れる前にレンダリングを開始することがよくあります（プリレンダーマージン）。このイベントはそのタイミングを通知し、コンテンツが見えるようになるときに準備が整っていることを保証します。

## 実装

### 1. CSS の Content Visibility を適用する

重いコンテナに `content-visibility: auto` を設定し、スクロールバーの飛びを防ぐためにプレースホルダーサイズを指定します。

```css
.heavy-component {
  /* Defer rendering work when off-screen */
  content-visibility: auto;

  /* Mandatory: Provide a placeholder size to prevent layouts shifts.
    - 'auto' is optional and enables the browser to remember the actual size
      once rendered. It must be paired with a <length> value to be used for
      the first render.
    - 'none' tells the browser not to apply any intrinsic width to this element.
      It can be used for either the height or the width value.
    - '500px' is the estimated height of this element. This can be any valid
      CSS <length> value. Replace it with the expected height of your
      component.
   */
  contain-intrinsic-size: auto none auto 500px;
}
```

### 2. 状態の変化を購読する

`contentvisibilityautostatechange` のイベントリスナーを追加して、バックグラウンドタスクを一時停止または再開します。

> **重要:** `contentvisibilityautostatechange` イベントは、一部のブラウザ実装ではバブリングしません。このイベントを確実に処理するには、次のいずれかを行ってください:
>
> - `content-visibility: auto` が適用された要素に直接イベントリスナーを取り付けます。
> - 親コンテナにイベントを委譲する場合は、キャプチャリングのイベントリスナー（`{ capture: true }`）を使用します。

```javascript
const component = document.querySelector('.heavy-component');

// Option 1: Direct listener (recommended)
component.addEventListener('contentvisibilityautostatechange', (event) => {
  if (event.skipped) {
    // The browser skipped rendering this content.
    // DO NOT perform heavy mutations or animation loops here.
    stopSimulation();
    pauseWebSocketPolling();
  } else {
    // The browser is about to render the content.
    // Resume your work so it is ready when visible.
    startSimulation();
    resumeWebSocketPolling();
  }
});

// Option 2: Capturing listener for event delegation
document.addEventListener(
  'contentvisibilityautostatechange',
  (event) => {
    if (event.target.matches('.heavy-component')) {
      if (event.skipped) {
        stopSimulation();
      } else {
        startSimulation();
      }
    }
  },
  { capture: true },
);
```

### フォールバック戦略

content-visibility のBaselineステータス: Newly available。2025年9月15日からBaselineです。
対応ブラウザ: Chrome 108（2022年11月）、Edge 108（2022年12月）、Firefox 130（2024年9月）、Safari 26（2025年9月）。

`content-visibility` プロパティと関連する `contentvisibilityautostatechange` イベントはプログレッシブエンハンスメントです。サポートしないブラウザでは:

- CSSプロパティは無視され、コンテンツは通常通りレンダリングされます。
- イベントは発火しないため、バックグラウンドタスクは最適化されないまま通常通り実行され続けます。

古いブラウザでもタスクの一時停止をサポートする必要がある場合は、おおまかな近似として `IntersectionObserver` を使うフォールバックを利用できます。これは古いデバイスでもバッテリーやCPUの節約に役立ちます。

```javascript
// Fallback using IntersectionObserver for older browsers
const target = document.getElementById('target-container');

// Check if content-visibility is supported
const isSupported = 'contentVisibility' in document.documentElement.style;

if (!isSupported) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // The element is close to the screen. Start work!
          startSimulation();
        } else {
          // The element is far away. Pause work!
          stopSimulation();
        }
      });
    },
    {
      // Use rootMargin to start rendering before it hits the screen
      rootMargin: '200px',
    },
  );

  observer.observe(target);
}
```
