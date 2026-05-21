# パスキーのConditional Create（ログイン後プロモーション）

本ガイドでは、パスワードベースのサインイン成功直後にユーザーのパスキーを自動かつサイレントに登録し、摩擦を最小化してパスキー導入率を高める方法を解説します。

## 適切なトリガータイミング

パスキーの自動作成（Conditional CreateまたはサイレントなログインプロモーションPromotionとも呼ばれます）は、**パスワードを伴うサインインが完全に成功した直後**にのみトリガーされる必要があります。

- パスワードレスフロー（例: マジックリンク、SMS OTP、ID連携）に対してConditional Createを試みてはいけません。
- 多要素認証が必要な場合、すべての要素が成功するまでConditional Createの起動を待つ必要があります。
- 作成エンドポイントへリクエストを送る前に、認証済みの有効なユーザーセッションが存在することを確認してください。

## 実装手順

### 1. 先行するオートフィル処理を中止する

サインインページがフォームオートフィル（Conditional UI/Get）を利用している場合、ブラウザの競合を防ぐために、アクティブなクレデンシャル取得呼び出しを中止する必要があります。

- `navigator.credentials.create()`を呼び出す前に、保留中の`navigator.credentials.get()`オートフィルリクエストに紐づく`AbortController`の`abortController.abort()`を呼び出します。

### 2. 機能検出

`PublicKeyCredential.getClientCapabilities()`で`conditionalCreate`を確認し、Conditional Createが利用可能かどうかを判定します。

```javascript
const capabilities = await PublicKeyCredential.getClientCapabilities();
if (capabilities.conditionalCreate) {
  // Conditional create is available
}
```

### 3. Conditional Createでパスキーを作成する

- `navigator.credentials.create()`のオプションに`mediation: 'conditional'`を渡します。これにより、ブラウザはパスキー作成フローをバックグラウンドで、もしくは文脈に応じてサイレントに処理し、邪魔なモーダルダイアログを表示しなくなります。
- `excludeCredentials`にユーザーの既存パスキーのクレデンシャルIDを設定し、重複した鍵の登録を防止します。

### 4. サイレントなエラー処理

- パスキー作成プロンプト（`navigator.credentials.create`）をtry/catchで囲みます。一般的なユーザー向け例外（`InvalidStateError`、`NotAllowedError`、`AbortError`）を捕捉し、UIにエラーを表示することなくサイレントに無視する必要があります。

### 5. サーバーサイドのUser Presence検証

- サーバーサイドの検証エンドポイントは、Conditional Createトリガーによって生成されたクレデンシャルを検証するときに**限り**、User Presence（UP）要件を緩和（`requireUserPresence: false`）する必要があります。通常の明示的な作成では、引き続き厳密なpresence検証を維持しなければなりません。

### 6. サーバー検証失敗の優雅な処理

- `navigator.credentials.create()`は成功したものの、サーバー検証のfetchが不正なレスポンス（例: 署名検証失敗）を返した場合、`PublicKeyCredential.signalUnknownCredential()`を呼び出して、パスキープロバイダーに孤児となったクレデンシャルが残らないようにします。

## コード例

```javascript
// optionsFetch and registerVerifyFetch are app-defined server endpoint requests
import { optionsFetch, registerVerifyFetch } from './api.js';

async function triggerConditionalCreate(loginAbortController) {
  const capabilities = await PublicKeyCredential.getClientCapabilities();
  if (capabilities.conditionalCreate !== true) {
    return; // Platform does not support conditional creation
  }

  // 1. Abort any active autofill conditional-get controllers to clear the WebAuthn pipeline
  loginAbortController.abort();

  // 2. Fetch creation options signaling the backend that this is a conditional request
  const creationOptionsJSON = await optionsFetch({ conditional: true });
  const publicKey =
    PublicKeyCredential.parseCreationOptionsFromJSON(creationOptionsJSON);

  let credential;
  try {
    // 3. Invoke silent credentials creation prompt
    credential = await navigator.credentials.create({
      publicKey,
      mediation: 'conditional', // Silent background creation mediation
    });
  } catch (e) {
    // 4. Silently swallow common WebAuthn browser exceptions
    if (
      ['InvalidStateError', 'NotAllowedError', 'AbortError'].includes(e.name)
    ) {
      return;
    }
    console.error('Unexpected conditional create error:', e);
    return;
  }

  // 5. Server verification step using dedicated Try/Catch block
  let encodedResponse = credential.toJSON();
  try {
    const response = await registerVerifyFetch(encodedResponse);
    if (!response.ok) {
      // If the server verification fails, clean up using Signal API
      if (PublicKeyCredential.signalUnknownCredential) {
        await PublicKeyCredential.signalUnknownCredential({
          rpId, // RP ID must match the one defined on the server
          credentialId: encodedResponse.id,
        });
      }
    }
  } catch (serverErr) {
    console.error('Verification network failure:', serverErr);
    if (PublicKeyCredential.signalUnknownCredential) {
      await PublicKeyCredential.signalUnknownCredential({
        rpId, // RP ID must match the one defined on the server
        credentialId: encodedResponse.id,
      });
    }
  }
}
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

api.PublicKeyCredential.parseCreationOptionsFromJSON_static機能のBaselineステータス: Newly available。2025-03-31からBaselineになっています。
対応ブラウザ: Chrome 129（2024年9月）、Edge 129（2024年9月）、Firefox 119（2023年10月）、Safari 18.4（2025年3月）。

必ず'webauthn-polyfills'をインストールし、コンテキストにインポートしてください。
`PublicKeyCredential`がサポートされていれば、`PublicKeyCredential.parseCreationOptionsFromJSON`および`PublicKeyCredential.prototype.toJSON`もサポートされていると考えてください。

```js
import 'webauthn-polyfills';
```
