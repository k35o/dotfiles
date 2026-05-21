## 概要

フリュードスケーリングを使うと、コンポーネントは現在のサイズに応じて内部のフォントサイズや余白などの比率を調整できます。これによって、固定のブレイクポイントを飛び飛びに移るよりも、まとまりのあるデザインが実現できます。

歴史的にフリュードスケーリングは（画面サイズに基づいてスケールする）ビューポートユニットで実現されてきましたが、モダンなコンテナクエリユニットを使えば、コンポーネントは親コンテナを基準にスケールできます。これにより、レイアウト内のどこに配置されても見栄えの良いコンポーネントを実現でき、コンポーネントの独立性と再利用性が高まります。

## 実装

### 1. コンテナを定義する

コンテナクエリユニットを使うには、まず親要素にコンテインメントのコンテキストを定義する必要があります。

```css
.component-wrapper {
  /* Define the container type. Use 'inline-size' for width-based scaling. */
  /* You can also use 'size' for both width and height, but it requires explicit sizing. */
  container-type: inline-size;
  
  /* Optional: Name the container for specific targeting */
  container-name: fluid-card;
}
```

### 2. コンテナクエリユニットを使う

コンテナのサイズに対する相対値で大きさを設定するには、コンテナクエリユニット（`cqi`、`cqb` など）を使います。

*   `cqi`: コンテナのインラインサイズの 1%（横書きモードでは幅）。
*   `cqb`: コンテナのブロックサイズの 1%（横書きモードでは高さ）。

**注意**: コンテナユニットは `@container` クエリルールを使わなくても、どのプロパティでも直接使用できます。`container-type` が定義されているもっとも近い祖先に基づいて自動的に解決されます。

```css
.component-title {
  /* Scale font size based on container width */
  /* 10cqi means 10% of the container's width */
  font-size: 10cqi;
}

.component-body {
  /* Scale padding based on container width */
  padding: 5cqi;
}
```

### 3. `clamp()` で値を制約する

サイズが小さくなりすぎたり大きくなりすぎたりしないようにするには、CSS の `clamp()` 関数を使います。これはユーザーがズームしたり、ベースフォントサイズを調整したりする能力に影響します。アクセシビリティガイドラインを満たすには、最大サイズが最小サイズの 2.5 倍を超えないようにしてください。

```css
.component-title {
  /* Clamp font size between 1rem and 2.5rem, scaling with 5% of container width */
  font-size: clamp(1rem, 5cqi, 2.5rem);
}
```

### フォールバック戦略

コンテナクエリの Baseline ステータス: Widely available。2023-02-14 から Baseline です。
対応ブラウザ: Chrome 105（2022 年 9 月）、Edge 105（2022 年 9 月）、Firefox 110（2023 年 2 月）、Safari 16（2022 年 9 月）。

ブラウザがコンテナクエリをサポートしていない場合は、ビューポートユニットや標準的なメディアクエリでフォールバックを提供してください。

```css
.component-title {
  /* Fallback for browsers that do not support container units */
  font-size: clamp(1rem, 5vw, 2.5rem);
}

@supports (font-size: 1cqi) {
  .component-title {
    /* Use container units where supported */
    font-size: clamp(1rem, 5cqi, 2.5rem);
  }
}
```

このフォールバックでは、テキストはコンポーネントの幅ではなく画面の幅に基づいてスケールします。ユースケースで意図どおりに動作するか必ずテストしてください。
