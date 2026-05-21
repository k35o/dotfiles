# フォアグラウンドの合計時間を算出する

このガイドでは、ユーザーがページを実際に閲覧していた合計時間を正確に算出する方法を解説します。time-on-page のような従来のメトリクスは、ページがバックグラウンドにある時間まで誤って含めてしまうことがよくあります。`VisibilityStateEntry` APIを利用することで、「フォアグラウンド時間」のみを計測でき、ユーザーエンゲージメントのより良い指標を提供できます。

## フォアグラウンド時間の算出を実装する

`PerformanceTimeline` APIは、可視状態の変化をパフォーマンスエントリとして公開します。`visibilitychange` イベントに反応してセッション全体にわたって時間を手動で積算する代わりに、いつでも可視状態の履歴全体を照会できます。

MANDATORY: 真のフォアグラウンド時間を算出するには、`visibility-state` パフォーマンスエントリを照会する必要があります。

```javascript
/**
 * Calculates total time the page was in the visible state.
 *
 * @returns {number} Total foreground time in milliseconds.
 */
function getTotalForegroundTime() {
  // MANDATORY: Query the visibility-state entries from the performance timeline.
  const entries = performance.getEntriesByType('visibility-state');

  // Fallback: If the browser does not support VisibilityStateEntry,
  // the API will gracefully return an empty array.
  if (entries.length === 0) {
    // Return total time since navigation start as a fallback.
    return performance.now();
  }

  let totalForegroundTime = 0;

  for (let i = 0; i < entries.length; i++) {
    // Only calculate duration for periods where the state was 'visible'
    if (entries[i].name === 'visible') {
      const start = entries[i].startTime;

      // The end time is the start time of the next state change,
      // or the current time if this is the final entry.
      const end =
        i + 1 < entries.length ? entries[i + 1].startTime : performance.now();

      totalForegroundTime += end - start;
    }
  }

  return totalForegroundTime;
}
```

## フォールバックとブラウザサポート

Page visibility state は限定的に利用可能です。
対応ブラウザ: Chrome 115（2023年7月）および Edge 115（2023年7月）。
未対応: Firefox および Safari。

`VisibilityStateEntry` APIはPerformance Timelineに新しく追加されたもので、すべてのブラウザでサポートされているわけではありません。

未対応ブラウザでは `performance.getEntriesByType('visibility-state')` は空の配列を返すため、Feature Detection は算出フローに組み込まれています。処理を進める前に、必ずエントリが返されたかどうかを確認してください。

APIが未対応の場合、推奨されるフォールバックは `performance.now()` を返すことです。これはナビゲーション開始からの合計時間を表し、可視状態の履歴が取得できないときのエンゲージメント時間の妥当な上限値として機能します。

```javascript
const entries = performance.getEntriesByType('visibility-state');

// If the array is empty, the API is likely unsupported.
if (entries.length === 0) {
  // Fallback: Return total time since page load.
  return performance.now();
}
```
