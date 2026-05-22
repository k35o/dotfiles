# スタガーアニメーションの作成

スタガーアニメーションは、複数の順序づけられた要素を一斉にではなくわずかな遅延を挟んで順次アニメーションさせる興味深い演出を提供します。この手法はリストやギャラリー、ナビゲーションメニューでよく用いられ、ユーザーの視線を誘導するとともに、洗練されたリズム感のあるインタラクションを生み出します。

## `sibling-index()` によるスタガーアニメーション

`animation-delay` プロパティに `sibling-index()` を用いることで、各要素のアニメーションを親要素内での位置に比例した値だけずらせます。`sibling-index()` 関数は整数を返すため、時間に変換するには時間単位を掛ける必要があります。

```css
#stagger-list > .item {
  --stagger-time: 0.1s;
  /* Define the animation first */
  animation: fade-in 0.4s;
  /* Set the `animation-delay` to a time multipled by the `sibling-index()` */
  animation-delay: calc(sibling-index() * var(--stagger-time));
}
```

**必須:** モーション削減を希望するユーザー向けには、ユーザー設定を尊重してアニメーションを無効化します。

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable animation for users who prefer reduced motion. */
  #stagger-list > .item {
    animation: none;
  }
}
```

## フォールバック戦略

sibling-count() と sibling-index() は限定的に利用可能です。
対応ブラウザ: Chrome 138（2025 年 6 月）、Edge 138（2025 年 6 月）、Safari 26.2（2025 年 12 月）。
未対応: Firefox。

`sibling-index()` のサポートを CSS でテストするには `@supports (animation-delay: calc(sibling-index() * 0.1s)){}` を使用します。JavaScript なら `!CSS.supports('animation-delay: calc(sibling-index() * 0.1s)')` を使用してください。

古いブラウザでスタガーアニメーションをサポートするには、JavaScript で兄弟要素それぞれに `--sibling-index` カスタムプロパティを追加します。必須: 不要な JavaScript の実行を避けるため、これを `CSS.supports('animation-delay: calc(sibling-index() * 0.1s)')` のテストでラップしてください。

```js
if (!CSS.supports('animation-delay: calc(sibling-index() * 0.1s)')) {
  const staggerList = document.getElementById('stagger-list');
  [...staggerList.children].forEach((el, index) =>
    el.style.setProperty('--sibling-index', index + 1),
  );
}
```

`--sibling-index` カスタムプロパティを使う `animation-delay` 宣言を追加します。これは `sibling-index()` 関数を使う `animation-delay` 宣言よりも前に書く必要があります。これを `@supports` でラップする必要はありません。古いブラウザは 2 つ目の宣言をパースできないため、1 つ目の宣言が使用されます。

```css
#stagger-list > .item {
  animation-delay: calc(var(--sibling-index) * var(--stagger-time));
  animation-delay: calc(sibling-index() * var(--stagger-time));
}
```
