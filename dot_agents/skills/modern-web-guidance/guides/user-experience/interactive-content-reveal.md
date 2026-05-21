CSS マスクと登録済みカスタムプロパティを使うと、パフォーマンスの良いインタラクティブなリビール効果をサイトに追加できます。マスクとして放射状グラデーションを使い、そのストップ値を登録することで、入退場をスムーズにトランジションさせつつ、最小限の JavaScript でユーザーのポインタを追跡できます。

## 実装

### 1. カスタムプロパティの登録
グラデーションのストップ値をスムーズに補間できるようにするには、`@property` を使って変数を登録する必要があります。これによって、ブラウザのエンジンにデータ型が通知され、更新時に値の間でトランジションさせられるようになります。

```css
/* Register the spotlight inner and outer sizes to enable interpolation */
 @property --inner-size{
  syntax: "<length-percentage>";
  inherits: true;
  initial-value: 0px;
}
@property --outer-size{
  syntax: "<length-percentage>";
  inherits: true;
  initial-value: 0px;
}
```

ポインタの位置を追跡するカスタムプロパティはトランジションさせる必要がないので、登録は必要ありません。

### 2. マスクレイヤーの定義
リビールしたい要素に `mask-image` を適用します。登録済みプロパティを参照する `radial-gradient` を使用します。

```css
.reveal-layer {
  /* Only transition the size properties, NOT the position variables */
  transition: --inner-size 0.2s ease-in-out, --outer-size 0.2s ease-in-out;  

  /* The spotlight is defined by the transparent center of the mask */
  mask-image: radial-gradient(
    circle at var(--mouse-x) var(--mouse-y),
    black var(--inner-size, 0%),
    transparent var(--outer-size, 0%)
  );

  /* Ensure the mask doesn't repeat if the element is large */
  mask-repeat: no-repeat;

  /* Make the mask layer non-interactive */
  pointer-events: none;
}

/* Update the gradients stops on interaction */
.reveal-layer:hover {
  --inner-size: 100px;
  --outer-size: 120px;
}  
```

### 3. JavaScript で座標を更新する
ポインタ位置を追跡して CSS 変数を更新します。プロパティが登録済みでトランジションが定義されているため、ポインタイベントが頻繁でなくてもスポットライトは滑らかに移動します。

```javascript
const container = document.querySelector('.container');
// Store the container's bounding rect
let rect = container.getBoundingClientRect();
// Update the rect when the container is resized
const resizeObserver = new ResizeObserver(()=>{
  rect = container.getBoundingClientRect();
})
resizeObserver.observe(container);

container.addEventListener('pointermove', (e) => {
  // Calculate position as a percentage of the container.
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  // Update the registered properties
  container.style.setProperty('--mouse-x', `${x}%`);
  container.style.setProperty('--mouse-y', `${y}%`);
});
```

### 4. アクセシビリティとインタラクション
**必須のアクセシビリティ保証:** このパターンはスポットライトを表示するためにポインタ操作に依存しています。スポットライトレイヤーはポインタユーザー向けの本質的でない視覚的エンハンスメントとしてのみ扱い、下層のコンテンツはデフォルトで完全に可視・可読・キーボードからも独立して到達可能であることを必ず保証してください。キーボードのみのユーザーや支援技術のユーザーから本質的なコンテンツを覆い隠したり、アクセスを制限するためにこの効果を絶対に使用してはいけません。

* **ポインタイベント:** マスクオーバーレイ層に `pointer-events: none` を設定して、標準のクリックやタッチが下のコントロールに透過するようにします。
* **モーション削減のオーバーライド:** モーション削減を希望するユーザー向けには、スムーズなトランジション補間を無効にします。

```css
/* MANDATORY Copy-Paste Safety: Disable transition scaling for motion-sensitive users */
@media (prefers-reduced-motion: reduce) {
  .reveal-layer {
    transition: none !important;
  }
}
```

## フォールバック戦略

登録済みカスタムプロパティの Baseline ステータス: Newly available。2024-07-09 から Baseline です。
対応ブラウザ: Chrome 85（2020 年 8 月）、Edge 85（2020 年 8 月）、Firefox 128（2024 年 7 月）、Safari 16.4（2023 年 3 月）。

### 未登録プロパティのフォールバック
`mask-image` をサポートしているが `@property` をサポートしていないブラウザでもスポットライトは表示されますが、`radial-gradient` 内部の値を補間できないため、動きはオン/オフの間でジャンプします。`var()` を使う際にはフォールバック値を提供してください。

```css
.reveal-layer {
  mask-image: radial-gradient(
    circle at var(--mouse-x) var(--mouse-y),
    /* Use fallback values when using the `var()` function for browsers that don't get an initial value from the @property registration. */
    black var(--inner-size, 0%),
    transparent var(--outer-size, 0%)
  );
}
```

マスクの Baseline ステータス: Newly available。2023-12-07 から Baseline です。
対応ブラウザ: Chrome 120（2023 年 12 月）、Edge 120（2023 年 12 月）、Firefox 53（2017 年 4 月）、Safari 15.4（2022 年 3 月）。

### 基本的なマスクサポート

CSS マスキングを一切サポートしないブラウザの場合:
1. **プレフィックス付きプロパティ:** より広いブラウザサポートのために `-webkit-mask-image` プレフィックスプロパティを使用します。
2. **プログレッシブエンハンスメント:** UI のベース状態は、リビール効果がなくても完全に機能し、可読である設計にします。これは、効果が視覚的な装飾を加えるだけで、コンテンツを読むのに必須ではない場合に有用です。
