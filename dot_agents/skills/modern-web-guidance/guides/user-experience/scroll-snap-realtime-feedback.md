## 概要
ユーザーは、カルーセルやギャラリーなどのUI要素を操作したときに即座の視覚的フィードバックを期待します。従来のスクロールスナップは、スクロールジェスチャーが完了して要素が落ち着いた *あと* にしかフィードバックを提供しませんでした。スクロールスナップイベント、特に `scrollsnapchanging` を使えば、スクロールジェスチャー中にリアルタイムなフィードバックを提供でき、ユーザーがタッチやマウスを離す前に、これからスナップする対象をハイライト表示できます。

## 実装

### 1. `scrollsnapchanging` をリッスンする
スクロールコンテナに `scrollsnapchanging` のイベントリスナーを取り付けます。このイベントは、ブラウザが新しいスナップ対象が選ばれそうだと判断したときに発火します。

```javascript
const container = document.querySelector('#gallery');
const thumbnails = document.querySelectorAll('.thumbnail');
const items = document.querySelectorAll('.gallery-item');

container.addEventListener('scrollsnapchanging', (event) => {
  // Highlight pending snap target during scroll for real-time feedback.
  const pendingTarget = event.snapTargetInline;
  const index = [...items].indexOf(pendingTarget);

  if (index === -1 || !thumbnails[index]) return;

  // Use lightweight class toggle to avoid layout thrashing during rapid events.
  // Note: aria-current is NOT toggled here. It tracks the settled "current"
  // item, which is updated in the scrollsnapchange handler below.
  thumbnails.forEach((thumb) => thumb.classList.remove('pending'));
  thumbnails[index].classList.add('pending');
});
```

この例ではギャラリーが横方向にスクロールするため `snapTargetInline` を使っています。スクロールコンテナが縦方向にスクロールする場合は代わりに `snapTargetBlock` を使ってください。

### 2. `scrollsnapchange` をリッスンする
スクロールジェスチャーが完了して要素が実際にスナップしたタイミングで最終的な状態を確定するために、`scrollsnapchange` イベントをリッスンします。これは最終的なアクティブ状態を確立するために必須です。

```javascript
container.addEventListener('scrollsnapchange', (event) => {
  // Promote pending state to active on scroll completion.
  const snappedTarget = event.snapTargetInline;
  const index = [...items].indexOf(snappedTarget);

  if (index === -1 || !thumbnails[index]) return;

  // Establish final active state and clean up pending.
  thumbnails.forEach((thumb) => {
    thumb.classList.remove('pending', 'active');
    thumb.removeAttribute('aria-current');
  });
  thumbnails[index].classList.add('active');
  thumbnails[index].setAttribute('aria-current', 'true');
});
```

### 3. 初期状態を同期する
ページロード時、ブラウザがスクロール位置を復元する場合があります(履歴の遷移やアンカーリンクなど)。このとき、`scrollsnapchange` も `scroll` イベントも自動的には発火しません。初期スクロール位置とUIを同期するために、一度きりの幾何学的チェックを実行します。

```javascript
// Note: For item.offsetLeft to be relative to the container, 
// the container MUST be the offsetParent (e.g., `position: relative`).
const findClosestItemIndex = () => {
  // Center-distance assumes scroll-snap-align: center on items.
  // For start-aligned snap, compare scrollLeft to item.offsetLeft directly.
  const containerCenter = container.scrollLeft + container.clientWidth / 2;
  let closestIndex = 0;
  let minDistance = Infinity;

  items.forEach((item, index) => {
    const itemCenter = item.offsetLeft + item.offsetWidth / 2;
    const distance = Math.abs(containerCenter - itemCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });
  return closestIndex;
};

const initActiveItem = () => {
  const closestIndex = findClosestItemIndex();
  if (!thumbnails[closestIndex]) return;

  thumbnails.forEach((thumb) => {
    thumb.classList.remove('pending', 'active');
    thumb.removeAttribute('aria-current');
  });
  thumbnails[closestIndex].classList.add('active');
  thumbnails[closestIndex].setAttribute('aria-current', 'true');
};

if (document.readyState === 'complete') {
  initActiveItem();
} else {
  window.addEventListener('load', initActiveItem, { once: true });
}
```

### フォールバック戦略
スクロールスナップイベントは限定的に利用可能です。
対応ブラウザ: Chrome 129 (2024年9月)、Edge 129 (2024年9月)。
未対応: Firefox、Safari。
スクロールスナップのBaselineステータス: Widely available。2020年1月15日以降Baseline。
対応ブラウザ: Chrome 69 (2018年9月)、Edge 79 (2020年1月)、Firefox 68 (2019年7月)、Safari 11 (2017年9月)。

`scrollsnapchanging` をサポートしないブラウザでは、デフォルトではスクロールジェスチャー中の先行フィードバックがUIに提供されず、連動するUIがコンテンツと同期しなくなります。

**MANDATORY:** 未対応ブラウザ向けのフォールバックを提供してください。さもないと連動するUIがコンテンツと同期しなくなります。

**DO** `scroll` イベントリスナーと `requestAnimationFrame` を組み合わせ、幾何学的距離計算でスクロール中に最も近いスナップ対象を判定することで、`scrollsnapchanging` のリアルタイム性をシミュレートしてください。

```javascript
if ('onscrollsnapchanging' in Element.prototype) {
  // Use native scroll snap events
} else {
  // Fallback: use scroll + requestAnimationFrame for eager feedback
  // (assumes the same container, thumbnails, items defined in step 1)
  let scrollTimeout;
  let rafId = null;

  const promotePendingToActive = () => {
    const closestIndex = findClosestItemIndex();
    if (!thumbnails[closestIndex]) return;
    thumbnails.forEach((thumb) => {
      thumb.classList.remove('pending', 'active');
      thumb.removeAttribute('aria-current');
    });
    thumbnails[closestIndex].classList.add('active');
    thumbnails[closestIndex].setAttribute('aria-current', 'true');
  };

  container.addEventListener('scroll', () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const closestIndex = findClosestItemIndex();
      if (!thumbnails[closestIndex]) return;

      // DO NOT forget to clean up stale pending classes
      thumbnails.forEach((thumb) => thumb.classList.remove('pending'));
      thumbnails[closestIndex].classList.add('pending');
    });

    // Debounce fallback for browsers that don't support scrollend
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(promotePendingToActive, 100);
  }, { passive: true });

  // Fallback: use Baseline `scrollend` event to promote pending to active cleanly where supported
  container.addEventListener('scrollend', () => {
    clearTimeout(scrollTimeout);
    promotePendingToActive();
  });
}
```

幾何学的な `scroll` + `requestAnimationFrame` のフォールバックは、プログラム的スクロールの正しい処理を含め、ネイティブのスナップ予測の挙動を忠実にエミュレートします。`scrollIntoView` のような関数は実行中に自然に `scroll` イベントを発火するため、追加のカスタムロジックなしでもスクロールアニメーション中ずっとUIがスムーズに同期します。
