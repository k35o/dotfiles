CSS で装飾用画像を最適化して配信すると、ビジュアル品質を犠牲にすることなく体感パフォーマンスを向上できます。`image-set()` CSS 関数を使うと、ひとつの背景画像やマスク画像に対して複数の選択肢をブラウザに提示できます。最新のフォーマット（AVIF や WebP など）と、複数の解像度（`1x` や `2x` など）を同時に指定でき、ブラウザはユーザーのデバイスに適したピクセル密度を提供しつつ、もっとも小さい互換画像を動的に選択します。

**注意**: 画像が Largest Contentful Paint（LCP）要素になり得る場合（大きなヒーローバナーなど）、`image-set()` 経由で CSS から参照される画像はブラウザのプリロードスキャナーが検出できないことに注意してください。これは画像の読み込みを大きく遅らせ、LCP を悪化させる可能性があります。LCP 候補となる画像については、標準の HTML の `<img>` または `<picture>` タグを使用するか、`media` 属性付きの `<link rel=preload>` で画像をプリロードすることを検討してください。

### 実装

`image-set()` 関数は CSS が `<image>` 値を期待する場所ならどこでも使用できますが、もっともよく使われるのは `background-image`、`content`、`mask-image` です。`type()` による画像フォーマットの指定と（`1x` や `2x` のような）解像度の指定の両方を行ったときに最良の結果が得られますが、どちらの引数も任意です。

```css
.gallery-item {
  /* Provide multiple resolutions and formats using image-set() */
  /* MANDATORY: Always order your formats from most optimized (AVIF) to least optimized (JPEG/PNG). 
     The browser will stop at the first supported format. */
  background-image: image-set(
    url("gallery.avif") type("image/avif") 1x,
    url("gallery-2x.avif") type("image/avif") 2x,
    url("gallery.webp") type("image/webp") 1x,
    url("gallery-2x.webp") type("image/webp") 2x,
    url("gallery.jpg") type("image/jpeg") 1x,
    url("gallery-2x.jpg") type("image/jpeg") 2x
  );
  
  /* Standard decorative properties */
  background-size: cover;
  background-position: center;
}
```

### フォールバック戦略

image-set() の Baseline ステータス: Widely available。2023-09-18 から Baseline です。
対応ブラウザ: Chrome 113（2023 年 5 月）、Edge 113（2023 年 5 月）、Firefox 89（2021 年 6 月）、Safari 17（2023 年 9 月）。

`image-set()` 関数をサポートしない古いブラウザ向けには、`image-set()` ルールの **前** に標準的な画像宣言を **必ず** 用意してください。このプログレッシブエンハンスメントの戦略は、CSS のカスケードを利用したもので、サポートされていないルールは無視されます。

```css
.gallery-item {
  /* MANDATORY: Fallback for browsers that do not support image-set() */
  background-image: url("gallery.jpg");
  
  /* Modern browsers will apply this and override the fallback */
  background-image: image-set(
    url("gallery.avif") type("image/avif") 1x,
    url("gallery-2x.avif") type("image/avif") 2x,
    url("gallery.jpg") type("image/jpeg") 1x,
    url("gallery-2x.jpg") type("image/jpeg") 2x
  );
}
```
