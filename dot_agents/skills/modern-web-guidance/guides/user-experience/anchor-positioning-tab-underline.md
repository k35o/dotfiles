タブメニューでは、ユーザーが現在どのページにいるのかを視覚的に示すヒントを提供すべきです。一つの方法は、タブに下線を引くことです。Anchor Positioningを使えば、下線の位置間でスムーズなアニメーションを作成できます。これはアクティブなタブを変更したときに新しいページを読み込む場合には機能しません。

この効果は、垂直タブバーでアクティブなタブを示すアニメーション付きの点を追加するためにも使えます。

`<li>` 要素を含む `<ul>` に `::before` 擬似要素を使って下線を作成します。**擬似要素を使う方法が推奨されます。DOMをクリーンに保ち、純粋に装飾的な効果のために余分な要素を追加することを避けられるためです。**

```css
ul::before {
  /* Use a pseudo-element on the container to represent the animated indicator */
  content: '';
}
```

アクティブなリストアイテムに `anchor-name` プロパティ（値は `--` で始まる）を追加して、それをアンカーにします。

```css
li.active {
  /* Make a unique anchor-name for the active element. */
  anchor-name: --active;
}
```

下線の `position-anchor` をアンカーの `anchor-name` と一致させ、`position: absolute` を設定することで、下線をアクティブなアイテムのアンカーに繋ぎ止めます。

```css
ul::before {
  /* Tether the underline to the active element. */
  position: absolute;
  position-anchor: --active;
}
```

`inset` プロパティと `anchor()` 関数を使って、アンカーに対して下線を配置します。

```css
ul::before {
  /* DO NOT use position-area, which can not be transitioned. */
  /* Use calc() to offset the top slightly */
  inset-block-start: calc(anchor(bottom) + 0.1lh);
  inset-inline-start: anchor(left);
  inset-inline-end: anchor(right);
}
```

高さやその他の視覚的なスタイルを追加します。

```css
ul::before {
  /* Apply your project's styles for the indicator */
  block-size: 0.25lh;
  background: red;
}
```

最後に、`inset` プロパティにトランジションを追加します。

```css
ul::before {
  @media (prefers-reduced-motion: no-preference) {
    /* MANDATORY: The transition must be wrapped in a prefers-reduced-motion media query to respect user preferences. */
    transition: inset 0.2s;
  }
}
```

これは視覚的なインジケーターに過ぎず、適切な `aria-current="page"` や `aria-selected` のARIA値を設定する代わりにはなりません。

```html
<!-- MANDATORY: Provide explicit assistive technology state alongside the visual tab underline -->
<nav aria-label="Primary">
  <ul>
    <li class="active">
      <a href="/home" aria-current="page">Home</a>
    </li>
    <li>
      <a href="/about">About</a>
    </li>
  </ul>
</nav>
```

## フォールバック戦略

Anchor Positioningはまだ主要ブラウザのいずれもネイティブにサポートしていません。

ブラウザがAnchor Positioningをサポートしていない場合、`border-bottom` を使って下線を追加してください。アニメーションはされません。

```css
ul li.active {
  @supports not (position-anchor: auto) {
    /* Choose a color appropriate to the app theme. */
    border-bottom: 0.25lh var(--primary) solid;
  }
}
```
