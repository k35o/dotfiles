# セッション全体のアナリティクスとテレメトリを確実に計測する

ユーザーのWebページ訪問全体（ページロードだけでなく）をカバーするアナリティクスおよびテレメトリデータを確実に計測するには、`fetchLater()` APIを使用します。

`fetchLater()` APIは、レスポンスが不要で配信タイミングが緊急ではない場合にサーバーへデータを送信する最も信頼できる方法であり、ユーザーアナリティクス、テレメトリ、エラートラッキング、Core Web Vitalsなどのパフォーマンスメトリクスといったデータに適用されます。

`unload` イベントリスナー内で `<img>` ピクセルを作成するような従来の手法は、特にモバイル環境では非常に信頼性が低く、パフォーマンスに悪影響を与える可能性があります（ページがbfcacheの対象外になります）。

## 実装方法

1. **リクエストをスケジュールする:** 関連データが利用可能になり次第、データペイロードを指定して `fetchLater()` を呼び出します。これによりデータが後で送信されるようキューに追加されます。

2. **必要に応じてペイロードを更新する:** ユーザーがさらにデータを生成するか状態が変化した場合は、以前にスケジュールされたリクエストをアボートし、完全に更新されたスナップショットで再度 `fetchLater()` を呼び出します。

3. **残りはブラウザに任せる:** ユーザーがページから離脱したりタブを閉じたりすると、ブラウザは直近の `fetchLater()` 呼び出しのペイロードを確実に送信します。

## サンプルコード

このコードは、`fetchLater()` を使って10秒ごとに更新済みのセッション時間で新しいビーコンをキューに入れることで、ユーザーがページを訪問しているセッションの長さを計測します。

```javascript
const ANALYTICS_ENDPOINT = '/path/to/analytics/endpoint';

const sessionData = {
  duration: 0,
  id: crypto.randomUUID(),
};

let fetchLaterController = null;

function queueBeacon() {
  // Abort any pending beacons before creating a new one.
  if (fetchLaterController) {
    fetchLaterController.abort();
  }
  fetchLaterController = new AbortController();

  // Update session duration to the current page time.
  sessionData.duration = performance.now();

  // Schedule a fetch for the data payload to be sent later.
  // IMPORTANT: wrap the call in a try/catch to handle quota errors.
  try {
    fetchLater(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(sessionData),
      signal: fetchLaterController.signal,
    });
  } catch (error) {
    // Handle errors as needed.
  }
}

// Update the session data and queue a new beacon every 10 seconds.
setInterval(queueBeacon, 10000);
```

## ベストプラクティス

- **DO** レスポンスが不要で、データを即時に送信することが重要でない状況では、`fetchLater()` を使用してサーバーへデータを送信してください。
- **DO** ユーザーがページを離れる前にデータを更新する必要がある場合に、保留中のフェッチをキャンセルするために `AbortController` を使用してください。
- **DO** クォータ（現在オリジン当たり約64KB）を超過しないよう、ペイロードサイズを最小化してください。
- **DO** クォータエラーを処理するために `fetchLater()` の呼び出しを `try/catch` で囲んでください。
- **DO** `globalThis` 上に `fetchLater()` が存在するかを Feature Detection し、APIをサポートしていないブラウザ向けのフォールバック戦略を実装してください。
- **DO NOT** リクエストボディに `ReadableStream` オブジェクトを使用しないでください。エラーになります。

## ブラウザサポートとフォールバック戦略

fetchLater は限定的に利用可能です。
対応ブラウザ: Chrome 135（2025年4月）および Edge 135（2025年4月）。
未対応: Firefox および Safari。

`fetchLater()` がBaselineのターゲットを満たさない場合はフォールバック戦略が必要です。ただし、このAPIによる信頼性とパフォーマンスの向上を考えると、ブラウザがサポートしている場合は `fetchLater()` を使用すべきです。

推奨されるフォールバック戦略は以下のポリフィルを使用することで、サポートしないブラウザでは `fetch()` の `keepalive` または `navigator.sendBeacon()` を使って内部的に処理します。あなた自身のコードは `fetchLater()` を直接呼び出す必要があります — `fetch()`、`sendBeacon()`、その他のビーコンAPIを自分で呼び出してはいけません。

### `fetchLater()` ポリフィル

以下は、未対応ブラウザでも可能な限り近い動作を実装する最小限の `fetchLater()` ポリフィルです。

このポリフィルでの主な動作の違いは、ブラウザのネイティブな unload 処理に頼るのではなく、`visibilitychange` を使ってユーザーが離れたタイミングを検出することです。これは内部実装の詳細です — あなたのコードは `visibilitychange` などのページライフサイクルイベントを購読する必要はありません。`fetchLater()` を呼び出すだけで、ポリフィルが配信を処理します。

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
