Imperative APIは`navigator.modelContext.registerTool()`を使い、JavaScriptツールをプログラム的に定義します。現在のルートやユーザー状態に応じてツールを追加・削除する必要があるシングルページアプリケーション（SPA）に最適です。

## 登録とライフサイクル

ツールは、ツール定義オブジェクトと、`AbortSignal`を含むオプションのオプションオブジェクトを渡して登録します。

### `AbortController`によるライフサイクル管理

WebMCPには`unregisterTool()`メソッドは存在しません。ツールの登録を解除するには、登録時に`AbortSignal`を渡し、不要になった時点でそのシグナルをabortします。

```javascript
const controller = new AbortController();

navigator.modelContext.registerTool(
  {
    name: 'get_user_preferences',
    description: "Retrieves the user's saved preferences.",
    inputSchema: { type: 'object', properties: {} },
    execute() {
      const prefs = localStorage.getItem('user_prefs');
      return prefs ? JSON.parse(prefs) : { theme: 'light' };
    },
    annotations: { readOnlyHint: true },
  },
  { signal: controller.signal },
);

// To unregister the tool (e.g., on component unmount):
controller.abort();
```

## パラメータの定義

パラメータ（params）は`inputSchema`プロパティで定義します。これはツールが期待する構造化データを記述する**JSON Schema**オブジェクトでなければなりません。

```javascript
navigator.modelContext.registerTool({
  name: 'calculate_area',
  description: 'Calculates the area of a rectangle.',
  inputSchema: {
    type: 'object',
    properties: {
      width: { type: 'number', description: 'The width of the rectangle.' },
      height: { type: 'number', description: 'The height of the rectangle.' },
    },
    required: ['width', 'height'],
  },
  execute(input) {
    // input is { width: 10, height: 20 }
    return input.width * input.height;
  },
  annotations: { readOnlyHint: true },
});
```

## 実行パターン

### `async execute`を使うとき

ツールがPromiseを返す処理や完了までに時間のかかる処理を伴う場合は、`async`を使用します。

- **ネットワーク呼び出し**: APIからのデータ取得。
- **非同期ストレージ**: IndexedDBへのアクセス。
- **外部イベント**: 特定の状態変化やアニメーション完了の待機。

```javascript
async execute(input) {
  const response = await fetch(`/api/data/${input.id}`);
  return await response.json();
}
```

### `execute`（同期）を使うとき

即時に完了する操作には、通常の同期関数を使用します。

- **純粋なロジック**: 既にメモリ上にあるデータに対する計算、フィルタリング、ソート。
- **同期的な状態**: `localStorage`や同期的なステートマネージャーからの読み取り。

```javascript
execute(input) {
  return input.items.filter(item => item.active);
}
```

## ツールファクトリパターン

ストアやアプリケーションインスタンスなどのコンテキストをツールに渡したい場合は、ファクトリ関数を使用します。

```javascript
export function createInventoryTool(inventoryManager) {
  return {
    name: 'get_inventory',
    description: 'Lists items in the inventory.',
    inputSchema: { type: 'object', properties: {} },
    execute() {
      return inventoryManager.getItems();
    },
    annotations: { readOnlyHint: true },
  };
}
```

## APIに関する補足

- **annotations**: （任意）ツールのメタデータ用の辞書。
  - **readOnlyHint**: （任意）ツールが状態を変更せずデータの読み取りのみを行う場合は`true`に設定します。エージェントがいつ安全にツールを呼び出せるかの判断材料になります。
- **戻り値のフォーマット**: `execute`関数は任意の値（オブジェクト、配列、文字列、数値、boolean）を返せます。LLMが処理しやすい内容になるよう最適化しつつ、ユースケースに最も適した構造を選んでください。出力は生データ、特定のエラーログ、エージェントの次のアクションに影響を与える直接的な指示など、何でも構いません。
- **セキュアコンテキスト**: WebMCPはHTTPSを必要とします。
- **非推奨/削除**: `unregisterTool()`、`provideContext()`、`clearContext()`はサポートされなくなりました。

## フォールバック戦略

navigator.modelContextは、現時点で主要ブラウザのいずれもネイティブにはサポートしていません。

WebMCP Imperative APIは、WebMCP未対応のブラウザとの互換性を確保するため、機能検出と組み合わせて使用してください。

```javascript
if ('modelContext' in navigator && 'registerTool' in navigator.modelContext) {
  // Register tools
}
```
