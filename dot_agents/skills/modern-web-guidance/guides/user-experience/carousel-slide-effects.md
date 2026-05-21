# カルーセルのスライドエフェクトを構築する

カルーセルのスライドエフェクトは、カルーセルに視覚的な面白さを加える素晴らしい方法です。ユーザーがスライドをスクロールするにつれ、各スライドはスクロールポートに入り、中央に来て、出ていく際にアニメーションできます。たとえば、スライドはフェードイン・フェードアウトしたり、回転したり、サイズが拡大・縮小したりできます。これはダイナミックで魅力的なユーザー体験を生み出します。シンプルな入場・退場アニメーションとは異なり、このエフェクトはスクロールポート全体にわたるスライドの見た目を、単一の連続したアニメーションで制御します。

## 実装方法

カルーセルのスライドエフェクトを作る手順:

1.  **スクローラーを作る:** この要素はカルーセルスライドのコンテナとして機能します。この例では `overflow-x: scroll` を使って水平スクロールを許可しています。

    ```html
    <ul class="scroller">
      <li class="entry">1</li>
      <li class="entry">2</li>
      <li class="entry">3</li>
      …
    </ul>
    ```

    ```css
    .scroller {
      overflow-x: scroll;
    }
    ```

2.  **アニメーションを定義する:** スライドがスクロールポートを通過する際の各状態を定義するCSSアニメーションを作成します。アニメーションのどの部分でもキーフレームを定義できます。たとえば、`50%` キーフレームを含めることで、スライドがスクロールポートの中央にあるときの状態を定義できます。この例では、`scale` プロパティでスライドが中央に近づくにつれて拡大し、遠ざかると縮小するようにしています。

    ```css
    @keyframes animate {
      0% {
        scale: 0.5;
      }
      50% {
        scale: 1;
      }
      100% {
        scale: 0.5;
      }
    }
    ```

3.  **アニメーションと `view-timeline` を適用する:** アニメーションをカルーセルのスライドに付与し、コンテナを通してスクロールする要素を追跡する `view-timeline` にリンクします。

    ```css
    .scroller > * {
      animation: animate auto linear both;
      animation-timeline: view(inline);
    }
    ```

    デフォルトでは `view()` は要素を `block` 軸で追跡します。`inline` 軸で追跡する必要がある場合は `view(inline)` を使えます。

## サンプルコード

このコードは**匿名のview-timeline**を使って、横スクローラーのカルーセル項目をスクロール時にアニメーションさせます:

```css
@keyframes animate {
  0% {
    scale: 0.5;
  }

  50% {
    scale: 1;
  }

  100% {
    scale: 0.5;
  }
}

.scroller > * {
  /* Applies the animation using an `auto` duration */
  animation: animate auto linear both;
  /* Sets the animation timeline to use an anonymous view progress timeline, tracking the element's progress through the scroller on the inline axis */
  animation-timeline: view(inline);
}
```

このコードは**名前付きのview-timeline**を使って、横スクローラーのカルーセル項目をスクロール時にアニメーションさせます:

```css
@keyframes animate {
  0% {
    scale: 0.5;
  }

  50% {
    scale: 1;
  }

  100% {
    scale: 0.5;
  }
}

/* This creates a named view-timeline on each carousel item. The timeline is used to drive the animation that is applied on the same element. */
.scroller > * {
  /* Applies the animation using an `auto` duration */
  animation: animate auto linear both;
  /* Defines a named view progress timeline, tracking the element's progress through the scroller on the inline axis */
  view-timeline: --item inline;
  /* Sets the animation timeline to use the named view progress timeline defined above */
  animation-timeline: --item;
}
```

## ベストプラクティス

スクロール駆動アニメーションを使う際は、スムーズでアクセシブルな体験を保証するため、いくつかのベストプラクティスを守ることが重要です:

- **DO** フィーチャー検出を含める: すべてのブラウザがスクロール駆動アニメーションをサポートしているわけではありません。`@supports ((animation-timeline: view()) and (animation-range: entry))` を使ってサポート状況を確認し、非対応ブラウザにフォールバックを提供してください。
  - 部分的サポートのブラウザを除外するため、`(animation-range: entry)` チェックを**必ず**含めてください。
  - フォールバック戦略として `scroll-timeline-polyfill` パッケージは機能が完全ではなく、既知の問題が多いため、**使用しないでください**。
  - アニメーションが純粋に装飾的とみなされる場合は、プログレッシブエンハンスメントを採用し、フォールバックは**提供しないでください**。
- **DO** ユーザー設定を尊重する: 一部のユーザーはWeb上の動きを少なくすることを好みます。これらのユーザー向けにアニメーションを無効化または減らすため、`prefers-reduced-motion` メディアクエリを使用してください。
- **DO** パフォーマンスの良いCSSプロパティのみをアニメーションさせるよう努める: 最もスムーズなアニメーションのために、`transform` や `opacity` のようなブラウザのコンポジタスレッドで処理できるプロパティに絞ってください。`width` や `height` のような他のプロパティをアニメーションさせると、パフォーマンス問題につながる可能性があります。
- **DO** 正しい宣言順序を使う: `animation` ショートハンドプロパティを使う際は、ショートハンドがタイムラインをリセットしないように、`animation-timeline` と `animation-range` をその*後*に宣言してください。

複数のDOM要素が同じタイムラインに基づいてアニメーションする必要がある場合や、`view-timeline` が定義された要素の子をアニメーションさせる必要がある場合は、名前付きの `view-timeline` を優先してください。アニメーションさせる要素が `view-timeline` を定義する要素でもある場合は、`view()` を使って匿名のview-timelineを使えます。

スクロール駆動アニメーションを作成する際に `view()` 関数を使う場合:

- **OPTIONAL** 追跡する軸を明示する: デフォルトの `block` 軸を対象にしない場合（水平スクローラーなど）、`view(block)` または `view(inline)` でどの軸を追跡するかを明示してください。

スクロール駆動アニメーションを作成する際に `view-timeline` プロパティを使う場合:

- **DO** 名前にはCSSの `<dashed-ident>` を使う（例: `view-timeline: --my-custom-name`）。
- **OPTIONAL** 追跡する軸を明示する: デフォルトの `block` 軸を対象にしない場合（水平スクローラーなど）、`view-timeline-axis` でどの軸を追跡するかを明示してください。
- **DO** ルックアップのスコープが機能することを確認する: `view-timeline` を宣言する要素がアニメーションさせる要素のフラットツリーの祖先でない場合、共有の祖先で `timeline-scope` を使って `view-timeline` の名前の可視性を引き上げてください。

## ブラウザサポートとフォールバック戦略

スクロール駆動アニメーションは limited availability。
対応ブラウザ: Chrome 115 (Jul 2023)、Edge 115 (Jul 2023)、Safari 26 (Sep 2025)。
非対応: Firefox。したがって、通常はフォールバック戦略が必要です。

スクロール駆動アニメーションをサポートしないブラウザでは、フォールバックを使って視覚的な効果を再現できます。フォールバックは通常、scroll listener（ScrollTimelineの効果向け）またはIntersectionObserver API（ViewTimelineの効果向け）で構築します。

スクロール駆動アニメーションのビルトインサポートがあるブラウザでは、よりパフォーマンスが高いため、必ずネイティブのCSS実装を使用してください。

すべてのエフェクトがフォールバックアプローチで再現できるわけではない点に注意してください。

この特定のユースケースでは、以下のスクリプトがスクロール駆動アニメーションをサポートしないブラウザにフォールバックを適用します。Web Animations API（`Element.animate()`）を使ってカルーセルの各項目に一時停止状態のアニメーションを作成します。次に、スクローラーで `scroll` イベントを監視し、スクローラー内の項目のスクロール進行度に基づいて各アニメーションの `currentTime` を更新します。

```js
// Fallback for browsers that don't support scroll-driven animations
if (
  !CSS.supports('(animation-timeline: view()) and (animation-range: entry)')
) {
  const scroller = document.querySelector('.scroller');
  const entries = document.querySelectorAll('.entry');

  // Create a map to store animations
  const animations = new Map();

  entries.forEach((entry) => {
    const animation = entry.animate(
      {
        scale: ['0.5', '1', '0.5'],
      },
      {
        duration: 1, // We'll control the time ourselves
        fill: 'both',
      },
    );
    animation.pause();
    animations.set(entry, animation);
  });

  // Update animations on scroll
  const tick = () => {
    const scrollerRect = scroller.getBoundingClientRect();

    entries.forEach((entry) => {
      const animation = animations.get(entry);
      if (!animation) return;

      const entryRect = entry.getBoundingClientRect();
      const progress =
        (entryRect.left + entryRect.width / 2 - scrollerRect.left) /
        scrollerRect.width;

      animation.currentTime = progress;
    });
  };

  scroller.addEventListener('scroll', tick);
  tick();
}
```
