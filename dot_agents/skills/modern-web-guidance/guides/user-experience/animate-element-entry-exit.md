かつてCSSトランジションは、要素がDOMに最初に追加されたときや `display` プロパティが `none` から変化したときにアニメーションさせることができませんでした。`@starting-style` アットルールと `transition-behavior: allow-discrete` は、スムーズな入場・退場アニメーションを宣言的に作成する方法を提供します。

## 実装

### 1. `display: none` のトグルをアニメーションさせる

属性（例: `display: none` を伴う `hidden`）で表示・非表示を切り替える要素をアニメーションさせるには:

1. **表示状態を定義する**: ベースクラスに最終的なプロパティ値（例: `opacity: 1`）を設定します。
2. **入場の開始状態を定義する**: `@starting-style` を使って、要素が表示になるときに*そこから*トランジションする値を指定します。
3. **離散トランジションを有効化する**: `transition` プロパティに `display` を含め、`transition-behavior: allow-discrete` を使用します。
4. **退場状態を定義する**: `hidden` 属性に目標値を設定します。

```css
.card {
  display: block;
  opacity: 1;
  translate: 0;
  /* MANDATORY: Use transition-behavior: allow-discrete for display transition */
  transition:
    display 0.4s,
    opacity 0.4s ease-out,
    translate 0.4s ease-out;
  transition-behavior: allow-discrete;
}

/* Entry animation: transition FROM these values when first rendered */
@starting-style {
  .card {
    opacity: 0;
    translate: 0 -20px;
  }
}

/* Exit animation: transition TO these values when hidden */
.card:where(.hidden, [hidden]) {
  display: none;
  opacity: 0;
  translate: 0 -20px;
}

/* Respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .card {
    /* Disable movement and shorten duration for a simple fade */
    translate: none;
    transition-duration: 0.1s;
  }

  @starting-style {
    .card {
      translate: none;
    }
  }

  .card:where(.hidden, [hidden]) {
    translate: none;
  }
}
```

### 2. DOMへの挿入と削除をアニメーションさせる

`appendChild()` で追加または `remove()` で削除される要素については:

- **入場**: 上記のように `@starting-style` を使用します。ブラウザは「何もない」状態から要素の初期スタイルへのスタイル変化を自動的に検出し、`@starting-style` の値からのトランジションをトリガーします。
- **削除**: `element.remove()` は即時に実行されてCSSトランジションを単独でトリガーしないため、まず退場トランジションをトリガーし（例: クラスを追加して）、それが終わるのを待ってからノードをDOMから削除する必要があります。

```javascript
// Trigger exit transition
element.setAttribute('hidden', true);

// 2. Wait for all active transitions/animations to finish,
//    with a failsafe timeout in case an animation never ends (e.g. for looping animations)
const animations = element.getAnimations();
if (animations.length > 0) {
  await Promise.race([
    // Promise.allSettled ensures we wait even if some animations fail
    Promise.allSettled(animations.map(a => a.finished)),
    new Promise(r => setTimeout(r, 2000))
  ]);
}

// 3. Finally remove the node from the DOM
element.remove();
```

## 制約とアクセシビリティ

- **MANDATORY**: `display` をトランジションさせる際は `transition-behavior: allow-discrete` を使用してください。これがないと、退場時に要素が瞬時に消えます。
- **DO NOT**: `transition` ショートハンド内で `allow-discrete` を使ってはいけません。古いブラウザは `transition` 宣言全体を無視します。それが望ましいユースケースを除き、`transition-behavior: allow-discrete` を別の宣言として書いてください。
- **MANDATORY**: 入場アニメーションには `@starting-style` を使用してください。ブラウザは、これを指定しない限り要素の最初のスタイル更新（初期レンダリングや `display: none` の変化）でのトランジションをスキップします。
- **DO**: `<dialog>` や `popover` のようなトップレイヤー要素をアニメーションさせる場合は、`transition` のリストに `overlay` を含めて、退場アニメーション中にトップレイヤーに残るようにしてください。
- **DO**: `prefers-reduced-motion` メディアクエリを使ってユーザーのモーション削減設定を尊重してください。
- **DO NOT**: 退場アニメーションに `@starting-style` を使わないでください。これは入場トランジションの*開始点*のみを定義するためのものです。退場アニメーションは非表示状態へのトランジションによって定義されます。

## フォールバック戦略

@starting-style のBaselineステータス: Newly available。2024-08-06からBaselineです。
対応ブラウザ: Chrome 117 (Sep 2023)、Edge 117 (Sep 2023)、Firefox 129 (Aug 2024)、Safari 17.5 (May 2024)。

これらの機能をサポートしないブラウザでは、要素は `display: none` を即時切り替えます。`CSS.supports()` を使ってJavaScriptでサポートを検出し、手動のアニメーションロジックを条件付きで適用できます。

```javascript
// Detect support for discrete transitions and starting-style
const supportsModernTransitions =
  window.CSS &&
  CSS.supports('transition-behavior', 'allow-discrete');

if (!supportsModernTransitions) {
  // Implement manual JS-based fallback for entry/exit
}
```

### 手動の入場アニメーション（JSフォールバック）

```javascript
// To show:
el.style.display = '';
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    el.classList.remove('hidden');
  });
});

// To hide:
el.setAttribute('hidden', true);
el.addEventListener('transitionend', () => {
  if (el.classList.contains('hidden')) el.style.display = 'none';
}, { once: true });
```
