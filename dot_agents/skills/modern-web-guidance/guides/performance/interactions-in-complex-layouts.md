# 複雑なレイアウトでのインタラクションを最適化する

カンバンボードや大量のデータグリッドなど、複雑で多カラムのレイアウトでドラッグアンドドロップや重い変更が行われても、高フレームレート（60FPS）を維持し、インタラクションのレイテンシを排除します。

## 概要

複雑なレイアウトでは、1つの項目への小さな変更（カードをドラッグしたり、セルを編集したりするなど）がスタイルとレイアウト計算の連鎖反応を引き起こし、ブラウザにページ全体のリフローを強制する可能性があります。これによりフレーム落ちが発生し、Interaction to Next Paint (INP)レイテンシが高くなります。

カンバンボードのカラムなど自己完結的なレイアウト領域に `content-visibility: auto` を適用することで、レンダリング作業を隔離できます。

### 画面内要素に対する仕組み

`content-visibility: auto` が **すでに画面に表示されている** 要素にどのようなメリットをもたらすかを理解することが重要です。

- 表示中の要素については、ブラウザはレンダリングを **スキップしません**。
- 代わりに、パフォーマンス上のメリットは、このプロパティが自動的に適用する **CSSコンテインメント**（レイアウト、スタイル、ペイント）から完全に得られます。
- このコンテインメントは境界として機能します。コンテインメントが適用されたコンテナ内で変更が発生した場合、ブラウザはその変更がコンテナ外の要素のジオメトリやスタイルに影響しないことを把握しています。ページのリフローは隔離され、グローバルなレイアウト再計算を防ぎます。

## 実装

### 1. コンテインメント領域を特定する

隔離されたレイアウト単位（例: グリッドのカラム、ボードのリスト）を表す大きく自己完結的なコンテナに `content-visibility: auto` を適用します。

```css
.board-column {
  /* Apply containment boundaries */
  content-visibility: auto;

  /* Mandatory: Provide a placeholder size to prevent layouts shifts.
     For a vertical column, define a reasonable width and height. 
     - 'auto' is optional and enables the browser to remember the actual size
       once rendered. It must be paired with a <length> value to be used for
       the first render.
     - '300px' is the estimated width of this element. This can be any valid
      CSS <length> value. Replace it with the expected width of your
      component.
     - '800px' is the estimated height of this element. This can be any valid
      CSS <length> value. Replace it with the expected height of your
      component.
   */
  contain-intrinsic-size: auto 300px auto 800px;
}
```

### 2. インタラクションを管理する

カラム内で発生するインタラクションがコンテインメントの恩恵を受けることを確認します。

```javascript
// Example: Drag and drop item movement
function moveItemToColumn(itemId, columnId) {
  const item = document.getElementById(itemId);
  const column = document.getElementById(columnId);

  // The browser will only reflow this specific column,
  // not the entire board layout!
  column.appendChild(item);
}
```

### フォールバック戦略

content-visibility のBaselineステータス: Newly available。2025年9月15日からBaselineです。
対応ブラウザ: Chrome 108（2022年11月）、Edge 108（2022年12月）、Firefox 130（2024年9月）、Safari 26（2025年9月）。

このプロパティは段階的に劣化します。未対応ブラウザでは:

- プロパティは無視され、変更により通常のグローバルなリフローが発生します。
- 古いブラウザでも同様の隔離効果を得るには、手動でコンテインメントを適用するフォールバックを使えます。

```css
@supports not (content-visibility: auto) {
  .board-column {
    /* Manual fallback for containment */
    contain: layout style paint;
  }
}
```
