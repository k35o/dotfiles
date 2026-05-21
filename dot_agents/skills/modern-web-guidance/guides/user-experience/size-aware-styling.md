## 概要

サイズに応じたスタイリングを行うと、画面全体ではなく、コンポーネントに割り当てられたスペースに応じてレイアウトや見た目を変えられます。これは、狭いサイドバーや広いメインエリアなど、レイアウト内の異なる場所に配置されうるカードやナビゲーションバーのようなコンポーネントに有用です。

コンテナクエリを使うのが推奨される理由は、コンポーネントを真にモジュール化できるためです。コンポーネントがどこに置かれるかを知る必要も、考えられるレイアウトすべてに対する複雑なメディアクエリを書く必要もありません。

## 実装

### 1. コンテナを定義する

MANDATORY: まずブラウザに、どの要素を測定対象のコンテナとするかを伝える必要があります。

```css
.card-container {
  /* Define the container type. Use 'inline-size' for width-based queries. */
  /* You can also use 'size' for both width and height, but it requires explicit sizing. */
  container-type: inline-size;
}
```

### 2. コンテナサイズに応じてスタイルを適用する

`@container` ルールを使って、コンテナが特定のサイズに達したときにスタイルを適用します。

```css
/* Default styles for small containers (stacked layout) */
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Styles for larger containers (side-by-side layout) */
/* This triggers when the container is wider than 400px */
@container (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
  }

  .card-image {
    width: 150px;
    height: 150px;
  }
}
```

### 3. 条件付きでコンテンツを表示する

コンテナクエリを使って、より多くの領域があるときに追加の詳細を表示/非表示にすることもできます。

```css
.card-details {
  /* Hide extra details by default in small spaces */
  display: none;
}

@container (min-width: 600px) {
  .card-details {
    /* Show details when there is plenty of room */
    display: block;
  }
}
```

### フォールバック戦略

コンテナクエリのBaselineステータス: Widely available。2023年2月14日以降Baseline。
対応ブラウザ: Chrome 105 (2022年9月)、Edge 105 (2022年9月)、Firefox 110 (2023年2月)、Safari 16 (2022年9月)。

コンテナクエリをサポートしないブラウザでは、安全なデフォルトレイアウト(縦に積み上げるレイアウトなど)を採用し、画面サイズが許せばメディアクエリでプログレッシブにエンハンスする方法が最良です。

```css
/* Default safe stacked layout */
.card {
  display: flex;
  flex-direction: column;
}

/* Fallback using media queries for older browsers */
@media (min-width: 600px) {
  .card {
    flex-direction: row;
  }
}

/* Overwrite with container queries where supported */
@supports (container-type: inline-size) {
  @media (min-width: 600px) {
    .card {
      /* Reset media query fallback if needed, or let container query handle it */
      flex-direction: column;
    }
  }

  @container (min-width: 400px) {
    .card {
      flex-direction: row;
    }
  }
}
```

これにより、特定のコンテナ幅に完璧に適応しない場合でも、古いブラウザのユーザーは利用可能なレイアウトを得られます。
