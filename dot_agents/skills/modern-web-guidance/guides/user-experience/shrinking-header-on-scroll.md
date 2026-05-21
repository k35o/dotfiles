# スクロールで縮小するヘッダー

スクロールで縮小するヘッダーは、ページ上部に固定されたヘッダー要素が、ユーザーが下にスクロールするにつれて滑らかに小さなサイズへ遷移する、よく使われるUIパターンです。この効果はメインコンテンツのために画面領域を最大化しつつ、重要なナビゲーションやブランディング要素にアクセス可能な状態を保つためによく使われます。CSSスクロール駆動アニメーションを使えば、アニメーションをドキュメントのスクロール位置に紐づけることで、この効果を宣言的かつパフォーマンスよく実現できます。

## 実装方法

スクロールで縮小するヘッダーを作成する手順は次のとおりです。

1.  **固定ヘッダーを作る:** ページ上部に固定された、あらかじめ高さが決まっているヘッダー要素から始めます。

    ```html
    <header>HEADER</header>
    ```

    ```css
    header {
      position: fixed;
      height: 200px;
      top: 0;
      left: 0;
      right: 0;
    }
    ```

2.  **縮小アニメーションを定義する:** ヘッダーの高さを変えるCSSアニメーションを作成します。

    ```css
    @keyframes shrink {
      to {
        height: 50px;
      }
    }
    ```

3.  **アニメーションとスクロールタイムラインを適用する:** ヘッダーにアニメーションをアタッチし、`scroll()` 関数でドキュメントのスクロール位置に紐づけます。

    ```css
    header {
      animation: shrink auto linear both;
      animation-timeline: scroll(block root);
    }
    ```

4.  **`animation-range` を設定する:** `animation-range` プロパティを使って、アニメーションを実行するスクロール距離を指定します。例えば、ヘッダーをスクロール開始から150ピクセルで縮小するには `animation-range: 0px 150px;` とします。

    ```css
    header {
      animation-range: 0px 150px;
    }
    ```

**ヒント:** ヘッダー直後のコンテンツがヘッダーに隠れないように、`body` (またはメインコンテンツコンテナ)にヘッダーの初期高さと等しい `padding-top` を追加してください。

**ヒント:** ページのコンテンツがヘッダーの縮小と同期してスクロールするようにするには、`animation-range-end` を開始サイズと終了サイズの差に設定します。これにより、ヘッダーが最終サイズに到達した時点でアニメーションが正確に完了します。このデモではヘッダーが `200px` から `50px` に縮むため、`animation-range-end` は `150px` に設定しています。

## サンプルコード

```css
@keyframes shrink {
  to {
    height: 50px;
  }
}

header {
  animation: shrink auto linear both;
  animation-timeline: scroll(block root);
  animation-range: 0px 150px;
}
```

## ベストプラクティス

スクロール駆動アニメーションを使用する際には、スムーズでアクセシブルな体験を提供するために、いくつかのベストプラクティスを守ることが重要です。

- **DO** 機能検出を含めること: すべてのブラウザがスクロール駆動アニメーションをサポートしているわけではありません。`@supports ((animation-timeline: scroll()) and (animation-range: 0% 100%))` でサポートを確認し、未対応のブラウザにはフォールバックを提供してください。
  - `(animation-range: 0% 100%)` のチェックは、部分的にしかサポートされていないブラウザを除外するために **必ず** 含める必要があります。
  - フォールバック戦略として `scroll-timeline-polyfill` パッケージを **DO NOT** 使用しないでください。機能が完備されておらず、既知の問題が多数あります。
  - アニメーションが装飾的なものに限られる場合は、プログレッシブエンハンスメントを採用し、**DO NOT** フォールバックを提供しないでください。
- **DO** ユーザー設定を尊重すること: 一部のユーザーはモーションを抑えた表示を好みます。`prefers-reduced-motion` メディアクエリを使ってこれらのユーザー向けにアニメーションを無効化または抑制してください。
- **DO** パフォーマンスの良いCSSプロパティのみをアニメーションさせること: 最もスムーズなアニメーションのためには、`transform` や `opacity` のようにブラウザのコンポジタースレッドで処理できるプロパティに絞ってアニメーションさせてください。`width` や `height` のような他のプロパティをアニメーションするとパフォーマンス問題を引き起こす可能性があります。
- **DO** 正しい宣言順序を使用すること: `animation` ショートハンドプロパティを使用する際は、ショートハンドがタイムラインをリセットしないように、その *後* に `animation-timeline` と `animation-range` を宣言してください。

`scroll()` 関数を使ってスクロール駆動アニメーションを作成する場合:

- **OPTIONAL** スクローラーを明示すること: 最も近い祖先のスクローラーを対象としない場合は、`scroll(root)` または `scroll(self)` でどのスクローラーを使うかを明示してください。
  - `root`、`nearest`、`self` が十分でない場合は、名前付き scroll-timeline を使ってください。
- **OPTIONAL** 追跡する軸を明示すること: デフォルトの `block` 軸を対象としない場合(横方向のスクローラーなど)は、`scroll(block)` または `scroll(inline)` で追跡する軸を明示してください。

このユースケース特有の注意点:

- `animation-range` でパーセンテージを使用する場合、アニメーション対象の要素は `position: static` または `position: relative` であってはなりません。
  - これらの要素は「フロー内」とみなされるためです。スクロールに合わせてこれらの要素を縮小すると、スクロール全体の距離も縮み、結果として例えば「スクロールの10%」といった計算値に影響を及ぼします。

## ブラウザサポートとフォールバック戦略

スクロール駆動アニメーションは限定的に利用可能です。
対応ブラウザ: Chrome 115 (2023年7月)、Edge 115 (2023年7月)、Safari 26 (2025年9月)。
未対応: Firefox。よって通常はフォールバック戦略が必要です。

スクロール駆動アニメーションをサポートしないブラウザでは、フォールバックを使って視覚効果を再現できます。フォールバックは通常、scroll listener(ScrollTimeline効果向け)や IntersectionObserver API(ViewTimeline効果向け)で構築されます。

スクロール駆動アニメーションをネイティブにサポートするブラウザでは、よりパフォーマンスの高いネイティブCSS実装を必ず使用してください。

なお、すべての効果をフォールバックで再現できるわけではありません。

このユースケースに特化したフォールバックとして、次のスクリプトはスクロール駆動アニメーションをサポートしないブラウザに適用されます。scroll listener を使ってドキュメントのスクロール位置を `150px` の範囲で追跡し、それに応じてヘッダーの高さを更新します。

```js
// Fallback for browsers that don't support scroll-driven animations
if (!CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)')) {
  const header = document.querySelector('header');

  const initialHeight = 200;
  const finalHeight = 50;
  const scrollDistance = 150;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const scrollPercent = Math.min(1, scrollY / scrollDistance);
    const newHeight = initialHeight - (initialHeight - finalHeight) * scrollPercent;

    header.style.height = `${newHeight}px`;
  });
}
```
