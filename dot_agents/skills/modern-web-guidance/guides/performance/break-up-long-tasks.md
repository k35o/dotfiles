重い計算や長いループはメインスレッドをブロックし、ページの応答性を損なう可能性があります。これを防ぐには、定期的にブラウザに制御を返す必要があります。`scheduler.yield()` APIを使用すると、長いタスクを一時停止し、処理を継続する前にユーザー入力やレンダリングをブラウザに処理させることができます。

### 長いタスクを分割する

非同期関数内で `scheduler.yield()` を使用して作業を分割します。

```javascript
async function processLargeArray(items) {
  // DO: Set a time-based deadline 50 milliseconds into the future. 50
  // milliseconds is the boundary for when a task becomes a long task.
  let deadline = performance.now() + 50; // 50ms budget

  for (const item of items) {
    // Process the item
    processItem(item);

    // MANDATORY: Yield to the main thread periodically to keep the UI
    // responsive. This can be done by checking if the deadline set earlier
    // has been exceeded. When it has been, yield, then reset the deadline
    // another 50 milliseconds into the future.
    if (performance.now() >= deadline) {
      await scheduler.yield();
      deadline = performance.now() + 50;
    }
  }
}
```

### フォールバック戦略

Scheduler API は限定的に利用可能です。
対応ブラウザ: Chrome 129（2024年9月）、Edge 129（2024年9月）、Firefox 142（2025年8月）。
未対応: Safari。

一部のブラウザは `scheduler` APIをサポートしていない場合があります。コードが破綻せず実行されるよう、必ず `setTimeout` を使ったフォールバックを実装してください。

#### `scheduler.yield()` のフォールバック

```javascript
async function processLargeArrayWithFallback(items) {
  // DO: Set a time-based deadline 50 milliseconds into the future.
  let deadline = performance.now() + 50;

  for (const item of items) {
    processItem(item);

    // MANDATORY: Yield to the main thread periodically to keep the UI responsive.
    if (performance.now() >= deadline) {
      // DO: Feature detect scheduler.yield
      if ('scheduler' in window && 'yield' in window.scheduler) {
        await scheduler.yield();
      } else {
        // DO: Fallback to setTimeout for older browsers
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      deadline = performance.now() + 50;
    }
  }
}
```
