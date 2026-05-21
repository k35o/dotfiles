デフォルトでは、`<input>`、`<textarea>`、`<select>`などのフォームコントロールには固定のサイズがあります。ユーザーが入力または選択するコンテンツの量に関係なく、サイズは一定のままです。

これらのコントロールがコンテンツ(プレースホルダを含む)に合わせて自動的に縮小または拡大するようにするには、`field-sizing: content` CSSプロパティを使用してください。

### フォームコントロールの自動サイジング

入力、セレクト、テキストエリアに`field-sizing: content`を設定すると、ユーザーが入力したりオプションを選択したりするにつれて動的にサイズが変更されます。ただし、堅牢なユーザー体験を確保するには、継承スタイル、レイアウトのデフォルト、最小値/最大値の制約を考慮する必要があります。

レイアウトの問題を防ぐため、テキスト入力では`field-sizing: content`と並んで`min-inline-size`(または`min-width`)と`max-inline-size`(または`max-width`)の両方を設定することが推奨されます。最小サイズは、空のときに入力の幅がゼロに崩れる(クリック不能になる)のを防ぎ、最大サイズは、無限に拡大してページレイアウトを壊さないようにします。

テキストエリアでは、水平方向の自動サイジングを許可すると、不快なUXを引き起こす可能性があります(例えば、長いプレースホルダを持つテキストエリアは、ユーザーが1文字入力すると水平方向に急激に縮小します)。これを防ぐため、テキストエリアに明示的な幅(`width: 100%`など)を適用してください。これにより、コンテンツが折り返されると垂直方向に自動サイジングしつつ、テキストエリアは安定した水平幅を維持します。

`<select>`要素で`field-sizing: content`を使用する場合は、極端に長い選択オプションがページレイアウトを壊さないように、`max-inline-size`(または`max-width`)を設定することが推奨されます。

```css
/* Applies horizontal auto-sizing to inputs */
input {
  /* Instructs the element to size itself to fit its content */
  field-sizing: content;

  /* Reset explicit width if inherited from global styles */
  width: auto;

  /* Prevents the input from collapsing and disappearing when empty */
  min-inline-size: 15ch;

  /* Prevents infinite horizontal growth */
  max-inline-size: 50ch;
}

textarea {
  /* Instructs the element to size itself to fit its content */
  field-sizing: content;

  /* Reset explicit height if inherited from global styles */
  height: auto;

  /* Use a fixed width to prevent jarring horizontal shifts when replacing a long placeholder */
  width: 50ch; /* or 100% depending on your layout */

  /* Sets a reasonable minimum height (e.g., 3 lines) for empty textareas */
  min-block-size: 3lh;

  /* Prevents infinite vertical growth. Once a textarea hits this */
  /* height, it will stop growing and show a vertical scrollbar. */
  max-block-size: 10lh;
}

select {
  /* Sizes the select element to fit the active option only */
  field-sizing: content;

  /* Prevents the dropdown from expanding infinitely and breaking the layout */
  max-inline-size: 50ch;
}
```

IMPORTANT: 明示的な`width`と`height`プロパティは、すべてのフォームコントロールで`field-sizing: content`を上書きします。プロジェクトのグローバルCSSで入力、セレクト、テキストエリアに`width: 100%`を設定している場合、自動サイジングが機能するように、`field-sizing: content`を使用する要素では明示的に`width: auto`(または`width: fit-content`)にリセットする必要があります。逆に、固定の高さが以前にグローバルに設定されていた場合は、テキストエリアに明示的に`height: auto`を設定する必要があります。

IMPORTANT: GridとFlexboxのレイアウトは、しばしば子要素を暗黙的に利用可能なスペースを満たすようにストレッチします。`field-sizing: content`を使用するフォームコントロールが縮小しない場合は、そのコンテナのalignmentプロパティを確認し、ストレッチを上書きするためにフォームコントロールに`align-self: start`または`justify-self: start`を適用してください。

### フォールバック戦略

field-sizing has limited availability.
Supported by: Chrome 123 (Mar 2024), Edge 123 (Mar 2024), and Safari 26.2 (Dec 2025).
Unsupported in: Firefox.

`field-sizing`はプログレッシブエンハンスメントとして扱うべきです。このプロパティをサポートしていないブラウザでは、フォームコントロールはデフォルトの固定サイジング挙動に優雅にフォールバックします。ユーザーは固定サイズの入力やテキストエリア内であふれるコンテンツに対する標準のスクロールを体験するだけです。

古いブラウザで動的に拡大するフィールドが絶対に必要な場合は、機能検出と複雑な回避策を使用する必要があります。テキストエリアに対する最も堅牢なフォールバックは、隠された疑似要素がユーザーの入力をリアルタイムで反映し、グリッドコンテナ(およびその中のテキストエリア)を拡張させるCSS Gridのトリックを使用します。

```html
<!-- The textarea is wrapped in a container that will mirror its value -->
<div class="growable-textarea" data-replicated-value="">
  <textarea></textarea>
</div>
```

```javascript
// Only attach the fallback event listeners if field-sizing is unsupported
if (!CSS.supports('field-sizing', 'content')) {
  document.querySelectorAll('.growable-textarea > textarea').forEach(textarea => {
    textarea.addEventListener('input', () => {
      textarea.parentNode.dataset.replicatedValue = textarea.value;
    });
  });
}
```

```css
/* Only apply the fallback if field-sizing is NOT supported */
@supports not (field-sizing: content) {
  .growable-textarea {
    display: grid;
  }

  /* The pseudo-element and textarea must share the exact same cell, font, and padding */
  .growable-textarea::after,
  .growable-textarea > textarea {
    grid-area: 1 / 1 / 2 / 2;
    font: inherit;
    padding: 0.5rem;
    border: 1px solid #999;
  }

  /* The pseudo-element renders the copied text invisibly to stretch the grid */
  .growable-textarea::after {
    /* The space is necessary for trailing empty lines to be rendered */
    content: attr(data-replicated-value) " ";
    white-space: pre-wrap;
    visibility: hidden;
  }

  .growable-textarea > textarea {
    resize: none;
    overflow: hidden;
  }
}
```

すべてのフォームコントロールについてDOMノード間でスタイルを複製し状態を同期する複雑さを考えると、動的サイジングがユーザー体験に不可欠でない限り、固定入力のデフォルトフォールバック挙動に依存するのがほとんどのアプリケーションで推奨されるアプローチです。
