`transform` プロパティでは複数の変形を指定の順序で適用できますが、ひとつの変形だけを変更したい場合でも変形チェイン全体を再指定する必要があります。これにより、単一の変形をアニメーションさせたりトランジションさせたりするのが面倒になります。

個別の CSS トランスフォームプロパティ（`translate`、`rotate`、`scale`）を使うと、`transform` プロパティとは独立して変形を適用できます。このアプローチは、たとえば `:hover` 時のような単一の変形の上書きを簡単にします。

### 主要な実装上のポイント

個別のトランスフォームプロパティは、CSS 内の記述順に関係なく **常に一定の順序** で適用されます。

1. `translate`
2. `rotate`
3. `scale`
4. `transform`（最後に適用）

異なる順序が必要な場合（例: 回転 _の前に_ スケーリング）は、引き続き `transform` プロパティの関数を使う必要があります。

トランスフォーム関数は個別のトランスフォームプロパティを上書きしません。つまり、`scale: 2; transform: scale(3);` はまず 2 倍にスケールし、さらに 3 倍にスケールするので合計 6 倍になります。

### スタッキングコンテキストと包含ブロックでの予期しない変化を防ぐ

`transform` プロパティと個別のトランスフォームプロパティはページのレイアウトとレンダリングに影響を与え、z-index やアンカーポジショニングで予期しない挙動を引き起こすことがあります。必須: `:hover` のような状態変化、あるいはトランジションやアニメーションの一環としてトランスフォームが適用される可能性のある要素には、ベース要素に恒等変形を適用してください。これにより、トランスフォーム適用時に要素のスタッキングコンテキストやコンテインメントが変わらないことが保証されます。

```css
.element {
  /* MANDATORY: Apply identity transformations for properties that will
     change on state changes (like :hover). This prevents unexpected layout
     or z-index shifts caused by creating a new stacking context only on hover. */
  translate: 0px;
  rotate: 0deg;
  scale: 1;
}
.element:hover {
  translate: 10px 10px;
  rotate: 20deg;
  scale: 0.8;
}
```

### 独立したアニメーションとトランジション

最大のメリットは、衝突なしに異なるプロパティを対象とする重なり合うアニメーションやトランジションを定義できる点です。

```css
.card {
  /* Define independent animations that don't overwrite each other */
  animation: float 3s infinite ease-in-out;

  /* Transition only the scale property for hover states */
  transition: scale 0.3s ease;

  /* Establish the base scale to prevent a sudden stacking context shift when transitioning on hover. */
  scale: 1;
}

.card:hover {
  /* Only the scale changes; the 'float' animation (translate) continues uninterrupted */
  scale: 1.05;
}

@keyframes float {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -10px;
  }
}
```

### フォールバック戦略

個別のトランスフォームプロパティの Baseline ステータス: Widely available。2022-08-05 から Baseline です。
対応ブラウザ: Chrome 104（2022 年 8 月）、Edge 104（2022 年 8 月）、Firefox 72（2020 年 1 月）、Safari 14.1（2021 年 4 月）、Safari iOS 14.5（2021 年 4 月）。

個別のトランスフォームプロパティをサポートしないブラウザでは、従来の `transform` プロパティを使用します。別の状態でひとつの部分だけを変更したい場合でも、トランスフォームスタック全体を再宣言する必要がある点に注意してください。

```css
.element {
  /* Base transform */
  transform: translate(100px, 0) rotate(45deg);
  /* Specify the identity for the scale property. */
  scale: 1;
}

@supports not (translate: 0px) {
  .element:hover {
    /* Fallback: Must repeat translate and rotate even if only scale changes */
    transform: translate(100px, 0) rotate(45deg) scale(1.1);
  }
}

@supports (translate: 0px) {
  .element:hover {
    /* Modern: Only declare the change */
    scale: 1.1;
  }
}
```
