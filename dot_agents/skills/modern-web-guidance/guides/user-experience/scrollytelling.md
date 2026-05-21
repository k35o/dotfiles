# スクロリテリング

スクロリテリングは、魅力的で没入感のあるWeb体験を作るために用いられる人気の技法です。ユーザーがスクロールするのに合わせてページの要素をアニメーションさせ、ストーリーを伝えたりナラティブを通してユーザーを導いたりします。CSSスクロール駆動アニメーションを使えば、JavaScriptに頼らずCSSだけでこれらの効果を作成できます。アニメーションは時間ベースのクロックではなくスクロール位置によって制御されるため、常にユーザーのスクロールと同期します。

## 実装方法

スクロリテリング体験を作成するには、スクロール位置を追跡する要素群と、アニメーションさせる要素群の2セットが必要です。

まず、追跡したい要素に名前付き `view-timeline` を定義します。これらがアニメーションの駆動源として機能します。

```css
#tracked {
  section:nth-child(1) {
    view-timeline: --tl-1 block;
  }
  section:nth-child(2) {
    view-timeline: --tl-2 block;
  }
  section:nth-child(3) {
    view-timeline: --tl-3 block;
  }
  section:nth-child(4) {
    view-timeline: --tl-4 block;
  }
  section:nth-child(5) {
    view-timeline: --tl-5 block;
  }
}
```

次に、アニメーションさせたい要素にアニメーションを適用し、`animation-timeline` プロパティで作成済みのタイムラインに紐づけます。

```css
#animated {
  section {
    animation:
      animate-in auto linear both,
      animate-out auto linear forwards;
    animation-range:
      entry 25% cover 50%,
      exit 50% exit 75%;
  }

  section:nth-child(1) {
    animation-timeline: --tl-1;
  }
  section:nth-child(2) {
    animation-timeline: --tl-2;
  }
  section:nth-child(3) {
    animation-timeline: --tl-3;
  }
  section:nth-child(4) {
    animation-timeline: --tl-4;
  }
  section:nth-child(5) {
    animation-timeline: --tl-5;
  }
}
```

`animation-timeline` が名前付きタイムラインを参照できるようにするには、両者が同じスコープに存在する必要があります。共通の祖先要素に `timeline-scope` プロパティを使うと、必要なすべての要素からタイムラインを参照できます。`:root` 要素はそのためによく使われる選択肢です。

```css
html {
  timeline-scope: --tl-1, --tl-2, --tl-3, --tl-4, --tl-5;
}
```

最後に、`animation-range` プロパティを使って、アニメーションを実行するタイムラインの範囲を厳密に指定できます。これにより、アニメーションがいつトリガーされ、どのように進行するかを細かく制御できます。

```css
#animated section {
  animation-range:
    entry 25% cover 50%,
    exit 50% exit 75%;
}
```

## サンプルコード

```css
html {
  timeline-scope: --tl-1, --tl-2, --tl-3, --tl-4, --tl-5;
}

#tracked {
  section:nth-child(1) {
    view-timeline: --tl-1 block;
  }
  section:nth-child(2) {
    view-timeline: --tl-2 block;
  }
  section:nth-child(3) {
    view-timeline: --tl-3 block;
  }
  section:nth-child(4) {
    view-timeline: --tl-4 block;
  }
  section:nth-child(5) {
    view-timeline: --tl-5 block;
  }
}

@keyframes animate-in {
  from {
    scale: 0.5;
    opacity: 0;
    transform: rotateY(-180deg);
  }
  to {
    transform: rotateY(0deg);
  }
}
@keyframes animate-out {
  to {
    translate: 100% 0;
    opacity: 0;
  }
}

#animated {
  section {
    animation:
      animate-in auto linear both,
      animate-out auto linear forwards;
    animation-range:
      entry 25% cover 50%,
      exit 50% exit 75%;
    backface-visibility: hidden;
  }

  section:nth-child(1) {
    animation-timeline: --tl-1;
  }
  section:nth-child(2) {
    animation-timeline: --tl-2;
  }
  section:nth-child(3) {
    animation-timeline: --tl-3;
  }
  section:nth-child(4) {
    animation-timeline: --tl-4;
  }
  section:nth-child(5) {
    animation-timeline: --tl-5;
  }
}

/* MANDATORY Copy-Paste Safety: Disable continuous storytelling motion for sensitive users */
@media (prefers-reduced-motion: reduce) {
  #animated section {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
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
- **DO** 正しい宣言順序を使用すること: `animation` ショートハンドプロパティを使用する際は、ショートハンドがタイムラインをリセットしないように、その _後_ に `animation-timeline` と `animation-range` を宣言してください。

`view-timeline` プロパティを使ってスクロール駆動アニメーションを作成する場合:

- **DO** 名前にCSSの `<dashed-ident>` を使用すること。
- **OPTIONAL** 追跡する軸を明示すること: デフォルトの `block` 軸を対象としない場合(横方向のスクローラーなど)は、`view-timeline-axis` で追跡する軸を明示してください。
- **DO** ルックアップのスコープが機能することを確認すること: `view-timeline` を宣言する要素がアニメーション対象要素のフラットツリー上の祖先でない場合、共通の祖先で `timeline-scope` を使って `view-timeline` の名前の可視範囲を引き上げてください。

## フォールバック戦略

スクロール駆動アニメーションは限定的に利用可能です。
対応ブラウザ: Chrome 115 (2023年7月)、Edge 115 (2023年7月)、Safari 26 (2025年9月)。
未対応: Firefox。

スクロール駆動アニメーションをサポートしないブラウザでは、フォールバックを使って視覚効果を再現できます。フォールバックは通常、scroll listener(ScrollTimeline効果向け)や IntersectionObserver API(ViewTimeline効果向け)で構築されます。

スクロール駆動アニメーションをネイティブにサポートするブラウザでは、よりパフォーマンスの高いネイティブCSS実装を必ず使用してください。

なお、すべての効果をフォールバックで再現できるわけではありません。

このユースケースに特化したフォールバックとして、次のスクリプトはスクロール駆動アニメーションをサポートしないブラウザに適用されます。`IntersectionObserver` を使って各 `#tracked section` 要素の可視性を追跡し、それに応じて対応する `#animated section` の `transform` プロパティを更新します。

```js
const animatedSections = document.querySelectorAll('#animated section');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const sectionIndex = Array.from(
        document.querySelectorAll('#tracked section'),
      ).indexOf(entry.target);
      if (sectionIndex !== -1) {
        const animatedSection = animatedSections[sectionIndex];
        const ratio = entry.intersectionRatio;

        // Animate-in
        animatedSection.style.opacity = ratio;
        animatedSection.style.transform = `scale(${0.5 + ratio * 0.5}) rotateY(${-180 + ratio * 180}deg)`;

        // Animate-out
        if (ratio < 0.5) {
          animatedSection.style.translate = `${(0.5 - ratio) * 2 * 100}% 0`;
        } else {
          animatedSection.style.translate = '0 0';
        }
      }
    });
  },
  { threshold: Array.from({ length: 101 }, (_, i) => i / 100) },
);

document.querySelectorAll('#tracked section').forEach((section) => {
  observer.observe(section);
});
```

それに対応するCSS:

```css
#animated section {
  opacity: 0;
  transform: scale(0.5) rotateY(-180deg);
  backface-visibility: hidden;
}

/* MANDATORY Copy-Paste Safety: Ensure content remains fully visible and legible for assistive technologies or users with motion sensitivities */
@media (prefers-reduced-motion: reduce) {
  #animated section {
    opacity: 1 !important;
    transform: none !important;
    translate: 0 0 !important;
  }
}
```

このフォールバックは、ネイティブのCSS機能をサポートしないブラウザに対してより正確なスクロール駆動アニメーションを提供し、すべてのユーザーに一貫した体験を保証します。`IntersectionObserver` のしきい値を多数並べることで、スクロール位置をより精密に追跡し、よりスムーズなアニメーションを実現できます。
