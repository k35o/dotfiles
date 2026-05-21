# 開発者向けWebプライバシーガイドライン

Webアプリケーション開発者は、プライバシーを法的コンプライアンスのチェックボックスとしてではなく、基礎的なアーキテクチャ要件として扱う必要があります。Webエコシステムが受動的なトラッキングから明示的なユーザー同意のあるインタラクションへ移行する中で、プライバシーを守るアプリケーションを構築することは、ユーザーの信頼とセキュリティのために極めて重要です。

このドキュメントでは、Web開発者向けに高レベルの原則と、コード例を伴う詳細で実践的なガイドラインを提供します。

## 高レベルの概要

これらのコアテーマがWeb開発でのプライバシーへのアプローチを導くべきです。

1.  **自動化の非対称性とプライバシー労働**: プライバシー保護の負担をユーザーに転嫁しない（プライバシー労働）でください。複雑な同意ダイアログでユーザーを圧倒することを避けてください（自動化の非対称性）。ユーザーの時間と注意は限られており、プライバシーの選択を彼らに転嫁することはしばしば効果がなく、疲労を引き起こします。システムはデフォルトでプライバシー保護的であるべきです。
2.  **データ最小化**: 「データを持っていなければ、失うこともない。」目の前のタスクに必要最小限のデータだけを収集してください。データ保管を減らすことは、漏洩リスクを減らし、ユーザーの信頼を築きます。
3.  **目的の限定**: 1つの目的のために収集されたデータは、新たな同意なしに別の目的に使用してはいけません。明示的な合意なしにデータを再利用することは、ユーザーとの信頼関係を侵害します。
4.  **デフォルトでの透明性**: なぜデータが収集されるか、どこへ行くか、どれくらい保管されるかを正直かつ明確に伝えてください。透明性は信頼を築き、アプリケーションのユニークなセリングポイントになり得ます。
5.  **信頼できる代理**: アプリケーションをユーザーの最善の利益のために動く代理として扱ってください。これは、侵入的な振る舞いから保護し、不必要なデータ露出を避け、第三者の利益に奉仕するのではなく、ユーザーに対する忠実な受託者として動くことを意味します。

## 詳細ガイドライン

### 1. データ最小化と目的の限定

収集するデータ量を減らし、その使用を厳密に制限することは、ユーザーのプライバシーを守る最も効果的な方法です。

#### DOs:

- 必要最小限の粒度でデータを収集して**ください**。ユーザーが特定の年齢層にいるか（例: 18〜34）だけを知る必要があるなら、正確な生年月日ではなく年齢層を尋ねてください。
- eコマースでは強制的なアカウント作成を避けるためにゲストチェックアウトオプションを提供して**ください**。これによりデータ収集とカート放棄が減ります。
- データ収集の目的が果たされたらすぐに削除して**ください**。
- 集約統計を集める際に、「ファジング」やノイズを加える技術（差分プライバシー）を使用して**ください**。

#### DON'Ts:

- 将来役立つかもしれない「念のため」で投機的にデータを収集し**ない**でください。
- 明示的なユーザーの同意なしに、1つの目的（例: セキュリティ検証）のために収集したデータを別の目的（例: マーケティング）に再利用し**ない**でください。

#### コード例:

**データ収集のファジング（HTML/JS）**
正確な年齢を尋ねる代わりに:

```html
<label for="age-bracket">Age Bracket:</label>
<select id="age-bracket" name="age-bracket">
  <option value="18-34">18-34</option>
  <option value="35-49">35-49</option>
  <option value="50+">50+</option>
</select>
```

### 2. 透明性と信頼

データの取り扱いを率直に伝え、ユーザーがデータを制御する簡単な方法を提供することで、信頼を築きます。

#### DOs:

- データが要求される理由をインラインで説明して**ください**。説明を入力フィールドのすぐ隣に配置してください。
- 強力なブラウザ権限（例: カメラ、位置情報）を要求する*前*に、明確な理由と文脈を提供して**ください**。
- サポートされている場合、**Page Embedded Permission Control（PEPC）** の `<permission>` 要素の使用を検討して、権限要求を宣言的・ユーザー起点とし、データの仲介役として機能させて**ください**。
- ユーザーがログアウトした際、ブラウザに残存データが残らないようにするために `Clear-Site-Data` ヘッダを使用して**ください**。
- オプトアウトやアカウント削除を、サインアップと同じくらい簡単にして**ください**。

#### DON'Ts:

- データ収集の説明を、長くて複雑なプライバシーポリシーに埋め込ま**ない**でください。
- ユーザーを騙して同意を取るような欺瞞的なパターン（ダークパターン）を使**わない**でください。

#### コード例:

**インラインの透明性（HTML）**

```html
<div>
  <label for="phone">Phone Number (Optional)</label>
  <input id="phone" type="tel" name="phone" />
  <a href="#phone-help">Why do we ask for this?</a>
  <aside id="phone-help">
    We only use your phone number to send two-factor authentication codes for
    account security.
  </aside>
</div>
```

**ログアウト時のClear-Site-Data（HTTPレスポンス）**

```http
HTTP/1.1 200 OK
Clear-Site-Data: "*"
```

_注: キャッシュをクリアする場合、低速デバイスでのUIレンダリングのブロックを避けるため、メインのナビゲーションページでは送信せず、サブリソース経由でトリガーしてください。_

**Page Embedded Permission Control（HTML）**

```html
<!-- Declarative permission element with fallback -->
<permission type="geolocation" onpromptdismiss="updateMap()">
  <!-- Fallback for unsupported browsers -->
  <button onclick="navigator.geolocation.getCurrentPosition(updateMap)">
    Use my location
  </button>
</permission>
```

### 3. プライバシーのためのセキュリティとデータ取り扱い

プライバシーはセキュアなコーディングの基礎に依存しています。アプリケーションの脆弱性や安全でない保管は、直接的にプライバシー侵害につながります。

#### DOs:

- アプリケーションログから個人を特定できる情報（PII）をスクラブして**ください**。メール、トークン、IDの自動マスキングを使ってください。
- セッション識別子を保管するクッキーには、他のスクリプトからのアクセスを防ぐために `HttpOnly` フラグを使用して**ください**。
- 一括データスクレイピングを防ぐために、機密性の高いエンドポイント（例: ユーザー検索やプロファイルビュー）にレート制限を実装して**ください**。
- トップレベルサイト間で状態を共有しない1対1の埋め込みには、`Partitioned` 属性を付けて**CHIPS（Cookies Having Independent Partitioned State）** を使用して**ください**。

#### DON'Ts:

- 機密性のあるトークンやPIIを `localStorage` に保管し**ない**でください。埋め込まれたあらゆるスクリプトからアクセス可能です。
- パーティション分けされていない `SameSite=None` クッキーに頼ら**ない**でください。

#### コード例:

**セキュアなセッションクッキー（HTTP）**

```http
Set-Cookie: session_id=xyz123; Secure; HttpOnly; SameSite=Lax
```

**CHIPSクッキー（HTTP）**

```http
Set-Cookie: theme_pref=dark; SameSite=None; Secure; Path=/; Partitioned; HttpOnly
```

### 4. 第三者の監査と緩和策

第三者のスクリプトやリソースは、プライバシー漏洩の一般的な原因です。アプリケーションに取り入れる第三者については、あなたが責任を負います。

#### DOs:

- DevToolsやHARファイルを使ってネットワークリクエストの定期的な技術監査を行い、第三者がどんなデータを収集しているか特定して**ください**。
- 重い埋め込み（YouTubeやTikTokなど）には**ファサードパターン**を使用して**ください**。静的なサムネイルを表示し、ユーザーがクリックしてからインタラクティブなiframeをロードします。
- 利用可能であれば、プライバシー保護のためのオプション（例: `youtube-nocookie.com`）を埋め込みに使用して**ください**。
- 重いソーシャル共有SDKを、ユーザーを追跡しないシンプルな静的HTMLリンクで置き換えて**ください**。
- **Federated Credential Management API（FedCM）** を使って「サインイン」フローをネイティブに仲介し、ユーザー同意前にIdPがReling Partiesを追跡することを防いで**ください**。

#### DON'Ts:

- 人気だからといって、ある第三者がプライバシーに安全であると仮定し**ない**でください。
- 機密データ（チェックアウトや健康情報など）が扱われるページには、厳密に必要でない限り第三者のスクリプトを読み込ま**ない**でください。

#### コード例:

**プライバシー保護のあるソーシャル共有（HTML）**

```html
<!-- No JS SDK required -->
<a
  href="https://x.com/intent/tweet?text=Check%20this%20out&url=https%3A%2F%2Fexample.com"
  rel="noopener"
  target="_blank"
>
  Share on X
</a>
```

**動画ファサードパターン（HTML/JS）**

```html
<div id="video-container" data-video-id="abc123">
  <img
    src="https://img.youtube.com/vi/abc123/maxresdefault.jpg"
    alt="Play Video"
    id="play-btn"
  />
</div>

<script>
  document.getElementById('play-btn').addEventListener('click', function () {
    const container = document.getElementById('video-container');
    const videoId = container.dataset.videoId;
    container.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1" allowfullscreen></iframe>`;
  });
</script>
```

**FedCMサインイン（JavaScript）**

```javascript
try {
  const credential = await navigator.credentials.get({
    identity: {
      providers: [
        {
          configURL: 'https://idp.example/fedcm.json',
          clientId: 'rp-client-id-123',
          nonce: 'a_secure_random_nonce_value',
        },
      ],
    },
  });
  authenticateWithBackend(credential.token);
} catch (error) {
  // Handle FedCM login failure
}
```

### 5. プライバシー保護用のヘッダ

標準のHTTPヘッダを使って、ブラウザにプライバシー境界の強制を指示します。

#### DOs:

- `Permissions-Policy` を使って強力な機能（カメラ、マイク、位置情報など）をデフォルトで無効化し、必要な場所でのみ有効化して**ください**。
- 機密性のあるURLパラメータが第三者に漏れないよう、厳格な `Referrer-Policy` を設定して**ください**。

#### コード例:

**厳格なReferrerポリシー（HTTP）**

```http
Referrer-Policy: strict-origin-when-cross-origin
```

**防御的なPermissionsポリシー（HTTP）**
すべてのオリジンに対して強力な機能をデフォルトで無効化します。

```http
Permissions-Policy: geolocation=(), camera=(), microphone=(), accelerometer=()
```

### 6. フィンガープリンティングとUser-Agent縮減

デバイス設定に基づいてユーザーを密かに一意に特定しようとする技術を避けてください。フィンガープリンティングは変化しない特性に依存し、目に見えないところで発生するため、ユーザーから制御を奪い、オプトアウトや識別子のクリアを妨げます。

#### DOs:

- ブラウザが機能をサポートしているか判定するために、User-Agentスニッフィングではなく**機能検出**を使用して**ください**。
- 特定のデバイスターゲティングが必要な場合、ブラウザがサポートしていれば**User-Agent Client Hints**（UA-CH）を使用して**ください**。

#### DON'Ts:

- デバイスフィンガープリントを構築するために、Canvasレンダリング、フォントリスト、音声/映像デバイスの列挙を使**わない**でください。
- 従来の `navigator.userAgent` 文字列の完全な粒度に頼ら**ない**でください。

#### コード例:

**機能検出（JavaScript）**

```javascript
// GOOD: Check if the API exists
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(...);
} else {
  // Fallback
}

// BAD: Sniffing UA
// if (navigator.userAgent.includes("Chrome/100")) ...
```

**User-Agent Client Hints（JavaScript）**

```javascript
if (navigator.userAgentData) {
  navigator.userAgentData
    .getHighEntropyValues(['platformVersion', 'architecture'])
    .then((ua) => {
      console.log(ua.platformVersion);
    });
}
```

### 7. データ権利とユーザー制御

ユーザーが個人データに対する権利を行使できるようエンパワーしてください。

#### DOs:

- ユーザーが自分について収集されたすべてのデータに**アクセス**できる明確な仕組みを提供して**ください**。
- **データ削除**（消去）の自動化または簡単な手動フローを実装して**ください**。
- ユーザーが自身のアイデンティティに紐付く不正確な情報を訂正できるようにして**ください**。

#### DON'Ts:

- サインアップが自動化されていた場合、削除プロセスを難しくしたりユーザーにサポートへの連絡を要求したりし**ない**でください。
- データ権利を行使したユーザーに対して、依存しないサービスへのアクセスを拒否するなどして報復し**ない**でください。
