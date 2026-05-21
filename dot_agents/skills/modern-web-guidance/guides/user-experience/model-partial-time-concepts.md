# Temporalで部分的な時間概念をモデル化する

クレジットカードの有効期限、年次更新、毎日のアラームなど、完全なカレンダー日付を持たない日付概念のモデリングは、レガシーな`Date`オブジェクトでは長らくエラーが起きやすい処理でした。開発者はしばしば任意の日（その月の1日など）を使ったり、文字列を解析したりせざるを得ず、「日のリーク」やうるう年・月の長さの違いによる誤った計算につながっていました。

`Temporal` APIは、これら部分的な概念に対する専用の型を提供します。`Temporal.PlainYearMonth`、`Temporal.PlainMonthDay`、`Temporal.PlainTime`です。これらの型は精度を保証し、無関係な日付要素のリークを防ぎます。

## 実装例

### 月単位の有効期限（クレジットカード、請求サイクル）

年と月を表すには`Temporal.PlainYearMonth`を使います。

```javascript
// Create a PlainYearMonth from values
// Use explicit calendar to avoid mismatch issues in polyfill environments
const expiry = Temporal.PlainYearMonth.from({
  year: 2027,
  month: 12,
  calendar: 'iso8601',
});

// Get the current year/month
const currentMonth = Temporal.Now.plainDateISO().toPlainYearMonth();

// Calculate duration until expiry
// largestUnit ensures the difference is expressed in years if applicable
const duration = currentMonth.until(expiry, { largestUnit: 'years' });

if (duration.sign < 0) {
  console.log('Expired');
} else if (duration.sign === 0) {
  console.log('Expires this month');
} else {
  console.log(
    `Expires in ${duration.years} years and ${duration.months} months`,
  );
}
```

### 毎年繰り返す日付（誕生日、更新日）

年を持たない月と日を表すには`Temporal.PlainMonthDay`を使います。

```javascript
// Create a PlainMonthDay for an annual event
// Include explicit calendar for polyfill safety
const birthday = Temporal.PlainMonthDay.from({
  month: 10,
  day: 31,
  calendar: 'iso8601',
});

// Check if it matches today's date components
const today = Temporal.Now.plainDateISO();
const isBirthdayToday = birthday.equals(today.toPlainMonthDay());

// To perform arithmetic (like days until next occurrence), convert to a full PlainDate
// by providing a specific year.
const birthdayThisYear = birthday.toPlainDate({ year: today.year });
```

### 時刻のみの表現（アラーム、店舗の営業時間）

日付を持たない時刻を表すには`Temporal.PlainTime`を使います。

```javascript
// Create a PlainTime from a string
const alarmTime = Temporal.PlainTime.from('08:00:00');

// Add a duration to a PlainTime
const snoozedTime = alarmTime.add({ minutes: 10 });

console.log(`Original alarm: ${alarmTime.toString()}`);
console.log(`Snoozed alarm: ${snoozedTime.toString()}`);
```

## 戦略的な実装とベストプラクティス

- **DO** 月と年だけを指定する値（クレジットカードの有効期限など）には`Temporal.PlainYearMonth`を使い、任意の日付値のリークを防いでください。
- **DO** 年を無視する毎年のイベント（誕生日や記念日など）には`Temporal.PlainMonthDay`を使ってください。
- **DO** 日付に依存しない毎日のスケジュールやアラームには`Temporal.PlainTime`を使ってください。
- **DO NOT** `PlainMonthDay`で直接演算を行わないでください。月の長さは年によって変わるため、まず年を指定して`PlainDate`に変換してください。
- **DO** オブジェクトからインスタンスを生成する際は、明示的なカレンダープロパティ（例: `calendar: 'iso8601'`）を指定して、ポリフィル実装間の安全性を確保してください。

## フォールバック戦略

### Temporalのフォールバックとブラウザサポート

Temporal has limited availability.
Supported by: Chrome 144 (Jan 2026), Edge 144 (Jan 2026), and Firefox 139 (May 2025).
Unsupported in: Safari.

ネイティブの`Temporal` APIをまだサポートしていないブラウザでは、機能検出とポリフィルを使ってください。標準的なリファレンスポリフィルは`@js-temporal/polyfill`です。

なおこのポリフィルは、衝突を避けるため自動ではグローバルスコープに`Temporal`オブジェクトを割り当てません。グローバルの`Temporal`オブジェクトに依存するコードでは、手動で割り当てる必要があります。

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
