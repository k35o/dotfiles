トップレベル `await` を使用すると、モジュールを非同期関数として扱うことができ、Promise を待つためにモジュールの実行を一時停止できます。これは、ポリフィルや重い二次ライブラリのような非同期依存をブラウザが必要とするときにのみ条件付きで読み込むのに非常に有用です。

トップレベル await を活用することで、条件付き読み込みのロジックを単一のモジュール内にカプセル化でき、依存関係の読み込みが完了して準備が整うまで下流のコンシューマーモジュールの実行を効果的に阻止できます。

### 条件付きポリフィルのパターン

トップレベル `await` はモジュールであるあらゆる非同期依存関係を条件付きで読み込むのに使用できますが、条件付き依存関係読み込みパターンの良い活用例は、特定の機能をサポートしていないブラウザ向けにポリフィルを条件付きで読み込むことです。このアプローチでは、Feature Detection と動的インポートを単一の依存関係モジュール内にカプセル化します。

以下の例では、`HTMLElement.prototype` に存在しない場合に `popover` 属性のポリフィルが条件付きで読み込まれます。

```javascript
// conditionally-load-polyfill.js

// Check if the feature is missing before doing work.
// MANDATORY: Prefer checking HTMLElement.prototype over window or document
// when checking for a global DOM attribute or property like popover.
if (!('popover' in HTMLElement.prototype)) {
  // Use top-level await to pause the execution of any module that imports this file
  // until the polyfill finishes downloading and executing.
  await import('/path/to/popover-polyfill.js');
}

// Export a marker if needed by your application
export const polyfillLoaded = true;
```

```javascript
// main.js

// MANDATORY: Because conditionally-load-polyfill.js uses top-level await,
// this import will block execution of main.js until the polyfill is ready.
import './conditionally-load-polyfill.js';

// Now it is safe to use the feature (e.g., showing a popover)
const myPopover = document.getElementById('my-popover');
if (myPopover) {
  myPopover.showPopover();
}
```

### Safari のトップレベル `await` バグを回避する

**MANDATORY:** Webkit においてトップレベル await が期待どおりに動作しないバグを回避するため、インポートの構造を注意深く設計する必要があります。このバグは、複数のモジュールがトップレベル `await` を含むモジュールを _同時に_ インポートした場合に発生します。

```javascript
// DO NOT do this: importing the top-level await module from multiple sibling modules
// simultaneously will crash in Safari.
//
// a.js: import './conditionally-load-polyfill.js';
// b.js: import './conditionally-load-polyfill.js';
// main.js: import './a.js'; import './b.js'; // CRASH!

// INSTEAD, guarantee a single entry point:
// Import the top-level await module ONCE at the very top of your application tree.
import './conditionally-load-polyfill.js';

// Then import the rest of your application code, ensuring the await resolves first.
import './app.js';
```

### フォールバック戦略

トップレベル await は限定的に利用可能です。
対応ブラウザ: Chrome 89（2021年3月）、Edge 89（2021年3月）、Firefox 89（2021年6月）。
未対応: Safari。

トップレベル `await` は2021年以降、すべての主要ブラウザでサポートされています（Chrome 89、Firefox 89、Safari 15）。この幅広いサポートのため、**最新のWebアプリケーションでフォールバック戦略を実装する必要はありません。**

前のセクションで説明した **Safari の実行順序のバグを回避** するためのガイダンスに従う限り、非同期依存関係の管理にトップレベル `await` を直接安全に利用できます。

アプリケーションが2021年以前にリリースされたレガシーブラウザのサポートを明示的に必要としている場合に限り、トップレベル `await` を避けて標準的な非同期関数や動的 `import()` のオーケストレーションにフォールバックする必要があります。
