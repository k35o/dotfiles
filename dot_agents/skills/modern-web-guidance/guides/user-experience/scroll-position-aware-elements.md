## 概要

「ページ最上部に戻る」リンクのようなフローティングボタンを、役に立つときだけ表示するようにして、ユーザー体験を改善します。このガイドでは、JavaScriptのスクロールリスナーやオブザーバに頼らず、コンテナのスクロール位置に基づいて要素をスタイルできるCSSの`container-scroll-state-queries`を使ってこれらの要素を構築する方法を示します。

## 実装

### 1. スクロールコンテナを確立する

スクロールコンテナをscroll-stateクエリコンテナとして宣言する必要があります。

```css
.scroller {
  overflow-y: auto;
  /* Establish this element as a scroll-state query container */
  container-type: scroll-state;
}
```

### 2. フローティング要素をスタイルする

要素をコンテナ内に配置してスタイルを与えます。デフォルトでは非表示にしておきます。

```css
.back-to-top {
  position: sticky;
  bottom: 20px;
  visibility: hidden;
  opacity: 0;
  translate: 0 20px;
  transition:
    visibility 0.3s,
    opacity 0.3s ease,
    translate 0.3s ease;
}
```

> **重要:** stickyまたはフローティング要素はスクロール可能なコンテンツの上に浮かびます。ユーザーが最下部までスクロールしたときにメインコンテンツの最後のいくつかの要素がボタンに恒久的に隠されないよう、メインコンテンツに十分な下部パディングまたはマージンを設けてください。

### 3. スクロール状態に応答する

`@container`ルールを`scroll-state`関数とともに使います。ユーザーが下にスクロールしたかを判定するには、コンテナを上に向かってスクロールできるかをチェックします。

```css
/* When the container can be scrolled toward the top, it means the user has scrolled down */
@container scroll-state(scrollable: top) {
  .back-to-top {
    visibility: visible;
    opacity: 1;
    translate: 0 0;
  }
}
```

## フォールバック戦略

Container scroll-state queries has limited availability.
Supported by: Chrome 133 (Feb 2025) and Edge 133 (Feb 2025).
Unsupported in: Firefox and Safari.

### 基本のフォールバック
`container-scroll-state-queries`がサポートされていない場合、デフォルトの`visibility: hidden`によりフローティング要素は不可視のままになります。機能を確保するため、非対応ブラウザでは要素を常に表示するという選択もできます。

```css
/* Fallback for browsers that do not support the feature */
.back-to-top {
  visibility: visible; /* Always visible */
  opacity: 1;
}

/* Override for supported browsers to handle dynamic visibility */
@supports (container-type: scroll-state) {
  .back-to-top {
    visibility: hidden;
    opacity: 0;
  }
  
  @container scroll-state(scrollable: top) {
    .back-to-top {
      visibility: visible;
      opacity: 1;
      translate: 0 0;
    }
  }
}
```

### 高度なフォールバック（Intersection Observer）
動的な可視性が必要な場合は、スクローラーの上部に置いたセンチネル要素が見えなくなったときにクラスを切り替える`IntersectionObserver`を使ってください。

```html
<!-- Sentinel element placed at the top of the scroller -->
<div class="scroll-sentinel"></div>
```

```css
/* Marker styling to ensure it does not affect layout */
.scroll-sentinel {
  height: 0;
  width: 0;
  visibility: hidden;
}

.scrolled .back-to-top {
  visibility: visible;
  opacity: 1;
  translate: 0 0;
}
```

```javascript
if (!CSS.supports('container-type', 'scroll-state')) {
  const sentinel = document.querySelector('.scroll-sentinel');
  const scroller = document.querySelector('.scroller');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // If the sentinel is NOT intersecting, it means the user has scrolled down
      if (!entry.isIntersecting) {
        scroller.classList.add('scrolled');
      } else {
        scroller.classList.remove('scrolled');
      }
    });
  }, { root: scroller });

  observer.observe(sentinel);
}
```
