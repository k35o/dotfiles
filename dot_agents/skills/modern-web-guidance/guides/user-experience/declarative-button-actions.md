# 宣言的なボタンアクション
Invoker Commands API を使用すると、HTML 属性によってボタンが宣言的にターゲット要素のアクションを呼び出せます。このアプローチによって、手動でイベントリスナーを設定する必要が減り、HTML がパースされた直後からインタラクションを利用できるようになります。

カスタムなアプリケーション固有のアクションを実装したい場合は、独自のコマンド名を定義できます。カスタムコマンドは将来追加されるブラウザの組み込みコマンドと衝突しないよう、ダブルダッシュ（`--`）をプレフィックスとして付ける必要があります。

## 実装手順

1.  **ターゲット要素を定義する**: アクションに反応する要素を特定します。一意の `id` を持たせる必要があります。
2.  **invoker ボタンを設定する**: `commandfor` 属性でターゲットの `id` を指定し、`command` 属性でカスタムコマンド名（`--` プレフィックス付き）を指定します。
3.  **command イベントを処理する**: `command` イベントリスナーを `document`（または共通の親）に登録します。これにより、ポリフィルや子要素からディスパッチされたイベントも確実に捕捉できます。イベントオブジェクトには `command` プロパティと（`commandfor` で指定された要素を参照する）`target` プロパティが含まれます。

## 例: カスタムアニメーションコントロール

```html
<!-- The target element that will respond to custom commands -->
<div id="action-target" class="target">
  Action Target
</div>

<!-- Buttons declaratively linked to the target element -->
<!-- Each button sends a unique custom command starting with '--' -->
<button commandfor="action-target" command="--spin">
  Spin
</button>

<button commandfor="action-target" command="--grow">
  Grow
</button>

<button commandfor="action-target" command="--reset">
  Reset All
</button>

<script>
  // Listen for the 'command' event directly on the target element
  // (This is necessary because the native 'command' event does not bubble)
  document.getElementById('action-target').addEventListener('command', (event) => {
    // Robustly handle both native API and manual/polyfill fallbacks
    const command = event.command || event.detail?.command;
    const target = event.currentTarget;

    // Custom commands are checked to identify the requested action
    if (command === '--spin') {
      target.classList.toggle('is-spun');
    } else if (command === '--grow') {
      target.classList.toggle('is-grown');
    } else if (command === '--reset') {
      // Clear all custom classes to return to initial state
      target.classList.remove('is-spun', 'is-grown');
    }
  });
</script>
```

## 重要な制約

*   **カスタムコマンドにはプレフィックスを付ける**: 必須: すべてのカスタムコマンド名は `--` で始める必要があります（例: `command="--my-action"`）。
*   **ターゲット指定**: `commandfor` 属性は、同じドキュメントツリー内にある要素の `id` と一致させなければなりません。

## フォールバック戦略

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
