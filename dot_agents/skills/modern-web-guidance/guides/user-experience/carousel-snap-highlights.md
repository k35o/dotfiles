スクロール状態のコンテナクエリにより、要素の現在のスクロール状態（スティッキー配置による「stuck」やスクロールスナップによる「snapped」など）に基づいて要素をスタイルできます。これにより、JavaScriptのインターセクションオブザーバーやスクロールイベントリスナーに頼ることなく、アクティブな項目を視覚的に区別するカルーセルやギャラリー体験を可能にします。

### 中核となる実装

スナップされた項目をハイライトするには、スクロールスナップコンテナを設定し、スナップターゲットをスクロール状態コンテナとして定義し、その状態をクエリして子孫をスタイルします。

#### 1. スクロールスナップコンテナを設定する

親コンテナで `scroll-snap-type` を有効にする必要があります。

```html
<div class="carousel">
  <div class="carousel-item">
    <div class="card">Product 1 content</div>
  </div>
  <div class="carousel-item">
    <div class="card">Product 2 content</div>
  </div>
</div>
```

```css
.carousel {
  display: flex;
  overflow-x: auto;
  /* MANDATORY: Enable scroll snapping on the container */
  scroll-snap-type: x mandatory;
}
```

#### 2. スナップターゲットをスクロール状態コンテナとして定義する

スナップを追跡したいカルーセルの各項目は `scroll-state` コンテナとして宣言する必要があります。

```css
.carousel-item {
  /* Define where the item snaps within the container */
  scroll-snap-align: center;

  /* MANDATORY: Establish this element as a scroll-state query container */
  container-type: scroll-state;
}
```

#### 3. `snapped` 状態をクエリする

コンテナクエリは**子孫**をスタイルするため、ハイライトのスタイルはスナップターゲットの*内側*の要素に適用する必要があります。スクロールコンテナはx軸でオーバーフローするように設定されているので、`scroll-state(snapped: x)` クエリを使います。

**MANDATORY**: ユーザーがモーション削減を要求していない場合にのみエフェクトを表示するため、スタイルを `@media (prefers-reduced-motion: no-preference)` で囲んでください。ユースケースによってはエフェクトの一部を残すこともできますが、この例ではカードが白から青にフラッシュするため、一部のユーザーにとって問題になりうるので完全に無効化します。

```css
/* Specify transition outside of queries so that it is applied regardless of state.  */
.card {
  transition:
    scale 0.4s cubic-bezier(0.25, 0.8, 0.25, 1),
    background-color 0.4s,
    color 0.4s,
    box-shadow 0.4s;
}
/* 
Only show the effect for users not requesting reduced motion. Disable completely, including the color change, as it causes a flash that may be problematic.
*/
@media (prefers-reduced-motion: no-preference) {
  /* Style the content when its parent .carousel-item is snapped on the x axis */
  @container scroll-state(snapped: x) {
    .card {
      background: #007bff;
      color: white;
      scale: 1.15;
      box-shadow: 0 10px 25px rgba(0, 123, 255, 0.3);
    }
  }
}

/* MANDATORY Copy-Paste Safety: Disable highlight scaling/flashing for motion sensitive users */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none !important;
    scale: 1 !important;
  }
}
```

`snapped` 記述子は特定の軸—`x`、`y`、`inline`、`block`、または `both`—をクエリできます。

### アクセシビリティ

**AVOID**: インタラクティブ要素で `scroll-state` を使うこと。

スナップされた項目の視覚的ハイライトはUXを向上させますが、スナップされた項目はアクセシビリティツリーには公開されません。スナップされた項目に適用される視覚テーマで、その要素がアクティブまたはフォーカスされていることを伝えてはなりません。また、キーボードフォーカスリングは `snapped` ハイライトとは明確に区別され、非常に目立つものでなければなりません。スナップされた項目がインタラクティブな場合は、他の標準的なアクセシビリティ実践を用いてアクセシブルにする必要があります。

スナップはスクロールによって発生し、キーボードフォーカスは移動しません。ただし、キーボードフォーカスがスクロールコンテナを移動させ、スナップされた項目が変わることがあります。これがフォーカスされた項目と一致するかは限らず、ユーザーの混乱の原因となる可能性が高く、推奨されません。

> [!NOTE]
> カルーセルの詳細なアクセシビリティ要件（ARIAロール、スライド属性、複雑なキーボードパターンなど）はこのガイドから意図的に省略されています。カルーセルのアクセシビリティは非常にニュアンスがあり文脈依存です。本番環境では確立されたアクセシビリティ基準を参照し、徹底的なユーザーテストを実施してください。

## フォールバック戦略

コンテナscroll-stateクエリは limited availability。
対応ブラウザ: Chrome 133 (Feb 2025)、Edge 133 (Feb 2025)。
非対応: Firefox、Safari。

scroll-stateクエリをサポートしないブラウザでは、「アクティブ」ハイライトがなくてもすべての項目が読みやすい機能的な基本体験を提供するべきです。

#### フィーチャー検出

`@supports` を使って、対応ブラウザにのみエンハンスメントを提供できます:

```css
@supports (container-type: scroll-state) {
  /* Enhancement styles here */
}
```

#### JavaScriptフォールバック

ハイライトがユーザー体験にとって重要な場合、`IntersectionObserver` を使ってスナップされた項目を判定してください。`rootMargin` にインライン方向の負の値を指定することで、観測領域をカルーセル中央の細いスライスに調整します。たとえば、要素がカルーセルの中央2%にあるときに交差していると見なすには、`rootMargin` を `"0px -49%"` に設定します。

```javascript
// Optional: detect support and apply a JS-based fallback
if (!CSS.supports('container-type', 'scroll-state')) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // Toggle a class based on intersection
        entry.target.classList.toggle('is-snapped', entry.isIntersecting);
      });
    },
    {
      root: document.querySelector('.carousel'),
      // Carousel item intersects if any part of the carousel item is in the middle 2% of the carousel.
      rootMargin: '0px -49%',
    },
  );

  document.querySelectorAll('.carousel-item').forEach((item) => {
    observer.observe(item);
  });
}
```
