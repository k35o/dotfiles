# Temporalによる場所に依存しないデータの取得

閲覧者の場所に関係なく同じであるべき年代記的データ（誕生日、定期アラーム、祝日など）を記録することは、レガシーの `Date` オブジェクトではエラーが起こりやすい作業でした。`Date` オブジェクトは常に特定の瞬間を表しタイムゾーンに紐づくため、「1990-01-01」のような日付を保存すると、タイムゾーンが異なるユーザーにはオフセットのずれにより「1989-12-31」と表示されることがあります。

`Temporal` APIは「Plain」型—`Temporal.PlainDate` や `Temporal.PlainTime` など—を導入し、これらはタイムゾーンの概念を持ちません。これらの型はカレンダーや時計から読み取れるとおりの暦日や時計上の時刻を表し、場所に依存しないデータに最適です。

## 実装方法

場所に依存しないデータを取得・表示するには:

1.  **日付には `Temporal.PlainDate` を使う**: 誕生日や祝日のようなデータには、`Temporal.PlainDate.from()` を使ってISO 8601文字列やオブジェクトからインスタンスを作成します。
2.  **時刻には `Temporal.PlainTime` を使う**: 毎日のアラームや好みの昼食時間のようなデータには `Temporal.PlainTime.from()` を使います。
3.  **変換せずに表示する**: これらのオブジェクトはタイムゾーンを意識しないため、ユーザーのローカルタイムゾーンに関係なく同じ値を表示します。

### 例: 誕生日の取得

```javascript
// 1. Parse a date string from an input (e.g., "1990-01-01")
const birthdateStr = '1990-01-01';
const plainDate = Temporal.PlainDate.from(birthdateStr);

// 2. Display the date
// This will output "01/01/1990" (or equivalent) in any time zone
console.log(plainDate.toLocaleString('en-GB'));

// 3. Compare with standard Date (which might drift)
const dateObj = new Date('1990-01-01T00:00:00Z');
// In a UTC-5 time zone, this might print "31/12/1989"
console.log(
  new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York' }).format(
    dateObj,
  ),
);
```

## 戦略的実装とベストプラクティス

- **DO**: 誕生日、記念日、祝日など、時間帯やタイムゾーンが無関係な「カレンダー上の日付」には `Temporal.PlainDate` を使用してください。
- **DO**: 毎日午前9時のリマインダーなど、ユーザーがいるタイムゾーンに関わらず午前9時であってほしい「時計上の時刻」には `Temporal.PlainTime` を使用してください。
- **DO NOT**: 物理的な特定の瞬間（「インスタント」）を表現する必要がある場合は、Plain型を使わないでください。ログ、イベントタイムスタンプ、タイムゾーンを意識する必要があるものには `Temporal.Instant` または `Temporal.ZonedDateTime` を使用してください。
- **DO**: `Temporal` オブジェクトは**イミュータブル**であることを忘れないでください。`add()` や `with()` などのメソッドは元のインスタンスを変更せず、新しいインスタンスを返します。

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
