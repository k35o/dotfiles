ユーザーがアクションを確定する前にプレビューを提供することは有用な場合があります。Interest invokers は、（ボタンやリンクのような）interest source と interest target の間に interest 関係を、宣言的なベースで作成できる実験的な Web プラットフォーム機能です。一度宣言的な関係が確立されると、CSS と JavaScript の両方で、interest とその喪失に応じて開発者がさまざまな方法で反応できます。このユースケースでは、`interest` と `loseinterest` イベントを利用して、interest target に対するさまざまな効果をプレビューできます。

## 実装方法

interest 関係は、ボタンまたはリンク（つまり interest source）に `interestfor` 属性を設定することで作成されます。この属性は別の要素（つまり interest target）への ID 参照を取ります。Interest invoker（source）はひとつの interest target しか持てませんが、interest target は複数の interest invoker を持てます。

```html
<!-- MANDATORY: interest relationships must be established with the `interestfor` attribute on a button or a link -->
<button interestfor="interestingElement" data-effect="A">Some effect</button>
<button interestfor="interestingElement" data-effect="B">
  Some other effect
</button>
<div id="interestingElement">Something interesting</div>
```

このユースケースでは、`interest` と `loseinterest` イベントを利用して interest target に対するさまざまな効果をプレビューできます。どちらのイベントも `InterestEvent` で、interest のソース（つまり `interestfor` 属性を持つ要素）を表す `source` プロパティを持ちます。

```javascript
interestingElement.addEventListener('interest', (event) => {
  // Apply the preview based on `event.source`
  event.target.dataset.preview = event.source.dataset.effect;
});

interestingElement.addEventListener('loseinterest', (event) => {
  // Unapply the preview
  delete event.target.dataset.preview;
});
```

> [!NOTE]
> **interest によるプレビューをライブリージョンで読み上げないでください。** interest はページ上でポインタを動かしたり近くのボタンに Tab で移動するだけでもトリガーされるので、適用/解除の読み上げはすぐにノイズとなり、ユーザーが本当に気にしているコンテンツを覆い隠してしまいます。プレビュー自体がアフォーダンスであり、それを知覚できるユーザーは直接恩恵を受けますし、知覚できないユーザーは "Previewing effect: A" のような音声の繰り返しからは恩恵を受けません。特定のケースで本当に読み上げが必要だと判断した場合は、ユーザーで慎重にテストしてください。

アクティブな interest source と target は、それぞれ `:interest-source` と `:interest-target` 疑似セレクタで CSS から選択できます。

```css
/* Styles to apply when the effect is being previewed */
:interest-source {
}
:interest-target {
}
```

interest invoker（つまり `interestfor` 属性を持つ要素）の開始ディレイと終了ディレイは、`interest-delay-start` と `interest-delay-end` CSS プロパティ、またはショートハンドの `interest-delay` プロパティで設定できます。

```css
[interestfor] {
  interest-delay-start: 0.2s;
  interest-delay-end: 0.1s;
}
```

### フォールバック戦略

Interest invokers は限定的に利用可能です。
対応ブラウザ: Chrome 142（2025 年 10 月）、Edge 142（2025 年 10 月）。
未対応: Firefox、Safari。

Interest invokers は、NPM の `interestfor` ポリフィルパッケージを使って条件付きでポリフィルする必要があります。CDN ではなく、バンドル方式を優先してください。

```html
<script type="module">
  if (!HTMLButtonElement.prototype.hasOwnProperty('interestForElement')) {
    // CDN link only used for example, prefer bundling.
    await import('https://unpkg.com/interestfor@latest');
  }
</script>
```

ポリフィルを使うとき、`:interest-source` と `:interest-target` 疑似クラス、および `interest-delay`、`interest-delay-start`、`interest-delay-end` プロパティの CSS API は少し変わります。

```css
/* Styles to apply when the effect is being previewed */
:is(:interest-source, .interest-source) {
}
:is(:interest-target, .interest-target) {
}

/* Adjust the start and end delay for interest invokers */
[interestfor] {
  --interest-delay-start: 0.2ms;
  interest-delay-start: 0.2ms;
  --interest-delay-end: 0.1ms;
  interest-delay-end: 0.1ms;
}
```
