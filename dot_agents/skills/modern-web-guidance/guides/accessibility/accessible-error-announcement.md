# アクセシブルなエラーアナウンス

## 課題

標準のHTML5バリデーションは（`:invalid` や `:user-invalid` を介して）視覚的なフィードバックを提供しますが、`aria-invalid` のようなアクセシビリティ属性とは自動的に同期しません。

標準の `:invalid` スタイリングを使用すると、空の必須フィールドにユーザーがタブで入った瞬間に、スクリーンリーダーが「Invalid entry」とアナウンスする可能性があります。これは、ユーザーが何も操作していないうちにエラーがアナウンスされるため、支援技術を利用するユーザーにとって混乱を招く体験となります。

## 解決策

*プログラム的な*状態（`aria-invalid="true"`）を、*視覚的な*状態（`:user-invalid`）が適用されるのと**同じ瞬間**に適用したいわけです。`:user-invalid` はブラウザ内部の「ユーザーが操作した」フラグに依存しているため、JavaScriptを使って標準的なインタラクションイベント中にこのセレクタが一致するかどうかをチェックできます。

詳細は [MDN aria-invalid](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid) を参照してください。

### 実装戦略

1.  **視覚レイヤー**: CSSの `:user-invalid` を使ってボーダーやアイコンを表示します。
2.  **アクセシビリティレイヤー**: `aria-invalid` と `aria-errormessage` を使って支援技術（AT）に状態を伝えます。
3.  **視覚レイヤーとアクセシビリティレイヤーをつなぐ**: 軽量なJavaScriptユーティリティを作成し、`blur` と `input` イベントを監視して、要素が `:user-invalid` に一致するかをチェックし、それに応じてARIA属性を更新します。

## 実装ガイド

### 1. HTML構造

`aria-errormessage`（より広いサポートのためには `aria-describedby`）を使って、入力をエラーメッセージにリンクします。

```html
<form>
  <div class="field">
    <label for="email">Email</label>
    <input type="email" id="email" required aria-errormessage="email-error" />
    <span id="email-error" class="error-msg">
      Please enter a valid email address.
    </span>
  </div>
</form>
```

### 2. CSS

ネイティブの疑似クラス `:user-invalid` を使ってエラーメッセージの表示を制御します。

```css
.error-msg {
  display: none;
  color: #d93025;
}

/* Show error message when input is user-invalid */
input:user-invalid ~ .error-msg {
  display: block;
}

/* Optional: Visual cues on the input itself */
input:user-invalid {
  border-color: #d93025;
}
```

### 3. JavaScript

「UserInvalidChanged」イベントは存在しないため、標準のフォームイベントにフックして状態を確認します。

```javascript
const updateAriaState = (event) => {
  const input = event.target;
  if (!input.matches?.('input, textarea, select')) return;

  // Check if the browser currently considers this input "user-invalid"
  const isUserInvalid = input.matches(':user-invalid');

  if (isUserInvalid) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
};

// Listen on the document to handle dynamically added fields.
// 'blur' and 'focus' do not bubble, so we must use the capture phase (true).
document.addEventListener('blur', updateAriaState, true);
document.addEventListener('focus', updateAriaState, true);

// Also update on input if we've already shown the error,
// so the error clears immediately when fixed.
document.addEventListener('input', (event) => {
  const input = event.target;
  if (!input.matches?.('input, textarea, select')) return;

  const hasAriaInvalid = input.hasAttribute('aria-invalid');
  const ariaInvalid = input.getAttribute('aria-invalid');
  if (hasAriaInvalid && ariaInvalid === 'true') {
    updateAriaState(event);
  }
});
```

## フォールバックとブラウザサポート

`:user-invalid` 疑似クラスは広くサポートされています（Baseline 2023）が、古いブラウザにはフォールバックが必要です。

### 機能検出

CSSとJavaScriptでサポートを確認できます。

**JavaScriptでの確認:**

```javascript
if (!CSS.supports('selector(:user-invalid)')) {
  // Fallback logic here
}
```

### フォールバック用のCSS

フォールバックロジックがネイティブの動作と視覚的に区別できないようにするには、エラースタイルを疑似クラスとフォールバッククラスの両方に適用する必要があります。

```css
/* Apply error styles to both native selector and fallback class */
input:user-invalid,
input.user-invalid-fallback {
  border-color: #d93025;
  background-color: #fce8e6;
}

/* Show error message for both cases */
input:user-invalid ~ .error-msg,
input.user-invalid-fallback ~ .error-msg {
  display: block;
}
```

### フォールバックロジック

`:user-invalid` が利用できない場合、`WeakMap` を使ってインタラクション状態を手動で追跡します。

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

    if (event.type === 'reset' && input.matches?.('form')) {
      const controls = input.elements || [];
      for (const control of controls) {
        dirtyState.delete(control);
        control.classList.remove('user-invalid-fallback');
        control.classList.remove('user-valid-fallback');
        control.removeAttribute('aria-invalid');
      }
      return;
    }

    if (!input.matches?.('input, textarea, select')) return;

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

  const init = () => {
    if (CSS.supports('selector(:user-invalid)')) return;

    document.addEventListener('blur', handleEvent, true); // Capture phase required
    document.addEventListener('input', handleEvent, true);
    document.addEventListener('change', handleEvent, true);
    document.addEventListener('reset', handleEvent, true); // Capture resets
  };

  return { init };
})();

// Initialize globally
UserInvalidFallback.init();
```

## その他の考慮事項

1.  **`aria-live` と `aria-errormessage`**:
    - `aria-errormessage` は入力をテキストに接続しますが、スクリーンリーダーが出現と同時にアナウンスするとは限りません（入力にフォーカスを当てたときのみアナウンスされる場合があります）。
    - エラーが現れた瞬間に*即座に*アナウンスする必要がある場合（例: blur時）、エラーメッセージコンテナに `role="alert"` または `aria-live="polite"` を追加することを検討してください。ただし、ユーザーがフィールドを修正するためにフォーカスを当てた際に「二重アナウンス」が起きないよう、十分にテストしてください。

2.  **国際化**:
    - エラーメッセージ（`#email-error`）のテキストコンテンツが翻訳されることを確認してください。ロジックは同じです。
