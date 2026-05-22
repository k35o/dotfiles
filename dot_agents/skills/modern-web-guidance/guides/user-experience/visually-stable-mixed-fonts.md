異なるフォントファミリーを混在させる場合、例えばインラインコードスニペットを挿入する場合や、テーマごとにフォントファミリーを切り替える場合に、「x-height」(小文字の高さ)の違いから、一方のフォントがもう一方よりはるかに小さくまたは大きく見えることがあります。これは可読性の悪化やレイアウトシフトの原因となります。

`font-size-adjust` プロパティを使うと、特定のフォントメトリック(通常はx-height)に基づいてフォントサイズを調整し、テキストの視覚的サイズを正規化できます。

### 実装手順

1.  **MANDATORY**: Webフォントを使うコンテナや複数のフォントファミリーが混在するブロックなど、フォントの一貫性が重要な要素に `font-size-adjust` を適用してください。
2.  **MANDATORY**: ネストされた要素のフォントサイズを主フォントの比率に自動で合わせるには、要素に `from-font` キーワードを使ってください。
3.  **MANDATORY**: 基準にしたいフォント比率が別テーマ由来である場合、独立して比率を正規化するには、`font-size-adjust` に具体的な数値のアスペクト比オーバーライド値(例: `font-size-adjust: 0.5`)を使ってください。

### 例: x-height の自動正規化

`from-font` を使うのが最も堅牢な方法です。利用可能な最初のフォントからx-heightのアスペクト比を抽出し、子要素のフォントに適用します。

```css
.content-area {
  font-family: 'MyCustomWebFont';
  /* Automatically extract and apply x-height ratio from MyCustomWebFont */
  font-size-adjust: from-font;
}
.content-area span {
  font-family: 'MyOtherCustomWebFont';
}
```

### 例: 特定の x-height を指定する

調整したいフォントが基準にしたいフォントの子要素ではない場合、x-height を調整する値を指定します。

```css
.theme {
  font-family: Verdana, sans-serif;
}
.theme.alternate {
  font-family: Times;
  /* Set to the aspect ratio (x-height / font-size) of the primary font */
  font-size-adjust: 0.51;
}
```

### フォールバック戦略

font-size-adjust のBaselineステータス: Newly available。2024年7月25日以降Baseline。
対応ブラウザ: Chrome 127 (2024年7月)、Edge 127 (2024年7月)、Firefox 118 (2023年9月)、Safari 17 (2023年9月)。

**MANDATORY**: `font-size-adjust` をサポートしないブラウザでは、フォントは元の `font-size` 値で描画されます。これを緩和するため、`@supports` ブロックを使って未対応ブラウザ向けの有効なフォールバック戦略を必ず提供してください。

- `@supports not (font-size-adjust: from-font)` で `font-size-adjust` のサポートを検出し、フォールバックスタイル(調整した line-height や font-size など)を提供してください。
- 主フォントと近い x-height のフォントを選んでください。
- 代替フォントやネストされたフォントファミリーに対して、固有の `font-size` と `line-height` のオーバーライドを適用してください。

```css
/* Feature detection for font-size-adjust */
@supports not (font-size-adjust: from-font) {
  .content-area {
    /* Manual adjustment for browsers without support (if needed) */
    line-height: 1.6;
    font-size: 1.2rem;
  }
}
```
