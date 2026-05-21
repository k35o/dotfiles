## Critical Rendering Path (CRP) の最適化

Critical Rendering Pathは、ブラウザがHTML、CSS、JavaScriptを描画ピクセルに変換する速さを左右します。

### DOs
*   **DO クリティカルCSSをインライン化する**: ファーストビューのコンテンツに必要なスタイルを抽出し、HTMLの `<head>` に直接埋め込みます。残りのスタイルシートは遅延読み込みします。
*   **DO 非クリティカルなスクリプトはすべて `async` または `defer` を使う**: JavaScriptがDOMパーサーをブロックしないようにします。DOMや相互に依存するスクリプトには `defer` を、独立したスクリプトには `async` を使用してください。最新のJavaScriptには `type="module"` を推奨します。これはデフォルトで defer されるため明示的な `defer` 属性は不要ですが、独立したモジュールスクリプトには `async` を使用できます。
*   **DO メディアクエリでCSSを分割する**: `<link>` タグの `media` 属性を使うことで、使われないスタイルシート（例: 印刷スタイルやモバイルでのデスクトップスタイル）をブラウザがレンダリングをブロックせずにダウンロードできます。
*   **DO リソースヒントを活用する**: 必須の3rd partyドメイン（例: フォントサービスやAPIエンドポイント）に対して `preconnect` や `dns-prefetch` を追加し、TLSハンドシェイクを早期に確立します。

### DON'Ts
*   **DON'T CSSで `@import` を使わない**: CSS Object Model (CSSOM) の構築を遅延させる順次リクエストチェーンが発生します。
*   **DON'T 大きく非クリティカルなJavaScriptを `<head>` に置かない**: スクリプトのダウンロード、解析、実行が完了するまでDOMの構築が止まります。
*   **DON'T 表示されない、または到達不可能なCSS/JSを読み込まない**: ビルドツールでツリーシェイキングとCSSの最小化を適用し、到達不可能なコードをデプロイ前に削除してください。

### コード例

**HTML: 非クリティカルなCSS／スクリプトの遅延**
```html
<!-- Inline critical styles directly in head -->
<style>
  body { margin: 0; font-family: system-ui; }
  .hero { min-height: 100vh; }
</style>

<!-- Defer non-critical CSS -->
<link rel="preload" href="non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="non-critical.css"></noscript>

<!-- Load CSS conditionally based on viewport -->
<link rel="stylesheet" href="mobile.css" media="(max-width: 768px)">

<!-- Defer JavaScript execution -->
<script defer src="app-bundle.js"></script>
```

### リソースヒントの使い分け

| ヒント | ツールとしての用途 | 例 |
| :--- | :--- | :--- |
| `preconnect` | 既知の3rd party APIに対してTLS/DNSを解決 | APIエンドポイント、フォントサービス |
| `dns-prefetch` | 非重要な3rd partyオリジン向けの軽量フォールバック | 広告サーバー、アナリティクスのフォールバック |
| `preload` | レンダリングに *いま* 必要な同一オリジンのアセット | ヒーロー画像、レンダーブロッキングのフォント |
| `prefetch` | 次ページナビゲーションに必要なアセット | 次ページのバンドル、詳細ビュー |

**1文の覚え方**: 「ドメインには Preconnect、ビューポートには Preload、未来には Prefetch」。

## Largest Contentful Paint (LCP) とリソースフェッチ

LCPはビューポート内に表示される最大のテキストまたは画像ブロックがレンダリングされるまでの時間を計測します。表示要素を優先し、事前準備することでLCPを最適化します。

### DOs
*   **DO LCP画像に `fetchpriority="high"` を使う**: 画像の優先度をスクリプトや非重要なアセットよりも上に引き上げるよう、ブラウザのヒューリスティックエンジンに伝えます。
*   **DO LCP画像を標準HTMLで宣言する**: プリロードスキャナーが即座に発見できるよう、`<img>` タグが生のHTMLレスポンスに存在することを確認します。LCP要素をJavaScriptでマウントする方式に頼らないでください。
*   **DO LCPとして機能する背景画像をプリロードする**: LCP要素がCSSの `background-image` の場合、`<link rel="preload" as="image">` と `fetchpriority="high"` を組み合わせて早期発見を強制します。
*   **DO 競合する要素の優先度を下げるために `fetchpriority="low"` を使う**: ファーストビューに表示されるがLCPの主要素ではない大きな画像やカルーセルの優先度を下げます。

### DON'Ts
*   **DON'T LCP画像を遅延読み込みしない**: ファーストビューの画像に `loading="lazy"` を適用してはいけません。これはレイアウト計算が完了するまでフェッチを意図的に遅らせ、LCPを大きく悪化させます。
*   **DON'T `fetchpriority="high"` を多用しない**: 優先度はゼロサムの仕組みです。過剰に優先度を上げるとネットワーク競合が発生し、メリットが打ち消されます。
*   **DON'T ヒーローセクションに複雑なJavaScriptローダーを実装しない**: LCP要素のクライアントサイドレンダリングは大きなリクエストチェーン（HTML -> JS -> 実行 -> 画像リクエスト）を導入します。

### コード例

**HTML: LCP画像の最適化**
```html
<!-- Standard LCP Image -->
<img 
  src="/images/hero.webp" 
  alt="Hero Product" 
  fetchpriority="high" 
  decoding="sync"
  width="1200" 
  height="600"
>

<!-- Preloading a CSS-based LCP background -->
<link rel="preload" as="image" href="/images/bg-hero.webp" fetchpriority="high" type="image/webp">

<!-- Demoting an above-the-fold non-LCP carousel image -->
<img src="/images/carousel-2.webp" fetchpriority="low" alt="Slide 2">
```

## Interaction to Next Paint (INP) とメインスレッドの解放

INPはページのライフサイクル全体にわたるすべてのインタラクティブイベントのレイテンシを計測します。INPの悪化は、長時間実行されるJavaScriptタスクがメインスレッドをブロックすることで発生します。

### DOs
*   **DO 長いタスクを分割する**: 50msを超えるJavaScriptの実行は分割すべきです。ブラウザが保留中のユーザー入力を処理できるよう、頻繁にメインスレッドに譲ります。
*   **DO フォールバック付きで `scheduler.yield()` を使う**: モダンな `scheduler.yield()` APIを使ってタスクの継続をキューの *先頭* に配置し、サポートしないブラウザにはPromiseでラップした `setTimeout` にフォールバックします。
*   **DO 高頻度なイベントリスナーをデバウンス／スロットルする**: `scroll`、`resize`、高頻度な `input` イベントに紐づくハンドラの実行頻度を制限します。
*   **DO UI更新と重い計算を分離する**: UIを同期的に更新して即時の視覚的フィードバックを提供し、その後でバックグラウンド処理をWeb Workerや遅延タスクに送ります。

### DON'Ts
*   **DON'T 継続的なyieldに `setTimeout(..., 0)` だけに頼らない**: 標準的な `setTimeout` は継続をタスクキューの *末尾* に配置するため、他のタスクが保留中だと長い遅延を引き起こす可能性があります。
*   **DON'T レイアウトスラッシングを起こさない**: 同じループ内でDOMの読み取り（`offsetHeight`、`getBoundingClientRect`）と書き込み（`style.height`）を交互に行わないでください。DOMの読み取りをまとめてから書き込みをまとめます。
*   **DON'T 繰り返しタイマーでスレッドをブロックしない**: メインスレッドを枯渇させる `setInterval` による重いポーリングを避けてください。

### コード例

**JS: `scheduler.yield` のポリフィルと使用例**
```javascript
// Polyfill for yielding to main thread
async function yieldToMain() {
  if ('scheduler' in window && 'yield' in scheduler) {
    return await scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Processing a large array without blocking user input
async function processLargeList(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    
    // Yield every 50 iterations to allow rendering/interaction
    if (i % 50 === 0) {
      await yieldToMain();
    }
  }
}
```

### メインスレッドのタスク分割ヒューリスティック

**INPの50msルール**:
- **< 50ms**: 同期的に実行。
- **50ms - 250ms**: タスクを分割し、`scheduler.yield()` で yield。
- **> 250ms**: Web Workerにオフロード。

## 3rd partyスクリプトの管理

3rd partyスクリプト（アナリティクス、広告、チャットウィジェット）はメインスレッド混雑の主要な原因です。

### DOs
*   **DO メインコンテンツをブロックする3rd partyスクリプトを避ける**: ページ読み込みに重要でない限り、すべての3rd partyスクリプトに `defer` を使い、`<head>` ではなくページのフッターに読み込みます。
*   **DO 重要な3rd party依存はセルフホストする**: 3rd partyライブラリをオリジンドメインでホストしてDNS参照を減らし、カスタムの `Cache-Control` ロジックを強制します。

### コード例

**HTML: 3rd partyスクリプトの実行**
```html
<!-- 1. Place third-party scripts near the end of the page with the defer attribute -->
<script defer src="http://www.example.com/third-party.js"></script>
```

## CSSレンダリングとコンテインメントの最適化

レンダリングにはレイアウト、スタイル、ペイント、コンポジットの計算が含まれます。CSS コンテインメントはこれらの計算のスコープを制限するもので、こうした計算がパフォーマンス問題を引き起こす可能性のある大きく複雑なページで有用です。

### DOs
*   **DO 大きく複雑なページの画面外セクションに `content-visibility: auto` を使う**: ビューポートに近づくまで、サブツリー全体のレイアウトおよびペイント計算をスキップするようブラウザに指示します。
*   **DO `content-visibility` と `contain-intrinsic-size` を組み合わせる**: 未レンダリングコンテナのプレースホルダー高さ／幅を提供してレイアウトシフトやスクロールバーの飛びを防ぎます。
*   **DO 明示的なCSSコンテインメント（`contain`）を適用する**: 隔離されたUIコンポーネント（モーダルやウィジェットなど）には `contain: layout style paint` を使い、内部の変更がページ全体のリフローを引き起こさないようにします。

### DON'Ts
*   **DON'T 小さくシンプルなページに `content-visibility: auto` を適用しない**: メリットはわずかで、コンテンツのジャンプという副作用のリスクがあります。
*   **DON'T ファーストビューのコンテンツに `content-visibility: auto` を適用しない**: ブラウザは依然として評価しますが、コンテインメントエンジンを強制的に経由させると、表示要素にわずかなオーバーヘッドが追加されます。
*   **DON'T `will-change` をグローバルに乱用しない**: 複数の要素に無差別に `will-change: transform` を適用すると、VRAMを過剰に消費し、GPUクラッシュや鈍いレンダリングを引き起こします。
*   **DON'T 要素を隠すときにアクセシビリティを忘れない**: `content-visibility: auto` はスクリーンリーダーのために要素をDOM内に残します。画面外のとき支援技術から本当に隠したい場合は、`aria-hidden` 属性を手動で管理してください。

### コード例

**CSS: Content Visibility とコンテインメント**
```css
/* Optimize a long list of articles below the fold */
.article-list-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px; /* Provides a 600px placeholder */
}

/* Scope a complex widget to prevent layout thrashing */
.isolated-widget {
  contain: layout style paint;
}

/* Hardware accelerate an animation only on hover */
.interactive-button:hover {
  will-change: transform;
  transform: scale(1.05);
}
```

## モダンな画像とメディアの最適化

画像は通常、Webページ上で最大のペイロードを占めます。最適化にはフォーマット交渉、レスポンシブサイジング、レイアウト安定化が必要です。

### DOs
*   **DO モダンフォーマット（AVIF / WebP）を提供する**: `<picture>` 要素を使ってAVIF（圧縮率最高）を提供し、WebP、最後にレガシーブラウザ向けのJPEG/PNGへフォールバックします。
*   **DO 明示的に `width` と `height` 属性を適用する**: ネイティブ属性を設定するとブラウザがすぐに縦横比を計算でき、スペースを確保してCLSを排除します。画像の寸法はHTML属性またはCSSプロパティのどちらでも設定できます。
*   **DO ファーストビュー外のすべての画像に `loading="lazy"` を使う**: 初期ビューポート外の画像のネットワークリクエストを遅延させるネイティブのブラウザ遅延読み込みを活用します。
*   **DO `srcset` と `sizes` でレスポンシブイメージを実装する**: 画面密度とビューポート幅に基づいて適切な解像度を提供し、モバイルデバイスがデスクトップサイズの画像をダウンロードしないようにします。

### DON'Ts
*   **DON'T ファーストビューの画像を遅延読み込みしない**: これはLCPに直接悪影響を与えます。表示画像は `loading="eager"`（デフォルト）を使用すべきです。
*   **DON'T 必要な寸法を削除しない**: 遅延読み込みされる画像に width/height を指定しないとレイアウトシフトが発生します。
*   **DON'T `srcset` を使うときに `sizes` 属性を省略しない**: `sizes` がないと、ブラウザは `100vw` と仮定し、利用可能な最大の画像をダウンロードします。

### コード例

**HTML: 包括的なレスポンシブイメージコンポーネント**
```html
<picture>
  <!-- Modern Formats with Source Negotiation -->
  <source type="image/avif" srcset="hero-400w.avif 400w, hero-800w.avif 800w" sizes="(max-width: 600px) 100vw, 50vw">
  <source type="image/webp" srcset="hero-400w.webp 400w, hero-800w.webp 800w" sizes="(max-width: 600px) 100vw, 50vw">
  
  <!-- Fallback + Dimensions + Priority for Above-The-Fold -->
  <img 
    src="hero-800w.jpg" 
    alt="Descriptive text" 
    width="800" 
    height="600"
    fetchpriority="high"
    loading="eager"
  >
</picture>

<!-- Below-The-Fold Image -->
<img 
    src="footer-icon.png" 
    alt="Footer Logo" 
    width="100" 
    height="100"
    loading="lazy"
>

<!-- DO: Use native lazy loading for below the fold iframes -->
<iframe src="https://example.com/map" width="800" height="600" loading="lazy" title="Example Map"></iframe>
```

## Service Workerとキャッシュ戦略

Service Workerによるクライアントサイドキャッシュは、アプリケーションがネットワークを完全にバイパスし、ディスクやメモリからリソースを提供できるようにします。

### DOs
*   **DO 静的でバージョン管理されたアセットには `CacheFirst` 戦略を使う**: イミュータブルなファイル（フォント、ハッシュ文字列を持つJS/CSSバンドル）はキャッシュから直接配信し、瞬時の読み込みを保証します。
*   **DO 動的で非クリティカルなリソースには `StaleWhileRevalidate` を使う**: わずかな古さが許容されるAPIコールでは、キャッシュから即座に配信しつつ、バックグラウンドで静かにキャッシュを更新します。
*   **DO HTMLドキュメントには `NetworkFirst` 戦略を実装する**: ユーザーが常に最新のアプリシェルとマニフェストを受け取れるようにし、オフラインのときのみキャッシュにフォールバックします。
*   **DO キャッシュサイズと有効期限を制限する**: Service Workerがデバイスのストレージクォータを使い果たさないよう、有効期限プラグインを使用します。

### DON'Ts
*   **DON'T 不透明なレスポンスを無条件にキャッシュしない**: CORSヘッダーがない3rd partyドメインからのレスポンスは「不透明」になります。これらをキャッシュするとクォータを大量に消費し、静かに失敗します。`NetworkFirst` または `StaleWhileRevalidate` でのみキャッシュしてください。
*   **DON'T POSTリクエストをキャッシュしない**: Service WorkerはネイティブにはGET以外のリクエストをキャッシュできません。オフライン送信にはバックグラウンドシンクキューを実装してください。
*   **DON'T バージョニングを省略しない**: アセットのハッシュやバージョンを更新しないと、ユーザーが無限のキャッシュループに閉じ込められます。

### コード例

**JS: Workboxを使ったService Workerキャッシュ**
```javascript
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// 1. HTML Documents: Network First
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages-cache' })
);

// 2. Static Assets (JS, CSS, Fonts): Cache First
registerRoute(
  ({ request }) => ['style', 'script', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 })
    ]
  })
);

// 3. API Responses: Stale While Revalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/content'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);
```

## Webフォントの最適化

Webフォントはレンダーブロッキングの一般的な原因です。最適化することで、Flash of Invisible Text (FOIT) を減らし、初期レンダリングを高速化します。

### DOs
*   **DO 重要なフォントをプリロードする**: ファーストビュー内で見られるフォントには `<link rel="preload" as="font" type="font/woff2" crossorigin>` を使用してください。
*   **DO フォントをサブセット化する**: アプリケーションが必要とする文字のみを含むよう、フォントウェイトやグリフのバリエーションを絞り込みます。

### DON'Ts
*   **DON'T すべてのフォントをプリロードしない**: 過剰なプリロードは他の重要なアセットを枯渇させるネットワーク競合を招きます。

### コード例

**CSS: フォントの読み込み**
```css
@font-face {
  font-family: 'Modern Sans';
  src: url('/fonts/modern-sans.woff2') format('woff2');
}
```

**HTML: 重要フォントのプリロード**
```html
<!-- Always use crossorigin for fonts even if on the same origin -->
<link rel="preload" href="/fonts/modern-sans.woff2" as="font" type="font/woff2" crossorigin>
```

## 動画のパフォーマンスとメトリクス

動画ペイロードは最も重いアセットの1つです。最適化は帯域幅のストール低減とCumulative Layout Shift (CLS) の安定性維持に重点を置きます。

### DOs
*   **DO 明示的に `width` と `height` 属性を指定する**: ネイティブな寸法を設定することでレイアウトスペースを確保し、CLSを防ぎます。
*   **DO `poster` 画像のフォールバックを提供する**: 動画のバッファリング中に軽量な画像プレースホルダーを表示して体感パフォーマンスを向上させます。
*   **DO 非重要な動画には `preload="none"` を使う**: ファーストビュー外や自動再生されない動画の帯域幅消費を遅延させます。
*   **DO ソース交渉でモダンフォーマットを提供する**: 標準のMP4と並んでWebM（より良い圧縮率）を提供します。
*   **DO 画面外の動画には `loading="lazy"` を使う**: 動画を遅延読み込みすると、`poster` と `preload` のダウンロードを動画がビューポート内またはその近くに来るまで遅延できます。

### DON'Ts
*   **DON'T 動画ファイルを無条件に自動再生しない**: ユーザーの意図に依存するか、プログレッシブエンハンスメントのストリームを使用してください。
*   **DON'T 大きな動画ファイルを絶対に自動再生しない**: 大きなファイルをダウンロードする前に、ユーザーの意図に依存してください。

### コード例

**HTML: アクセシブルで動的な動画ローダー**
```html
<video 
  controls 
  width="1200" 
  height="675"
  poster="/images/video-poster.webp" 
  preload="none"
>
  <source src="/videos/intro.webm" type="video/webm">
  <source src="/videos/intro.mp4" type="video/mp4">
  <!-- Include accessibility tracks -->
  <track src="/video-caps.vtt" kind="captions" srclang="en" label="English">
</video>
```

## JavaScriptのコード分割

巨大なモノリシックバンドルは、ローエンドデバイスではメインスレッドの解析時間をブロックします。分割することで、即時のビューに必要なバイトだけをダウンロードできるようにします。

### DOs
*   **DO 動的インポートを使う**: 標準の `import()` 仕様を使ってルートや重いUIライブラリを分割します。
*   **DO バンドラーのアセットチャンキングを設定する**: ViteやWebpackのロールアップディレクティブを使い、3rd partyベンダーをランタイムアプリケーションロジックから分離します。

### DON'Ts
*   **DON'T 単一の巨大な `app.js` バンドルを出荷しない**: 初期ビューの解析時間とメモリ消費が増加します。

### コード例

**JS: ルートベースの動的分割**
```javascript
// Dynamic import of heavy module only when button is clicked
document.getElementById('heavy-btn').addEventListener('click', async () => {
  const { heavyFunction } = await import('./heavy-module.js');
  heavyFunction();
});
```
