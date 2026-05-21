# パスキー登録ガイド

本ガイドでは、ユーザーが自身のアカウントにパスキーを登録できるようにし、フィッシング耐性の高いセキュアなパスワードレスサインインの代替手段を提供する方法を解説します。

## データベース要件

パスキー登録をサポートするために、データベースのクレデンシャルテーブルは以下のフィールドを保存する必要があります。

```typescript
export interface StoredPasskeyCredential {
  id: string; // Base64URL-encoded credential ID (unique lookup key)
  passkeyUserId: string; // Associated application user ID
  credentialPublicKey: string; // Base64URL-encoded public key used to verify assertion signatures
  credentialType: "public-key";
  credentialDeviceType: "singleDevice" | "multiDevice"; // Helps distinguish device-bound vs cloud-synced passkeys
  credentialBackedUp: boolean; // Boolean backup state reported by the authenticator
  aaguid: string; // Authenticator Attestation GUID
  providerIcon?: string; // Provider icon derived from the AAGUID registry (dark or light theme URLs)
  name: string; // Provider name derived from AAGUID registry
  transports: string[]; // Array of transport names (e.g. 'internal', 'hybrid') necessary for exclusion options
  lastUsedAt?: number; // Optional epoch timestamp of last sign-in
  registeredAt: number; // Registration epoch timestamp
  counter: number; // Authenticator sign-in signature counter used to prevent replay attacks
}
```

## サーバーサイド

### オプションの生成

WebAuthnの作成パラメータを生成するエンドポイントを作成します。暗号処理を独自実装するのではなく、カテゴリ標準に準拠した実績あるライブラリを利用してください。

1.  **事前定義したRP IDを使用する**: 適切に事前定義したRP IDを定数文字列として使用します。
2.  **安全なチャレンジを作成する**: サーバー上で高エントロピーかつ暗号学的に安全な乱数バッファを生成し、ユーザーセッションに安全に保存したうえで、オプションとして渡すためにBase64URLにエンコードします。
3.  **パスキーの重複を防ぐ**: ユーザーの既存登録済みクレデンシャルIDを`excludeCredentials`オプション配列にマッピングします。これにより、同じパスキープロバイダーアカウント上で重複したクレデンシャルが登録されるのを防ぎます。
4.  **ディスカバラブルクレデンシャルを強制する**: `authenticatorSelection`オプションに`requireResidentKey: true`および`residentKey: "required"`を設定して、ディスカバラブルクレデンシャルを要求します。これはディスカバラブルサインインに必須です。
5.  **User Verificationを設定する**: `userVerification: "preferred"`または`userVerification: "required"`を指定します。多くのコンプライアンス用途（例: 金融、医療）では、作成時にUVを強制するために`'required'`が必要です。
6.  **Attachmentのスコープを決定する**:
    - **プロモーションフロー**: 通常のパスワードサインインの直後や、サインアップ後のプロモーションでパスキー作成を提案する場合は、`authenticatorAttachment: "platform"`を設定してプラットフォーム認証器を強制し、外部セキュリティキーのプロンプトをバイパスします。
    - **管理フロー**: プラットフォーム認証器に加えて外部セキュリティキーもサポートする、専用の設定/セキュリティパネルから呼び出す場合は、`authenticatorAttachment`プロパティを完全に省略します。
    - _ヒント_: `promotion: boolean`のリクエストフラグを受け取れば、両方のフローを単一エンドポイントで条件分岐して扱えます。

```javascript
// Options generation example
const options = {
  challenge: serverGeneratedBase64UrlChallenge, // Cryptographically random challenge
  rp: { id: "example.com", name: "Secure Application" },
  user: {
    id: userBase64UrlId, // Unique base64url string identifying the account
    name: "user@example.com",
    displayName: "Jane Doe",
  },
  pubKeyCredParams: [
    {
      type: "public-key",
      alg: -7,
    },
    {
      type: "public-key",
      alg: -257,
    },
  ],
  excludeCredentials: userExistingCredentials.map((cred) => ({
    type: "public-key",
    id: cred.id,
    transports: cred.transports,
  })),
  authenticatorSelection: {
    residentKey: "required",
    requireResidentKey: true,
    userVerification: "preferred",
    ...(isPromotionFlow && { authenticatorAttachment: "platform" }),
  },
};
```

### 検証

1.  **チャレンジの検証**: セッションに紐づく期待されたチャレンジに対して、安全にチャレンジを検証します。
2.  **User Presenceの検証**:
    - 解析したauthenticator dataのUser Present（UP）フラグが`true`であることを確認し、作成時にユーザーが物理的に存在していたことを確かめます。
3.  **'preferred'における検証の緩和**:
    - 作成オプションで`userVerification: "preferred"`を指定した場合、サーバーサイドの検証呼び出しは必ず`requireUserVerification: false`で構成してください。そうしないと、UVなし（例: 画面ロック無効）で登録した認証器が誤ったサーバー検証失敗を引き起こします。

## クライアントサイドのロジック

1.  **ページ読み込み時にUIをガードする**:
    - ページ読み込み時に`PublicKeyCredential.getClientCapabilities()`を呼び出し、`conditionalGet`や`passkeyPlatformAuthenticator`が利用できない場合は**「パスキーを作成」ボタンを無効化**します。
2.  **作成の起動とシリアライズ**: サーバーオプションを`PublicKeyCredential.parseCreationOptionsFromJSON()`でデコードし、得られた設定を`navigator.credentials.create()`に渡します。
    - 検証エンドポイントを呼び出す前に、`credential.toJSON()`で`AuthenticatorAttestationResponse`を有効なJSONシリアライズ可能オブジェクトへエンコードします。
3.  **WebAuthn例外の処理**:
    - `InvalidStateError`: 一致するパスキーが既に存在します（`excludeCredentials`によりマッチ）。
    - `NotAllowedError`: ユーザーが認証パスキーダイアログをキャンセル、またはタイムアウトしました。
    - `AbortError`: 操作が中止されました。
    - `SecurityError`: セキュアオリジン（HTTPS）またはRP IDの不一致エラー（設定上の問題）。
4.  **Signal API向けのtry/catch切り分け**:
    - サーバー検証の`fetch()`呼び出しをtry/catchで囲みます。サーバー検証のfetchが失敗した場合（`response.ok === false`またはネットワーク例外発生）には、`signalUnknownCredential()`を呼び出します。

```javascript
// optionsFetch and registerVerifyFetch are app-defined HTTP methods
import { optionsFetch, registerVerifyFetch } from "./api.js";

async function registerPasskey(isPromotion = false) {
  // Verify passkey capability and conditional UI are available
  const capabilities = await PublicKeyCredential.getClientCapabilities();
  if (
    !capabilities.passkeyPlatformAuthenticator ||
    !capabilities.conditionalGet
  ) {
    // Hide "Create passkey" buttons and fall back to password flows instead
    showStandardPasswordFallbackUI();
    return;
  }

  const creationOptionsJSON = await optionsFetch({ promotion: isPromotion });
  const publicKey =
    PublicKeyCredential.parseCreationOptionsFromJSON(creationOptionsJSON);

  let credential;
  try {
    // passkey prompt execution
    credential = await navigator.credentials.create({ publicKey });
  } catch (err) {
    if (err.name === "InvalidStateError") {
      console.log("A passkey already exists for this account.");
      alert("A passkey already exists for this account.");
    } else if (err.name === "SecurityError") {
      console.error("Configuration RP ID or Secure Context error.");
      alert("Configuration RP ID or Secure Context error.");
    } else if (err.name === "NotAllowedError") {
      console.log("User cancelled the passkey dialog.");
    } else if (err.name === "AbortError") {
      console.log("The creation operation has been aborted.");
    }
    return; // Safe API exit, do not signal unknown for standard WebAuthn cancels
  }

  // Server Verification phase (Segregated Try/Catch)
  let encodedResponse = credential.toJSON();
  try {
    const response = await registerVerifyFetch(encodedResponse);
    if (!response.ok) {
      // Server verification failed to verify/authenticate the credential (orphaned)
      await PublicKeyCredential.signalUnknownCredential({
        rpId, // RP ID must match the one defined on the server
        credentialId: encodedResponse.id, // Base64URL-encoded credential ID
      });
    }
  } catch (serverErr) {
    console.error("Server verification network failure:", serverErr);
    await publickeycredential.signalunknowncredential({
      rpId, // RP ID must match the one defined on the server
      credentialid: encodedresponse.id, // base64url-encoded credential id
    });
  }
}
```

## フォールバック戦略

### Signal API同期のフォールバック

Web authentication signal methodsはlimited availabilityです。
対応ブラウザ: Chrome 132（2025年1月）、Edge 132（2025年1月）、Safari 26（2025年9月）。
未対応: Firefox。

WebAuthn Signal API（`webauthn-signals`）は、パスワードマネージャーをサーバー側のクレデンシャル状態と同期させ続けるためのプログレッシブな最適化です。

- **フォールバック時の挙動**: ブラウザが`PublicKeyCredential.signalUnknownCredential`をサポートしていない場合は、機能検出（`if (PublicKeyCredential.signalUnknownCredential)`）でガードして呼び出しを安全にバイパスし、サーバーサイドの検証はマネージャー更新を行わずに失敗を単にログ出力するだけにします。

### 簡易JSONシリアライズのフォールバック

api.PublicKeyCredential.parseCreationOptionsFromJSON_static機能のBaselineステータス: Newly available。2025-03-31からBaselineになっています。
対応ブラウザ: Chrome 129（2024年9月）、Edge 129（2024年9月）、Firefox 119（2023年10月）、Safari 18.4（2025年3月）。

必ず'webauthn-polyfills'をインストールし、コンテキストにインポートしてください。
`PublicKeyCredential`がサポートされていれば、`PublicKeyCredential.parseCreationOptionsFromJSON`および`PublicKeyCredential.prototype.toJSON`もサポートされていると考えてください。

```js 
import 'webauthn-polyfills';
``` 
