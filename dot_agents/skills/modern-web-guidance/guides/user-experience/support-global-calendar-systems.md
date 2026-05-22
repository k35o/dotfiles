# Temporal でグローバルなカレンダーシステムをサポートする

従来のJavaScriptの `Date` オブジェクトは先発グレゴリオ暦に基づいているため、イスラム暦(太陰暦)、ヘブライ暦(太陰太陽暦)、中国暦(太陰太陽暦)など他のカレンダーシステムに依拠するユーザー向けのアプリケーションを構築するのは困難でした。開発者はこれらのシステムをサポートするために、複雑なサードパーティライブラリや手動計算に頼らざるを得ませんでした。

`Temporal` API は複数のカレンダーシステムをファーストクラスでサポートします。日付オブジェクトにカレンダー識別子を関連付けることで、Temporalは異なる文化的文脈に必要な複雑な演算とフォーマットをネイティブに処理します。

## 実装方法

Temporal を使ってグローバルなカレンダーシステムをサポートするには:

1. **カレンダーを関連付ける(必須):** Temporalオブジェクト(`Temporal.PlainDate` など)を作成または変換する際には、`withCalendar()` を使って希望するカレンダーシステムを指定し、カレンダー依存の操作を行います。
2. **安定した識別子を使う(太陰太陽暦の場合は必須):** 太陰太陽暦で年をまたいで特定の月を識別するには、数値の `month` インデックスではなく `monthCode` を使う必要があります。これは、ヘブライ暦や中国暦のように閏月を使うカレンダーに限り使用してください。
3. **カレンダーの不変条件を尊重する(必須):** 月や日を反復する際、固定値(1年に12か月、1か月に31日など)を仮定してはいけません。すべてのカレンダーで動作するように、`monthsInYear` や `daysInMonth` のようなプロパティを使ってください。
4. **カレンダーを意識した比較を使う(必須):** 特定のカレンダーシステム内で日付を比較する際は、year/month/day のプロパティを手動で比較するのではなく、`Temporal.PlainDate.compare()` を使ってください。カレンダーのルールに従って正しく年代順を扱います。

## サンプルコード: カレンダーの変換と反復

```javascript
// 1. Helper to check calendar support
function isCalendarSupported(calendarId) {
  try {
    return Intl.supportedValuesOf('calendar').includes(calendarId);
  } catch {
    // Fallback for environments where supportedValuesOf is not available
    return false;
  }
}

// 2. Get current date in default ISO 8601 calendar
const isoDate = Temporal.Now.plainDateISO();

// 3. Convert to Hebrew calendar if supported
const calendarId = 'hebrew';
const targetDate = isCalendarSupported(calendarId)
  ? isoDate.withCalendar(calendarId)
  : isoDate; // Fallback to ISO if not supported

if (targetDate.calendar.id !== calendarId) {
  console.warn(
    `Calendar ${calendarId} not supported; falling back to ISO 8601`,
  );
}

// 4. Log properties specific to the calendar
console.log(`Calendar: ${targetDate.calendar.id}`);
console.log(`Year: ${targetDate.year}`);
console.log(`Month Code: ${targetDate.monthCode}`); // Stable across leap years

// 5. Safely iterate through months in the current year
for (let m = 1; m <= targetDate.monthsInYear; m++) {
  console.log(
    `Month ${m} has ${targetDate.with({ month: m }).daysInMonth} days.`,
  );
}

// 6. Compare dates within the same calendar
const today = Temporal.Now.plainDateISO().withCalendar(calendarId);
const comparison = Temporal.PlainDate.compare(targetDate, today);
const relative = comparison < 0 ? 'Past' : comparison > 0 ? 'Future' : 'Today';
console.log(`Timeline: ${relative}`);

// 7. Format for display using toLocaleString
const localizedDisplay = targetDate.toLocaleString('en-u-ca-hebrew', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
```

## 戦略的実装とベストプラクティス

- **DO** 月をループする際の上限には12を仮定せず、`monthsInYear` を使ってください。
- **DO** 閏月を使うカレンダー(ヘブライ暦や中国暦など)で特定の月を識別するには、年に関わらず `monthCode` を使ってください。
- **DO NOT** `date.month === 12` が年の最後の月であると仮定しないでください。`date.month === date.monthsInYear` を使ってください。
- **DO NOT** `inLeapYear === true` がその年が1日だけ長いことを意味すると仮定しないでください。太陰太陽暦では丸ごと閏月が追加されることがあります。
- **DO** 特定のカレンダーシステム内で2つの日付を比較する際は、Year/Month/Day プロパティを手動で比較するのではなく `Temporal.PlainDate.compare()` を使ってください。
- **DO** 日付をユーザー向けにフォーマットする際は、手動の文字列連結ではなく `toLocaleString()` を使ってください。
- **DO** カレンダー固有の Temporal オブジェクトを作成する前に、`Intl.supportedValuesOf('calendar')` を使って対象のカレンダーシステムが環境でサポートされているか検証してください。
- **DO** 一部のカレンダー(イスラム暦の変種など)は固定計算ではなく実際の視認に基づくことに注意してください。`Temporal` API は環境の `Intl` 実装に従い、通常は計算上の近似を使います。文化的または宗教的に重要な日付計算では、専門家による検証や専用のライブラリを使ってください。
- **DO** 元号を使うカレンダー(日本暦や仏暦など)を使用する際は、`toLocaleString()` で元号名を考慮してください。

## フォールバック戦略

Temporal は限定的に利用可能です。
対応ブラウザ: Chrome 144 (2026年1月)、Edge 144 (2026年1月)、Firefox 139 (2025年5月)。
未対応: Safari。

ネイティブにサポートされていないブラウザでの本番運用にはポリフィルを必ず使用してください。

推奨されるアプローチは、ネイティブサポートを確認したうえで、必要であれば `@js-temporal/polyfill` のようなポリフィルを動的に読み込むプログレッシブエンハンスメントです。

```javascript
/**
 * Progressive Enhancement Fallback
 */
async function getTemporal() {
  if (typeof Temporal !== 'undefined') {
    return Temporal;
  }

  try {
    // Load polyfill dynamically from CDN
    const module = await import('https://esm.sh/@js-temporal/polyfill');
    globalThis.Temporal = module.Temporal;
    return module.Temporal;
  } catch (e) {
    console.error('Failed to load Temporal polyfill:', e);
    throw e;
  }
}
```
