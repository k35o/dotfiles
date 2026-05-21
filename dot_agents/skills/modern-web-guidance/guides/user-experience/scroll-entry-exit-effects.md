# 要素がスクロールポートに出入りする際のエントリー／エグジット効果を追加する

エントリーとエグジットの効果は、要素がビューポートに入る、または出るときに発火するアニメーションです。これは魅力的でダイナミックなユーザー体験を作るのに使えます。例えば、エントリー効果でスクロール時に要素をフェードインさせたり、エグジット効果でスクロールアウト時に要素を縮小させたりできます。

## 実装方法

エントリーとエグジット効果を要素に追加するには、いくつかのCSSプロパティを組み合わせる必要があります。ステップごとに見ていきましょう。

1.  **エントリーとエグジットのアニメーション用に別々の`@keyframes`を作成する。** エントリーアニメーションは要素がビューポートに入るときに、エグジットアニメーションはビューポートから出るときに適用されます。

    ```css
    @keyframes slide-in {
      from {
        transform: translateX(-100%);
      }
    }
    @keyframes slide-out {
      to {
        transform: translateX(100%);
      }
    }
    ```

2.  **エントリーとエグジットのキーフレームを要素に紐づける。** `animation`プロパティで複数のアニメーションを定義することで実現できます。
    - エントリーアニメーションには`animation-fill-mode`を`backwards`にして、アニメーション開始前に初期状態を適用するようにします。
    - エグジットアニメーションには`animation-fill-mode`を`forwards`にして、アニメーション完了後に最終状態を維持するようにします。

    ```css
    .animated-element {
      animation:
        slide-in 1s linear backwards,
        slide-out 1s linear forwards;
    }
    ```

3.  **View Timelineを作成してアニメーションに紐づける。** View Timelineはビューポート内の要素の可視性に連動するタイムラインの一種です。`view()`関数で作成し、`animation-timeline`プロパティでアニメーションに適用できます。

    ```css
    .animated-element {
      animation-timeline: view();
    }
    ```

    デフォルトでは、`view()`は`block`軸で要素を追跡します。`inline`軸で追跡したい場合は、`view(inline)`を使えます。

4.  **アニメーションを`entry`と`exit`の範囲に限定する。** `animation-range`プロパティを使うと、アニメーションをタイムラインのどの部分で実行するかを指定できます。
    - `entry`範囲は要素が最初にビューポートに入ってから完全に見えるようになるまでの時間をカバーします。
    - `exit`範囲は要素がビューポートから出始めてから完全に隠れるまでの時間をカバーします。

    ```css
    .animated-element {
      animation-range: entry, exit;
    }
    ```

## コード例

このコードは、**匿名のview-timeline**を使ってスクローラーの直接の子要素をスクロール時にアニメーションさせます。

```css
@media (prefers-reduced-motion: no-preference) {
  @supports ((animation-timeline: view()) and (animation-range: entry)) {
    @keyframes grow {
      from {
        scale: 0.5;
      }
    }
    @keyframes shrink {
      to {
        scale: 0.5;
      }
    }

    .scroller > * {
      animation:
        grow auto linear backwards,
        shrink auto linear forwards;
      animation-timeline: view(inline);
      animation-range: entry, exit;
    }
  }
}
```

要素がスクロールポートに入ると`grow`アニメーションが再生され、出ていくときには`shrink`アニメーションが再生されます。

以下のコードは視覚的には同じ結果ですが、**名前付きview-timeline**を使ってスクローラーの直接の子要素をスクロール時にアニメーションさせています。

```css
@media (prefers-reduced-motion: no-preference) {
  @supports ((animation-timeline: view()) and (animation-range: entry)) {
    @keyframes grow {
      from {
        scale: 0.5;
      }
    }
    @keyframes shrink {
      to {
        scale: 0.5;
      }
    }

    .scroller > * {
      view-timeline: --tl inline;
      animation:
        grow auto linear backwards,
        shrink auto linear forwards;
      animation-timeline: --tl;
      animation-range: entry, exit;
    }
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
- **DO** 正しい宣言順序を使う: `animation`ショートハンドプロパティを使う場合は、`animation-timeline`を**その後ろ**に宣言し、ショートハンドがタイムラインをリセットしないようにしてください。

`view()`関数でスクロール駆動アニメーションを作る場合:

- **任意** 追跡する軸を明示する: 水平スクローラーなどデフォルトの`block`軸を対象にしないときは、`view(block)`や`view(inline)`で追跡する軸を明示します。
- アニメーションが追跡対象自身に適用されない場合は、名前付きview timelineを使います。

`view-timeline`プロパティでスクロール駆動アニメーションを作る場合:

- **DO** 名前にはCSSの`<dashed-ident>`を使ってください。
- **任意** 追跡する軸を明示する: 水平スクローラーなどデフォルトの`block`軸を対象にしないときは、`view-timeline-axis`で追跡する軸を明示します。
- **DO** ルックアップのスコープが機能することを確認する: `view-timeline`を宣言している要素が、アニメーション対象要素のフラットツリーの祖先でない場合、共通の祖先で`timeline-scope`を使って`view-timeline`の名前の可視性を持ち上げてください。

追跡対象の複数の要素または子要素がアニメーションする必要がある場合は、名前付き`view-timeline`を優先してください。

## ブラウザサポートとフォールバック戦略

Scroll-driven animations has limited availability.
Supported by: Chrome 115 (Jul 2023), Edge 115 (Jul 2023), and Safari 26 (Sep 2025).
Unsupported in: Firefox.. そのため、通常はフォールバック戦略が必要になります。

スクロール駆動アニメーションをサポートしていないブラウザでは、フォールバックで視覚効果を再現できます。フォールバックは通常、スクロールリスナー（ScrollTimeline効果向け）か`IntersectionObserver` API（ViewTimeline効果向け）で構築します。

スクロール駆動アニメーションがネイティブサポートされているブラウザでは、パフォーマンスがより高いため、**常に**ネイティブCSS実装を使ってください。

すべての効果がフォールバックで再現できるわけではない点に注意してください。

このユースケース固有では、以下のスクリプトがスクロール駆動アニメーション非対応ブラウザ向けのフォールバックを適用します。`IntersectionObserver`で`.wrapper`要素の表示状況を追跡し、スクロール位置に基づいてレイヤーの`transform`プロパティを更新します。

```html
<script>
  if (
    !CSS.supports('(animation-timeline: view()) and (animation-range: entry)')
  ) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // This matches the effect as defined in the CSS example above.
          // Customize this further if needed.
          entry.target.style.scale = 0.5 + entry.intersectionRatio * 0.5;
        }
      },
      {
        threshold: Array.from({ length: 101 }, (_, i) => i / 100),
      },
    );

    document.querySelectorAll('.scroller > *').forEach((el) => {
      observer.observe(el);
    });
  }
</script>
```
