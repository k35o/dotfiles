# Temporalによるイベント差分の計算

イベント間の経過時間（トライアル期限、サブスクリプション期間、日割り計算など）の算出は、タイムゾーン、サマータイム（DST）、一貫性のないパースの複雑さのため、レガシーの `Date` オブジェクトでは長らく難しい作業でした。

`Temporal` APIは、日付・時刻の演算に対する現代的で堅牢な解決策を提供します。特に、`Temporal.ZonedDateTime` と `Temporal.Duration` により、DSTに安全で正確な時間差の計算が可能になります。

## 実装方法

2つのイベント間の差分を計算するには:

1.  **ZonedDateTimeオブジェクトを取得**: 入力（日付と時刻）を `Temporal.ZonedDateTime` オブジェクトに変換します。これにより、計算がタイムゾーンを意識したものになります。
2.  **`.since()` で経過時間を計算**: `currentZonedDateTime.since(startZonedDateTime)` を使って、開始イベントからの経過時間を求めます。
3.  **`.until()` で残り時間を計算**: `currentZonedDateTime.until(endZonedDateTime)` を使って、将来のイベントまでの残り時間を求めます。
4.  **オプションで精度を制御**: `largestUnit`、`smallestUnit`、`roundingMode` を使って結果の期間のバランス調整と丸めを制御します。

### 例: トライアル期限の計算

```javascript
// 1. Get current time point in the system time zone
const now = Temporal.Now.zonedDateTimeISO();
const tz = now.timeZoneId;

// 2. Parse inputs (assuming ISO strings from form inputs)
const startDateStr = '2025-01-01';
const startTimeStr = '12:00:00';
const endDateStr = '2025-01-31';
const endTimeStr = '12:00:00';

const startDate = Temporal.PlainDate.from(startDateStr);
const startTime = Temporal.PlainTime.from(startTimeStr);
const start = startDate.toPlainDateTime(startTime).toZonedDateTime(tz);

const endDate = Temporal.PlainDate.from(endDateStr);
const endTime = Temporal.PlainTime.from(endTimeStr);
const end = endDate.toPlainDateTime(endTime).toZonedDateTime(tz);

// 3. Calculate difference using .since() and .until()
// By default, units larger than hours might not wrap automatically.
// Use largestUnit to ensure differences are expressed in larger units if applicable.
const timeActive = now.since(start, { largestUnit: 'year' });
const timeRemaining = now.until(end, { largestUnit: 'year' });

console.log(`Active: ${timeActive.days} days, ${timeActive.hours} hours`);
console.log(
  `Remaining: ${timeRemaining.days} days, ${timeRemaining.hours} hours`,
);

// 4. Compare dates
const isExpired = Temporal.ZonedDateTime.compare(now, end) > 0;
if (isExpired) {
  console.log('Subscription is expired.');
}
```

## 戦略的実装とベストプラクティス

- **DO**: 特定のタイムゾーンで発生する現実世界のイベント（サブスクリプションの更新、イベントスケジューリングなど）の計算には `Temporal.ZonedDateTime` を使用してください。
- **DO**: `largestUnit` を使って、結果に含めたい最大単位（例: `'year'` や `'month'`）を指定してください。省略するとデフォルトは `'auto'` となり、人間に読みやすい期間として年や月にまとまらないことがあります。
- **DO**: 過去のイベント*からの*経過時間（例: `now.since(start)`）には `.since()` を、将来のイベント*までの*残り時間（例: `now.until(end)`）には `.until()` を使ってください。
- **DO NOT**: インスタンスを直接変更しないでください。`Temporal` オブジェクトは**イミュータブル**です。`add()`、`subtract()`、`with()` などの操作は*新しい*インスタンスを返します。
- **DO**: ある時点が別の時点より後かを判定するには `Temporal.ZonedDateTime.compare` を使ってください。1つ目が後ならば `1`、前ならば `-1`、等しければ `0` を返します。

## フォールバック戦略

### Temporalのフォールバックとブラウザサポート

Temporal は limited availability。
対応ブラウザ: Chrome 144 (Jan 2026)、Edge 144 (Jan 2026)、Firefox 139 (May 2025)。
非対応: Safari。

ネイティブの `Temporal` APIをまだサポートしないブラウザでは、フィーチャー検出とポリフィルを使用してください。標準のリファレンスポリフィルは `@js-temporal/polyfill` です。

ポリフィルは衝突を避けるため、自動的に `Temporal` オブジェクトをグローバルスコープに割り当てません。コードがグローバルの `Temporal` オブジェクトに依存している場合は、手動で割り当てる必要があります。

```javascript
// Check if Temporal is supported natively
(async () => {
  if (typeof Temporal === 'undefined') {
    // Load the polyfill conditionally
    const module = await import('https://esm.sh/@js-temporal/polyfill');
    globalThis.Temporal = module.Temporal;
    // Extend Date.prototype if needed
    Date.prototype.toTemporalInstant = module.toTemporalInstant;
    initializeApp();
  }
})();
```
