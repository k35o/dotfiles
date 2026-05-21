# 必須フィールドのフィードバック

## 問題
ページ読み込み直後に必須フィールドをエラー状態としてマークすると、混乱を招く可能性があります。理想的には、必須フィールドは、ユーザーが入力を試みて失敗した場合にのみ「無効」に見えるべきです。

## 解決策
`:user-invalid`疑似クラスは、これを完全に解決します。必須フィールドの場合、ページ読み込み時にはマッチしません。次の場合にのみマッチします:
1.  ユーザーがフィールドとやり取りし(例: 文字を入力して削除する)、空の状態で離れた(blur)場合。
2.  ユーザーが空の状態でフォームを送信しようとした場合。

### 実装戦略

1.  **HTML制約**: 入力に`required`属性を追加します。
2.  **視覚的フィードバック**: `:user-invalid`を使用してボーダーを赤くスタイル付けし、「必須」のヘルパーテキストを表示します。
3.  **タイミング**: ブラウザのネイティブなタイミングに視覚的フィードバックを任せます。`touched`クラスを追加するために`onBlur`ハンドラを使用する必要はもうありませんが、ARIA属性を同期するためのJavaScriptはまだ必要です(以下を参照)。

## 実装ガイド

### 1. HTML構造
```html
<form id="feedback-form">
  <div class="field">
    <label for="full-name">Full Name</label>
    <input
      type="text"
      id="full-name"
      name="full-name"
      required
      aria-errormessage="name-error"
    >
    <!-- MANDATORY: Include an icon or distinct non-color indicator alongside error text -->
    <div id="name-error" class="error-msg">
      <span aria-hidden="true">❌</span> This field is required.
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
  Only highlight empty required fields AFTER the user visits them.
  MANDATORY: Provide multiple indicators (border shift + helper text/icon) to avoid color-only state communication.
*/
input:user-invalid {
  border-color: #d93025;
  background-color: #fce8e6;
}

input:user-invalid + .error-msg {
  display: block;
}

/* Optional: Subtle indicator for required fields that are valid */
input:required:user-valid {
  border-color: #188038;
  border-width: 2px;
}
```

### 3. JavaScriptの状態同期

MANDATORY: `:user-invalid`は視覚的な状態であるため、ユーザーが無効なフィールドからblurしたり送信を試みたりした際に、支援技術のために`aria-invalid="true"`を動的に同期するJavaScriptブリッジを提供しなければなりません。

```javascript
const form = document.getElementById('feedback-form');

const syncAriaInvalid = (input) => {
  if (!input.checkValidity()) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
};

// Sync on blur when a user finishes interacting
form.addEventListener('blur', (e) => {
  if (e.target.matches('input[required]')) {
    syncAriaInvalid(e.target);
  }
}, true);

// Sync all required fields when submission is attempted
form.addEventListener('submit', () => {
  form.querySelectorAll('input[required]').forEach(syncAriaInvalid);
});

// Remove error state immediately upon correction
form.addEventListener('input', (e) => {
  if (e.target.matches('input[required]') && e.target.checkValidity()) {
    e.target.removeAttribute('aria-invalid');
  }
});
```

## フォールバックとブラウザサポート

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

1.  **アスタリスク**: ユーザーがやり取り*する前*に何を期待すべきかを知ることができるよう、ラベルでアスタリスク`*`などを使って必須フィールドを視覚的に示すのは依然としてベストプラクティスです。
2.  **送信ボタン**: `disabled`ボタンとは異なり、送信ボタンは有効のままにしてください。ユーザーがクリックすると、ブラウザは自動的にすべての空の必須フィールドに対して`:user-invalid`をトリガーし、最初のフィールドにフォーカスします。これはアクセシビリティとUXに優れています。
3.  **アクセシビリティ**: ネイティブの`:user-invalid`はARIA属性と自動的に同期しません。視覚的な状態と`aria-invalid`を同期させるため、次のJavaScriptを追加してください:

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
