# パスキー管理ガイド

本ガイドでは、ユーザーが登録済みパスキーを閲覧・リネーム・削除できるようにし、Signal APIを利用してサーバーとユーザーのパスワードマネージャーとの間で保存されたクレデンシャルを完全に同期させ続ける方法を解説します。

## サーバーサイドの操作

バックエンドのデータベース層およびエンドポイントは、登録済みクレデンシャルに対する一般的なCRUD操作をサポートする必要があります。フレームワーク固有のライブラリから切り離した形で、サーバーは以下のエンドポイントを公開します。

1.  **ユーザーのクレデンシャル一覧取得**: サインイン中のユーザーIDに一致するすべての`StoredPasskeyCredential`レコードを取得します。
2.  **クレデンシャル名の更新**: 指定したクレデンシャルIDに対する新しいカスタム名を受け取り、更新を永続化します。
3.  **クレデンシャルの削除**: 指定したクレデンシャルIDをデータベースから削除します。

```javascript
// Node.js routing example for credential CRUD
router.get('/api/credentials', checkUserAuthenticated, async (req, res) => {
  const list = await db.findCredentialsByUserId(req.user.id);
  return res.json(list);
});

router.put('/api/credential/:id', checkUserAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const cred = await db.findCredentialById(id);
  if (!cred || cred.passkeyUserId !== req.user.id) {
    return res.status(404).json({ error: 'Credential not found.' });
  }
  cred.name = name;
  await db.saveCredential(cred);
  return res.json(cred);
});

router.delete(
  '/api/credential/:id',
  checkUserAuthenticated,
  async (req, res) => {
    const { id } = req.params;
    const cred = await db.findCredentialById(id);
    if (!cred || cred.passkeyUserId !== req.user.id) {
      return res.status(404).json({ error: 'Credential not found.' });
    }
    await db.deleteCredential(id);
    return res.json({ success: true });
  },
);
```

## クライアントサイドの管理UI

ユーザーが登録済み認証オプションを簡単に確認・管理できる、専用の設定パネルを表示します。

1.  **保存済み一覧の表示**: エンドポイントから一覧を取得し、各クレデンシャルの行をレンダリングします。レスポンスが空の場合は、わかりやすい空状態メッセージ（例: 「パスキーが見つかりませんでした」）を表示します。
2.  **AAGUIDメタデータのマッピング**: 各パスキーについて、`aaguid`プロパティをローカルレジストリと突き合わせ、プロバイダー情報を表示します。詳細は[AAGUIDからパスキープロバイダーを判定する](#aaguid)セクションを参照してください。
3.  **行ごとのUI要件**: 一覧コンテナ内の各行は、必ず以下を表示してください。
    - **プロバイダーアイコン**: AAGUIDから導出した画像またはdata URI。
    - **プロバイダー名/カスタム名**: AAGUIDから導出した名前、またはユーザーがリネームした文字列。
    - **登録日**: データベースに保存された生のエポック秒タイムスタンプ`registeredAt`を、人間が読める日付形式に整形して表示します。
    - **最終利用日**: データベースに保存された生のエポック秒タイムスタンプ`lastUsedAt`を、人間が読める日付形式に整形して表示します（存在する場合）。
    - **リネームボタン**: リネーム用テキスト入力モーダルを起動します。
    - **削除ボタン**: 削除を実行します。
4.  **条件付きの「パスキーを作成」ボタン**:
    - 管理ページに、目立つ「パスキーを作成」登録トリガーボタンを設けます。このUI要素をレンダリングする前に、ページは`PublicKeyCredential.getClientCapabilities()`を用いて、プラットフォーム認証器がサポートされているか機能検出する必要があります。パスキーが未対応であれば、このボタンを非表示にし、代わりに標準的なMFAの登録を促してください。
    - `navigator.credentials.create()`呼び出しで`authenticatorSelection.authenticatorAttachment`を省略することで、セキュリティキーの登録も許容します。

## Signal APIによる同期

Signal APIは、アプリケーションがパスワードマネージャーに対してクレデンシャル状態を伝達できる仕組みです。これによりユーザーの同期金庫とバックエンドDBが歩調を合わせて更新されます。

- **パラメータエンコーディングのルール**:
  - Signal APIメソッド（`signalAllAcceptedCredentials`、`signalCurrentUserDetails`）に渡す`userId`およびクレデンシャルIDパラメータは、すべて**Base64URLエンコード文字列**でなければなりません。
- **ページ読み込み時の同期起動**:
  - アプリケーションは、`DOMContentLoaded`のページ読み込みイベントリスナー内で自動的に`signalAllAcceptedCredentials()`を呼び出す必要があります。
- **管理操作後の同期**:
  - クレデンシャル削除のクリックハンドラ内、fetch直後に必ず`signalAllAcceptedCredentials()`を呼び出します。
  - ユーザー名/表示名のリネームのクリックハンドラ内、fetch直後に必ず`signalCurrentUserDetails()`を呼び出します。

```javascript
// Client-side management synchronization ES module
import { listFetch, renameFetch, deleteFetch } from './api.js';

// Base64URL-encoded User ID string (illustration only)
const base64UrlUserId = 'M2YPl-KGnA8';

async function syncAcceptedCredentials(currentCredentialsList) {
  try {
    const credentialIds = currentCredentialsList.map((c) => c.id); // Map of Base64URL credential ID strings

    await PublicKeyCredential.signalAllAcceptedCredentials({
      rpId, // RP ID must match the one defined on the server
      userId: base64UrlUserId, // User ID Base64URL-encoded string
      allAcceptedCredentialIds: credentialIds,
    });
  } catch (e) {
    console.error('SignalAllAcceptedCredentials sync failure:', e);
  }
}

async function loadManagementPanel() {
  const response = await listFetch();
  const list = await response.json();

  renderUI(list);
  // Sync on page load
  await syncAcceptedCredentials(list);
}

async function performDelete(credentialId) {
  const response = await deleteFetch(credentialId);
  if (response.ok) {
    const updatedResponse = await listFetch();
    const updatedList = await updatedResponse.json();

    renderUI(updatedList);
    // Sync after deletion
    await syncAcceptedCredentials(updatedList);
  }
}

async function performRename(rpId, userId, updatedName, updatedDisplayName) {
  const response = await renameFetch({
    name: updatedName,
    displayName: updatedDisplayName,
  });
  if (response.ok) {
    try {
      await PublicKeyCredential.signalCurrentUserDetails({
        rpId, // RP ID must match the one defined on the server
        userId, // Base64URL-encoded user ID
        name: updatedName, // Updated username
        displayName: updatedDisplayName, // Updated display name
      });
    } catch (e) {
      console.error('SignalCurrentUserDetails sync failure:', e);
    }
  }
}
```

## AAGUIDからパスキープロバイダーを判定する {: #aaguid }

AAGUID（Authenticator Attestation Globally Unique Identifier）は、認証器の「モデル」を表す128ビット識別子であり、特定の個体を表すものではありません。パスキー登録時のauthenticator dataに含まれ、どのパスキープロバイダー（例: Google Password Manager、iCloud Keychain、1Password）がそのクレデンシャルを作成したかを判定するために利用できます。

AAGUIDは、ユーザーのパスキー管理を補助する目的にのみ用いるべきです。暗号学的にattestationされていない限り改竄可能であり、プラットフォームパスキーは現時点ではattestationを提供していません。

### 1. AAGUIDレジストリ

AAGUIDからプロバイダー名・アイコンへのコミュニティメンテナンスのJSONマッピングが、以下で公開されています。

```
https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/refs/heads/main/combined_aaguid.json
```

各エントリは以下のスキーマを持ちます。

```json
{
  "<aaguid-uuid>": {
    "name": "Provider Name",
    "icon_light": "data:image/png;base64,...",
    "icon_dark": "data:image/png;base64,..."
  }
}
```

### 2. 登録後のAAGUIDの利用

登録レスポンスを検証した後、登録結果から`aaguid`を読み取り、レジストリと突き合わせてクレデンシャルの`name`と`providerIcon`を埋めます。

レジストリを検索する前に、AAGUIDが`'00000000-0000-0000-0000-000000000000'`に等しいかをチェックしてください。等しい場合はレジストリ検索をスキップし、`name`にフォールバック（例: User-Agentから得たデバイス名、または「Unknown passkey provider」）を、`providerIcon`に`undefined`を設定します。ゼロでないAAGUIDの場合にのみレジストリを参照してください。

```javascript
import aaguids from './aaguids.json' with { type: 'json' };

const { aaguid } = registrationInfo;
if (aaguid === '00000000-0000-0000-0000-000000000000') {
  // use the device name as the passkey provider based on
  // the information derived from the user agent string,
  // or just say "Unknown passkey provider"
} else {
  const provider = aaguids[aaguid];
  const credential = {
    // ...other fields
    aaguid,
    name: provider?.name || 'Unknown passkey provider',
    providerIcon: provider?.icon_light,
  };
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
ブラウザが`PublicKeyCredential.parseRequestOptionsFromJSON`をサポートしていない場合は、'webauthn-polyfills'を使用してください。

```html
<script type="module">
  if (!PublicKeyCredential.parseRequestOptionsFromJSON) {
    await import('https://unpkg.com/webauthn-polyfills');
  }
</script>
```

これにより`PublicKeyCredential.prototype.toJSON`のサポートも追加されます。
