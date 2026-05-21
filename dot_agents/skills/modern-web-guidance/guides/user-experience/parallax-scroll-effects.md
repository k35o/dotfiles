# スクロール時のパララックス効果を構築する

スクロール時のパララックス効果とは、ユーザーがページをスクロールするにつれてコンテンツの異なるレイヤーがそれぞれ異なる速度で動く視覚表現です。これにより奥行きの錯覚が生まれ、前景の要素が背景の要素より速く動いて見えるため、魅力的で没入感のあるブラウジング体験になります。この効果はCSSスクロール駆動アニメーションを使って実現するのが最適で、コンテナのスクロール位置にアニメーションを連動させられます。

## 実装方法

基本的なパララックス効果を作る手順を示します。

1.  **ラッパー要素を作る:** この要素はパララックス効果のすべてのレイヤーをグループ化するためだけのものです。スクロール対象の要素ではないので、オーバーフローはクリップしてください。また、パララックスを構成するレイヤーのうち1つと同じ高さになるよう`height`を指定します。

    ```html
    <div class="wrapper">
      …
    </div>
    ```

    ```css
    .wrapper {
      overflow: clip;
      height: 100vh; /* Height of one of the layers of the parallax */
    }
    ```

2.  **レイヤーを宣言する:** ラッパーの内側に、異なる速度で動かす個々のレイヤーを追加します。

    ```html
    <div class="wrapper">
      <div class="layer">LAYER 0</div>
      <div class="layer">LAYER 1</div>
      <div class="layer">LAYER 2</div>
      …
    </div>
    ```

3.  **translateアニメーションを追加する:** レイヤーの`transform`プロパティを変更するCSSアニメーションを定義します。パララックスの場合は通常、`translateY`でレイヤーを垂直方向に動かします。

    ```css
    @keyframes parallax {
      from {
        transform: translateY(700px);
      }
    }
    ```

4.  **`view-timeline`を設定する:** アニメーションをスクロール位置に連動させるには、ラッパー要素に`view-timeline`を作成し、それをレイヤーに適用します。

    ```css
    .wrapper {
      view-timeline: --wrapper;
    }

    .layer {
      animation: parallax linear both;
      animation-timeline: --wrapper;
    }
    ```

5.  **アニメーションをずらす:** レイヤーを異なる速度で動かすには、2つの主なアプローチがあります。**キーフレームでずらす方法**と、**`animation-range`をずらす方法**です。

    どちらのアプローチでもハードコードした値を使えるほか、`sibling-index()`／`sibling-count()`による実装も使えます。ハードコードした値は最も簡単で、レイヤー数が限られているときにも便利です。`sibling-index()`／`sibling-count()`の実装は、レイヤーが多いときに有用です。

    *   **キーフレームでずらす方法:**

        **ハードコードした値**を使う場合、各レイヤーにカスタムプロパティを定義して、それぞれのパララックスオフセットを手動で制御できます。

        ```css
        .layer:nth-child(1) { --offset: 100px; }
        .layer:nth-child(2) { --offset: 200px; }
        .layer:nth-child(3) { --offset: 300px; }

        @keyframes parallax {
          from {
            transform: translateY(var(--offset));
          }
        }
        ```

        **`sibling-index()`**を使う場合、子要素の兄弟内でのインデックスを返す`sibling-index()`関数によって、ずらし効果を自動的に計算させられます。

        ```css
        @keyframes parallax {
          from {
            transform: translateY(calc(100px * sibling-index()));
          }
        }
        ```

    *   **`animation-range`をずらす方法:**

        **ハードコードした値**を使う場合、各レイヤーごとに`animation-range`の境界を明示的に定義できます。

        ```css
        .layer:nth-child(1) { animation-range: entry 25% exit 50%; }
        .layer:nth-child(2) { animation-range: entry 25% exit 75%; }
        .layer:nth-child(3) { animation-range: entry 25% exit 100%; }
        ```

        **`sibling-index()`と`sibling-count()`**を使う場合、レイヤーの総数（`sibling-count()`）を元に範囲を数学的に計算できます。

        ```css
        .layer {
          animation-range: entry 25% exit calc(100% / sibling-count() * sibling-index());
        }
        ```

## コード例

```css
@keyframes parallax {
  from {
    transform: translateY(calc(100px * sibling-index()));
  }
}

.wrapper {
  view-timeline: --wrapper;
}

.layer {
  animation: parallax linear both;
  animation-timeline: --wrapper;
}

@media (prefers-reduced-motion: reduce) {
  .layer {
    animation: none;
  }
}
```

別の方法として、`animation-range`プロパティで似たような効果を出せます。

```css
@keyframes parallax {
  from {
    transform: translateY(700px);
  }
}

.wrapper {
  view-timeline: --wrapper;
}

.layer {
  animation: parallax linear both;
  animation-timeline: --wrapper;
  animation-range: entry 25% exit calc(100% / sibling-count() * sibling-index());
}

@media (prefers-reduced-motion: reduce) {
  .layer {
    animation: none;
  }
}
```

## ベストプラクティス

スクロール駆動アニメーションを使う際は、スムーズでアクセシブルな体験を確保するためにいくつかのベストプラクティスを守りましょう。

- **DO** 機能検出を含める: すべてのブラウザがスクロール駆動アニメーションをサポートしているわけではありません。`@supports ((animation-timeline: view()) and (animation-range: entry))`でサポートを確認し、未サポートのブラウザにはフォールバックを提供します。
  - 部分的なサポートしかないブラウザを除外するため、`(animation-range: entry)`のチェックも**必須**で含めてください。
  - フォールバック戦略として`scroll-timeline-polyfill`パッケージは**使わないで**ください。完全ではなく、既知の問題が多数あります。
  - アニメーションが装飾的なものに過ぎない場合は、プログレッシブエンハンスメントを選択し、フォールバックを**提供しないで**ください。
- **DO** ユーザーの設定を尊重する: ウェブで動きを減らしたいというユーザーもいます。`prefers-reduced-motion`メディアクエリで、こうしたユーザー向けにアニメーションを無効化または抑制してください。
- **DO** 可能な限りパフォーマンスの良いCSSプロパティのみアニメーションする: 最もスムーズなアニメーションには、ブラウザのコンポジタスレッドで扱える`transform`や`opacity`などのプロパティに絞ります。`width`や`height`のような他のプロパティをアニメーションするとパフォーマンスの問題が発生する可能性があります。
- **DO** 正しい宣言順序を使う: `animation`ショートハンドプロパティを使う場合は、`animation-timeline`と`animation-range`を**その後ろ**に宣言し、ショートハンドがタイムラインをリセットしないようにしてください。

`animation-range`を設定する際:

- **DO** すべてのレイヤーで同じ開始オフセット（例: `entry 25%`）を指定する
- **DO** すべてのレイヤーで終了オフセットを変え、`sibling-count()`と`sibling-index()`でオフセットを分散させる（例: `exit calc(100% / sibling-count() * sibling-index())`）。


## ブラウザサポートとフォールバック戦略

Scroll-driven animations has limited availability.
Supported by: Chrome 115 (Jul 2023), Edge 115 (Jul 2023), and Safari 26 (Sep 2025).
Unsupported in: Firefox.. そのため、通常はフォールバック戦略が必要になります。

スクロール駆動アニメーションをサポートしていないブラウザでは、フォールバックで視覚効果を再現できます。フォールバックは通常、スクロールリスナー（ScrollTimeline効果向け）か`IntersectionObserver` API（ViewTimeline効果向け）で構築します。

スクロール駆動アニメーションがネイティブサポートされているブラウザでは、パフォーマンスがより高いため、**常に**ネイティブCSS実装を使ってください。

すべての効果がフォールバックで再現できるわけではない点に注意してください。

このユースケース固有では、以下のスクリプトがスクロール駆動アニュメーション非対応ブラウザ向けのフォールバックを適用します。`IntersectionObserver`で`.wrapper`要素の表示状況を追跡し、スクロール位置に基づいてレイヤーの`transform`プロパティを更新します。

```js
// Fallback for browsers that don't support scroll-driven animations
if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
  const wrapper = document.querySelector('.wrapper');
  const layers = document.querySelectorAll('.layer');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        window.addEventListener('scroll', onScroll);
      } else {
        window.removeEventListener('scroll', onScroll);
      }
    });
  }, { threshold: 0 });

  observer.observe(wrapper);

  function onScroll() {
    const scrollY = window.scrollY;
    const wrapperRect = wrapper.getBoundingClientRect();
    const wrapperTop = wrapperRect.top + scrollY;
    const wrapperHeight = wrapperRect.height;
    const windowHeight = window.innerHeight;

    if (scrollY >= wrapperTop - windowHeight && scrollY <= wrapperTop + wrapperHeight) {
      const scrollPercent = (scrollY - (wrapperTop - windowHeight)) / (wrapperHeight + windowHeight);
      
      layers.forEach((layer, index) => {
        // This matches the effect as defined in the CSS example above.
        // Customize this further if needed.
        const initialTranslateY = 100 * index;
        const translateY = initialTranslateY * (1 - scrollPercent);
        layer.style.transform = `translateY(${translateY}px)`;
      });
    }
  }

  // Trigger onScroll once to set initial positions
  onScroll();
}
```
