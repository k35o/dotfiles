「トップレイヤー」に描画される要素（`<dialog>`、`popover` 属性を持つ要素、ツールチップなど）は、`display: none` と表示状態を切り替えるため、歴史的にアニメーションが難しいものでした。最新のCSSは `@starting-style`、`transition-behavior: allow-discrete`、`overlay` プロパティを提供し、これらの要素のスムーズな入場・退場トランジションを可能にします。以下の例ではネイティブCSSネストが使われている点に注意してください。

## 実装

### 1. 離散トランジションの有効化

`display` プロパティをアニメーションさせるには、`transition-behavior: allow-discrete` を設定する必要があります。これにより、要素は退場トランジション中も表示されたままになります。トランジションのショートハンドを使う場合は、ショートハンドが打ち消さないように、`transition-behavior: allow-discrete` をショートハンドの後に必ず配置してください。

### 2. `overlay` プロパティ

要素がトップレイヤーへ出入りする際は、`overlay` プロパティもトランジションさせる必要があります。これにより、アニメーション期間中要素がトップレイヤーにとどまり、他の要素やビューポートに早期にクリップされるのを防げます。

### 3. `@starting-style` による入場アニメーション

`@starting-style` アットルールを使って、要素が最初に描画されるときや `display` が `none` から変化するときに*そこから*トランジションすべきスタイルを定義します。

### 4. backdropのアニメーション

`::backdrop` 擬似要素も、同様に自身のプロパティへトランジションを適用することでアニメーションできます。

## 例

```css
/* 1. Define the visible (open) state */
dialog[open],
[popover]:popover-open {
  opacity: 1;
  transform: scale(1);

  /* 2. Define the starting state for entry (must come after open state) */
  @starting-style {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* 3. Define the base (closed/exit) state and transitions */
dialog,
[popover] {
  opacity: 0;
  transform: scale(0.9);

  /* MANDATORY: transition display and overlay for top-layer elements */
  transition-property: opacity, transform, display, overlay;
  transition-duration: 0.3s;
  transition-timing-function: ease-out;
  /* Applies to discrete properties like display and overlay */
  transition-behavior: allow-discrete; /* Note: be sure to write this after the shorthand */
}

/* 4. Animate the backdrop */
dialog::backdrop,
[popover]::backdrop {
  background-color: rgba(0, 0, 0, 0);
  /* The transition shorthand can also be used with allow-discrete */
  transition:
    display 0.3s allow-discrete,
    overlay 0.3s allow-discrete,
    background-color 0.3s ease-out;
}

dialog[open]::backdrop,
[popover]:popover-open::backdrop {
  background-color: rgba(0, 0, 0, 0.5);

  @starting-style {
    background-color: rgba(0, 0, 0, 0);
  }
}

/* 5. Respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce) {
  dialog,
  [popover] {
    /* Disable movement and shorten duration for a simple fade */
    transform: none;
    transition-duration: 0.1s;
  }

  @starting-style {
    dialog[open],
    [popover]:popover-open {
      transform: none;
    }
  }
}
```

## 制約とアクセシビリティ

- **MANDATORY**: トップレイヤーへ出入りする要素では、`transition` のリストに `overlay` を含めてください。
- **MANDATORY**: `display` プロパティのトランジションには `allow-discrete` を使用してください。
- **MANDATORY**: `prefers-reduced-motion` を使ってユーザーのモーション削減設定を尊重し、トランジションを単純化してください（例: トランスフォームを削除し、再生時間を短縮）。
- **DO**: `@starting-style` ブロックは「open」状態のセレクタの内側または後に置いて、カスケードが正しく機能するようにしてください。
- **DO NOT**: 退場アニメーションに `@starting-style` を使わないでください。退場アニメーションは基本（閉じた）状態へのトランジションで定義されます。

## フォールバック戦略

#### トップレイヤーアニメーション機能

@starting-style のBaselineステータス: Newly available。2024-08-06からBaselineです。
対応ブラウザ: Chrome 117 (Sep 2023)、Edge 117 (Sep 2023)、Firefox 129 (Aug 2024)、Safari 17.5 (May 2024)。
transition-behavior のBaselineステータス: Newly available。2024-08-06からBaselineです。
対応ブラウザ: Chrome 117 (Sep 2023)、Edge 117 (Sep 2023)、Firefox 129 (Aug 2024)、Safari 17.4 (Mar 2024)。
overlay は limited availability。
対応ブラウザ: Chrome 117 (Sep 2023)、Edge 117 (Sep 2023)。
非対応: Firefox、Safari。

これらの機能をサポートしないブラウザでは、トップレイヤー要素は即時に表示・非表示されます。古いブラウザでアニメーションを提供するには、JavaScriptでクラスの切り替えを調整し、`transitionend` イベントを待つか、Web Animations APIを使う必要があります。

```javascript
// Feature detection for top-layer animations
const supportsTopLayerAnimation =
  window.CSS &&
  CSS.supports('transition-behavior', 'allow-discrete') &&
  CSS.supports('overlay', 'auto');

if (!supportsTopLayerAnimation) {
  // Manual JS fallback for entry/exit animations:
  // 1. Add an `.is-opening` class for entry.
  // 2. On close, add an `.is-closing` class, wait for the `transitionend` event, then call .close() or hide the popover.
}
```

#### popover

PopoverのBaselineステータス: Newly available。2025-01-27からBaselineです。
対応ブラウザ: Chrome 116 (Aug 2023)、Edge 116 (Aug 2023)、Firefox 125 (Apr 2024)、Safari 17 (Sep 2023)、Safari iOS 18.3 (Jan 2025)。

ブラウザがPopoverをサポートしていない場合、`@oddbird/popover-polyfill` を使用してください:

```html
<script type="module">
  if (!HTMLElement.prototype.hasOwnProperty('popover')) {
    await import('https://unpkg.com/@oddbird/popover-polyfill');
  }
</script>
```

または、ポリフィルなしでレガシーサポートを行うには、`position: fixed` を使い、JavaScriptの `getBoundingClientRect()` で座標を手動計算してください。
