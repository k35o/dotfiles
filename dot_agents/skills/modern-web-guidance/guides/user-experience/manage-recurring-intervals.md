# Temporalで繰り返し間隔を管理する

サブスクリプションの請求サイクルや給与計算期間といった繰り返し間隔の算出は、レガシーな`Date`オブジェクトでは長らくエラーが起きやすい処理でした。1月31日のような日付に1か月を足すのは曖昧です（2月28日／29日とすべきか、それとも3月3日にすべきか？）。

`Temporal` APIは`Temporal.PlainDate`とその`.add()`メソッドによってクリーンな解決策を提供します。月末の遷移は設定可能なオーバーフロー戦略により予測可能な形で扱われます。

## 実装方法

1. **必須:** **開始日をパースする**: `Temporal.PlainDate.from()`で日付オブジェクトを生成します。
2. **必須:** **期間を加算する**: `.add()`メソッドに期間オブジェクト（例: `{ months: 1 }`）を渡します。
3. **任意:** **オーバーフローの挙動を指定する**: `overflow`オプションで、2月31日のような無効な日付の扱い方を制御します。
    - `'constrain'`（デフォルト）: 月内の最終有効日にクランプします。
    - `'reject'`: `RangeError`をスローします。

### 例: サブスクリプションの請求サイクル

```javascript
// 1. Parse the start date (e.g., billing starts on Jan 31st)
const startDate = Temporal.PlainDate.from('2024-01-31');

// 2. Add 1 month with default 'constrain' overflow
// Jan 31 + 1 month -> Feb 29 (2024 is a leap year)
const nextBillingDate = startDate.add({ months: 1 });
console.log(`Next billing: ${nextBillingDate.toString()}`); // 2024-02-29

// 3. Add 1 month to Feb 29
// Feb 29 + 1 month -> Mar 29
// Note: Day is preserved if valid, otherwise constrained.
const thirdBillingDate = nextBillingDate.add({ months: 1 });
console.log(`Third billing: ${thirdBillingDate.toString()}`); // 2024-03-29

// Example with 'reject' strategy
try {
  // Jan 31 + 1 month with 'reject' throws because Feb 31 is invalid
  const invalidDate = startDate.add({ months: 1 }, { overflow: 'reject' });
} catch (e) {
  console.log("Caught expected error:", e.name); // RangeError
}
```

## 戦略的な実装とベストプラクティス

- **DO** 特定の時刻やタイムゾーンに依存しない計算（カレンダー日付や請求サイクルなど）には`Temporal.PlainDate`を使ってください。
- **DO** デフォルトの`constrain`の挙動を理解してください。請求においてユーザーが期待する結果と一致することがほとんどです（例: 1月31日 -> 2月28日／29日 -> 3月28日／29日）。
- **DO NOT** インスタンスを直接書き換えないでください。`Temporal`オブジェクトは**イミュータブル**であり、演算は常に新しいインスタンスを返します。
- **DO** カレンダー上に実在する日付であることを強制し、失敗を明示的に扱う必要がある場合は`overflow: 'reject'`を使ってください。

### フォールバック戦略

Temporal has limited availability.
Supported by: Chrome 144 (Jan 2026), Edge 144 (Jan 2026), and Firefox 139 (May 2025).
Unsupported in: Safari.

ネイティブの`Temporal` APIをまだサポートしていないブラウザでは、機能検出とポリフィルを使ってください。標準的なリファレンスポリフィルは`@js-temporal/polyfill`です。

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
  const date = Temporal.PlainDate.from('2024-01-31');
  console.log(date.add({ months: 1 }).toString());
}
```
