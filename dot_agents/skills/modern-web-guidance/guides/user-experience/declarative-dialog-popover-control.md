# 概要

Invoker Commands API を使うと、HTML のボタンから直接 `<dialog>` 要素や `[popover]` 要素の表示状態をトグルできるため、独自の JavaScript イベントリスナーを書く必要がなくなります。

`<button>` に `commandfor`（ターゲット ID）属性と `command`（アクション）属性を付与すると、ブラウザが開閉状態の変更、フォーカス管理、（`aria-expanded` のような）アクセシビリティのバインディングを自動的に処理します。この宣言的なアプローチは、壊れやすいボイラープレートコードを排除し、HTML がパースされた直後からインタラクションが機能することを保証し、ネイティブにアクセシブルな堅牢なユーザー体験を提供するため、推奨されます。

## 宣言的なポップオーバーの実装

ポップオーバーはひとつのボタンで開閉をトグルできます。

```html
<!-- MANDATORY: The commandfor attribute links the invoker to the ID of the target element so the browser knows what to control. -->
<!-- MANDATORY: The command attribute specifies the action to perform. Use 'toggle-popover' to handle both open and close states automatically. -->
<button commandfor="my-popover" command="toggle-popover">
  Toggle Popover
</button>

<!-- MANDATORY: The target element must have the popover attribute to be controlled as a popover. -->
<div id="my-popover" popover>
  <p>Popover content goes here.</p>
</div>
```

開閉を別々のボタンで制御したい場合は、`show-popover` と `hide-popover` コマンドを利用できます。

```html
<!-- MANDATORY: Use 'show-popover' to explicitly open the popover. It will not close the popover if clicked again. -->
<button commandfor="my-explicit-popover" command="show-popover">
  Show Popover
</button>

<div id="my-explicit-popover" popover="manual">
  <p>This popover is explicitly opened and closed by separate buttons.</p>

  <!-- MANDATORY: Use 'hide-popover' to explicitly close the targeted popover. -->
  <button commandfor="my-explicit-popover" command="hide-popover">
    Hide Popover
  </button>
</div>
```

## 宣言的なモーダルダイアログの実装

ポップオーバーとは違い、モーダルダイアログは通常、開閉に別々のボタンを使います。ダイアログをモーダルとして開く必要がある場合は、専用の `show-modal` コマンドを使用します。

```html
<!-- MANDATORY: Use command="show-modal" to trigger the dialog as a modal, trapping focus and preventing interaction with the rest of the page. -->
<!-- MANDATORY: The commandfor attribute connects this button to the dialog ID. -->
<button commandfor="confirm-dialog" command="show-modal">
  Open Confirmation
</button>

<dialog id="confirm-dialog">
  <p>Are you sure you want to proceed?</p>

  <!-- MANDATORY: Use command="close" to dismiss the dialog safely. -->
  <button commandfor="confirm-dialog" command="close">
    Cancel
  </button>
</dialog>
```

## フォールバック戦略

Invoker Commands の Baseline ステータス: Newly available。2025-12-12 から Baseline です。
対応ブラウザ: Chrome 135（2025 年 4 月）、Edge 135（2025 年 4 月）、Firefox 144（2025 年 10 月）、Safari 26.2（2025 年 12 月）。
Popover の Baseline ステータス: Newly available。2025-01-27 から Baseline です。
対応ブラウザ: Chrome 116（2023 年 8 月）、Edge 116（2023 年 8 月）、Firefox 125（2024 年 4 月）、Safari 17（2023 年 9 月）、Safari iOS 18.3（2025 年 1 月）。

Invoker Commands と Popover はまだすべてのブラウザで普遍的にサポートされているわけではないため、古いブラウザ用のフォールバックとしてポリフィルを **必ず** 使用する必要があります。

### Invoker Commands のポリフィル

必須: `HTMLButtonElement` プロトタイプの `commandForElement` プロパティの有無で機能検出を行ってください。window や document オブジェクトをチェックしてはいけません。ネイティブ機能が存在しない場合のみ、必ず動的にポリフィルをインポートしてください。無条件にポリフィルをロードしてはいけません。
必須: ネイティブの 'command' イベントはバブリングしないため、ターゲット要素に対して直接 'command' イベントをリッスンしてください。

**オプション 1: バンドラを使う場合**
ポリフィルを npm で追加します（`npm install invokers-polyfill`）。このアプローチは、（Vite や Webpack のような）バンドラまたはインポートマップを使うプロジェクト向けです。それ以外の場合は、後述する CDN オプションを使ってください。

```javascript
// MANDATORY: Feature detect 'commandForElement' on HTMLButtonElement.prototype.
// Conditionally load the invokers-polyfill only in browsers lacking native support.
if (!('commandForElement' in HTMLButtonElement.prototype)) {
  import('invokers-polyfill');
}
```

**オプション 2: CDN を使う場合**
バンドラを使わないプロジェクトでは、`<script type="module">` の中でポリフィルを CDN から動的にインポートします。

```html
<script type="module">
  // MANDATORY: Feature detect 'commandForElement' on HTMLButtonElement.prototype.
  // Conditionally load the invokers-polyfill from a CDN only in browsers lacking native support.
  if (!('commandForElement' in HTMLButtonElement.prototype)) {
    import('https://esm.run/invokers-polyfill');
  }
</script>
```

**Invokers Polyfill の制限事項**
必須: このポリフィルは、コマンドボタンの ARIA 状態（例: `aria-expanded`）をネイティブブラウザのようには処理しません。サイトを完全にアクセシブルに保つために、これらの状態は開発者自身で扱うことが強く推奨されます。

Invoker Commands の Baseline ステータス: Newly available。2025-12-12 から Baseline です。
対応ブラウザ: Chrome 135（2025 年 4 月）、Edge 135（2025 年 4 月）、Firefox 144（2025 年 10 月）、Safari 26.2（2025 年 12 月）。

Invoker Commands API がサポートされていない場合、`command` イベントは発火しません。すべてのモダンブラウザで完全にサポートするには、https://github.com/keithamus/invokers-polyfill の invokers-polyfill を `npm install` または CDN 経由で利用することが推奨されます。

このポリフィルはカスタムアクション（`--` で始まるもの）を完全にサポートし、ネイティブ API と同じ形で `command` イベントをディスパッチします。

### 動的インポート（パフォーマンス最適化）

最良のパフォーマンスを得るには、ブラウザが API をネイティブにサポートしていない場合のみポリフィルをロードしてください。これによりモダンブラウザのユーザーに対する帯域消費とスクリプト実行時間を節約できます。

```javascript
// Check for native support first
const hasNativeSupport = 'commandForElement' in HTMLButtonElement.prototype;

if (!hasNativeSupport) {
  // Dynamically import the polyfill only when needed
  try {
    await import('https://cdn.jsdelivr.net/npm/invokers-polyfill@latest/dist/index.min.js');
    console.log('Invoker Commands polyfill loaded');
  } catch (err) {
    console.error('Error loading fallback:', err);
  }
}
```

### 手動フォールバック（従来のパターン）

ポリフィルを使いたくない場合は、**イベント委譲**でイベントをディスパッチする方法と、**コマンドレジストリ**でアクションを処理する方法を組み合わせて利用できます。これは従来の JavaScript 開発における一般的なアーキテクチャパターンで、効率的でスケーラブルです。

```javascript
// 1. Define a registry of requested actions for cleaner logic
const commandRegistry = {
  '--spin': (target) => target.classList.toggle('is-spun'),
  '--grow': (target) => target.classList.toggle('is-grown'),
  '--reset': (target) => target.classList.remove('is-spun', 'is-grown'),
};

const supportsInvokers = 'commandForElement' in HTMLButtonElement.prototype;

// 2. The fallback: Dispatch events manually if native support is missing
if (!supportsInvokers) {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[commandfor]');
    if (!button) return;

    const target = document.getElementById(button.getAttribute('commandfor'));
    const command = button.getAttribute('command');

    if (target && command) {
      target.dispatchEvent(new CustomEvent('command', {
        bubbles: true,
        detail: { command }
      }));
    }
  });
}

// 3. The unified listener: Registered directly on the target element
document.getElementById('action-target').addEventListener('command', (event) => {
  const command = event.command || event.detail?.command;
  const target = event.currentTarget;
  const action = commandRegistry[command];

  if (action) {
    action(target);
  }
});
```

### Popover 属性のポリフィル

古いブラウザで `popover` 属性をサポートするには、`@oddbird/popover-polyfill` を使用します。

必須: `HTMLElement` プロトタイプの `popover` プロパティをチェックして、ポップオーバーのサポート状況を機能検出してください。ネイティブサポートがない場合のみ条件付きでポリフィルを初期化します。

**オプション 1: バンドラを使う場合**
パッケージを npm でインストールします（`npm install @oddbird/popover-polyfill`）。この方法では、モジュールパスを解決するためにバンドラまたはインポートマップが必要です。

```javascript
// MANDATORY: Feature detect 'popover' on HTMLElement.prototype.
if (!('popover' in HTMLElement.prototype)) {
  import('@oddbird/popover-polyfill/fn').then(({ apply }) => {
    apply();
  });
}
```

**オプション 2: CDN を使う場合**
バンドラを使わないプロジェクトでは、`<script type="module">` の中でポリフィルを CDN から動的にインポートします。

```html
<script type="module">
  // MANDATORY: Feature detect 'popover' on HTMLElement.prototype.
  // Conditionally load the popover-polyfill from a CDN only in browsers lacking native support.
  if (!('popover' in HTMLElement.prototype)) {
    import('https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover-fn.js').then(({ apply }) => {
      apply();
    });
  }
</script>
```

**Popover Polyfill の制限事項とスタイリング上の注意点**
必須: `:popover-open` をポリフィルが提供する対応クラスと組み合わせる場合は、`:is()` または `:where()` を使用してください。そうしないと、`:popover-open` をサポートしないブラウザではルール全体が破棄されます。

```css
[popover]:is(:popover-open, .\:popover-open) {
  display: block;
}
```
