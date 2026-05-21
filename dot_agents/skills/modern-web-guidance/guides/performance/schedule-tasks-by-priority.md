複雑なWebアプリケーションを構築するとき、タスクには異なる緊急度があります。現在のビューに必要なタスクを完了させることは、アナリティクスの送信やアセットのプリフェッチよりも重要です。Prioritized Task Scheduling APIを使うと、特定の優先度で作業をスケジュールでき、ブラウザがユーザー入力に応答し続けるようにできます。

### 優先度別にタスクをスケジュールする

`scheduler.postTask()` を使い、3つの優先度のいずれかでタスクをスケジュールします。
- `user-blocking`: ユーザーのインタラクションをブロックするタスク（例: 入力処理、重要なレンダリング）。
- `user-visible`: ユーザーに見えるがブロックしないタスク（デフォルト）。
- `background`: 時間に余裕のあるタスク（例: アナリティクス、プリフェッチ）。

```javascript
// Schedule a high-priority task that blocks user interaction
scheduler.postTask(() => {
  // DO: Handle critical updates that impact user interaction
  handleCriticalUpdate();
}, { priority: 'user-blocking' });

// Schedule a default priority task
scheduler.postTask(() => {
  // DO: Render non-critical content that is visible to the user
  renderSecondaryContent();
}); // Defaults to 'user-visible'

// Schedule a low-priority background task
scheduler.postTask(() => {
  // DO: Perform heavy background work that is not time-critical
  sendAnalytics();
}, { priority: 'background' });
```

### フォールバック戦略

Scheduler API は限定的に利用可能です。
対応ブラウザ: Chrome 129（2024年9月）、Edge 129（2024年9月）、Firefox 142（2025年8月）。
未対応: Safari。

Prioritized Task Scheduling APIを持たないブラウザをサポートするには、タスクの優先度付けを維持するためにポリフィルを使用しなければなりません。

```javascript
// Feature detect the scheduler API
if (!('scheduler' in window && 'postTask' in window.scheduler)) {
  // DO: Conditionally load the polyfill for browsers that need it
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/scheduler-polyfill';
  script.onload = () => {
    // Polyfill is loaded and ready to use
    runScheduledTasks();
  };
  document.head.appendChild(script);
} else {
  runScheduledTasks();
}

function runScheduledTasks() {
  // Now safe to use scheduler.postTask in all browsers
  scheduler.postTask(() => {
    console.log('Task with priority support');
  }, { priority: 'background' });
}
```
