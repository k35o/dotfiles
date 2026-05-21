開いている`<dialog>`、ポップオーバー、フルスクリーン要素を`appendChild()`や`insertBefore()`といった従来のメソッドでDOM内で動かすと、ブラウザは暗黙のうちにその要素を削除して再挿入します。この削除によって状態がリセットされ、開いていたモーダル、ポップオーバー、フルスクリーン要素が突然閉じてしまいます。

最上位レイヤー要素をユーザー体験を損なわず、また閉じることもなく親を付け替えるには、アトミックな`moveBefore()` APIを使ってください。

### 開いている最上位レイヤー要素の親を付け替える

`moveBefore()`は2つの引数を取ります。移動するノードと、その前に挿入する参照ノード（新しい親の末尾に追加する場合は`null`）です。

```javascript
const newParent = document.getElementById('new-container');
const dialogElement = document.getElementById('my-dialog');

// MANDATORY: Use moveBefore to ensure the <dialog> or popover stays open.
// Passing null appends it to the end of newParent.
newParent.moveBefore(dialogElement, null);
```

### フォールバック戦略

moveBefore() has limited availability.
Supported by: Chrome 133 (Feb 2025), Edge 133 (Feb 2025), and Firefox 144 (Oct 2025).
Unsupported in: Safari.

`moveBefore()`はプログレッシブエンハンスメントとして使う機能なので、呼び出し前に必ず機能検出を行ってください。古いブラウザでは、従来の親付け替えにフォールバックする必要があります。

**MANDATORY**: 非対応ブラウザの`<dialog>`要素では、従来の移動でダイアログが閉じてしまいます。開いたままにしたい場合は、移動後に手動で再オープンする必要があります。

```javascript
const targetParent = document.getElementById('target-container');
const popoverOrDialog = document.getElementById('my-top-layer-element');

// Check if moveBefore is supported
if ('moveBefore' in Element.prototype) {
  targetParent.moveBefore(popoverOrDialog, null);
} else {
  // Fallback: traditional move.
  // Note: This WILL close <dialog>, popover, and fullscreen elements.
  const wasOpen = popoverOrDialog.hasAttribute('open') || popoverOrDialog.matches(':popover-open');
  targetParent.insertBefore(popoverOrDialog, null);
  
  // Manually restore state if possible
  if (wasOpen && typeof popoverOrDialog.showModal === 'function') {
    popoverOrDialog.showModal();
  } else if (wasOpen && typeof popoverOrDialog.showPopover === 'function') {
    popoverOrDialog.showPopover();
  }
}
```
