# 分散イベントを順序付ける

分散システムにおける高頻度なトレーシングおよびイベントロギングでは、正しい因果関係の順序を保証するために精密なタイムスタンプが必要です。標準的なJavaScriptの `Date.now()` はミリ秒精度を提供しますが、複数のイベントが同じミリ秒内に発生するとタイムスタンプの衝突が発生する可能性があります。

`Temporal` API、特に `Temporal.Instant` はナノ秒精度のタイムスタンプを提供し、イベントを衝突なしに精密に順序付けできます。

## 実装方法

`Temporal` を使って高頻度イベントを順序付けるには次のようにします。

1. **正確なタイムスタンプを取得する**: `Temporal.Now.instant()` を使ってナノ秒精度の現在時刻を取得します。
2. **イベントを時系列で並べる**: `Temporal.Instant.compare(a, b)` を使ってイベントオブジェクトをソートします。このメソッドはナノ秒レベルまでの順序の違いを解決します。
3. **遅延を算出する**: `Temporal.Instant.prototype.since(other)` を使ってイベント間の正確な期間を求めます。
4. **送信用にシリアライズする**: `Temporal.Instant.prototype.toString()` を使ってタイムスタンプを標準のISO-8601文字列に変換し、ロギングやネットワーク送信に用います。

## サンプルコード: 高頻度イベントの順序付け

```javascript
// 1. Capture timestamps for incoming events
function recordEvent(eventType, nodeId) {
  return {
    nodeId,
    eventType,
    timestamp: Temporal.Now.instant(), // Nanosecond resolution
  };
}

// 2. Sort events chronologically
function sequenceEvents(events) {
  // Always use Temporal.Instant.compare for sorting instants
  return [...events].sort((a, b) =>
    Temporal.Instant.compare(a.timestamp, b.timestamp),
  );
}

// 3. Calculate delays between events
function analyzeTelemetry(sortedEvents) {
  for (let i = 1; i < sortedEvents.length; i++) {
    const prev = sortedEvents[i - 1];
    const curr = sortedEvents[i];

    // Calculate difference in nanoseconds
    const duration = curr.timestamp.since(prev.timestamp);
    const nsDiff = duration.total('nanoseconds');

    console.log(
      `Delay between Event ${prev.eventType} and Event ${curr.eventType}: ${nsDiff}ns`,
    );
  }
}
```

## 戦略的な実装とベストプラクティス

- **DO** ミリ秒精度では不十分な場面（マイクロ秒プロファイリングなど）で、サーバー側のトレーシングやクライアント側のテレメトリには `Temporal.Now.instant()` を使ってください。
- **DO NOT** 連続して発生するイベントの安定したソートが必要なときは `Date.now()` を使わないでください。
- **DO NOT** タイムゾーンと組み合わせる場合を除いて、壁時計時間の表示には `Temporal.Instant` を使わないでください（ローカライズされた表示には `Temporal.ZonedDateTime` を使用してください）。
- **DO** ネイティブに使う前に、`Temporal` が環境でサポートされているかを確認するか、フォールバックを提供してください。

## フォールバック戦略

Temporal は限定的に利用可能です。
対応ブラウザ: Chrome 144（2026年1月）、Edge 144（2026年1月）、Firefox 139（2025年5月）。
未対応: Safari。

ネイティブサポートのない環境では、`@js-temporal/polyfill` のような標準準拠のポリフィルを使用してください。最新のクライアントのペイロードを肥大化させないよう、条件付きで読み込みます。`@js-temporal/polyfill` はグローバルな `Temporal` オブジェクトを自動的にインストールしないため、グローバルに必要な場合は明示的に代入する必要があることに注意してください。

```javascript
(async () => {
  // Check for native support
  if (typeof Temporal === 'undefined') {
    // Dynamically load polyfill using an ESM-compatible CDN
    const module = await import('https://esm.sh/@js-temporal/polyfill');
    // The polyfill does not auto-install globally, so we must assign it
    globalThis.Temporal = module.Temporal;
  }

  // Proceed with application logic
})();
```
