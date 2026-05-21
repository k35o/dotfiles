`ease-in`や`cubic-bezier()`といった従来のCSSイージング関数は単純なカーブに限定されており、バウンスやスプリングのような複雑な物理ベースの効果を作ることはできません。`linear()`タイミング関数はこれを解決し、複雑なカーブを近似する一連のストップを指定できます。トランジションやアニメーションはストップ間を直線で補間しますが、十分な数のストップがあれば滑らかに見せられます。

### 実装手順

1.  **カーブのストップを生成する:**
    スプリングやバウンスのために何十もの点を手動でプロットするのは現実的ではありません。外部ライブラリのタイミング関数を使うか、既存のJavaScriptイージング関数やSVGパスを`linear()`構文に変換するツールを使ってください。任意: これらのタイミング関数をCSSカスタムプロパティとして保存して、サイト全体で再利用できるようにします。
2.  **タイミング関数を定義する:**
    生成したストップを`transition-timing-function`または`animation-timing-function`プロパティ、あるいは`transition`や`animation`のショートハンドで適用します。
3.  **デュレーションを調整する:**
    物理プロパティ（質量、剛性）からデュレーションが導出されるJavaScript物理エンジンとは異なり、CSSでは依然として固定の`duration`が必要です。意図した効果にするためにデュレーションを調整する必要があるかもしれません。

### 例: スプリングイージング

この例では、カスタム`linear()`関数を使って、目標値をオーバーシュートしてから収束するスプリング効果を作ります。

```css
.spring {
  /* Define the physics-based easing as a reusable variable */
  --spring-easing: linear(0, 0.016 0.5%, 0.06 1%, 0.226 2%, 1.116 5.4%, 1.375 6.6%, 1.527 7.7%, 1.565 8.2%, 1.585 8.8%, 1.581 9.3%, 1.559 9.8%, 1.458 10.9%, 0.937 14.3%, 0.784 15.5%, 0.693 16.6%, 0.67 17.1%, 0.657 17.7%, 0.671 18.7%, 0.729 19.8%, 1.042 23.3%, 1.13 24.5%, 1.182 25.6%, 1.201 26.7%, 1.192 27.7%, 1.156 28.8%, 0.977 32.2%, 0.925 33.4%, 0.894 34.5%, 0.882 35.6%, 0.887 36.6%, 0.907 37.7%, 1.045 42.4%, 1.069 44.5%, 1.059 46.3%, 0.979 50.9%, 0.96 53.4%, 0.966 55.3%, 1.013 59.9%, 1.024 62.3%, 0.986 71.2%, 1.008 79.9%, 0.995 88.9%, 1);


  /* Apply the easing with a duration that fits the spring's complexity */
  /* MANDATORY: Always include a duration; linear() does not calculate it automatically */
  transition: scale 0.8s var(--spring-easing);
}

.spring:hover {
  scale: 1.2;
}
```
### 例: バウンスイージング

この例では、カスタム`linear()`関数を使ってバウンス効果を作ります。

```css
.bounce {
  /* Define the physics-based easing as a reusable variable */
  --bounce-easing: linear(0, 0.214 14.7%, 0.386 23.7%, 0.598 31.9%, 0.999 44.7%, 0.807 52.6%, 0.762 56%, 0.747 59.4%, 0.758 62.4%, 0.793 65.6%, 0.999 77.4%, 0.961 81.2%, 0.949 84.8%, 0.956 88%, 0.993 95.5%, 1);


  /* Apply the easing with a duration that fits the bounce's complexity */
  /* MANDATORY: Always include a duration; linear() does not calculate it automatically */
  transition: scale 0.4s var(--bounce-easing);
}

.bounce:hover {
  scale: 1.2;
}
```

### 重要な考慮事項

*   **パフォーマンス:** 最もスムーズな物理ベースのアニメーションには、別スレッドで動く`transform`や`opacity`などのプロパティに`linear()`を適用してください。
*   **精度とペイロードのトレードオフ:** ストップが多いほどカーブは滑らかになりますが、CSSのサイズも増えます。ほとんどのジェネレーターでは、滑らかさとコードサイズの最適なバランスを見つけるためにカーブを「シンプル化」できます。
*   **バウンスに不透明度を使わない:** バウンスイージングを`opacity`に適用すると、値が0未満や1超にオーバーシュートした際に視覚的に不快なちらつきが発生します。
*   **アクセシビリティ:** 複雑な物理ベースのアニメーションは、一部のユーザーにとって気を散らすものや、動きへの過敏症を引き起こすものになり得ます。常にユーザーの設定を尊重し、これらのアニメーションを抑制または無効化してください。

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    transition: none;
  }
}
```

### フォールバック戦略

Baseline status for linear() easing: Newly available. It's been Baseline since 2023-12-11.
Supported by: Chrome 113 (May 2023), Edge 113 (May 2023), Firefox 112 (Apr 2023), and Safari 17.2 (Dec 2023).

#### CSSフォールバック
`linear()`非対応のブラウザでは、フォールバックとして標準のイージング関数を提供してください。ブラウザは認識できない`linear()`値を無視し、その前の有効な宣言にフォールバックします。

```css
.element {
  /* Fallback for older browsers (standard smooth exit) */
  transition: transform 0.8s ease-out;
  
  /* Modern browsers will override with the physics-based easing */
  transition-timing-function: linear(0, 1.1, 0.95, 1.02, 1);
}
```

#### JavaScriptライブラリによるフォールバック（Motion/GSAP）

任意: 古いブラウザでも高忠実度の物理アニメーションが必須であれば、`linear()`非対応時に**Motion**（motion.dev）や**GSAP**（greensock.com）といったJavaScriptライブラリでアニメーションを扱ってください。

1.  **サポートを検出する:** `CSS.supports()`でブラウザが`linear()`関数を扱えるか確認します。
2.  **条件付きでロード/適用する:** 非対応の場合、ライブラリのスプリングまたはバウンス実装を使います。

```javascript
/* Detect if the browser supports the linear() function */
const supportsLinearEasing = window.CSS && CSS.supports('animation-timing-function', 'linear(0, 1)');

if (!supportsLinearEasing) {
  /* 
     Example using Motion (motion.dev) for a spring fallback.
     This should only be initialized if native CSS support is missing.
  */
  import("https://cdn.jsdelivr.net/npm/motion@latest/dist/motion.js").then(({ animate, spring }) => {
    animate(".element", { transform: "scale(1.2)" }, {
      easing: spring({ stiffness: 100, damping: 10 })
    });
  });
}
```

CSSの`@supports`を使った、より明示的な機能検出も可能です:

```css
@supports not (animation-timing-function: linear(0, 1)) {
  .element {
    /* Alternative experience for unsupported browsers */
    transition-duration: 0.4s;
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}
```
