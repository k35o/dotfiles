# :has() で親要素をスタイリングする

## 課題

エラー状態では、入力要素自身ではなく _外側_ の要素にスタイルを当てる必要があることがよくあります。例えば、親 `fieldset` のボーダーの色を変えたり、`<label>` をハイライトしたり、カードのヘッダーに全体的なエラーアイコンを表示したりするケースです。従来これには、親要素のクラスを切り替えるJavaScriptが必要でした。

## 解決策

`:has()` と `:user-invalid` を組み合わせることで、特定の子孫の有効性に基づいて任意の祖先要素を宣言的にスタイリングできます。これにより、プレゼンテーションロジックをすべてCSSに保てます。

### 実装戦略

1.  **セレクター**: コンテナを対象にするには `.parent:has(:user-invalid)` を使います。
2.  **スコープ**: パフォーマンスの問題を避けるため、具体的に指定します。`body` ではなく `.field-group` を対象にします。
3.  **フォールバック**: `:has()` がサポートされていない場合は、親要素のクラスを切り替えるJSが必要です。

## 実装ガイド

### 1. HTML構造

```html
<form>
  <div class="card-section">
    <div class="header">
      <h3>Profile Settings</h3>
      <span class="status-icon"></span>
    </div>

    <div class="field">
      <label for="username">Username</label>
      <input type="text" id="username" required />
    </div>
  </div>
</form>
```

### 2. CSS

```css
/* Default State */
.card-section {
  border: 1px solid #ccc;
  border-left: 4px solid #ccc;
}

/*
  Parent Styling Logic:
  If the card contains ANY user-invalid input, turn the whole card's edge red.
*/
.card-section:has(:user-invalid) {
  border-left-color: #d93025;
  background-color: #fff8f8;
}

/* Change the icon too */
.card-section:has(:user-invalid) .status-icon::after {
  content: '⚠️';
}
```

## フォールバックとブラウザサポート

`:user-invalid` 擬似クラスは広くサポートされています(Baseline 2023)が、古いブラウザをサポートする必要がある場合は、実装の一貫性を確保する必要があります。

### フォールバック用のCSS

親に `.has-error` クラスを使って `:has()` の挙動を模倣します。

```css
/* Native */
.card-section:has(:user-invalid) {
  border-left-color: #d93025;
}

/* Fallback */
.card-section.has-error-fallback {
  border-left-color: #d93025;
}
```

### JavaScriptフォールバック

`WeakMap` でインタラクション状態を追跡する再利用可能なユーティリティを使います。これによりDOMに「dirty」クラスやdata属性が散らかるのを避けられます。

```javascript
const UserInvalidFallback = (() => {
  const dirtyState = new WeakMap();

  const updateState = (input) => {
    const isValid = input.checkValidity();

    // Update both visual and ARIA state
    input.classList.toggle('user-invalid-fallback', !isValid);
    input.classList.toggle('user-valid-fallback', isValid);

    if (!isValid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  };

  const handleEvent = (event) => {
    const input = event.target;

    if (event.type === 'reset') {
      const controls = input.elements || [];
      for (const control of controls) {
        dirtyState.delete(control);
        control.classList.remove('user-invalid-fallback');
        control.classList.remove('user-valid-fallback');
        control.removeAttribute('aria-invalid');
      }
      return;
    }

    if (!input.checkValidity) return;

    if (event.type === 'input' || event.type === 'change') {
      const state = dirtyState.get(input) || {
        hasInteracted: false,
        hasBlurred: false,
      };
      state.hasInteracted = true;
      dirtyState.set(input, state);
      if (state.hasBlurred) {
        updateState(input);
      }
    } else if (event.type === 'blur') {
      const state = dirtyState.get(input) || {
        hasInteracted: false,
        hasBlurred: false,
      };
      state.hasBlurred = true;
      dirtyState.set(input, state);
      if (state.hasInteracted) {
        updateState(input);
      }
    }
  };

  const init = (root = document) => {
    if (CSS.supports('selector(:user-invalid)')) return;

    root.addEventListener('blur', handleEvent, true); // Capture phase
    root.addEventListener('input', handleEvent);
    root.addEventListener('change', handleEvent);
    root.addEventListener('reset', handleEvent, true); // Capture resets
  };

  return { init };
})();

// Initialize for a specific form
const form = document.querySelector('#demo-form');
UserInvalidFallback.init(form);
```

```js
// 1. Initialize the generic fallback
const form = document.querySelector('#demo-form');
UserInvalidFallback.init(form);

// 2. Add specialized "parent styling" logic (Separate from fallback)
// Listen for changes to form validity after interaction
form.addEventListener(
  'blur',
  (e) => {
    if (!e.target.matches('input, select, textarea')) return;

    // Find the container we want to style (sync with CSS)
    const container = e.target.closest('.card-section');
    if (!container) return;

    // Check if ANY fallbacked input in this container is invalid
    const hasError = container.querySelector('.user-invalid-fallback');
    container.classList.toggle('has-error-fallback', !!hasError);
  },
  true,
); // Capture phase to ensure we run after the fallback's blur listener

// Also handle input events for immediate cleanup
form.addEventListener('input', (e) => {
  const container = e.target.closest('.card-section');
  if (container) {
    const hasError = container.querySelector('.user-invalid-fallback');
    container.classList.toggle('has-error-fallback', !!hasError);
  }
});

// Handle form resets
form.addEventListener('reset', () => {
  form.querySelectorAll('.has-error-fallback').forEach((el) => {
    el.classList.remove('has-error-fallback');
  });
});
```

## その他の考慮事項

1.  **アクセシビリティ**: ネイティブの `:user-invalid` はARIA属性と自動同期しません。次のJavaScriptを追加して `aria-invalid` を視覚状態と同期させてください。

```javascript
// Sync aria-invalid with the CSS :user-invalid state
const syncAria = (el) => {
  el.setAttribute?.(
    'aria-invalid',
    el.matches(':user-invalid') ? 'true' : 'false',
  );
};

// Update on blur (to show error) and input (to clear it)
document.addEventListener('blur', (e) => syncAria(e.target), true);
document.addEventListener('input', (e) => {
  if (e.target.hasAttribute('aria-invalid')) syncAria(e.target);
});
```
