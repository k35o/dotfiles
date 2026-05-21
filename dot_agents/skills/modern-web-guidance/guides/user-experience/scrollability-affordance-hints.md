## 概要

シャドウやグラデーションなどの視覚的なヒントは、ユーザーがスクロールしてさらにコンテンツを見られることを理解する助けになります。本ガイドでは、JavaScriptのスクロールリスナーやオブザーバーに頼らず、コンテナのスクロール状態に基づいて要素をスタイリングできるCSSの `container-scroll-state-queries` を使ってこれらのヒントを構築する方法を示します。

## 実装

### 1. スクロールコンテナを定義する

スクロールコンテナはスクロール状態クエリのコンテナとして宣言する必要があります。

```css
.scroller {
  overflow-y: auto;
  /* Establish this element as a scroll-state query container */
  container-type: scroll-state;
  position: relative;
}
```

### 2. インジケーターをスタイリングする

シャドウ、グラデーション、矢印などのインジケーター要素をコンテナ内に配置してスタイルを当てます。デフォルトでは非表示にし、表示されるときはインタラクティブではないように `pointer-events: none` を設定します。

```css
.indicator-top, .indicator-bottom {
  position: sticky;
  left: 0;
  right: 0;
  height: 20px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none; /* Let clicks pass through */
}

.indicator-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.2), transparent); /* Example: Shadow */
}

.indicator-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.2), transparent); /* Example: Shadow */
}
```

### 3. スクロール状態をクエリする

`@container` ルールと `scroll-state` 関数を使います。コンテナが上または下にスクロール可能かを確認し、それぞれのインジケーターを表示します。

```css
/* Show top indicator when the user can scroll up */
@container scroll-state(scrollable: top) {
  .indicator-top {
    opacity: 1;
  }
}

/* Show bottom indicator when the user can scroll down */
@container scroll-state(scrollable: bottom) {
  .indicator-bottom {
    opacity: 1;
  }
}
```

## フォールバック戦略

Container scroll-state クエリは限定的に利用可能です。
対応ブラウザ: Chrome 133 (2025年2月)、Edge 133 (2025年2月)。
未対応: Firefox、Safari。

### 基本フォールバック
この機能がサポートされていない場合、インジケーターは非表示のままになります。これらはヒントであり機能上の必須要素ではないため、未対応ブラウザでは省略しても問題ありません。

### 高度なフォールバック(Intersection Observer)
ヒントが必須の場合は、`IntersectionObserver` を使い、スクローラーの上端と下端にセンチネル要素を配置して、それらがスクロールポートに出入りするタイミングでクラスを切り替えます。

```html
<!-- Sentinel elements placed at the ends of the scroller -->
<div class="sentinel-top"></div>
<!-- Content goes here -->
<div class="sentinel-bottom"></div>
```

```css
/* Marker styling to ensure it does not affect layout */
.sentinel-top, .sentinel-bottom {
  height: 0;
  width: 0;
  visibility: hidden;
}

.scroller.scrolled-down .indicator-top {
  opacity: 1;
}

.scroller.can-scroll-down .indicator-bottom {
  opacity: 1;
}
```

```javascript
if (!CSS.supports('container-type', 'scroll-state')) {
  const topSentinel = document.querySelector('.sentinel-top');
  const bottomSentinel = document.querySelector('.sentinel-bottom');
  const scroller = document.querySelector('.scroller');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.target === topSentinel) {
        // If top sentinel is not intersecting, we have scrolled down
        scroller.classList.toggle('scrolled-down', !entry.isIntersecting);
      }
      if (entry.target === bottomSentinel) {
        // If bottom sentinel is intersecting, we reached the bottom
        scroller.classList.toggle('can-scroll-down', !entry.isIntersecting);
      }
    });
  }, { root: scroller });

  observer.observe(topSentinel);
  observer.observe(bottomSentinel);
}
```
