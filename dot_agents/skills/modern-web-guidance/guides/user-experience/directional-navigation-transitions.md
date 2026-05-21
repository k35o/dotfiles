シングルページアプリケーション（SPA）は、新しいページに遷移することなくページのコンテンツを置き換えることで、ナビゲーションが行われているように見せます。デフォルトではコンテンツは単に置き換わるだけで、トランジションは行われません。方向性のあるトランジションは、ビュー間の空間的な関係を視覚的に補強できます。

ユーザーが進んでいる方向から新しいコンテンツをスライドインさせることで、アプリ構造のメンタルマップを作り出します。たとえば、製品サイトでは「進む」は右へ、「戻る」は左へのトランジションを使い、スライドショーでは前後のスライドを示すために上下にトランジションすることがあります。

### 実装手順

1. **ナビゲーション方向を検出する**: ユーザーがアプリのフローで「進んでいる」のか「戻っている」のかを判定します。方向の検出方法はユースケースによって異なります。
2. **types でトランジションをトリガーする**: 方向を `types` 配列で `document.startViewTransition()` に渡し、トランジションを分類します。
3. **CSS で方向別のアニメーションを定義する**: `:active-view-transition-type()` 疑似クラスを使い、ナビゲーションタイプに応じた特定のアニメーションを適用します。

### キーフレームの定義

各方向への、また各方向からのスライドアニメーションを定義します。最良のパフォーマンスを得るためには、位置の変化を `transform` プロパティもしくは個別のトランスフォームプロパティ（`scale`、`rotate`、`translate`）を用いてアニメーションさせます。`opacity` も一般にパフォーマンスは良好ですが、それ以外の CSS プロパティをアニメーションさせる際は、レイアウトやペイントを発生させないことを事前に確認してください。

```css
/* Slide an element out to the left */
@keyframes slide-to-left {
  /* Mandatory: animate `transform` instead of inset properties for better performance. */
  to {
    transform: translateX(-100%);
  }
}

/* Slide an element in from the right */
@keyframes slide-from-right {
  from {
    transform: translateX(100%);
  }
}

/* Slide an element out to the right */
@keyframes slide-to-right {
  to {
    transform: translateX(100%);
  }
}

/* Slide an element in from the left */
@keyframes slide-from-left {
  from {
    transform: translateX(-100%);
  }
}
```

### 共通のアニメーション設定をセットアップする

すべてのトランジションで共有するアニメーション設定を適用するには、`::view-transition-group(root)` セレクタを使用します。

```css
::view-transition-group(root) {
  animation: 0.4s ease-in-out both;
}
```

### 方向別アニメーションの適用

`active-view-transition-type` 疑似クラスを使って、「forward」または「backward」タイプがアクティブなときに特定のトランジションビューをターゲットにします。

```css
/* MANDATORY: Apply forward animations when the 'forward' type is active */
html:active-view-transition-type(forward)::view-transition-old(root) {
  animation-name: slide-to-left;
}
html:active-view-transition-type(forward)::view-transition-new(root) {
  animation-name: slide-from-right;
}

/* MANDATORY: Apply backward animations when the 'backward' type is active */
html:active-view-transition-type(backward)::view-transition-old(root) {
  animation-name: slide-to-right;
}
html:active-view-transition-type(backward)::view-transition-new(root) {
  animation-name: slide-from-left;
}
```

### トランジションのトリガー

ナビゲーション時に、適切なタイプを `startViewTransition` メソッドに渡します。

```javascript
const transitionType = yourTransitionTypeLogic();
const updateDOM = yourUpdateDOMLogic();

document.startViewTransition({
  update: updateDOM,
  types: [transitionType], // Matches the CSS :active-view-transition-type() selectors
});
```

### アクセシビリティ

ユーザーのモーション削減設定を常に尊重し、アニメーションを無効化または単純化してください。

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(root) {
    animation: none !important;
  }
}
```

### フォールバック戦略

View Transitions の Baseline ステータス: Newly available。2025-10-14 から Baseline です。
対応ブラウザ: Chrome 111（2023 年 3 月）、Edge 111（2023 年 3 月）、Firefox 144（2025 年 10 月）、Safari 18（2024 年 9 月）。
Active view transition の Baseline ステータス: Newly available。2026-01-13 から Baseline です。
対応ブラウザ: Chrome 125（2024 年 5 月）、Edge 125（2024 年 5 月）、Firefox 147（2026 年 1 月）、Safari 18.2（2024 年 12 月）。

View Transitions API はプログレッシブエンハンスメントです。未対応のブラウザでは `document.startViewTransition` が `undefined` になります。ナビゲーションロジックは機能検出でラップして、アニメーションがなくても DOM の更新が即時に行われるようにする必要があります。次のヘルパー関数を参照してください。

```javascript
/**
 * Navigates to a new view with a directional transition.
 * @param {Function} updateDOM - Callback to update the DOM state.
 * @param {string} direction - Either 'forward' or 'backward'.
 */
function navigate(updateDOM, direction) {
  // Feature detect for browsers that do not support View Transitions
  if (!document.startViewTransition) {
    updateDOM();
    return;
  }

  // Start transition with the specific navigation type
  document.startViewTransition({
    update: updateDOM,
    types: [direction], // Matches the CSS :active-view-transition-type() selectors
  });
}
```
