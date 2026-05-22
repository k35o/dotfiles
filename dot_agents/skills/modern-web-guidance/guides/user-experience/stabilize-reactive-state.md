# Temporal でリアクティブな状態を安定化する

リアクティブシステムの中には、状態の変化を厳格に参照の等価性で検出するもの([React](https://react.dev/) など)もあれば、プレーンオブジェクトのミューテーションを追跡できるもの([Vue](https://vuejs.org/) や [Svelte](https://svelte.dev/) など)もあります。しかし、レガシーな `Date` オブジェクトのような組み込みオブジェクトの内部ミューテーション(`setHours()` など)はオブジェクトの参照を変更せず、どのフレームワークのデフォルトのリアクティビティシステムでも一般に追跡されません。これにより、UI更新の取りこぼしやデバッグの難しい副作用が発生します。

`Temporal` API はイミュータブルなオブジェクトを提供することでこの問題を解決します。値を変更するあらゆる操作(時間の加算やフィールド設定など)は、新しいメモリ参照を持つ新しいインスタンスを返します。これにより、リアクティブシステムが必ず状態更新を検出でき、UIの安定性が保証されます。

## 実装方法

Temporal を使ってリアクティブな状態を安定化するには:

1. **状態にTemporal型を使う:** リアクティブな状態に、レガシーな `Date` ではなく `Temporal` オブジェクト(`Temporal.PlainDateTime` や `Temporal.PlainDate` など)を保持します。
2. **イミュータブルな更新を行う:** 状態を更新する際は、`.add()`、`.subtract()`、`.with()` などのTemporalメソッドを使います。これらのメソッドは新しいオブジェクトを返します。
3. **新しい参照を状態セッターに渡す:** 新たに作成されたTemporalオブジェクトでコンポーネントの状態を更新し、確実な再レンダリングをトリガーします。

## サンプルコード: Temporal vs. レガシーDateを状態に使う

```javascript
// ❌ BAD: Mutating legacy Date breaks reactivity
let dateState = { deadline: new Date() };

function extendDeadlineBad() {
  // Mutates the object in place. Reference remains the same!
  dateState.deadline.setHours(dateState.deadline.getHours() + 1);

  // Frameworks will skip re-rendering because
  // prevState === nextState (same memory reference)
  updateState(dateState);
}

// ✅ GOOD: Temporal ensures immutability and reliable reactivity
let temporalState = { deadline: Temporal.Now.plainDateTimeISO() };

function extendDeadlineGood() {
  // Returns a new object with a new reference.
  const newDeadline = temporalState.deadline.add({ hours: 1 });

  // Create a new state object with the new Temporal reference
  temporalState = { deadline: newDeadline };

  // Frameworks will detect the reference change and re-render the UI
  updateState(temporalState);
}
```

## 戦略的実装とベストプラクティス

- **DO** リアクティブな状態に保存されるすべての日付/時刻値に `Temporal` を使い、イミュータビリティの恩恵を受けてください。
- **DO** ユースケースに最も特化したTemporal型を使ってください(例: カレンダー日付だけが必要な場合は `Temporal.PlainDate`)。不必要な複雑さを避けられます。
- **DO NOT** コンポーネントの状態の一部となる `Date` オブジェクトをその場でミューテートしないでください。
- **DO** ネイティブサポートのない環境向けにポリフィルを条件付きで読み込み、対応してください。

### フォールバック戦略

Temporal は限定的に利用可能です。
対応ブラウザ: Chrome 144 (2026年1月)、Edge 144 (2026年1月)、Firefox 139 (2025年5月)。
未対応: Safari。

`Temporal` API は新しい機能のため、すべてのブラウザでサポートされているとは限りません。機能検出を行い、必要な場合は条件付きでポリフィルを読み込んでください。

```html
<!-- Conditionally load the Temporal polyfill only if not natively supported -->
<script>
  if (typeof Temporal === "undefined") {
    try {
      const module = await import("https://esm.sh/@js-temporal/polyfill");
      globalThis.Temporal = module.Temporal;
    } catch (e) {
      console.error("Failed to load Temporal polyfill:", e);
    }
  }
</script>
```
