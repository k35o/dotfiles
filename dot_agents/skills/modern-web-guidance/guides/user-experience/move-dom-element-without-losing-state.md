`appendChild()`や`insertBefore()`といった従来のメソッドでDOM要素の親を付け替えると、ブラウザは暗黙のうちにその要素をDOMから削除し、新しい場所に挿入し直します。この「削除と挿入」の操作は多くの内部状態をリセットしてしまい、`<iframe>`要素は再読み込みされ、CSSアニメーションは最初からやり直され、入力フィールドはフォーカスを失います。

要素の状態を保ったまま移動するには、`moveBefore()` APIを使ってください。このメソッドは削除と挿入のステップを完全に省き、アトミックな移動を行います。

### 状態を保ったまま要素を移動する

`moveBefore()`は`insertBefore()`と全く同じように使えます。引数は2つで、移動するノードと、その前に挿入する参照ノード（新しい親の末尾に追加する場合は`null`）です。

```javascript
const newParent = document.getElementById('new-parent');
const elementWithState = document.getElementById('iframe-or-focused-input');

// MANDATORY: Use moveBefore to preserve state.
// Passing null as the second argument appends the element to the end of newParent.
newParent.moveBefore(elementWithState, null);
```

### カスタム要素（Web Components）の移動

`moveBefore()`でカスタム要素を移動した場合、`connectedCallback`および`disconnectedCallback`のライフサイクルメソッドは**発火しません**。

移動時にカスタム要素で特定のロジックを実行する必要がある場合は、カスタム要素の定義内に`connectedMoveCallback()`メソッドを実装してください。

```javascript
class MyCustomElement extends HTMLElement {
  connectedCallback() {
    // Runs on initial insertion.
  }

  connectedMoveCallback() {
    // Runs when the element is moved via moveBefore().
    // Use this to update state that depends on the new DOM location.
  }
}
```

### フォールバック戦略

moveBefore() has limited availability.
Supported by: Chrome 133 (Feb 2025), Edge 133 (Feb 2025), and Firefox 144 (Oct 2025).
Unsupported in: Safari.

`moveBefore()`はプログレッシブエンハンスメントとして使う機能なので、呼び出し前に必ず機能検出を行い、古いブラウザでは従来の`insertBefore()`や`appendChild()`にフォールバックする必要があります。

```javascript
const targetParent = document.getElementById('target-container');
const nodeToMove = document.getElementById('moving-element');

// Check if moveBefore is supported on the Element prototype
if ('moveBefore' in Element.prototype) {
  targetParent.moveBefore(nodeToMove, null);
} else {
  // Fallback: traditional move.
  // Note: This WILL reset <iframe>, animation, and focus state in unsupported browsers.
  targetParent.insertBefore(nodeToMove, null);
}
```
