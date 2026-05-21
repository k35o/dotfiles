## 概要
ブラシストロークや有機的なテクスチャのような複雑で自由な形状に要素をクリップするには、CSSマスキング（`mask-image`）を使用します。`clip-path` は幾何学的形状やベクターパスに優れていますが、`mask-image` は画像（透明度のあるPNGなど）やSVGを使って要素の可視領域を定義できます。このアプローチはより表現力豊かで、半透明をサポートするため、`clip-path` では困難または不可能なソフトなエッジや複雑なテクスチャを実現できます。

## 実装
CSSマスクで複雑な形状を実装するには:

### 画像の透明度を使う
画像の透明度をマスクとして使えます。不透明な部分は表示され、透明な部分は非表示になります。これは透明度を持つPNG、SVG、その他の画像でもよく、CSSグラデーションのような生成画像でもかまいません。

```css
.shaped-element {
  /* MANDATORY: Use vendor prefix for wider support in older browsers */
  -webkit-mask-image: url('mask.svg');
  -webkit-mask-size: cover; /* Scale mask to cover element */
  -webkit-mask-repeat: no-repeat; /* Do not tile the mask */

  /* Standard property for modern browsers */
  mask-image: url('mask.svg');
  mask-size: cover;
  mask-repeat: no-repeat;
}
```

### HTML内のSVG要素を使う
ページのHTMLでインラインSVG内に定義した `<mask>` 要素を参照することもできます。`maskContentUnits="objectBoundingBox"` を使うことで、要素のサイズに応じてマスクを自動的にスケーリングできます。これは、マスク内のすべての座標を絶対ピクセルではなく `0` から `1` の分数（例: 50%は `0.5`）として解釈するようブラウザに指示します。

> **輝度マスキング vs アルファマスキング**: デフォルトでは、SVGマスクは**輝度**（明るさ）を使って不透明度を決定します。白が表示し、黒が隠し、グレーが半透明を生み出します。代わりにSVG図形の**アルファチャネル**（透明度）をマスクに使いたい場合は、CSSで `mask-type: alpha;` を指定するか、SVGの `<mask>` 要素に直接 `mask-type="alpha"` を指定します。

```html
<!-- White areas reveal content, gray creates semi-transparency, black or transparent hides it -->
<svg width="0" height="0">
  <defs>
    <!-- objectBoundingBox scales mask coordinates (0 to 1) with the element's size -->
    <mask id="custom-shape" maskContentUnits="objectBoundingBox">
      <!-- Use white shapes to define fully opaque areas -->
      <circle cx="0.5" cy="0.5" r="0.5" fill="white" />
      <!-- Use gray shapes to define semi-transparent/faded areas -->
      <circle cx="0.5" cy="0.5" r="0.25" fill="gray" />
    </mask>
  </defs>
</svg>

<div class="masked-content">
  <!-- Content to be masked -->
</div>

<style>
.masked-content {
  /* Reference the SVG mask ID */
  -webkit-mask-image: url(#custom-shape);
  mask-image: url(#custom-shape);
}
</style>
```

### フォールバック戦略
マスクのBaselineステータス: Newly available。2023-12-07からBaselineです。
対応ブラウザ: Chrome 120 (Dec 2023)、Edge 120 (Dec 2023)、Firefox 53 (Apr 2017)、Safari 15.4 (Mar 2022)。

ブラウザが `mask-image` またはそのプレフィックス付きバージョンをサポートしない場合:
- 要素はクリップされず、通常の長方形として表示されます。
- マスクなしでもコンテンツが読みやすく、レイアウトが崩れないようにしてください（プログレッシブエンハンスメント）。
- 任意で、フィーチャー検出を使い、`clip-path` でよりシンプルな代替形状を提供してください。

```css
/* Fallback for browsers that do not support masking */
@supports (not (mask-image: url(x))) and (not (-webkit-mask-image: url(x))) {
  .shaped-element {
    /* Use a simple rounded rectangle as fallback */
    clip-path: inset(5% round 15px);
  }
}
```
