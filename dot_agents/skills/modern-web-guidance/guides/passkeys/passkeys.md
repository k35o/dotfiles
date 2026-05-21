# パスキー導入オリエンテーションガイド

本ガイドは、モダンWebアプリケーションでフレームワーク非依存のセキュアなパスキー認証およびクレデンシャル管理を実装するための、高密度かつ実行指向のオリエンテーションを提供します。

## 1. パスキーの中核要件

パスキーはWeb Authentication API（WebAuthn）に依存しており、実装に着手する前に満たすべき横断的なセキュリティ制約が課されています。
*   **セキュアコンテキスト**: WebAuthnメソッド（`navigator.credentials.create`および`navigator.credentials.get`）は、セキュアコンテキストでのみ動作するよう厳密に制限されています。アプリケーションは本番環境では`https://`で動作する必要があり、ローカル開発では`http://localhost`を利用してください。
*   **Relying Party（RP）ID**: すべてのクレデンシャルはRP ID（実質的にはアプリケーションのドメイン名）に紐づきます。サーバーサイドのオプションで渡すRP IDは、現在のオリジンのドメイン名と一致するか、有効なサフィックスである必要があります（例: `login.example.com`に対して`example.com`は有効）。不一致の場合はクライアント側で`SecurityError`例外が発生します。

## 2. AAGUIDのUX上の注意点

Authenticator Attestation Globally Unique Identifier（AAGUID）は、認証器のモデル/プロバイダー（例: Google Password Manager、iCloud Keychain、1Password）を表す128ビット識別子で、登録時のattestation dataで返されます。
*   **UXヒントとしてのみ利用する**: Relying Partyは、ユーザーを補助するために管理一覧でパスキープロバイダー名やアイコンを表示するなど、UXヒントとしてのみAAGUIDを利用しなければなりません。
*   **セキュリティ依存は禁止**: アプリケーションは、暗号学的セキュリティやアクセス判定にAAGUIDを利用してはいけません。プラットフォームパスキーは現時点でAAGUIDに対する暗号学的attestationを提供しておらず、ユーザーエージェントによって改変・偽装される可能性があります。

## 3. 切り分けて使うべきライブラリ推奨

バックエンドでのFIDO2/WebAuthnオプション生成および署名検証では、暗号処理を独自実装するのではなく、各言語ごとに実績のあるオープンソースライブラリを必ず利用してください。
*   **JavaScript/TypeScript**: SimpleWebAuthn（github.com/MasterKale/SimpleWebAuthn）
*   **Python**: py_webauthn（github.com/duo-labs/py_webauthn）
*   **Java**: Java WebAuthn Server（github.com/Yubico/java-webauthn-server）、WebAuthn4J（github.com/webauthn4j/webauthn4j）
*   **.NET**: .NET library for FIDO2（github.com/abergs/fido2-net-lib）
*   **Go**: WebAuthn Go Library（github.com/go-webauthn/webauthn）
*   **Ruby**: WebAuthn Ruby（github.com/cedarcode/webauthn-ruby）
*   **PHP**: WebAuthn Framework（github.com/web-auth/webauthn-framework）

## 4. ユースケース参照マトリクス

該当するユースケースを下記から特定し、各ユースケース向けの完全な実装ガイドを取得してください。各ユースケースには重要なAPI（`PublicKeyCredential.parseCreationOptionsFromJSON`、`parseRequestOptionsFromJSON`、`signalAllAcceptedCredentials`、`signalCurrentUserDetails`、`signalUnknownCredential`、conditional mediation、AAGUID処理など）があり、これらはユースケースごとのガイドにのみ記載されています。この取得ステップを省略してはいけません。また、クライアント側ではSimpleWebAuthnの`startAuthentication`/`startRegistration`などのサードパーティライブラリラッパーで代用せず、ネイティブのWebAuthnブラウザAPIを直接呼び出してください。セクション3のライブラリ推奨は**サーバーサイド**（バックエンドのFIDO2検証）に対してのみ適用されます。

具体的なパスキーおよびWebAuthnの実装詳細は、以下のガイドにマッピングされています。
*   **パスキー登録**: [`passkey-registration`](passkeys/passkey-registration.md) — 新規パスキー登録の提供およびプロモーション。
*   **パスキーのConditional Create**: [`passkey-conditional-create`](passkeys/passkey-conditional-create.md) — パスワードログイン成功直後にパスキーをサイレントに登録する。
*   **パスキー認証**: [`passkey-authentication`](passkeys/passkey-authentication.md) — ディスカバラブル/オートフィルおよびボタンによるサインイン。
*   **パスキー管理**: [`passkey-management`](passkeys/passkey-management.md) — 一覧、リネーム、削除をパスワードマネージャーと同期する。
*   **パスキー再認証**: [`passkey-reauthentication`](passkeys/passkey-reauthentication.md) — 機微な操作の前にサインイン中の既存ユーザーを再検証する。

