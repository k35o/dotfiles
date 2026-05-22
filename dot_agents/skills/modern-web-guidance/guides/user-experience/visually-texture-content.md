## 概要

グランジ、ノイズ、紙のテクスチャといったリアルな風化やテクスチャパターンを要素に適用するには、繰り返しのテクスチャ画像を使ったCSSマスキング(`mask-image`)を使います。これにより、テクスチャを単に上に重ねるのではなく、要素の一部を半透明にすることでコンテンツ自体にテクスチャを与えられます。これによって、より現実的な物質感を表現できます。

## 実装

テクスチャパターンを適用するには:

### 方法1: 繰り返しラスター画像を使う(リアルなテクスチャに推奨)

これはリアルなテクスチャを実現する最も一般的な手法です。

```css
.weathered-element {
  /* MANDATORY: Use vendor prefix for wider support in older browsers */
  -webkit-mask-image: url('grunge-pattern.png');
  -webkit-mask-repeat: repeat; /* Repeat the pattern to fill the area */
  -webkit-mask-size: 300px; /* Control the scale of the texture */

  /* Standard property for modern browsers */
  mask-image: url('grunge-pattern.png');
  mask-repeat: repeat;
  mask-size: 300px;
}
```

### 方法2: 幾何学的パターンにCSSグラデーションを使う

CSSグラデーションを使ってパターンを生成できます。自己完結しており、外部画像ファイルを必要としません。

```css
.patterned-element {
  --checkerboard-gradient:
    linear-gradient(45deg, #000 25%, transparent 25%),
    linear-gradient(-45deg, #000 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #000 75%),
    linear-gradient(-45deg, transparent 75%, #000 75%);

  /* Apply a checkerboard pattern as a mask */
  -webkit-mask-image: var(--checkerboard-gradient);
  -webkit-mask-size: 20px 20px;
  -webkit-mask-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;

  mask-image: var(--checkerboard-gradient);
  mask-size: 20px 20px;
  mask-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
}
```

### アルファ vs 輝度のマスキングモード

CSSマスクはデフォルトで `mask-mode: match-source` を使います。これは、提供されたソースの種類に基づいて、ブラウザが **アルファチャンネル** (透明度)を使うか **輝度** (明るさ)を使うかを自動的に決定することを意味します。

| マスクソース種別                              | デフォルトのマスクモード | マスキングの挙動                                                                                                |
| :-------------------------------------------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **インラインSVGの `<mask>` 要素**             | `luminance`              | 不透明度は色の明るさで決まります。**白** はコンテンツを表示し、**黒** は隠し、**灰色** は半透明を作り出します。 |
| **直接の画像ファイル** (PNGやSVGファイルなど) | `alpha`                  | 不透明度は透明度で決まります。**不透明** な部分はコンテンツを表示し、**透明** な部分は隠します。                |
| **CSSグラデーション**                         | `alpha`                  | 不透明度は透明度で決まります。**不透明** な色(`black` など)はコンテンツを表示し、**透明** な色は隠します。      |

> **注:** デフォルトのマスクモードは `mask-mode` CSSプロパティで明示的にオーバーライドできます(例: `mask-mode: luminance;` や `mask-mode: alpha;`)。

## フォールバック戦略

マスクのBaselineステータス: Newly available。2023年12月7日以降Baseline。
対応ブラウザ: Chrome 120 (2023年12月)、Edge 120 (2023年12月)、Firefox 53 (2017年4月)、Safari 15.4 (2022年3月)。

ブラウザが `mask-image` やそのプレフィックス版をサポートしない場合:

- 要素はテクスチャなし(クリーンなソリッド塗り)で表示されます。
- テクスチャがなくてもコンテンツが可読であることを保証してください(プログレッシブエンハンスメント)。
- 背景画像やオーバーレイをフォールバックとして使ってテクスチャを模倣できますが、コンテンツ自体の透明度には影響しません。

```css
/* Fallback: Use a background image for browsers without mask support */
@supports (not (mask-image: url(x))) and (not (-webkit-mask-image: url(x))) {
  .weathered-element {
    /* Fallback adds texture on top or behind, depending on implementation */
    background-image: url('grunge-pattern.svg');
    background-color: #fff; /* Ensure background is solid if needed */
  }
}
```
