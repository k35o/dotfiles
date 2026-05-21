# Temporalによるグローバルイベントの調整

異なるタイムゾーンをまたいだイベントのスケジュール調整は、レガシーの `Date` オブジェクトでは特にサマータイム（DST）の切り替わり時に時間がスキップされたり繰り返されたりすることで悪名高く困難でした。

`Temporal` APIは `Temporal.ZonedDateTime` を提供し、特定のタイムゾーンにおける日付と時刻を表現し、DSTの切り替えを自動かつ予測可能な形で処理します。

## 実装方法

グローバルイベントを調整し、DSTの衝突を処理するには:

1. **MANDATORY:** **ZonedDateTimeを作成**: `Temporal.ZonedDateTime.from()` を使ってタイムゾーンを意識した日付・時刻オブジェクトを作成します。
2. **MANDATORY:** **曖昧さを処理**: `disambiguation` オプションで、時刻が曖昧または存在しない場合（クロック変更時など）の振る舞いを制御します。
3. **MANDATORY:** **タイムゾーンを変換**: `.withTimeZone()` を使って別の場所での等価な時刻を確認します。

### 例: スケジュール調整と衝突検出

```javascript
// 1. Define the event time and target time zone
const date = "2025-03-09";
const time = "02:30"; // This time is skipped in New York during Spring Forward
const timeZone = "America/New_York";
const inputStr = `${date}T${time}[${timeZone}]`;

// 2. Detect conflicts using 'reject'
let hasConflict = false;
try {
  // 'reject' throws RangeError if the time is ambiguous or does not exist
  Temporal.ZonedDateTime.from(inputStr, { disambiguation: 'reject' });
} catch (e) {
  if (e instanceof RangeError) {
    hasConflict = true;
    console.log("This time falls in a DST transition gap or overlap.");
  }
}

// 3. Resolve the time safely using 'compatible' (default)
// 'compatible' will resolve to a valid time even if skipped or repeated
const hostTime = Temporal.ZonedDateTime.from(inputStr, { disambiguation: 'compatible' });
console.log(`Resolved time: ${hostTime.toString()}`);

// 4. Convert to another time zone (e.g., Tokyo)
const tokyoTime = hostTime.withTimeZone("Asia/Tokyo");
console.log(`Tokyo time: ${tokyoTime.toString()}`);
```

## 戦略的実装とベストプラクティス

-   **DO**: 特定の地理的場所に紐づくイベント（特定の都市での会議など）には `Temporal.ZonedDateTime` を使用してください。
-   **DO**: DST切り替え中のスケジュール衝突をユーザーに検出して警告したい場合は、`disambiguation: 'reject'` を使用してください。
-   **DO**: 衝突が発生した際に妥当な時刻を自動選択させたい場合は、`disambiguation: 'compatible'`（デフォルト）を使用してください。
-   **DO NOT**: `Temporal.PlainDateTime` をグローバルイベントに使用しないでください。タイムゾーン情報を持たず、DSTの変更を考慮できません。
-   **DO**: 元のオブジェクトを変更せずに他の場所での等価な時刻を計算するには `.withTimeZone()` を使ってください（Temporalオブジェクトはイミュータブルです）。

### フォールバック戦略

Temporal は limited availability。
対応ブラウザ: Chrome 144 (Jan 2026)、Edge 144 (Jan 2026)、Firefox 139 (May 2025)。
非対応: Safari。

ネイティブの `Temporal` をサポートしない環境では、`@js-temporal/polyfill` を条件付きで読み込む必要があります。

```javascript
// Check if Temporal is supported natively
(async () => {
  if (typeof Temporal === 'undefined') {
    // Load the polyfill conditionally
    const module = await import("https://esm.sh/@js-temporal/polyfill");
    globalThis.Temporal = module.Temporal;
    // Extend Date.prototype if needed
    Date.prototype.toTemporalInstant = module.toTemporalInstant;
    initializeApp();
  }
})();

function initializeApp() {
  // Your app logic here
  console.log("Temporal is ready:", typeof Temporal);
}
```
