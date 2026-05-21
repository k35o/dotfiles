# レンダリングが重いコンテンツを遅延させる

無限スクロール、複雑なダッシュボード、密度の高い記事など、コンテンツが豊富なWebページは、初期レンダリングの遅さやインタラクションの鈍さに悩まされることがあります。最新のWeb技術を活用すれば、すぐに表示されないコンテンツのレンダリング作業を遅延させることができ、アクセシビリティやユーザー体験を損なうことなくパフォーマンスを大幅に向上させられます。

レンダリングを最適化するには、CSS の `content-visibility` プロパティと HTML の `hidden="until-found"` 属性を活用できます。どちらもパフォーマンスに貢献しますが、用途は異なります。

## どちらをいつ使うか

| シナリオ／例 | 適用する機能 | パフォーマンス上のメリット |
| :--- | :--- | :--- |
| **1. ファーストビューの下** （初期読み込みの遅延） | **`content-visibility: auto`** | コンテナがビューポート近くまでスクロールされるまで、ブラウザがレイアウト／ペイントの作業を自動的にオフロードし、通常のページ読み込み速度をスムーズに保ちます。 |
| **2. トグル状態** （高速なビュー切替） | **`content-visibility: hidden`** | 非表示の div のレイアウト計算をスキップしつつ、スタイルのコンテインメント状態は保持するため、構造シフトなしで瞬時に切り替えられます（`display: none` より優れています）。 |
| **3. 検索可能かつ遅延** （折りたたみ式の開示） | **`hidden="until-found"`** | レンダリングパフォーマンスとページ内検索アクセシビリティを組み合わせる詳細な手順は、[`search-hidden-content`](user-experience/search-hidden-content.md)を参照してください。 |

## `content-visibility: auto` の実装方法

### 画面外コンテンツを選択する

**MANDATORY**: `content-visibility: auto` を適用する要素は慎重に特定する必要があります。
- **DO** **初期のファーストビューより明らかに下にある**、大きく自己完結的なレイアウトブロック（例: 無限フィードのカード項目、末尾のコメント、ページ下部の重いレイアウトセクション）を対象にしてください。
- **DO NOT** このプロパティを初期のファーストビュー内にある要素に適用しないでください。そうすると、ブラウザはレンダリング前に可視境界を評価することを強いられ、結果として重要なページ読み込みパフォーマンスを逆に遅延させます。
- **DO** 内部DOM構造が深い、または複雑な要素を対象にすると、レンダリングコストの削減効果を最大化できます。

### 実装手順

1. **MANDATORY**: 初期読み込みで画面外にあることが確認できる、重いセクションを特定します。
2. **MANDATORY**: それらの画面外要素のそれぞれに `content-visibility: auto` を適用します。
3. **MANDATORY**: 各要素に `contain-intrinsic-size` を使用して推定レイアウト構造のサイズを指定します。

### `contain-intrinsic-size` の使い方

**MANDATORY**: `content-visibility: auto` は `contain-intrinsic-size` と組み合わせて使用する必要があります。指定しなかった場合、画面外にあるときに要素の高さが 0px に折りたたまれ、ユーザーがスクロールしたときに深刻なレイアウトシフトやスクロールバーの飛びが発生します。

`contain-intrinsic-size` ショートハンドCSSプロパティは、プレースホルダーの寸法として機能します。`auto` キーワードを使うと、ブラウザは要素が最終的にレンダリングされたときの正確なサイズを「記憶」し、要素が再び画面外に出てもプレースホルダーではなくその計算済みサイズを利用します。

### サンプルコード

```css
/* DO ONLY apply this class to items OUTSIDE the initial layout viewport */
.heavy-section-deferred {
  /* MANDATORY: Skips rendering calculations when off-screen */
  content-visibility: auto;
  
  /* Mandatory: Provide an estimated size to prevent layouts shifts.
    - 'auto' is optional and enables the browser to remember the actual size
      once rendered. It must be paired with a <length> value to be used for
      the first render.
    - 'none' tells the browser not to apply any intrinsic width to this element.
      It can be used for either the height or the width value.
    - '150px' is the estimated height of this element. This can be any valid
      CSS <length> value.
   */
  contain-intrinsic-size: auto none auto 150px; 
}
```

## `content-visibility: hidden` の実装方法

1. **重いセクションを特定する:** 初期状態で非表示になっているレイアウトブロック（例: 大きなデータテーブルの追加行）を見つけます。
2. **CSSを適用する:** 対象要素に `content-visibility: hidden` を追加します。
3. **要素を表示する:** 要素を表示するタイミングで、`content-visibility` プロパティを `visible` または `auto` に変更します。

### サンプルコード

```css
.cached-view {
  /* Hides content but caches rendering state */
  content-visibility: hidden;
}

.cached-view.is-active {
  content-visibility: visible;
}
```

`content-visibility: hidden` は要素とその子要素をアクセシビリティツリーやページ内検索の対象から除外するため、非表示の状態でもコンテンツを発見可能にしておく必要がある場合は **使用しないでください**。非表示のコンテンツをネイティブのページ内検索で検索可能にしておきたい場合は、[`search-hidden-content`](user-experience/search-hidden-content.md)で説明されている `hidden="until-found"` を使用してください。

## ベストプラクティス

- **DO** `content-visibility: auto` と `contain-intrinsic-size` を組み合わせて使用してください。指定しなかった場合、スクロール時に高さの再計算が強制され、ビューポートのレイアウトジャンプや視覚的なグリッチが発生します。
- **DO NOT** 重要なページレンダリングを遅延させるため、初期のファーストビュー内の要素に `content-visibility: auto` を適用しないでください。
- **MANDATORY アクセシビリティ検証**: `content-visibility: auto` を適用するときは、キーボードでの順次到達可能性を必ず検証してください。一部の支援技術の構成では、`content-visibility: auto` を利用している画面外ノードは、フォーカスが内部に強制的に移動するまでアクセシビリティツリーや順次ナビゲーション経路から除外されることがあります。キーボードのみで画面外境界を越えるリニアナビゲーションをテストしてください。

## フォールバック戦略

### `content-visibility` のフォールバック

content-visibility のBaselineステータス: Newly available。2025年9月15日からBaselineです。
対応ブラウザ: Chrome 108（2022年11月）、Edge 108（2022年12月）、Firefox 130（2024年9月）、Safari 26（2025年9月）。

`content-visibility` が未対応の場合、ブラウザはこれを無視します。ほとんどの場合 `content-visibility: auto` にフォールバックは不要ですが、それがないとパフォーマンスの向上は失われます。未対応のブラウザでは `content-visibility: hidden` の要素は完全に表示されたままになります。フォールバックを実装するには Feature Detection を使用してください。

```css
/* Default for everyone */
.inactive {
  display: none;
}

/* Modern Browsers only */
@supports (content-visibility: hidden) {
 .inactive {
    display: block; /* Turn the layout box back on */
    content-visibility: hidden;
  }
}
```
