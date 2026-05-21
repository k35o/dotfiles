# 複数のアナリティクスイベントをデバウンスしてバッチ送信する

ほとんどのアナリティクスおよびテレメトリデータは優先度が低く、ユーザーがページを離れるまで送信を遅らせても問題ありません。例外は、リアルタイムの更新を配信する必要がある場合であり、その場合はタイミングが重要になります。

リアルタイムのアナリティクス更新を提供しつつ、ビーコンの数を最小限に抑える最適な方法は、`fetchLater()` と `activateAfter` 設定オプションを併用することです。これにより、特定の時間枠内に発生したすべてのアナリティクスイベントを単一のビーコンとして効果的にデバウンスおよびバッチ処理でき、タイムアウトが切れる前にユーザーがページを離れても確実に送信されます。

## 実装方法

1. **リクエストをスケジュールする:** 関連するアナリティクスデータが利用可能になり次第、データペイロードを指定して `fetchLater()` を呼び出し、`activateAfter` の値を渡します。これにより、その時間が経過した後、もしくはそれ以前にユーザーがページを離れた時点でデータが送信されるようキューに追加されます。

2. **複数のイベントをまとめてバッチ処理する:** `activateAfter` のタイムアウトが切れる前に新しいアナリティクスイベントが発生した場合、以前にスケジュールされたリクエストをアボートし、すべてのイベントキューを単一のペイロードとして（同じ `activateAfter` の値で）再度 `fetchLater()` を呼び出します。

3. **タイムアウトが切れたらイベントキューをリセットする:** スケジュール済みのビーコンが正常に送信された後（つまり `fetchLater()` の結果の `activated` 値が `true` になった後）に新しいアナリティクスイベントが発生した場合は、イベントキューをリセットします。

3. **残りはブラウザに任せる:** `activateAfter` のタイムアウトが切れる前にユーザーがページから離脱したりタブを閉じたりした場合でも、ブラウザは直近の `fetchLater()` 呼び出しのペイロードを確実に送信します。

## サンプルコード

このコードはページ上のすべての `load` イベントと `click` イベントを追跡し、10秒のタイムアウト内に発生したすべてのイベントをまとめてバッチ送信します。

```javascript
// Replace with your analytics endpoint.
const ANALYTICS_ENDPOINT = '/path/to/analytics/endpoint';

// Replace with a time window of your choice. All analytics events that
// occur within this time window will be batched together.
const BATCH_WINDOW = 10 * 1000;

// The maximum number of events to batch. Pick a number that is unlikely
// to overflow the fetchLater() quota for the page.
const MAX_QUEUE_SIZE = 100;

const eventQueue = [];
let fetchLaterResult;
let fetchLaterController;

function trackEvent(eventData) {
  // If the previously queued beacon has already been sent, or if the
  // max queue size has been met, reset the queue.
  if (fetchLaterResult?.activated || eventQueue.length > MAX_QUEUE_SIZE) {
    fetchLaterController = null;
    fetchLaterResult = null;
    eventQueue.length = 0;
  }

  eventQueue.push(eventData);

  // Abort any pending beacons before creating a new one.
  if (fetchLaterController) {
    fetchLaterController.abort();
  }
  fetchLaterController = new AbortController();

  // Schedule a fetch for the events to be sent when the batch window expires.
  // IMPORTANT: wrap the call in a try/catch to handle quota errors.
  try {
    fetchLaterResult = fetchLater(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(eventQueue),
      signal: fetchLaterController.signal,
      activateAfter: BATCH_WINDOW,
    });
  } catch (error) {
    // Handle errors as needed.
  }
}

// Track page loads.
window.addEventListener('load', () => {
  trackEvent({type: 'page_load'});
});

// Track click events.
window.addEventListener('click', (event) => {
  trackEvent({type: 'click', target: serializeElement(event.target)});
});
```

## ベストプラクティス

- **DO** 近接して発生する複数のアナリティクスイベントをまとめてバッチ送信するために、`activateAfter` オプションを設定した `fetchLater()` を使用してください。
- **DO** 新しいアナリティクスイベントが発生した場合に保留中のフェッチをキャンセルするために `AbortController` を使用してください。
- **DO** イベントをまとめすぎて `fetchLater()` のクォータ（現在オリジン当たり約64KB）を超過しないように確認してください。
- **DO** クォータエラーを処理するために `fetchLater()` の呼び出しを `try/catch` で囲んでください。
- **DO** `globalThis` 上に `fetchLater()` が存在するかを Feature Detection し、APIをサポートしていないブラウザ向けのフォールバック戦略を実装してください。
- **DO NOT** リクエストボディに `ReadableStream` オブジェクトを使用しないでください。エラーになります。

## ブラウザサポートとフォールバック戦略

fetchLater は限定的に利用可能です。
対応ブラウザ: Chrome 135（2025年4月）および Edge 135（2025年4月）。
未対応: Firefox および Safari。そのため、通常はフォールバック戦略が必要です。

ただし、このAPIによる信頼性とパフォーマンスの向上を考えると、ブラウザがサポートしている場合は `fetchLater()` を使用すべきです。

### `fetchLater()` ポリフィル

以下は、未対応ブラウザでも可能な限り近い動作を実装する最小限の `fetchLater()` ポリフィルです。

このポリフィルでの主な動作の違いは、ユーザーがページを離れるときにペイロードを送信する代わりに、ページの `visibilityState` が "hidden" に変わったタイミングで送信することです。これは現在広く利用可能な、最も信頼できるセッション終了シグナルだからです。

```js
globalThis.fetchLater ??= function fetchLater(url, init = {}) {
  let timeoutHandle;
  let activated = false;

  function sendNow() {
    if (!(init.signal && init.signal.aborted)) {
      // Use fetch keepalive if the browser supports it or if custom fetch
      // parameters are specified (e.g. custom headers or methods).
      // Otherwise fall back to `navigator.sendBeacon()`.
      if (
        'keepalive' in Request.prototype ||
        init.method !== 'POST' ||
        init.headers
      ) {
        fetch(url, Object.assign({}, init, {keepalive: true}));
        activated = true;
      } else {
        activated = navigator.sendBeacon(url, init.body);
      }
    }
    destroy();
  }

  function destroy() {
    document.removeEventListener('visibilitychange', sendNow);
    clearTimeout(timeoutHandle);
  }

  if (document.visibilityState === 'hidden') {
    // If the beacon was created while the page is already hidden, send data
    // ASAP but wait until the next microtask to allow all sync code to run.
    queueMicrotask(sendNow);
  } else {
    document.addEventListener('visibilitychange', sendNow);

    if (typeof init.activateAfter === 'number' && init.activateAfter >= 0) {
      timeoutHandle = setTimeout(sendNow, init.activateAfter);
    }
  }

  if (init.signal) {
    init.signal.addEventListener('abort', destroy);
  }

  return {
    get activated() {
      return activated;
    },
  };
};
```
