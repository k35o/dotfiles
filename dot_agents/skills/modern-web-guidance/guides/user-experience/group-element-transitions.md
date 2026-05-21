リストからアイテムが追加・削除されたり並び替えられたりするとき、トランジションはユーザーが文脈を維持するのに役立ちます。ビュートランジションは、要素にユニークな `view-transition-name` を与えることで、ある状態から別の状態へ遷移する手段を提供します。ページ上の複数の要素が同じトランジション挙動を共有する場合、`view-transition-class` を使えば、そのロジックを各ユニークな `view-transition-name` ごとに繰り返さずに CSS で一度だけ定義できます。これにより、要素グループ全体で一貫したアニメーションを保ちつつ、スタイルシートの保守性も保てます。

### 実装手順

1. **ユニークな名前と共有クラスを割り当てる**

トランジション中に個別に追跡する必要のある各要素には、ユニークな `view-transition-name` を割り当てる必要があります。

```html
<!-- Mandatory: Each element must have a unique view-transition-name -->
<li style="view-transition-name: item-1" class="item">Item 1</li>
<li style="view-transition-name: item-2" class="item">Item 2</li>
```

共有スタイルを適用するには、`view-transition-class` も割り当てます。

```css
.item {
  view-transition-class: list-item;
}
```

2. **共有のトランジションロジックを定義する**

`::view-transition-group()` 疑似要素にクラスセレクタを使うことで、そのグループのすべてのメンバーにスタイルを適用できます。

```css
/* Targets any view transition group that has the 'list-item' class */
::view-transition-group(.list-item) {
  animation-duration: 0.5s;
  animation-timing-function: ease-in-out;
}

/* Handle accessibility by respecting motion preferences */
@media (prefers-reduced-motion: reduce) {
  /* Disable all group transitions, including the default `root` group. */
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

3. **任意: 入場・退場のアニメーションを定義する**

追加または削除された要素に特定のトランジションを加えるには `:only-child` セレクタを使います。`::view-transition-new()` と `::view-transition-old()` の疑似要素は `::view-transition-image-pair()` 疑似要素の子なので、それが唯一の子であれば追加または削除された要素であると判断できます。

```css
/* A `::view-transition-new()` element is the only child if it wasn't present before the view transition, so it is an added element. */
::view-transition-new(.list-item):only-child {
  animation-name: slide-in;
  /* Specify an animation duration if you want something different than the UA default of 0.5s */
  animation-duration: 1s;
}
/* A `::view-transition-old()` element is the only child if it isn't present after the view transition, so it is a removed element. */
::view-transition-old(.list-item):only-child {
  animation-name: slide-out;
  /* Specify an animation duration if you want something different than the UA default of 0.5s */
  animation-duration: 1s;
}

@keyframes slide-in {
  from {
    translate: -100vw 0;
  }
}
@keyframes slide-out {
  to {
    translate: -100vw 0;
  }
}
```

4. **トランジションをトリガーする**

DOM 更新を `document.startViewTransition()` でラップします。ブラウザは古い状態をキャプチャし、更新を実行し、新しい状態へとアニメーションさせます。

```javascript
function updateList(newData) {
  document.startViewTransition(() => {
    // All DOM changes inside this callback will be transitioned
    render(newData);
  });
}
```

5. **トランジション対象外の要素のインタラクティブ性を維持する**

ビュートランジションは DOM 要素のスナップショットを重ね合わせ、そのスナップショットをトランジションさせて動作します。つまり、トランジション中は要素がインタラクティブではなくなります。トランジション対象外のインタラクティブな要素がある場合、ビュートランジション上のタッチイベントを無効にすることでそれらを操作可能に保てます。

```css
::view-transition {
  /* Non-transitioned elements below the view transitions remain interactive */
  pointer-events: none;
}
```

加えて、デフォルトでは `:root` 要素には `root` という名前のビュートランジションが付き、ページ全体のトランジションが有効になります。ルート要素に変更がない場合、これは同一のスナップショット 2 枚のトランジションとなり、インタラクティブにはなりません。ここでは特定の要素だけをトランジションさせていて画面全体ではないので、`root` トランジションを無効化できます。

```css
:root {
  /* Disable the root transition because we are only transitioning specific elements. */
  view-transition-name: none;
}
```

### フォールバック戦略

view-transition-class の Baseline ステータス: Newly available。2025-10-14 から Baseline です。
対応ブラウザ: Chrome 125（2024 年 5 月）、Edge 125（2024 年 5 月）、Firefox 144（2025 年 10 月）、Safari 18.2（2024 年 12 月）。

View Transitions はプログレッシブエンハンスメントです。ブラウザが `document.startViewTransition` をサポートしていない場合でも、DOM 更新は即時に行われるべきで、機能はするがアニメーションなしの体験になります。

```javascript
if (document.startViewTransition) {
  document.startViewTransition(() => updateDOM());
} else {
  // Fallback: Perform the update without animation
  updateDOM();
}
```

CSS については、`view-transition-class` や `::view-transition-group()` のクラスセレクタを認識しないブラウザは、それらのルールを単に無視し、アニメーションは適用されません。
