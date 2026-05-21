モダンなモーダルダイアログはしばしば「ライトディスミス」をサポートし、ユーザーがバックドロップ（ダイアログの外側の領域）をクリックまたはタップすることでダイアログを閉じられるようにします。`closedby` 属性は、独自の JavaScript を書かずにこの挙動を有効にするための宣言的な方法を提供します。

## 実装

ライトディスミスを有効にするには:

1. `<dialog>` 要素に `closedby="any"` を追加します。
2. `dialog.showModal()` でダイアログを開きます。

### 属性の値

- `any`: ライトディスミス（バックドロップのクリック）、「クローズリクエスト」（`Esc` キー）、開発者によるメカニズム（例: `dialog.close()`）を有効にします。
- `closerequest`: クローズリクエストと開発者によるメカニズムだけを有効にします。これはモーダルダイアログのデフォルトです。
- `none`: 開発者によるメカニズムでのみダイアログを閉じられます。

### バックドロップのスタイリング
ダイアログが `showModal()` でモーダルとして開かれると、ブラウザは `::backdrop` 疑似要素を生成します。このバックドロップはビューポート全体を覆い、ダイアログの真後ろに配置されます。

```css
/* Style the backdrop to indicate the dialog is modal */
dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px); /* Optional: add blur for modern browsers */
}
```

## 例

```html
<!-- MANDATORY: Use closedby="any" to enable light-dismiss behavior -->
<dialog id="myDialog" closedby="any" aria-labelledby="dialogTitle">
  <form method="dialog">
    <h2 id="dialogTitle">Feedback</h2>
    <p>Click outside this box or press Esc to dismiss.</p>
    <button type="submit">Close</button>
  </form>
</dialog>

<button onclick="document.getElementById('myDialog').showModal()">Open Dialog</button>
```

## 制約とアクセシビリティ

- **必須**: `closedby="any"` を使ってライトディスミスを宣言的に有効化すること。
- **必須**: モーダルダイアログは常に `showModal()` で開くこと。これにより、ダイアログがトップレイヤーに乗り、フォーカスがトラップされ、`Esc` キーが処理されます。
- **DO**: `aria-labelledby` または `aria-label` でダイアログのアクセシブルな名前を提供すること。
- **DO NOT**: `show()` で開く非モーダルダイアログでは `closedby` を使わないこと。バックドロップを持たず、ライトディスミスがトリガーされません。
- **DO NOT**: 閉じる *前に* 実行すべきクリティカルなロジックには `click` イベントを使わないこと。代わりに `close` または `cancel` イベントをリッスンしてください。

## フォールバック戦略

<dialog closedby> は限定的に利用可能です。
対応ブラウザ: Chrome 134（2025 年 3 月）、Edge 134（2025 年 3 月）、Firefox 141（2025 年 7 月）。
未対応: Safari。

**必須**: `closedby` をまだサポートしていないブラウザのために、次のスクリプトでダイアログコンテンツの境界外でクリックが発生したかを判定し、ライトディスミスのフォールバックを **必ず** 実装してください。

```javascript
const dialog = document.querySelector('dialog');

// Fallback for browsers without closedby support
if (!('closedBy' in HTMLDialogElement.prototype)) {
  dialog.addEventListener('click', (event) => {
    // 1. When clicking the backdrop, the event target is the dialog element itself.
    // Ignore clicks where the target is a child element inside the dialog.
    if (event.target !== dialog) return;

    // 2. Check if the click coordinates fall within the dialog's content box.
    // This distinguishes between a click on the backdrop vs a click on the dialog's background/padding.
    const rect = dialog.getBoundingClientRect();
    const isDialogContent = (
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width
    );

    if (isDialogContent) return;

    // 3. Since the click was outside the content area (on the backdrop), manually close the dialog.
    dialog.close();
  });
}
```
