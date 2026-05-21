# セレクトメニューインタラクション

## 問題
必須のドロップダウン(例: 「国を選択」)の場合、デフォルトオプションが空の値を持っていると、標準のバリデーションは即座にフィールドを無効としてフラグ付けします。これは視覚的なノイズを生む可能性があります。エラーは、ユーザーがメニューを開いてオプションを選択せずに閉じた場合、またはフォームの送信を試みた場合にのみ表示したいものです。

## 解決策
`:user-invalid`疑似クラスは、`<select>`要素とシームレスに連携します。これはユーザーのインタラクションフローを尊重します。単にページを読み込んだり、フォーカス/ブラーするだけでは、インタラクションとみなされないため、ユーザーが能動的に選択を試みるまでフィールドは中立のままです。

### 実装戦略

1.  **HTML制約**: `required`付きの`<select>`を使用します。最初のオプションは`value=""`を持ち、有効な選択を強制するために、理想的には無効/非表示にしてください。
2.  **視覚的フィードバック**: `:user-invalid`を使用して、セレクトボックスのボーダーをスタイル付けします。
3.  **タイミング**: ブラウザは、ユーザーがコントロールからblurする前に値を(デフォルトの無効状態に戻しても)変更した場合、またはフォーム送信時に、フィールドを「インタラクション済み」と見なします。

## 実装ガイド

### 1. HTML構造
ここでは「プレースホルダ」オプションが鍵です。

```html
<form>
  <div class="field">
    <label for="country">Country</label>
    <select
      id="country"
      name="country"
      required
      aria-errormessage="country-error"
    >
      <option value="" disabled selected>Select a country...</option>
      <option value="us">United States</option>
      <option value="ca">Canada</option>
      <option value="uk">United Kingdom</option>
    </select>
    <div id="country-error" class="error-msg">
      Please select a country.
    </div>
  </div>
</form>
```

### 2. CSS
```css
.error-msg {
  display: none;
  color: #d93025;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/*
  Only show error after the user visits the select menu.
*/
select:user-invalid {
  border-color: #d93025;
  background-color: #fce8e6;
}

select:user-invalid + .error-msg {
  display: block;
}

select:user-valid {
  border-color: #188038;
}
```

## フォールバックとブラウザサポート

`:user-invalid`疑似クラスは広くサポートされていますが(Baseline 2023)、古いブラウザをサポートする必要がある場合は、実装の一貫性を確保する必要があります。

### :user-valid と :user-invalid のフォールバックとブラウザサポート

Baseline status for :user-valid and :user-invalid: Widely available. It's been Baseline since 2023-11-02.
Supported by: Chrome 119 (Oct 2023), Edge 119 (Nov 2023), Firefox 88 (Apr 2021), and Safari 16.5 (May 2023).

### フォールバック用のCSS

```css
input:user-invalid,
input.user-invalid-fallback {
  border-color: #d93025;
  background-color: #fce8e6;
}

input:user-invalid + .error-msg,
input.user-invalid-fallback + .error-msg {
  display: block;
}
```

### JavaScriptフォールバック

`WeakMap`を使用してインタラクション状態を追跡する再利用可能なユーティリティを使用します。これにより、「dirty」クラスやデータ属性でDOMを汚染することがなくなります。

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
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(input, state);
      if (state.hasBlurred) {
        updateState(input);
      }
    } else if (event.type === 'blur') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
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

## その他の考慮事項

1.  **モバイルの挙動**: モバイルデバイスでは、OSピッカーによって「ブラー」の動作が異なる場合があります。実機でのテストを推奨します。
2.  **アクセシビリティ**: ネイティブの`:user-invalid`はARIA属性と自動的に同期しません。視覚的な状態と`aria-invalid`を同期させるため、次のJavaScriptを追加してください:

```javascript
// Sync aria-invalid with the CSS :user-invalid state
const syncAria = (el) => {
  el.setAttribute?.('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
};

// Update on blur (to show error) and input (to clear it)
document.addEventListener('blur', (e) => syncAria(e.target), true);
document.addEventListener('input', (e) => {
  if (e.target.hasAttribute('aria-invalid')) syncAria(e.target);
});
```
