# Webセキュリティ

予防的セキュリティ対策をWeb上で安全かつ段階的に実装するためのガイドライン。

**注**: このスキルは標準的なWebプラットフォーム上の防御策、主にブラウザに関するものを扱います。アプリケーションには依然として包括的なサーバーサイドのセキュリティ、認可モデル、入力検証が必要です。

## 目次

- このスキルを適用するタイミング
- フェーズ1: クイックウィンと明らかなアンチパターン
  - 1.1 セキュアコンテキスト
  - 1.2 危険なDOMシンクを避ける
  - 1.3 セキュアクッキー
  - 1.4 クリックジャッキング保護（Frame-Ancestors & X-Frame-Options）
  - 1.5 セキュアなウィンドウメッセージング（postMessage）
- フェーズ2: 発見とデータ収集（前提条件）
  - 2.1 アプリケーションを検査する
  - 2.2 Report-Onlyポリシーをデプロイする
  - 2.3 レポート用のデータ衛生
  - 2.4 ブラウザAPIとDevToolsによる自動発見
- フェーズ3: 結果の解釈と強制
  - コア強制（データ駆動のロールアウト）
    - 3.1 CSPレポートの分析
    - 3.2 CSP強制への移行
    - 3.3 Trusted Typesの強制
    - 3.4 Cross-Origin Opener Policy（COOP）
    - 3.5 Cross-Origin Resource Policy（CORP）
    - 3.6 Cross-Origin Isolation
    - 3.7 Fetch Metadata（リソース分離）
  - 並行してデプロイする付随ポリシー
    - HTTP Strict Transport Security（HSTS）
    - X-Content-Type-Options
    - Referrer Policy
    - Permissions Policy
    - Subresource Integrity（SRI）
    - Cross-Origin Resource Sharing（CORS）
    - Clear-Site-Data（ログアウト）

## このスキルを適用するタイミング

正しい起点はアプリケーションによって異なります。

- **既存アプリの改修**: 常にフェーズ1から始めてください。発見なしに厳しいポリシーを適用するとアプリが壊れます。フェーズ3を強制する前提条件として、フェーズ2（report-only）を扱ってください。
- **グリーンフィールドアプリや新機能**: フェーズ3の強制ポリシーを直接採用できますが、初日からレポートを配線しておいてください。
- **SaaSテンプレート/フレームワークのデフォルト**: フェーズ1の衛生策とフェーズ3のポリシーをデフォルトで有効にし、下流のユーザーがリグレッションを検出できるようにフェーズ2のレポートをオンにして出荷してください。

どのケースに当てはまるか不明なら、フェーズ1→2→3の順をデフォルトにしてください。

**レバレッジに集中する**: フェーズ1と2はベースラインの衛生とデータ収集を確立しますが、フェーズ3のコア強制が最高のレバレッジを持つセキュリティ作業です。具体的には、CSP（§3.2）とTrusted Types（§3.3）によるインジェクション/XSS緩和が最大の実用的脅威に対処し、付随ポリシーと分離防御は重要な防御の深層化を提供します。

## フェーズ1: クイックウィンと明らかなアンチパターン

グローバルなセキュリティポリシーを展開しようとする前に、アプリケーションを壊すリスクのないコードレベルの衛生と即時の修正に集中してください。

### 1.1 セキュアコンテキスト
- **DO**: 受動的および能動的なネットワーク攻撃者から保護するために、HTTPSでリソースを配信します。
- **DO**: 可能な限りHTTPSを強制するため、`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` のようなヘッダを送信します。
- **TIP**: 本番リリースでは、短い `max-age`（例: 300秒）から始め、徐々に1年まで増やします。長い max-age で誤設定されたHSTSは、見たすべてのブラウザでキャッシュが期限切れになるまでサイトを永久にアクセス不能にする可能性があります。

### 1.2 危険なDOMシンクを避ける
- **DO**: テキストコンテンツを設定する際は `innerHTML` よりも `textContent` や `innerText` を優先します。
- **DO**: 利用可能であれば、HTMLを安全に挿入するために `setHTML`（Sanitizer APIの一部）を使います。
- **DO NOT**: 信頼できない、またはサニタイズされていない入力を `innerHTML` や `setHTMLUnsafe` で使いません。
- **DO**: HTML文字列を連結する代わりに、DOMParserを使うか、要素をプログラム的に作成します（`document.createElement`）。

**grepすべき危険なシンク**: `innerHTML`、`outerHTML`、`document.write`、`eval`、文字列引数を持つ `setTimeout`、`script.src`。

**コードパターン:**
```javascript
// Unsafe
element.innerHTML = `Hello, ${untrustedName}!`;

// Safe
element.textContent = `Hello, ${untrustedName}!`;
```

Trusted Typesは、危険なシンクへの文字列代入をブロックすることで、このパターンを実行時に強制できます。デプロイすることはCSP強制のステップであり、実際の破損リスクがあります — §3.3 を参照してください。

### 1.3 セキュアクッキー
新しいクッキーがデフォルトでセキュアに設定されることを確認してください。
- **DO**: 1つのドメインだけで使用されるクッキーには `__Host-` プレフィックスでの命名を優先します。これは `Secure` と `Path=/` 属性が設定され、`Domain` 属性が省略されることを要求します。これは同一サイトとネットワーク攻撃者から保護します。
- **DO**: `__Host-` が適切でない場合、`__Secure-` プレフィックスでの命名を優先します。これは `Secure` 属性を要求し、ネットワーク攻撃者から保護します。
- **DO**: 標準的なファーストパーティクッキーには明示的に `SameSite=Lax` を設定します。
- **DO**: アプリがサードパーティコンテキストでiframeとして埋め込まれる場合、`SameSite=None; Secure; Partitioned` を使います。
- **DO NOT**: パーティション分けされていない `SameSite=None` に頼らないでください — これらはトラッキング防止のため体系的にブロックされつつあります。

```http
Set-Cookie: __Host-session_id=value; SameSite=Lax; HttpOnly; Secure; Path=/
Set-Cookie: third_party_var=value; SameSite=None; Secure; Partitioned
```

### 1.4 クリックジャッキング保護（Frame-Ancestors & X-Frame-Options）
クリックジャッキング保護はデプロイが簡単で、正当な機能を壊すリスクが極めて低く、悪意あるUIリドレッシングに対する即時の防御を提供します。
- **DO**: 他のサイトがあなたのページをiframeで埋め込むのを防ぐために `X-Frame-Options: SAMEORIGIN` ヘッダを設定します（決して埋め込まれるべきでない場合は `DENY` を使用）。
- **DO**: 細かい制御には、CSPヘッダで `frame-ancestors 'self'`（または指定された信頼できるドメイン）を使います。

```http
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self' https://trusted-partner.com;
```

### 1.5 セキュアなウィンドウメッセージング（postMessage）
アプリケーションが `window.postMessage` を使って他のオリジンと通信する場合、送信側と受信側を厳密に検証する必要があります。
- **DO**: 受信側では常に、信頼できるオリジンのリストに対する厳密な等価性チェックで受信メッセージの `event.origin` を検証します。ワイルドカード（`*`）や未検証のペイロードを信用**しない**でください。
- **DO**: 機密データを送信するために `postMessage` を呼ぶ際は、意図したオリジンだけが受信できるように、ワイルドカード `*` ではなく必ずターゲットオリジンを指定します。
- **DO**: 操作を実行したりDOMシンクに書き込んだりする前に、受信メッセージペイロードのプロパティを検証してサニタイズします。`postMessage` はオブジェクトのクローンを内部で処理するため、手動のJSONシリアライズは不要です。

```javascript
// Receiver (Safe - traditional string check)
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-origin.com') return;
  const data = event.data;
  if (data && data.action === 'update') {
    // Process data safely
  }
});

// Sender (Safe)
targetWindow.postMessage({ action: 'update' }, 'https://trusted-origin.com');
```

## フェーズ2: 発見とデータ収集（前提条件）

既存のアプリケーションに厳しいポリシーを盲目的に適用しないでください。まずデータを収集して、アプリケーションの制約を理解する必要があります。

### 2.1 アプリケーションを検査する
何かを有効にする前に、事実を集めてください。
- **既存のセキュリティヘッダをgrepする**: サーバ設定、ミドルウェア、CDN/エッジ設定、metaタグの中で次を探します: `Content-Security-Policy`、`Strict-Transport-Security`、`X-Frame-Options`、`X-Content-Type-Options`、`Permissions-Policy`、`Cross-Origin-*`、`Access-Control-*`、`Timing-Allow-Origin`、`Reporting-Endpoints`。
- **インラインスクリプトとスタイルを列挙する**: サーバレンダリングされたテンプレートや静的HTMLの中のもの — これらにはnonce、ハッシュ、またはリファクタリングが必要になります。
- **第三者スクリプトのオリジンをリストする**: アプリがロードする（アナリティクス、広告、タグマネージャ、CDN）。これらは `script-src` が許可する必要があるもの、または `'strict-dynamic'` が実行可能かどうかを決定します。
- **ポップアップ依存のフローを特定する**: OAuth、決済ゲートウェイ、SSO。これらはCOOPの選択を制約します。
- **クロスオリジンの埋め込みと埋め込み元を特定する**: アプリがロードするiframe、アプリを埋め込むサイト。これらはCOEP/CORP/`frame-ancestors` を制約します。
- **必要なブラウザ機能を列挙する**: アプリや埋め込まれた第三者ウィジェットが使用する機能（カメラ、位置情報、マイク、フルスクリーン）をリストして `Permissions-Policy` の決定に役立てます。
- **動的依存を特定する**: 第三者スクリプトがバージョン管理されているか、またはサイレントアップデートを受け取るかを確認し、`SRI` が使えるかを判断します。
- **クロスサイト統合をマップする**: すべての着信Webhook、クロスサイトAPI、SSOリダイレクトエンドポイントをリストし、`Fetch Metadata` リソース分離ポリシーがそれらを壊さないようにします。

### 2.2 Report-Onlyポリシーをデプロイする
「Report-Only」ヘッダを使って、潜在的な破損を発生する前に特定します。
- **DO**: 強制せずにポリシーをドライランするためにreport-onlyヘッダを使用します。標準的なreport-onlyヘッダ:
  - CSPルールには `Content-Security-Policy-Report-Only`。
  - COOP分離には `Cross-Origin-Opener-Policy-Report-Only`。
  - COEP分離には `Cross-Origin-Embedder-Policy-Report-Only`。
  - ドキュメント機能には `Document-Policy-Report-Only`。
- **DO**: 違反が行き着く先を持つように `Reporting-Endpoints` ヘッダを定義し、`report-to` からその名前を参照します。`default` という名前のエンドポイントを設定することを推奨します。これは非推奨化およびクラッシュレポートを自動的にキャプチャします。
- **DO**: 合成テストだけでなく、実際のトラフィックパターンをカバーするのに十分な期間（通常は数日から数週間）report-onlyを実行します。

**ヘッダの例:**
```http
Reporting-Endpoints: default="https://reports.example/default", main-endpoint="https://reports.example/main"
Content-Security-Policy-Report-Only: script-src 'nonce-{RANDOM}' 'strict-dynamic' 'report-sample'; object-src 'none'; base-uri 'none'; report-to main-endpoint;
```

`'strict-dynamic'`、`https:`、`'unsafe-inline'` のトークンが組み合わさって後方互換のラダーを形成します。最新のブラウザは `'strict-dynamic'`（nonce伝播）を尊重し他を無視します。古いブラウザは `https:` にフォールバックし、非常に古いブラウザは `'unsafe-inline'` にフォールバックします。より厳しいトークンをサポートするブラウザでは、フォールバックは無害です。

**レポートの偽陽性の管理**: レポートエンドポイントは、クライアントサイドミドルウェア、攻撃的なブラウザ拡張機能、古いブラウザ、Webクローラー、アンチウイルススキャナによって引き起こされた偽陽性の違反レポートをかなりの量受け取ります。Report-onlyログを分析するときは、最新のユーザーエージェントからの高頻度パターンに集中し、デプロイの決定を下す前にノイズをフィルタリングしてください。具体的には:
- **ノイズを除去**: 既知のバグを持つ古いブラウザによって発火する偽の違反、人気のブラウザ拡張機能やクライアントサイドミドルウェアによって注入されることが知られているマークアップに対するレポート（多くの異なるアプリケーション間で同一のレポートが見られるなど）、デバッグに十分な情報が含まれていないレポートを無視します。
- **低ボリュームのレポートを無視**: ポリシーが展開されているなら、低い違反ボリュームはしばしば安全に無視できる偽陽性を示します。
- **`'report-sample'` を活用**: `script-src` ディレクティブに常に `'report-sample'` を含めてください。これにより、違反するスクリプトやインラインコードスニペットの最初の40文字を違反レポートに含めるようブラウザに指示し、デバッグがはるかに容易になります。

### 2.3 レポート用のデータ衛生
- **DO NOT**: 機密データ（PII、認証トークン、セッション識別子、秘密のあるクエリ文字列）をログや違反レポートに含めないでください。レポートエンドポイントに届く前にエッジでマスクまたは省略します。

### 2.4 ブラウザAPIとDevToolsによる自動発見
- **Reporting API**: report-onlyヘッダ（例: `Content-Security-Policy-Report-Only`、`Document-Policy-Report-Only`）と組み合わせて `Reporting-Endpoints` を使い、ブラウザに違反を自動的にサーバーへPOSTさせます。
- **ブラウザDevTools**: 最新のブラウザ（例: Chrome DevTools）の **Issues タブ** を使います。コードベースを手動でクロールしなくても、ブロックされたリソース、混在コンテンツ、サードパーティクッキー非推奨警告、機能ポリシー違反を自動的に表面化します。

## フェーズ3: 結果の解釈と強制

データを収集したあと、強制をどう進めるか決めます。フェーズ3には、順次ではなく並行して走る2つのトラックがあります。

- **コア強制（データ駆動のロールアウト）** — フェーズ2のreport-onlyデータに依存する、破損リスクの高いポリシー。これらはステージングして注視するロールアウトです。
- **付随ポリシー（並行してデプロイ）** — リスクの低いヘッダで、コアな作業の前または並行して有効化でき、フェーズ2の発見はほとんど不要です。

### コア強制（データ駆動のロールアウト）

#### 3.1 CSPレポートの分析

CSP違反レポートをレビューする際、まず（§2.2に従って）ノイズを正当なアプリケーションの問題から分離します。アプリケーションでの非互換性によって引き起こされたと思われる違反（通常、「Sample」や「Blocked URI」が、マークアップに存在する可能性のある正当なスクリプトや資産に見える違反）について:
- **コード検索**: 問題となるスクリプトソース、URL、ハッシュをコードベースで検索し、コード、動的サーバテンプレート、静的HTMLファイルに存在するか確認します。
- **コンソール監査**: 違反をトリガーしたページ（レポート内の「Document URI」）を同じブラウザで開き、できるだけ多くのアプリケーション機能を行使しながらデベロッパーツール/コンソールでCSP違反を確認します（一部の違反は特定のユーザーインタラクションでのみ発火します）。

フィルタリングとトリアージが終わったら、次の一般的なシナリオに照らしてレポートを分析します。

- **シナリオ**: インラインスクリプトに対する多数の違反。
  - **条件**: アプリがインラインスクリプトに依存するフレームワークを使用している。
  - **判断**: 強制する前にNonce（サーバレンダリング）またはハッシュ（静的）を実装します。
- **シナリオ**: 第三者アナリティクススクリプトに対する違反。
  - **条件**: スクリプトが必要。
  - **判断**: リクエストごとのnonceで `'strict-dynamic'` を使い、アナリティクスローダーが依存物をアタッチできるようにします。アナリティクスのオリジンをURL許可リストに追加**しない**でください — ドメイン許可リストは、許可されたオリジン上のオープンリダイレクト、JSONP、依存性注入を介して回避可能です。
- **シナリオ**: 特定のシンクに対するTrusted Types違反。
  - **条件**: レガシーコードパスがまだ `innerHTML` などに文字列を書いている。
  - **判断**: 強制する前にそれらのシンクを（§1.2に従って）リファクタするか、Trusted Typesポリシー（§3.3）経由でルーティングします。

#### 3.2 CSP強制への移行
次の場合にのみ強制モードに移行します。
1. report-onlyログでの違反がほぼゼロに減少しているか、すべて説明可能である。
2. 切り替え後もレポートが配線されたまま — リグレッションが見えるよう、強制ヘッダ上に `report-to` を保ちます。

**設定すべき主要ディレクティブ:**
- nonceまたはハッシュ付きの `script-src` — これはあらゆるCSPの中核ディレクティブであり、XSSを防ぐ主要なメカニズムです。
- `<base>` ハイジャックをブロックする `base-uri 'none'`。`object-src 'none'` のようなレガシーディレクティブは、最新のポストFlashなWeb環境では省略できます。
- *任意ですが破壊的になり得る*: 未指定のfetchディレクティブのフォールバックとして `default-src 'self'` が時々使われますが、デプロイを劇的に複雑にし、`script-src` を超えるセキュリティ的価値はほとんどありません。最初は堅牢な `script-src` の強制に集中するほうが一般的に安全です。
- *任意*: `form-action 'self'` は攻撃者制御のオリジンへのフォーム送信を防ぎます。
- *任意*: `upgrade-insecure-requests` はサブリソースのHTTPロードをHTTPSに自動アップグレードしますが、最新のブラウザは多くの混在コンテンツを自動アップグレードします。

**強制ヘッダの例（レポート付きCSP）:**
```http
Reporting-Endpoints: main-endpoint="https://reports.example/main"
Content-Security-Policy: script-src 'nonce-{RANDOM}' 'strict-dynamic' 'report-sample'; object-src 'none'; base-uri 'none'; report-to main-endpoint;
```

nonceベースCSPのHTML:
```html
<script nonce="{RANDOM}" src="https://example.com/script.js"></script>
```

レスポンスごとのnonceが不可能な静的/キャッシュされたHTML（SPA）には、ハッシュベースのCSPを使います。各インラインスクリプトをハッシュ化し、ハッシュを `script-src` にリストします。

**避けるべきこと**: `script-src https://cdn.example.com` のようなURL許可リスト — オープンリダイレクト、JSONPエンドポイント、許可されたオリジン上の依存性注入で簡単に回避されます。

#### 3.3 Trusted Typesの強制
Trusted Typesは§1.2のソースレベルのガイダンスを実行時に強制します。有効になると、名前付きポリシーを通過しない限り、ブラウザは危険なシンクへの文字列代入をブロックします。

- **段階的なロールアウト戦略**: 全面的な強制には実際の破損リスクがありますが、すべてを一度に行う必要はありません。リファクタリング中のアプリケーションの一部に対してポリシーを定義してロールアウトし、シンクを置き換えるにつれて使用範囲を徐々に拡大する非常に実行可能なアプローチがあります。これにより、短期的な破損リスクを抑えながら、最終的なグローバル強制を簡素化できます。
- **前提条件**: Trusted Typesにはフレームワークの協力が必要です。アプリのフレームワーク（またはDOMシンクに書き込むあらゆる第三者ウィジェット）が `TrustedHTML` / `TrustedScript` 値を生成しない場合、そのコードを壊さずにポリシーを強制できません。report-onlyロールアウトを始める前にフレームワークのサポートを監査してください。
- **前提条件**: フェーズ1のコードレベルのシンクリファクタは、完全なTrusted Types強制の前提条件です。（対照的に、標準のCSP `script-src` 強制はDOMシンクを取り締まらず、それらをリファクタせずにデプロイできます。）
- **DO**: まず `Content-Security-Policy-Report-Only: require-trusted-types-for 'script'` 経由でロールアウトし、すべての違反シンクを見つけます。
- **DO**: サニタイズ（またはエスケープ）を行う単一の名前付きポリシーを定義し、すべてのシンク書き込みをそれを通してルーティングします。
- **DO**: ポリシーが正常に統合され、report-onlyログでの違反がゼロに低下したら、グローバルな `Content-Security-Policy: require-trusted-types-for 'script'` 強制へ移行します。

```javascript
if (window.trustedTypes && trustedTypes.createPolicy) {
  const policy = trustedTypes.createPolicy('escapePolicy', {
    createHTML: str => str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  });
  el.innerHTML = policy.createHTML(untrustedString);
}
```

#### 3.4 Cross-Origin Opener Policy（COOP）

3つの中で最もリスクが低いものです。アプリがOAuthプロバイダ、決済処理者、その他オープナーから到達されることが期待されていない場合に展開します。

- **DO**: `Cross-Origin-Opener-Policy: same-origin-allow-popups` を使用 — 悪意あるオープナーがXS-leaks攻撃を仕掛けるのを防ぎつつ、*アプリ自身が*開始するOAuthや決済フローを許可します。
- **DO NOT**: クロスオリジン `window.opener` アクセスに依存する統合がないことを明示的に確認していない限り、いきなり `same-origin` にジャンプしないでください。

#### 3.5 Cross-Origin Resource Policy（CORP）

各レスポンスに対して、他のコンテキストに埋め込み可能かどうかに基づいてCORPを明示的に設定します。コアな利点は2つあります。悪意あるクロスオリジン読み取りからリソースを保護し、ページがより強いクライアントサイド分離をリクエストする際の互換性を確保します。

- **DO**: アプリ内部のリソース（認証済みデータ、ユーザーセッションJSON、制限された内部スクリプト）にはデフォルトで `Cross-Origin-Resource-Policy: same-origin` を使います。
- **DO**: 同じeTLD+1のサブドメイン間で使用されるエンドポイントには `same-site` を使います。
- **DO**: 汎用的な埋め込みや広くキャッシュされる配信のために作成されたリソース（例: 静的な共有資産や公開CDN）にのみ `cross-origin` を提供します。

#### 3.6 Cross-Origin Isolation

デプロイの破損リスクが最も高いものです。`SharedArrayBuffer` に依存する機能（例: WebAssemblyのマルチスレッドや共有メモリアーキテクチャ）をアプリケーションが必要とする場合のみ、このインフラストラクチャをデプロイする必要があります。必要ない場合、このポリシーグループはスキップしてください。

- **優先パス（Chromium環境）**: `Document-Isolation-Policy: isolate-and-credentialless` を有効化します。これはCOEPと同等のクライアントサイド分離を提供し、ブラウザに非CORSのクロスオリジンリソースフェッチからクッキーと認証情報を剥がすよう指示し、完全にブロックしません。これは主にChrome（142以降）でサポートされており、他のベンダーはまだ関心を示していません。そのため、ターゲット視聴者に基づいて慎重に評価してください。明示的なCORPオプトインのないクロスオリジンリソースを*ブロック*する必要があるアプリ（資格情報を剥がして読み込むのではなく）は、代わりに `isolate-and-require-corp` を採用できます。これはより厳格でデプロイが難しく、以下のクロスブラウザパスと同様のサブリソース監査が必要です。
- **クロスブラウザパス（複雑な強制）**: `Cross-Origin-Opener-Policy: same-origin` と `Cross-Origin-Embedder-Policy: require-corp` の組み合わせを要求します。埋め込まれたすべてのサブリソース（画像、スタイル、外部メディア）は明示的な `Cross-Origin-Resource-Policy` ヘッダを提供する必要があり、そうでないとブラウザはそれらの読み込みを防止します。

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

#### 3.7 Fetch Metadata（リソース分離）
`Sec-Fetch-*` リクエストヘッダを使って疑わしいクロスサイトリクエストを拒否するサーバサイドの強制。強制前に§2.1のクロスサイト統合マッピングが必要です。

- **DO**: `Sec-Fetch-*` ヘッダを確認し、非ナビゲーションエンドポイントへの `cross-site` リクエストを拒否するサーバサイドのリソース分離ポリシーを実装します。
- **DO**: 認証や認可のチェックの*前に*許可しないリクエストを拒否し、リソースやセッションが存在するかどうかについてのタイミング情報をレスポンスが漏らさないようにします。
- **DO**: `Vary: Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site` を含めて、中間キャッシュ（CDN）が攻撃者にキャッシュされたレスポンスを提供しないようにします。
- **注意**: `same-site` はeTLD+1配下のすべてのサブドメインを信頼します。いずれかのサブドメインがユーザー生成コンテンツやレガシーアプリ、その他信頼できないコードをホストしている場合は、許可リストから `same-site` を外し、`same-origin` と `none` のみを受け入れてください。
- **注意**: これらのチェックを誤設定すると、クロスサイト統合、SSOハンドラ、Webhookからの正当なAPIリクエストをブロックします。事前に `Sec-Fetch-*` の制約をログに記録してテストしてください。

```javascript
app.use((req, res, next) => {
  const site = req.get('Sec-Fetch-Site');
  const mode = req.get('Sec-Fetch-Mode');
  const dest = req.get('Sec-Fetch-Dest');

  if (!site) return next(); // Fallback for legacy browsers

  if (['same-origin', 'same-site', 'none'].includes(site)) return next();

  // Allow standard navigate GET requests (link clicks)
  if (site === 'cross-site' && mode === 'navigate' && req.method === 'GET' && !['object', 'embed'].includes(dest)) {
    return next();
  }

  res.status(403).send('Forbidden');
});
```

### 並行してデプロイする付随ポリシー

これらはコア強制トラックよりも破損リスクが大幅に低いです。CSPと分離のロールアウトと並行して、あるいはそれよりも前に展開できます。

#### HTTP Strict Transport Security（HSTS）
- **DO**: HTTPSを強制するために `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`。
- **TIP**: 本番リリースでは、短い `max-age`（例: 300秒）から始め、徐々に1年まで増やします。長い max-age で誤設定されたHSTSは、見たすべてのブラウザでキャッシュが期限切れになるまでサイトを永久にアクセス不能にする可能性があります。

#### X-Content-Type-Options
- **DO**: MIMEタイプスニッフィングをブロックするために `X-Content-Type-Options: nosniff` を設定します。
- **DO**: ブラウザが `nosniff` 制約を厳密に強制できるよう、すべてのリソースに対して正しい `Content-Type` ヘッダ（スクリプトには `application/javascript`、APIには `application/json`、ドキュメントには `text/html` など）をサーバが提供することを確認します。

#### Referrer Policy
- **DO**: 安全なデフォルトとして `Referrer-Policy: strict-origin-when-cross-origin` を使います。

#### Permissions Policy
- **DO**: Structured Fields構文を使って、ページとiframe用に未使用のブラウザ機能（カメラ、位置情報、マイク）を無効化します。
- **DO**: 機能をiframeに委譲する場合は、ヘッダに*加えて*HTMLの `allow` 属性を使います。
- **注意**: 委譲された機能を意図せずブロックすると、第三者ウィジェット（埋め込み動画プレーヤーや決済ゲートウェイなど）でサイレントな失敗を引き起こします。ブロック前に第三者依存を監査してください。

```http
Permissions-Policy: camera=(), geolocation=(), microphone=()
```

```html
<iframe src="https://trusted-video.com/player" allow="fullscreen; camera"></iframe>
```

#### Subresource Integrity（SRI）
- **DO**: 第三者スクリプトを読み込む際に、暗号化ハッシュ（`sha256` または `sha512` を優先）を含む `integrity` 属性を `crossorigin="anonymous"` と組み合わせて使います。
- **DO**: ブラウザがハッシュを計算できるよう、サーバ/CDNが適切な `Access-Control-Allow-Origin` ヘッダを送信することを確認します。
- **DO NOT**: 動的または非バージョン管理の資産にSRIを使用しないでください — サイレントアップデートでスクリプト実行が失敗します。SRIは厳密に不変でバージョン管理された資産用です。

```html
<script src="https://cdn.example.com/lib.js" integrity="sha256-H8df...39v" crossorigin="anonymous"></script>
```

#### Cross-Origin Resource Sharing（CORS）
CORSは防御ではなく権限付与です — どのクロスオリジン読み取りを許可するかをブラウザに伝えます。リスクは寛容すぎる設定にすることです。

- **DO**: サーバで `Origin` ヘッダを検証し、`Access-Control-Allow-Origin` をワイルドカード `*` ではなく特定のオリジンに動的に設定します。
- **DO NOT**: `Access-Control-Allow-Credentials: true` が必要な場合、`Access-Control-Allow-Origin` にワイルドカード `*` を使わないでください — ブラウザはレスポンスを拒否します。
- **DO**: プリフライト（`OPTIONS`）リクエストを処理し、データ処理の前に適切なヘッダを返します。

```http
Access-Control-Allow-Origin: https://trusted-app.com
Access-Control-Allow-Credentials: true
```

#### Clear-Site-Data（ログアウト）
- **DO**: ログアウトエンドポイントで `Clear-Site-Data` を使用して、完全なセッション終了を保証します。

```http
Clear-Site-Data: "cookies", "storage", "cache"
```
