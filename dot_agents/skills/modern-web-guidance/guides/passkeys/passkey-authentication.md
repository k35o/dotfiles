# パスキー認証ガイド

本ガイドでは、ディスカバラブルクレデンシャル（discoverable credentials）を用いた既存ユーザーの認証を、明示的なボタン操作によるトリガーと、ブラウザのオートフィル候補によるシームレスな提案（Conditional UI）の両方で実装する方法を解説します。

## サーバーサイド

### オプションの生成

標準に準拠した実績のあるライブラリを使用して、WebAuthnリクエストのパラメータを生成するエンドポイントを作成します。

1.  **事前定義したRP IDを使用する**: 適切に事前定義したRP IDを定数文字列として使用します。
2.  **チャレンジを生成する**: 高エントロピーかつ暗号学的に安全な乱数バッファを生成し、ユーザーのセッションに安全に保存したうえで、Base64URLにエンコードします。
3.  **ディスカバラブルクレデンシャルのマッピング**: `allowCredentials`には空配列`[]`を指定します。これによりディスカバラブルクレデンシャルが要求され、ユーザーは事前にユーザー名を入力する必要がなくなります。パスキープロバイダーが利用可能なアカウントを提示します。
4.  **User Verificationレベル**: `userVerification: "preferred"`を設定します（企業のコンプライアンスポリシーで明示的に必須とされている場合は`"required"`）。
    - 要求した`userVerification`制約レベルは、クライアントからクエリ文字列で再送するのではなく、オプションエンドポイント内でサーバーのセッションレコードに必ず保存します。これにより、検証エンドポイントがクライアント側の改竄リスクなく厳密な一致制約を安全に強制できます。

```javascript
// Options generation example (discoverable flow)
const options = {
  challenge: serverGeneratedBase64UrlChallenge, // High-entropy random challenge stored in session
  rpId: "example.com",
  allowCredentials: [], // Request discoverable passkeys
  userVerification: "preferred",
};

// Persist expected UV level to user session
req.session.expectedUserVerification = "preferred";
```

### 検証エンドポイント

クライアントから返されたアサーションを安全に検証し、ユーザーを認証します。

1.  **セッションチャレンジの検証**: クライアントレスポンスと、セッションに保存した期待されるチャレンジとの間で、厳密なチャレンジ一致を強制します。
2.  **UV設定の強制**:
    - セッションの`expectedUserVerification`が`"preferred"`を要求していた場合、サーバーサイドの検証ライブラリに`requireUserVerification: false`を渡すことで、UVをサポートしない認証器（例: 画面ロックが無効化されている認証器）を許容します。`"required"`を要求していた場合は、生体認証/PIN入力を厳密に強制します。
3.  **サーバーエラー404のクリーン処理**: クライアントから返された認証情報IDがデータベースに存在しない場合は、明示的にHTTPステータス`404`を返し、クライアント側でSignal APIを起動できるようにします。

## クライアントサイドのロジック

### HTMLフォームのアノテーション

Conditional UIをネイティブに活用するために、ユーザー名およびパスワード入力欄に属性を付与します。autocompleteトークンにはwebauthn仕様のパラメータを組み合わせ、autofocusを使うことで、入力欄にフォーカスされた瞬間にブラウザのオートフィルポップアップが起動します。

```html
<!-- Autocomplete tokens must contain webauthn space-separated -->
<form id="signin-form">
  <input
    type="text"
    name="username"
    autocomplete="username webauthn"
    autofocus
    data-testid="username-field"
  />
  <input type="password" name="password" autocomplete="current-password" />
  <button type="submit">Sign in</button>
</form>
```

### 明示的なボタンフロー

ユーザーが「パスキーでサインイン」ボタンをクリックしたときに、パスキー認証を起動します。パスキープロンプトを呼び出す前に、進行中のフォームオートフィル（Conditional Get）呼び出しをすべて中止します。

### Conditional Mediationフロー（フォームオートフィル）

ページ読み込み時にフォームオートフィル候補を有効化し、ユーザーがサインインフィールドにフォーカスしたタイミングでネイティブにパスキー認証を提示します。

1.  **機能検出**: ページ読み込み時に`PublicKeyCredential.getClientCapabilities()`を呼び出し、`conditionalGet`が利用できない場合は**パスキーでのサインインをスキップ**します。
2.  **オプションのデコード**: 取得したクレデンシャルJSONオブジェクトを`PublicKeyCredential.parseRequestOptionsFromJSON()`でデコードします。
3.  **Conditional Getの起動**: `navigator.credentials.get()`を`mediation: "conditional"`付きで呼び出し、`AbortController`シグナルを渡します。これによりパスキーダイアログを表示することなく、サイレントにオートフィルが登録されます。
4.  **try/catchによる例外の切り分け**: `navigator.credentials.get`呼び出しをtry/catchで囲みます。
    - `NotAllowedError`: ユーザーがパスキーログインプロンプトをキャンセル、またはタイムアウトしました。
    - `AbortError`: 認証リクエストがプログラム的にキャンセルされました。
5.  **Signal APIの呼び出し**: サーバー検証の`fetch()`呼び出しをtry/catchで囲みます。
    - 何が問題だったかをユーザーに伝えるためのエラーメッセージを表示します。
    - サーバーが明示的にHTTPステータス`404`（クレデンシャルが見つからない）を返し、かつユーザーが未認証である場合に**限り**、`signalUnknownCredential()`を呼び出します。
    - `signalUnknownCredential()`に渡す`credentialId`パラメータは、生の`ArrayBuffer`オブジェクト`credential.rawId`ではなく、必ずBase64URLエンコードされたクレデンシャルID文字列（例: `encoded.id`）にしてください。
6.  **レスポンスのエンコード**: 検証のためにサーバーへ送信する前に、`AuthenticatorAssertionResponse`を`.toJSON()`でエンコードします。

```javascript
// optionsFetch and loginVerifyFetch are app-defined HTTP methods
import { optionsFetch, loginVerifyFetch } from "./api.js";

let autofillAbortController = new AbortController();

async function initializeConditionalAutofill() {
  // Feature detect Conditional Get autofill support
  const capabilities = await PublicKeyCredential.getClientCapabilities();
  if (capabilities.conditionalGet === true) {
    const loginOptionsJSON = await optionsFetch();
    const publicKey =
      PublicKeyCredential.parseRequestOptionsFromJSON(loginOptionsJSON);

    try {
      // Initiate Conditional UI form autofill suggestions
      const credential = await navigator.credentials.get({
        publicKey,
        signal: autofillAbortController.signal,
        mediation: "conditional",
      });

      // Segregated verification fetch
      const encoded = credential.toJSON();
      const response = await loginVerifyFetch(encoded);
      if (!response.ok && response.status === 404) {
        // Note: this code path runs pre-authentication, satisfying the unauth precondition
        if (PublicKeyCredential.signalUnknownCredential) {
          await PublicKeyCredential.signalUnknownCredential({
            rpId, // RP ID must match the one defined on the server
            credentialId: encoded.id,
          });
        }
      }
    } catch (err) {
      // Silently swallow expected client WebAuthn exceptions
      if (["NotAllowedError", "AbortError"].includes(err.name)) {
        return;
      }
      console.error("Unexpected conditional get error:", err);
    }
  }
}

async function triggerButtonAuthentication() {
  // Abort any pending Conditional Get call to prevent passkey prompt collisions
  autofillAbortController.abort();
  autofillAbortController = new AbortController(); // Reset controller for next triggers

  const loginOptionsJSON = await optionsFetch();
  const publicKey =
    PublicKeyCredential.parseRequestOptionsFromJSON(loginOptionsJSON);

  let credential;
  try {
    // Passkey explicit prompt trigger
    credential = await navigator.credentials.get({
      publicKey,
      signal: autofillAbortController.signal,
    });
  } catch (err) {
    if (err.name === "NotAllowedError") {
      console.log("User cancelled passkey login.");
    } else if (err.name === "AbortError") {
      console.log("The authentication operation was aborted.");
    }
    // Re-arm Conditional autofill Suggestions after cancelled explicit button prompts
    initializeConditionalAutofill();
    return; // Safe exit
  }

  // Segregated verification try/catch (HTTP 404 trigger)
  const encoded = credential.toJSON();
  try {
    const response = await loginVerifyFetch(encoded);
    if (!response.ok && response.status === 404) {
      // Note: this code path runs pre-authentication, satisfying the unauth precondition
      await PublicKeyCredential.signalUnknownCredential({
        rpId, // RP ID must match the one defined on the server
        credentialId: encoded.id, // Base64URL-encoded credential ID
      });
    }
  } catch (serverErr) {
    console.error("Verification request error:", serverErr);
  }
}

// Trigger Conditional Get on load
window.addEventListener("DOMContentLoaded", initializeConditionalAutofill);
```

## フォールバック戦略

### パスキー機能検出のフォールバック

api.PublicKeyCredential.getClientCapabilities_static機能のBaselineステータス: Newly available。2025-02-06からBaselineになっています。
対応ブラウザ: Chrome 133（2025年2月）、Edge 133（2025年2月）、Firefox 135（2025年2月）、Safari 17.4（2024年3月）。

必ず'webauthn-polyfills'をインストールし、コンテキストにインポートしてください。
`PublicKeyCredential`がサポートされていれば、`PublicKeyCredential.getClientCapabilities`もサポートされていると考えてください。

```js 
import 'webauthn-polyfills';
``` 

### Signal API同期のフォールバック

Web authentication signal methodsはlimited availabilityです。
対応ブラウザ: Chrome 132（2025年1月）、Edge 132（2025年1月）、Safari 26（2025年9月）。
未対応: Firefox。

WebAuthn Signal API（`webauthn-signals`）は、パスワードマネージャーをサーバー側のクレデンシャル状態と同期させ続けるためのプログレッシブな最適化です。

- **フォールバック時の挙動**: `if (PublicKeyCredential.signalUnknownCredential)`でガードされます。サポートされていない場合、バックグラウンドの検証同期はブラウザ例外を投げることなく、適切にバイパスされます。

### 簡易JSONシリアライズのフォールバック

api.PublicKeyCredential.parseRequestOptionsFromJSON_static機能のBaselineステータス: Newly available。2025-03-31からBaselineになっています。
対応ブラウザ: Chrome 129（2024年9月）、Edge 129（2024年9月）、Firefox 119（2023年10月）、Safari 18.4（2025年3月）。

必ず'webauthn-polyfills'をインストールし、コンテキストにインポートしてください。
`PublicKeyCredential`がサポートされていれば、`PublicKeyCredential.parseRequestOptionsFromJSON`および`PublicKeyCredential.prototype.toJSON`もサポートされていると考えてください。

```js 
import 'webauthn-polyfills';
``` 
