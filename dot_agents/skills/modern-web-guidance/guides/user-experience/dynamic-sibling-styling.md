# カウントとインデックスに基づく兄弟要素のスタイリング

歴史的に、リスト内の各兄弟要素に固有のスタイルを適用するには、複雑な `:nth-child` ループや、インラインスタイルを注入する JavaScript が必要でした。モダンな CSS では `sibling-index()` と `sibling-count()` を使ってこれらの計算をスタイルシート内で直接行えるため、要素の追加や削除に自動で適応する動的なレイアウトやカラーシステムを実現できます。

## 動的なカラーシステム

兄弟要素のグループ全体に色のスペクトルを作るには、各子要素ごとに固有の色相や明度を計算します。これによって、アイテム数に関係なく一貫したグラデーション効果が得られます。

```css
.swatch {
  /* Calculate hue by dividing the full 360deg circle by total siblings */
  /* and multiplying by the current element's 1-based index */
  background-color: hsl(
    calc(360deg / sibling-count() * sibling-index()),
    70%,
    50%
  );
}
```

## 対称的なレイアウトと扇形効果

対称的な効果（「扇」状の展開や中央揃えなど）を作るには、合計数を使ってリストの中央点を求めます。

```css
.card {
  /* Find the center index (e.g., 3 if there are 5 siblings) */
  --center: calc((sibling-count() + 1) / 2);

  /* Rotate items away from the center: negative for left, positive for right */
  /* center element gets 0deg rotation */
  transform: rotate(calc(10deg * (sibling-index() - var(--center))));
}
```

## 円形配置や複雑なポジショニング

これらの関数を CSS の三角関数（`sin()`、`cos()`）と組み合わせれば、座標を手動で指定することなく要素を完全な円形に配置できます。

```css
.orb {
  /* Calculate the angle for this item's position on a 360deg circle */
  --angle: calc(360deg / sibling-count() * sibling-index());
  --radius: 150px;

  /* Set the pre-transformed position for all items to be centered */
  position: absolute;
  place-self: center;


  /* Position each element around the parent center */
  transform: translate(
    calc(cos(var(--angle)) * var(--radius)),
    calc(sin(var(--angle)) * var(--radius))
  );
}
```

### フォールバック戦略

sibling-count() と sibling-index() は限定的に利用可能です。
対応ブラウザ: Chrome 138（2025 年 6 月）、Edge 138（2025 年 6 月）、Safari 26.2（2025 年 12 月）。
未対応: Firefox。

`sibling-index()` と `sibling-count()` が未対応の場合は、JavaScript で CSS カスタムプロパティを注入してフォールバックを提供します。**必須:** スクリプトが必要なときだけ実行されるよう、`CSS.supports()` で機能検出を行ってください。

```js
/* MANDATORY: Check for native support before applying fallback */
if (!CSS.supports('top: calc(sibling-index() * 1px)')) {
  const items = document.querySelectorAll('.item');
  items.forEach((item, index) => {
    /* MANDATORY: Injected index must be 1-based to match native function */
    item.style.setProperty('--sibling-index', index + 1);
    item.style.setProperty('--sibling-count', items.length);
  });
}
```

CSS では、これらの変数を基本値として使い、`@supports` ブロック内でネイティブ関数によって上書きします。**必須:** 古いブラウザでも変数が有効なまま保たれるよう、ネイティブ関数による上書きは必ず `@supports` でラップしてください。

```css
.item {
  /* 1. Set base values using variables (from JS fallback) */
  --index: var(--sibling-index);
  --count: var(--sibling-count);

  /* 2. Use the computed variables - replace this with your implementation-specific styles */
  background-color: hsl(calc(360deg / var(--count) * var(--index)), 70%, 50%);
}

@supports (top: calc(sibling-index() * 1px)) {
  .item {
    /* 3. Override with native functions ONLY if supported */
    --index: sibling-index();
    --count: sibling-count();
  }
}
```
