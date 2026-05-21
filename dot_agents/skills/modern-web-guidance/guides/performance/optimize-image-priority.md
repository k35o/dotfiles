# 画像の優先度を最適化する

ブラウザはヒューリスティックを使って画像に読み込み優先度を割り当てますが、これらのデフォルトは必ずしもページのLargest Contentful Paint (LCP) に最適化されているとは限りません。`<img>` 要素に `fetchpriority` を使うと、画像の重要性をブラウザに明示的に伝えられ、重要な画像をより速く読み込みつつ、必須でない画像が帯域幅を奪い合わないようにできます。

## 実装方法

1. **LCP画像を特定する**: Largest Contentful Paintの候補となる可能性が最も高い画像を特定します（通常はページ上部のヒーロー画像です）。
2. **LCPの優先度を上げる**: LCP候補となる `<img>` 要素に `fetchpriority="high"` を追加します。
3. **非重要な画像の優先度を下げる**: メガメニュー、モーダル、画面外のカルーセルスライドなど、二次的UIの一部や、ユーザー操作後にのみ表示される画像には `fetchpriority="low"` を追加します。
4. **遅延読み込みを最適化する**: LCP画像に `loading="lazy"` を絶対に使わないでください。標準的なファーストビュー外の画像には `loading="lazy"` で十分で、ユーザーがそれらの近くまでスクロールするまでリクエストを遅延します。これらの画像に `fetchpriority="low"` を追加するのは避けてください。ユーザーがスクロールして到達したときに通常の優先度で読み込ませたいからです。`fetchpriority="low"` は、技術的には「ファーストビュー内」だが初期状態では表示されていない画像（例: 非表示のカルーセルスライドやメガメニュー）に予約してください。これらの非表示画像については、`loading="lazy"` も併用してかまいません。ブラウザは低い優先度を尊重しつつリクエストのタイミングを処理します。
5. **デフォルトの優先度を優先する**: 画像に通常の読み込み優先度を持たせたい場合は、`auto` を設定する代わりに `fetchpriority` 属性を完全に省略してください。これはブラウザのネイティブヒューリスティックに任せつつHTMLをクリーンに保つためのスタイル的な慣習です。

## サンプルコード

```html
<!-- Elevate priority for the LCP image -->
<img src="/images/hero-lcp.jpg"
     alt="Main Banner"
     fetchpriority="high"
     width="800" height="400">

<!-- Deprioritize initially hidden images above the fold -->
<img src="/images/gallery-alt.jpg"
     alt="Gallery Image"
     fetchpriority="low"
     width="400" height="300">

<!-- Deprioritize images revealed only after user interaction -->
<img src="/images/mega-menu-promo.jpg"
     alt="Special Offer"
     fetchpriority="low"
     width="300" height="150">

<!-- Use lazy loading ALONE for standard below-the-fold images -->
<img src="/images/footer-logo.png"
     alt="Footer Logo"
     loading="lazy"
     width="120" height="60">

<!-- Omit fetchpriority for images with standard priority -->
<img src="/images/standard-image.jpg"
     alt="Standard Image"
     width="400" height="300">
```

## ベストプラクティス

- **MANDATORY**: LCP画像には常に `fetchpriority="high"` を適用してください。
- **MANDATORY**: ネットワーク競合や優先度ブーストの希薄化を避けるため、`fetchpriority="high"` は重要な画像1〜2枚に限定して使用してください。
- **MANDATORY**: 技術的には「ファーストビュー内」だが初期状態では非表示の画像（非表示のカルーセルスライド、メガメニュー画像など）には `fetchpriority="low"` を使用してください。
- **MANDATORY**: `loading="lazy"` をすでに使っている標準的なファーストビュー外の画像に `fetchpriority="low"` を **使わないでください**。これらの画像はビューポートに入った時点で通常の優先度で読み込まれるべきです。
- **RECOMMENDED**: `fetchpriority="auto"` の使用は避けてください。デフォルト優先度が必要な場合は、属性を完全に省略してHTMLをクリーンに保ってください。
- **DO NOT** LCP画像に `fetchpriority="high"` と `loading="lazy"` を組み合わせないでください。
- **DO NOT** 非推奨の `importance` 属性を使用しないでください。`fetchpriority` に置き換えられており、どのブラウザでもサポートされていません。

## フォールバック戦略

Fetch priority のBaselineステータス: Newly available。2024年10月29日からBaselineです。
対応ブラウザ: Chrome 103（2022年6月）、Edge 103（2022年6月）、Firefox 132（2024年10月）、Safari 17.2（2023年12月）。

`fetchpriority` 属性は `<img>` 要素に対するプログレッシブエンハンスメントです。ブラウザがサポートしていない場合、属性は無視され、ブラウザはデフォルトの優先度ヒューリスティックを使用します。
