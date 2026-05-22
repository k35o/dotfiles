# スクロールプログレスインジケーターの構築

スクロールプログレスインジケーターは、スクロール可能なドキュメントやコンテナ内でのユーザーの進捗状況を視覚的に伝える一般的なUIパターンです。ユーザーがスクロールするにつれて視覚的要素が現在位置を反映して更新され、どれだけのコンテンツを閲覧したか、あとどれだけ残っているかを明確かつ直感的に伝えます。

## 実装方法

スクロールプログレスインジケーターを作成するには、次の2つが必要です。

1.  プログレスバーとして機能する要素。この要素は通常、ユーザーがスクロールしている間も表示され続けるように `position: fixed` または `position: absolute` に設定されます。
2.  スクロール位置に連動したアニメーション。

具体的な手順は次のとおりです。

- まず、プログレスバーとして機能するHTML要素を作成します。この要素は好みに合わせてスタイル付けできます。
- 次に、CSSでプログレスバーをスケールする `@keyframes` アニメーションを定義します。一般的な手法としては、要素を `scaleX(0)` から `scaleX(1)` までスケールします。
- 最後に、このアニメーションをプログレスバー要素に適用し、`animation-timeline` を scroll-timeline に設定します。これにより、ブラウザは最も近い祖先のスクローラーのスクロール位置に基づいてアニメーションの進行を駆動します。

## サンプルコード

このコードは、`scroll()` 関数で作成した無名 scroll-timeline を使用して、スクロール時に `#progress` 要素を成長させます。

```css
@media (prefers-reduced-motion: no-preference) {
  @supports ((animation-timeline: scroll())) {
    @keyframes grow-progress {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }

    #progress {
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 1em;
      background: red;

      transform-origin: 0 50%;
      animation: grow-progress auto linear;
      animation-timeline: scroll();
    }
  }
}
```

DOM内の配置により、`scroll()` 関数は `block` 方向で最も近い祖先のスクローラーを追跡します。ここではそれがルートスクローラーになります。

```html
<body>
  <!-- MANDATORY: 純粋に装飾的な視覚的スクロールプログレスバーは、空の要素を支援技術の読み上げツリーから取り除くため aria-hidden="true" を必ず設定すること -->
  <div id="progress" aria-hidden="true"></div>
</body>
```

このコードは、`scroll-timeline` プロパティで作成した名前付き scroll-timeline を使用して、スクロール時に `#progress` 要素を成長させます。

```css
@media (prefers-reduced-motion: no-preference) {
  @supports ((animation-timeline: scroll())) {
    @keyframes grow-progress {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }

    :root {
      scroll-timeline: --tl block;
    }

    #progress {
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 1em;
      background: red;

      transform-origin: 0 50%;
      animation: grow-progress auto linear;
      animation-timeline: --tl;
    }
  }
}
```

## ベストプラクティス

スクロール駆動アニメーションを使用する際には、スムーズでアクセシブルな体験を提供するために、いくつかのベストプラクティスを守ることが重要です。

- **DO** 機能検出を含めること: すべてのブラウザがスクロール駆動アニメーションをサポートしているわけではありません。`@supports (animation-timeline: scroll())` でサポートを確認し、未対応のブラウザにはフォールバックを提供してください。
  - フォールバック戦略として `scroll-timeline-polyfill` パッケージを **DO NOT** 使用しないでください。機能が完備されておらず、既知の問題が多数あります。
  - アニメーションが装飾的なものに限られる場合は、プログレッシブエンハンスメントを採用し、**DO NOT** フォールバックを提供しないでください。
- **DO** 純粋に装飾的な要素を支援技術の読み上げフローから取り除くこと: 純粋に視覚的なスクロールインジケーターには `aria-hidden="true"` を付与し、スクリーンリーダーが空の名前のないノードに遭遇しないようにしてください。
- **DO** ユーザー設定を尊重すること: 一部のユーザーはモーションを抑えた表示を好みます。`prefers-reduced-motion` メディアクエリを使ってこれらのユーザー向けにアニメーションを無効化または抑制してください。
- **DO** パフォーマンスの良いCSSプロパティのみをアニメーションさせること: 最もスムーズなアニメーションのためには、`transform` や `opacity` のようにブラウザのコンポジタースレッドで処理できるプロパティに絞ってアニメーションさせてください。`width` や `height` のような他のプロパティをアニメーションするとパフォーマンス問題を引き起こす可能性があります。
- **DO** 正しい宣言順序を使用すること: `animation` ショートハンドプロパティを使用する際は、ショートハンドがタイムラインをリセットしないように、その _後_ に `animation-timeline` を宣言してください。

`scroll()` 関数を使ってスクロール駆動アニメーションを作成する場合:

- **OPTIONAL** スクローラーを明示すること: 最も近い祖先のスクローラーを対象としない場合は、`scroll(root)` または `scroll(self)` でどのスクローラーを使うかを明示してください。
  - `root`、`nearest`、`self` が十分でない場合は、名前付き scroll-timeline を使ってください。
- **OPTIONAL** 追跡する軸を明示すること: デフォルトの `block` 軸を対象としない場合(横方向のスクローラーなど)は、`scroll(block)` または `scroll(inline)` で追跡する軸を明示してください。

`scroll-timeline` プロパティを使ってスクロール駆動アニメーションを作成する場合:

- **DO** 名前にCSSの `<dashed-ident>` を使用すること。
- **OPTIONAL** 追跡する軸を明示すること: デフォルトの `block` 軸を対象としない場合(横方向のスクローラーなど)は、`scroll-timeline-axis` で追跡する軸を明示してください。
- **DO** ルックアップのスコープが機能することを確認すること: `scroll-timeline` を宣言する要素がアニメーション対象要素のフラットツリー上の祖先でない場合、共通の祖先で `timeline-scope` を使って `scroll-timeline` の名前の可視範囲を引き上げてください。

## フォールバック戦略

スクロール駆動アニメーションは限定的に利用可能です。
対応ブラウザ: Chrome 115 (2023年7月)、Edge 115 (2023年7月)、Safari 26 (2025年9月)。
未対応: Firefox。

スクロール駆動アニメーションをサポートしないブラウザでは、フォールバックを使って視覚効果を再現できます。フォールバックは通常、scroll listener(ScrollTimeline効果向け)や IntersectionObserver API(ViewTimeline効果向け)で構築されます。

スクロール駆動アニメーションをネイティブにサポートするブラウザでは、よりパフォーマンスの高いネイティブCSS実装を必ず使用してください。

なお、すべての効果をフォールバックで再現できるわけではありません。

このユースケースに特化したフォールバックとして、次のスクリプトはスクロール駆動アニメーションをサポートしないブラウザに適用されます。scroll listener を使ってルート要素のスクロール位置を追跡し、それに応じてプログレスバーの `transform` プロパティを更新します。

```html
<script>
  if (!CSS.supports('animation-timeline', 'scroll()')) {
    const progress = document.querySelector('#progress');

    window.addEventListener('scroll', () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const progressPercentage = scrolled / scrollable;

      progress.style.transform = `scaleX(${progressPercentage})`;
    });
  }
</script>
```
