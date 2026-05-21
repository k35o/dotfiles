# インタラクション後の入力バリデーション

## 問題

ユーザーがフィールドにフォーカスして入力を開始した瞬間にバリデーションエラーを表示することは、時期尚早で気が散ります。例えば、ユーザーがメールアドレス(例: "user@gm")や複雑な要件を持つパスワードを入力している間、フィールドは完了まで技術的には無効です。標準の`:invalid`スタイリングでは、エラー状態がすぐに現れ、ユーザーをいらつかせます。

## 解決策

`:user-invalid`疑似クラスを使用すると、ユーザーが値を「コミット」する(フィールドからブラーする)か、フォームの送信を試みるまでエラー状態を遅らせることができます。これにより、ユーザーがフィールドとのインタラクションを終えた後にのみバリデーションフィードバックが提供されます。

### 実装戦略

1.  **HTML制約**: ブラウザの組み込みバリデーションロジックをトリガーするために、`type="email"`、`pattern`、`required`などの標準HTML5属性を**DO**使用してください。
2.  **視覚的フィードバック**: インタラクション後にのみエラースタイリングを適用するため、`:user-invalid`を**DO**使用してください。
3.  **ポジティブな強化**: 要件が満たされたら緑色の「成功」インジケータを表示するため、`:user-valid`を任意で**DO**使用してください。
4.  **優雅な復旧**: ユーザーが入力を有効な形式に修正するとすぐに、`:user-invalid`がマッチしなくなり、エラー状態が即座に解除されます。

## 実装ガイド

### ユースケース1: メールバリデーション

MANDATORY: メールフィールドには標準HTML5属性に依存してください。エラーメッセージはデフォルトで非表示で、ブラウザがフィールドを無効な状態でユーザーが離れたと判断した場合にのみ表示されます。

```html
<form>
  <div class="field">
    <label for="email">Email Address</label>
    <!-- MANDATORY: Place format hints above the input so autocomplete popovers don't cover them during editing -->
    <span id="email-hint" class="hint">Format: you@example.com</span>
    <!-- DO: Use standard HTML validation attributes like type="email" and required -->
    <input
      type="email"
      id="email"
      name="email"
      required
      autocomplete="email"
      aria-describedby="email-hint"
      aria-errormessage="email-error"
    >
    <div id="email-error" class="error-msg">
      <span aria-hidden="true">❌</span> Please enter a valid email address.
    </div>
  </div>
</form>
```

```css
.hint {
  display: block;
  color: #5f6368;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.error-msg {
  display: none;
  color: #d93025;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/*
  DO: Only show error styles after user interaction.
  Use multiple indicators (border/background shift + icon/text) to avoid color-only states.
*/
input:user-invalid {
  border-color: #d93025;
  background-color: #fce8e6;
}

/* DO: Reveal the error message using the adjacent sibling selector */
input:user-invalid + .error-msg {
  display: block;
}

/* DO: Provide a clear success indication on :user-valid */
input:user-valid {
  border-color: #188038;
}
```

### ユースケース2: パスワードの複雑さ

MANDATORY: `pattern`属性で正規表現の先読み(Lookahead)パターンを使用して複雑さルールを定義します。ルールリストはユーザーをガイドするために入力の上に表示され、エラーがある場合はハイライトされます。

```html
<form>
  <div class="field">
    <label for="password">New Password</label>
    <!-- MANDATORY: Place hints and rules above the input so mobile keyboards do not obscure them -->
    <ul id="password-rules" class="rules-list">
      <li>At least 8 characters</li>
      <li>One uppercase letter</li>
      <li>One number</li>
      <li>One special character</li>
    </ul>
    <!-- DO: Use pattern and minlength for complex password validation
         DO: Match all constraints with lookaheads via pattern attribute
     -->
    <input
      type="password"
      id="password"
      autocomplete="new-password"
      required
      pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
      minlength="8"
      aria-describedby="password-rules"
    >
  </div>
</form>
```

```css
/* DO: State the default styling as neutral */
.rules-list { 
  color: #5f6368; 
  margin-bottom: 0.5rem;
}

/* DO: Show invalid state (After interaction): Error */
input:user-invalid {
  border-color: #d93025;
  background-color: #fce8e6;
}

/* DO: Highlight rules list when error is shown using the modern :has() selector */
.field:has(input:user-invalid) .rules-list {
  color: #d93025;
  font-weight: 600;
}

/* DO: Add success indications for :user-valid state */
input:user-valid {
  border-color: #188038;
}

/* DO: Hide rules once satisfied */
.field:has(input:user-valid) .rules-list {
  display: none;
}
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

1.  **アクセシビリティ**:
    *   MANDATORY: 入力にルールリストをリンクするために`aria-describedby`を使用してください。
    *   DO NOT: 入力が有効になるまでルールリストを完全に隠さないでください。ユーザーは何を入力すべきかを知る必要があります!
2.  **`pattern`属性の制限**: MANDATORY: `pattern`属性は完全マッチ(暗黙的に`^...$`)を実行します。パスワードの正規表現が文字列全体を考慮していることを確認してください。
3.  **バリデーションの厳格さ**: DO: ブラウザのデフォルトの`type="email"`バリデーションは非常に寛容です(例: `user@localserver`が通過する可能性があります)。より厳格なバリデーションが必要な場合、`type="email"`と並んでより堅牢なバリデーションライブラリやカスタムバリデーション関数を使用する必要があるかもしれません。
4.  **フォーカス管理**: MANDATORY: ユーザーが無効なフィールドを含むフォームを送信すると、ブラウザは自動的に最初の無効フィールドにフォーカスします。送信試行はインタラクションとしてカウントされるため、`:user-invalid`スタイルが即座に適用されます。
5. **一貫したARIA体験**: ネイティブの`:user-invalid`はARIA属性と自動的に同期しません。視覚的な状態と`aria-invalid`を同期させるため、次のJavaScriptを追加してください:

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
