# プリロードの優先度を最適化する

`<link rel="preload">` でリソースをプリロードすると、そのリソースが近いうちに必要になることをブラウザに伝えます。しかし、プリロードはリソースタイプのデフォルト優先度を引き継ぐため、特に画像の場合は低くなります。`fetchpriority` を使うとこの相対的な優先度を調整でき、特に画像のプリロードを高い優先度でプリロードできるようにすることで、より早く開始し、より多くの帯域幅リソースを取得できるようになります。

## 実装方法

1. **プリロード候補を特定する**: 動画のポスター画像やCSS内の背景画像など、ブラウザが早期に発見しないリソースで、ページの見た目に必須のものを見つけます。
2. **重要な画像プリロードの優先度を上げる**: LCP画像や、デフォルトでは優先されない他の重要な画像については、`<link rel="preload" fetchpriority="high">` を使って他のプリロードよりも優先するようにします。フォントはデフォルトですでに高優先度であることに注意してください。
3. **非重要なプリロードの優先度を下げる**: 初期レンダリングに重要でないリソース（例: 背景動画や二次的なフォント）には `<link rel="preload" fetchpriority="low">` を使用します。
4. **リソースタイプと連携する**: `as` のタイプによってデフォルト優先度が異なることに注意し、必要に応じて `fetchpriority` でデフォルトを上書きしてください。

## サンプルコード

```html
<!-- Elevate priority for a video poster image that acts as the LCP candidate -->
<link
  rel="preload"
  href="/images/video-poster.jpg"
  as="image"
  fetchpriority="high"
/>

<!-- Elevate priority for a critical LCP image that is hidden in CSS -->
<link
  rel="preload"
  href="/images/hero-background.jpg"
  as="image"
  fetchpriority="high"
/>

<!-- Deprioritize a secondary font to avoid network contention -->
<link
  rel="preload"
  href="/fonts/secondary-font.woff2"
  as="font"
  type="font/woff2"
  fetchpriority="low"
  crossorigin
/>
```

## ベストプラクティス

- **MANDATORY**: ネットワーク競合や優先度ブーストの希薄化を避けるため、`fetchpriority="high"` は重要な画像プリロード1〜2枚に限定して使用してください。
- **MANDATORY**: Largest Contentful Paint (LCP) 画像には `fetchpriority="high"` を使用してください。
- **DO**: 帯域幅の競合を防ぐため、ページ上のプリロードの総数は画像2枚と必須フォント2〜3個程度に制限してください。
- **DO** ブラウザに早く開始してほしいが重要なリソースを犠牲にしたくないプリロード（特に非重要なフォント）には `fetchpriority="low"` を使用してください。
- **DO** プリロードが利用されるよう、`as` 属性を正しく指定してください。
- **DO** 背景画像のプリロードに頼るのではなく、重要なリソース（LCP画像など）はHTMLの `<img>` タグで静的に発見可能にすることを優先してください。
- **DO** フォントのプリロードには、同一オリジンであっても常に `crossorigin` 属性を付けてください。
- **DO NOT** 非推奨の `importance` 属性を使用しないでください。`fetchpriority` に置き換えられています。

## フォールバック戦略

Fetch priority のBaselineステータス: Newly available。2024年10月29日からBaselineです。
対応ブラウザ: Chrome 103（2022年6月）、Edge 103（2022年6月）、Firefox 132（2024年10月）、Safari 17.2（2023年12月）。

`<link rel="preload">` の `fetchpriority` 属性はプログレッシブエンハンスメントです。サポートしないブラウザでも、リソースタイプに対するデフォルトの優先度でリソースをプリロードします。互換性を確保するため、常に正しい `as` および `type` 属性を指定してください。
