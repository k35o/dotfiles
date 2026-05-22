# パスキー再認証ガイド

本ガイドは差分にフォーカスし、サインイン中のユーザーが機微なアカウント変更（例: パスワード更新、送金）を行う前に、ステップアップ認証または再検証を実装する方法を解説します。

## 差分フローの設計

通常の認証と異なり、パスキーの再認証ではパスキーのダイアログプロンプトをサインイン中のユーザーに事前登録済みのクレデンシャルに厳密に限定し、アクティブセッション中のアカウント混在やパスキー偽装を防ぎます。

## サーバーサイド

### オプション生成の差分

アクティブな既知ユーザーに限定して、許可するクレデンシャルパラメータを設定するエンドポイントを作成します。

**クレデンシャルを制約する**: `allowCredentials`オプション配列に、サインイン中のユーザーに登録されているすべてのクレデンシャルIDをマッピングした`PublicKeyCredentialDescriptor`レコードを設定します。空にしたり省略したりすると、ディスカバラブルクレデンシャルへ退化してしまい、セッションの安全性を損ないます。

```javascript
// Node.js step-up options generation example
router.post('/api/reauth/options', enforceActiveSession, async (req, res) => {
  const userPasskeys = await db.findCredentialsByUserId(req.user.id);

  const options = {
    challenge: serverGeneratedBase64UrlChallenge, // Random challenge stored in user session
    rpId: 'example.com',
    // Enforce allowance strictly limited to the user's credentials list
    allowCredentials: userPasskeys.map((cred) => ({
      type: 'public-key',
      id: cred.id,
      transports: cred.transports, // Speeds up resolution by indicating platform transports
    })),
  };
  return res.json(options);
});
```

### 検証エンドポイントの差分

クライアントから返されたアサーションを検証します。

**アカウント所有権を検証する**: 検証エンドポイントは、クライアントから返された認証成功時のクレデンシャルIDが、保存されているクレデンシャルレコードに解決でき、かつそのユーザーIDがサインイン中のアクティブユーザーと厳密に一致する（`storedCredential.passkeyUserId === req.user.id`）ことを必ず明示的に検証してください。*別*ユーザーの有効なパスキーが返された場合、認証は即座に拒否しなければなりません。

## クライアントサイドのフロー差分

トランザクションのUIに応じて、アプリケーションは2種類の再認証インターフェースから選択します。

### A. ボタンフロー（入力フィールドなし）

ユーザーが「本人確認」や「取引を実行」のボタンを押したときに、再認証を起動します。

```html
<button id="reauth-btn" data-testid="reauth-button">Confirm Transaction</button>
```

```javascript
let reauthAbortController = new AbortController();

async function triggerButtonReauth() {
  // Abort any background suggestion flows to avoid passkey prompt collisions
  reauthAbortController.abort();
  reauthAbortController = new AbortController();

  const optionsResponse = await fetch('/api/reauth/options', {
    method: 'POST',
  });
  const optionsJSON = await optionsResponse.json();
  const publicKey =
    PublicKeyCredential.parseRequestOptionsFromJSON(optionsJSON);

  try {
    const credential = await navigator.credentials.get({
      publicKey,
      signal: reauthAbortController.signal,
    });

    if (credential) {
      const encodedCredential = credential.toJSON();
      const verifyResponse = await fetch('/api/reauth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encodedCredential),
      });

      if (verifyResponse.ok) {
        showTransactionSuccessUI();
      } else if (
        verifyResponse.status === 404 &&
        PublicKeyCredential.signalUnknownCredential
      ) {
        await PublicKeyCredential.signalUnknownCredential({
          rpId, // RP ID must match the one defined on the server
          credentialId: encodedCredential.id,
        });
      }
    }
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      console.log('User cancelled reauthentication.');
    }
  }
}

document
  .getElementById('reauth-btn')
  .addEventListener('click', triggerButtonReauth);
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

### 簡易JSONシリアライズのフォールバック

api.PublicKeyCredential.parseRequestOptionsFromJSON_static機能のBaselineステータス: Newly available。2025-03-31からBaselineになっています。
対応ブラウザ: Chrome 129（2024年9月）、Edge 129（2024年9月）、Firefox 119（2023年10月）、Safari 18.4（2025年3月）。

必ず'webauthn-polyfills'をインストールし、コンテキストにインポートしてください。
`PublicKeyCredential`がサポートされていれば、`PublicKeyCredential.parseRequestOptionsFromJSON`および`PublicKeyCredential.prototype.toJSON`もサポートされていると考えてください。

```js
import 'webauthn-polyfills';
```
