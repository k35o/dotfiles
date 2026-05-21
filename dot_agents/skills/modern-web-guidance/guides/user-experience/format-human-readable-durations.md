# Temporal で人間に読みやすい時間表現を整形する

経過時間や所要時間を読みやすい形式（例: "1 hour and 30 minutes"）でユーザーに表示するには、歴史的に手動の計算や外部ライブラリが必要でした。`Temporal` API の `Temporal.Duration` クラスは、構造化された duration オブジェクトと、`round()` メソッドによる強力な「balancing」（バランス調整）機能を提供することで、これを簡単にします。

## 実装方法

duration を整形するには、次の手順に従います。

1.  (**必須**) **Duration を作成する**: `Temporal.Duration.from()` を使って、単位の集合から duration オブジェクトを作成します。
2.  (**任意**) **Balancing を適用する**: `round()` メソッドを `largestUnit` オプション付きで使い、単位のバランスを制御します。たとえば、90 分を時間と分に変換したり、合計分数のまま保ったりできます。
3.  (**必須**) **表示用文字列を構築する**: `.hours`、`.minutes` などのプロパティにアクセスして手動で人間に読みやすい文字列を構築するか、**（推奨）** ローカライズされた自動化アプローチとして `Intl.DurationFormat` を使用します。

### 例: Balancing とローカライズされた整形

```javascript
// 1. Create a duration (e.g., from user input)
const duration = Temporal.Duration.from({ minutes: 90 });

// 2. Balance to hours (converts 90 minutes to 1 hour and 30 minutes)
const balanced = duration.round({ largestUnit: 'hours' });

// 3. Format using Intl.DurationFormat (Handles pluralization automatically)
const formatter = new Intl.DurationFormat('en', { style: 'long' });
console.log(formatter.format(balanced));
// Note: Output may vary by browser (e.g., "1 hour and 30 minutes" or "1 hour, 30 minutes")
```

### ベストプラクティス

*   **DO**: 表示戦略（詳細な内訳 vs 合計値）を制御するには、`Temporal.Duration.round()` を `largestUnit` 付きで使ってください。
*   **DO**: ローカライズされた文字列整形と自動的な複数形処理には `Intl.DurationFormat` を使い、サポートされていない場合は手動構築にフォールバックしてください。
*   **DO NOT**: ユーザー向けテキストに `Temporal.Duration.prototype.toString()` を使わないでください。ISO 8601 文字列（例: `PT1H30M`）が返ります。
*   **DO**: ネイティブサポートがない環境向けに、機能検出とポリフィルを使用してください。

## フォールバック戦略

### Temporal のフォールバックとブラウザサポート

Temporal は限定的に利用可能です。
対応ブラウザ: Chrome 144（2026 年 1 月）、Edge 144（2026 年 1 月）、Firefox 139（2025 年 5 月）。
未対応: Safari。

ネイティブの `Temporal` API をまだサポートしていないブラウザでは、機能検出とポリフィルを使用してください。標準のリファレンスポリフィルは `@js-temporal/polyfill` です。

ポリフィルは衝突を避けるためにグローバルスコープに `Temporal` オブジェクトを自動で割り当てません。コードがグローバルな `Temporal` オブジェクトに依存する場合は、手動で割り当てる必要があります。

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
```

### Intl.DurationFormat

Intl.DurationFormat の Baseline ステータス: Newly available。2025-03-04 から Baseline です。
対応ブラウザ: Chrome 129（2024 年 9 月）、Edge 129（2024 年 9 月）、Firefox 136（2025 年 3 月）、Safari 16.4（2023 年 3 月）。

`Intl.DurationFormat` がサポートされていない場合は、機能検出を行い、balancing 済みの duration プロパティを取り出して手動で文字列を構築するフォールバックを使用してください。

* **ガイダンス:** サポートチェックには `typeof Intl.DurationFormat !== 'undefined'` を使用します。サポートされていない場合は、balancing された `Temporal.Duration` オブジェクトから `.hours` や `.minutes` などのプロパティを取り出して結合し、複数形を適切に処理してください。

```javascript
// 3. Format the display string

if (typeof Intl.DurationFormat !== 'undefined') {
  // Use recommended Intl API if available
  const formatter = new Intl.DurationFormat('en', { style: 'long' });
  console.log(formatter.format(balanced));
} else {
  // Fallback manual formatting (assuming duration is already balanced)
  const h = balanced.hours;
  const m = balanced.minutes;

  const hoursStr = `${h} hour${h === 1 ? '' : 's'}`;
  const minutesStr = `${m} minute${m === 1 ? '' : 's'}`;

  console.log(`${hoursStr} and ${minutesStr}`);
}
```
