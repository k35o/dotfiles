# スクロール終了まで作業を遅延させる

Web 上でのスクロールは滑らかで応答性が高くあるべきです。レイアウト再計算、アナリティクスデータビーコンの追跡、動的なDOM更新といった重いタスクをスクロール中に実行すると、メインスレッドが飽和し、フレーム落ちやレイアウトスラッシングが発生します。

これまで開発者は、スクロールが終わったタイミングを推測するために `setTimeout()` を使って `scroll` イベントをデバウンスする手法に頼ってきました。しかし、こうしたデバウンスされた関数は非常に信頼性が低く、ユーザーがまだスクロール中であっても発火する可能性があります。

`scrollend` イベントは、パフォーマンス重視で非常に信頼性の高い解決策を提供します。ブラウザは、スクロールが停止し、すべての遷移が完了し、タッチジェスチャーが解放された正確なタイミングで `scrollend` イベントを発火させます。

## 実装方法

作業遅延パターンを実装するには次のようにします。

1. **スクロール可能なコンテナを用意する**: `overflow: auto` または `overflow: scroll` を持つコンテナを作成します。
2. **`scroll` イベントを購読する**: このリスナーは基本的な動的メトリクスや情報的なレイアウトスタイリングにのみ使用します。重い作業はここで実行しないでください。
3. **`scrollend` イベントを購読する**: スクロールコンテナまたはドキュメント自身に `scrollend` コールバックを登録します。
4. **高コストな作業はコールバックで実行する**: 動的コンテンツの取得や、包括的なDOMレイアウトのトリガーは、この場所で行うのが安全です。

## サンプルコード

```css
.scroll-container {
  height: 300px;
  overflow-y: auto;
}
```

```javascript
const scroller = document.querySelector('.scroll-container');

// 1. Informative feedback during scroll
scroller.addEventListener('scroll', () => {
  // Avoid dynamic heavier data updates here
  console.log('Scrolling dynamically... updates deferred');
});

// 2. Safe callback when scrolling rests
scroller.addEventListener('scrollend', () => {
  // Run layout recalculations or analytical beacons updates here
  const currentVisibleSection = findMostVisibleSection(scroller);
  fetchAdditionalData(currentVisibleSection);
});
```

## 戦略的な実装とベストプラクティス

- **DO** レイアウト関連のデータビーコンを送信したり、新しいコンテンツを動的にフェッチしたりするときは、デバウンスされた `scroll` イベントではなく `scrollend` を使ってください。
- **DO** カルーセルや証言ギャラリーのスライドを構築している場合は、`scrollSnapChange` や `scrollSnapChanging` などのスナップインタラクションと組み合わせることを検討してください。
- **DO NOT** レイアウトに依存する動的更新を、動的な視覚的スクロールコールバック内にまとめないでください。
- **DO** ビジュアルビューポートのズームやスクロールも `scrollend` イベントを正しくトリガーすることを念頭に置いてください。

## フォールバック戦略

scrollend のBaselineステータス: Newly available。2025年12月12日からBaselineです。
対応ブラウザ: Chrome 114（2023年5月）、Edge 114（2023年6月）、Firefox 109（2023年1月）、Safari 26.2（2025年12月）。

未対応ブラウザでは、`setTimeout` を使ったデバウンスされた `scroll` イベントにフォールバックし、カスタムの `scrollend` イベントをディスパッチします。

```javascript
function initializeDemo() {
  const scroller = document.querySelector('#scroller');
  scroller.addEventListener('scrollend', () => {
    // Safe execution
  });
}

if ('onscrollend' in window) {
  initializeDemo();
} else {
  initializeDemo();
  const scroller = document.querySelector('#scroller');
  scroller.addEventListener('scroll', () => {
    clearTimeout(window.scrollendtimer);
    window.scrollendtimer = setTimeout(() => {
      scroller.dispatchEvent(new CustomEvent('scrollend'));
    }, 100);
  });
}
```
