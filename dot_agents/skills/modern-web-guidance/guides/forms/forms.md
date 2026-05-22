## 1. セマンティック構造とフォーム要素

### ガイドライン

- **DO** データ収集用のインタラクティブコントロールをラップするために`<form>`要素を使用してください。
- **DO** 機密データやミューテーションには`method="POST"`を使用し、冪等なリクエスト(検索など)には`method="GET"`を使用してください。
- **DO** 宛先URLには`action`属性を指定してください。
- **DO** 送信時にデータを識別するために、すべてのフォームコントロールに`name`属性を指定してください。
- **DO** `<button type="submit">`、`<textarea>`、`<select>`などのセマンティックタグを使用してください。
- **DO** 関連するコントロールをグループ化するために`<fieldset>`と`<legend>`を使用してください。
- **DO** 送信ボタンには行動を表す言葉(例: "Save changes")を使用してください。

- **DON'T** 機密データに`GET`を使用しないでください(履歴やログにデータが露出します)。
- **DON'T** フォームコントロールに汎用的な`<div>`や`<span>`を使用しないでください。
- **DON'T** プライマリ送信ボタンに`type="button"`を使用しないでください。
- **DON'T** 代替レイアウト対応なしにテキストエリアのリサイズを無効化しないでください。

### コード例

```html
<form action="/search" method="GET">
  <fieldset>
    <legend>Search Preferences</legend>
    <label for="q">Query:</label>
    <input type="text" id="q" name="q" required />
    <button type="submit">Search</button>
  </fieldset>
</form>
```

### 選択コントロールの判断マトリクス

| オプション数      | 選択タイプ | 推奨される要素                    | ユーザビリティとアクセシビリティの論理                                           |
| :---------------- | :--------- | :-------------------------------- | :------------------------------------------------------------------------------- |
| **1〜5**          | 単一(排他) | `<input type="radio">`            | **ゼロクリックスキャン**: すべての選択肢が即座に表示される。スキャン時間が速い。 |
| **6以上**         | 単一(排他) | `<select>`                        | **スペース節約**: 縦スペースが貴重またはリストが長い場合のみ使用。               |
| **10以上 / 動的** | 単一(排他) | `<input list="id">`(`<datalist>`) | **ファジー検索**: 巨大なセット(国名など)でのスクロール疲労を防ぐ。               |
| **任意**          | 複数選択   | `<input type="checkbox">`         | **標準セマンティクス**: ネイティブの非排他トグル。                               |

**一文で覚えるメンタルモデル**: 「相互排他的なオプションは、選択肢が6つ未満の場合は表示されたラジオボタンとして公開する。`<select>`はスペースが制約されているかリストが長い場合にのみ使用する。」

## 2. アクセシブルなラベリングと状態

### ガイドライン

- **DO** 常に`<label>`を`for`と`id`を使って入力に関連付けてください。
- **DO** スキャンが速くなるように、ラベルをフォームコントロールの上に配置してください。
- **DO** 表示されたラベルを使用してください。`placeholder`だけに頼らないでください。
- **DO** ラベルと入力間の垂直マージンが、フォームグループ間のマージンよりも小さくなるようにしてください(**ゲシュタルトの近接性の法則**)。
- **DO** 入力をヘルプテキストやエラーメッセージにリンクするために`aria-describedby`を使用してください。
- **DO** 適切なデバイス翻訳のために`<html>`に`lang`属性を定義してください。
- **DO** 状態を伝えるために非色の視覚的キュー(アイコン、テキスト)を使用してください(色だけに頼らない)。
- **DO** どのフィールドが必須かを明確に示してください。
- **DO** 動的なエラーアナウンスのために`aria-live`を使用してください。

- **DON'T** ラベルの代わりに`placeholder`を使用しないでください。
- **DON'T** 翻訳が必要な場合、`aria-label`を唯一のテキスト説明として使用しないでください。
- **DON'T** 高コントラストな代替を提供せずにフォーカスアウトラインを無効にしないでください。

### コード例

```html
<div class="field">
  <label for="username">Username:</label>
  <input
    type="text"
    id="username"
    name="username"
    aria-describedby="user-help"
    required
  />
  <span id="user-help" class="hint">3-12 characters.</span>
</div>

<style>
  input:focus-visible {
    outline: 3px solid #0b57d0;
    outline-offset: 2px;
  }
</style>
```

## 3. オートフィルと入力モード

### ガイドライン

- **DO** 期待されるデータを指定するために`autocomplete`属性を使用してください(例: `email`、`tel`、`current-password`、`new-password`)。
- **DO** オンスクリーンキーボードを最適化するために`inputmode`を使用してください(例: PINに対して`inputmode="numeric"`)。
- **DO** Enterキーのラベルを設定するために`enterkeyhint`を使用してください(例: `next`、`done`)。
- **DO** 複雑な番号(クレジットカード、電話)にはオートフィルを助けるために単一フィールド入力を使用してください。

- **DON'T** クレジットカードや郵便番号に`type="number"`を使用しないでください(UIスクロール問題を引き起こし、先頭のゼロが削除されます)。

### コード例

```html
<label for="zip">ZIP Code:</label>
<input
  type="text"
  id="zip"
  name="zip"
  autocomplete="postal-code"
  inputmode="numeric"
  pattern="\d{5}"
/>
```

## 4. 制約とバリデーション

### ガイドライン

- **DO** ネイティブな制約を使用してください: `required`、`minlength`、`maxlength`、`pattern`。
- **DO** 邪魔にならないスタイリングのためにCSS疑似クラス`:invalid:user-invalid`を使用してください。
- **DO** カスタムメッセージのためにValidityState API(`setCustomValidity`)を使用してください。

- **DON'T** バリデーションをブロックするために送信ボタンを無効にしないでください。ユーザーに送信させ、エラーをハイライトしてください。ただし、二重投稿を防ぐため、有効な送信がクリックされた*後*にボタンを無効化することは**DO**してください。

### コード例

```html
<label for="code">Activation Code (4 digits):</label>
<input type="text" id="code" name="code" required pattern="\d{4}" />

<script>
  const input = document.getElementById('code');
  input.addEventListener('invalid', () => {
    input.setCustomValidity('Please enter exactly 4 digits.');
  });
  input.addEventListener('input', () => {
    input.setCustomValidity('');
  });
</script>
```

### バリデーションイベントタイミングマトリクス

| イベントトリガー        | フェーズ             | 許可されるアクション                 | UX / アクセシビリティの論理                                                                                |
| :---------------------- | :------------------- | :----------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **`input`**             | 入力中               | 既存エラーの**クリア**のみ。         | **邪魔にならない**: 入力が完了する前にユーザーに警告しない。                                               |
| **`blur` / `focusout`** | フィールドから離れる | チェックを**実行**しエラーを表示。   | **コンテキストに応じたバリデーション**: ユーザーがフィールドで「終了」を示したらバリデーションを実行。     |
| **`submit`**            | 最終試行             | **ブロック**してフォーカスをルート。 | **最終的なゲートキーパー**: 不正なペイロードを傍受し、スクリーンリーダーのフォーカスをサマリーに強制する。 |

**一文で覚えるメンタルモデル**: 「入力中の早すぎる警告を避けるために`blur`でバリデーションし、ユーザーが修正を試みた瞬間に`input`でエラー状態をリセットする。」

**セキュリティ vs UXのスケール**: クライアントサイドのバリデーションはユーザー体験のため、サーバーサイドのバリデーションはセキュリティのためです。ブラウザの制約をデータ整合性の防御として扱わないでください。

## 5. レスポンシブデザインとタイポグラフィ

### ガイドライン

- **DO** スキャンしやすいように単一カラムのレイアウトを使用してください。
- **DO** iOSのズームを防ぐため、`font-size`を少なくとも`1rem`(16px)に設定してください。
- **DO** モバイルタップターゲットのために、パディングのトリックを使ってクリック可能な領域を拡張してください。
- **DO** タップターゲットが少なくとも`48px`であることを確認してください。
- **DO** ルートからの相対単位(`rem`)と単位なしの`line-height`を使用してください。
- **DO** RTLサポートのためにCSS論理プロパティ(例: `margin-inline-start`)を使用してください。

### コード例

```css
.form-group {
  margin-block-end: 1.5rem;
}

/* Expand clickable tap area without layout shift */
label {
  display: inline-block;
  padding: 10px 0;
  margin: -10px 0;
}

input {
  font-size: 1rem;
  padding: 0.75rem;
  min-height: 48px;
  box-sizing: border-box;
}

@media (pointer: coarse) {
  input {
    min-height: 52px;
  }
}
```

## 6. フォームコントロールのスタイリング

### ガイドライン

- **DO** ネイティブのラジオ/チェックボックスを素早くブランディングするために`accent-color`を使用してください。
- **DO** セマンティクスを壊さずにカスタムドロップダウン矢印を作成するには、`appearance: none`を使用してください。
- **DO** 入力が十分なボーダーコントラスト(例: 白の背景に`#ccc`以上の濃さ)で明確に見えるようにしてください。
- **DO** 入力を視覚的に隠すには標準的な`.visually-hidden`レシピ(`clip-path: inset(50%)`を1pxサイズで使用)を使用してください。アクセシビリティツリーから削除する`display: none`は**使わない**でください。

### コード例

```html
<div class="checkbox-container">
  <input type="checkbox" id="sub" name="sub" class="visually-hidden" />
  <label for="sub" class="checkbox-label">Subscribe</label>
</div>

<style>
  .visually-hidden {
    position: absolute;
    clip-path: inset(50%);
    overflow: hidden;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    white-space: nowrap;
  }
  .checkbox-label::before {
    content: '';
    display: inline-block;
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid #ccc;
  }
  input:focus-visible + .checkbox-label::before {
    outline: 2px solid #0b57d0;
  }
</style>
```

## 7. JavaScriptとAJAX

### ガイドライン

- **DO** AJAXのフォーム送信ではデフォルトのナビゲーションを防止してください(`e.preventDefault()`)。
- **DO** リアルタイムのバリデーションチェックには`ValidityState`インターフェースを使用してください。
- **DO** 動的なUIの表示には`aria-expanded`と`aria-controls`を使用してください。

- **DON'T** JSが失敗した場合にページの送信をブロックしないでください。サーバーサイドのフォールバックを確保してください。

### コード例

```js
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  // fetch('/submit', { method: 'POST', body: data });
});
```

## 8. アイデンティティ、支払い、高度なセキュリティ

### ガイドライン

- **DO** サインアップには`autocomplete="new-password"`を、サインインには`autocomplete="current-password"`を使用してください。
- **DO** パスワードフィールドへの貼り付けを許可してください。
- **DO** ユーザーがパスワード入力のマスクを解除できるトグル機能を提供してください。
- **DO** 支払いボタンに正確な金額を示してください(例: "Pay $100")。
- **DO** `autocomplete="cc-number"`、`cc-exp`、`cc-csc`を使用してください。
- **DO** すべてのページにHTTPSを使用してください。
- **DO** ミューテーションアクション(POST/PUT/DELETE)のために、暗号学的に安全なアンチCSRFトークンを実装してください。
- **DO** XSSを防ぐため、ユーザー入力をDOMに注入する前にサニタイズしてください(例: DOMPurify経由)。
- **DO** 開いているフォームにはスパム保護(ハニーポットやCAPTCHA)を実装してください。

- **DON'T** 状態変更を実行するエンドポイントでHTTP `GET`を使用しないでください。
- **DON'T** 厳格なコンテンツセキュリティポリシー(CSP)を満たすため、フォームマークアップ内に直接インラインJavaScript(例: `onclick="..."`)を使用しないでください。

### コード例

```html
<form method="post">
  <input type="hidden" name="csrf_token" value="secure_token_abc123" />

  <h1>Sign up</h1>

  <div class="form-group">
    <label for="name">Full name</label>
    <input
      id="name"
      name="name"
      autocomplete="name"
      required
      pattern="[\p{L}\.\- ]+"
    />
  </div>

  <div class="form-group">
    <label for="email">Email</label>
    <input
      id="email"
      name="email"
      type="email"
      autocomplete="username"
      required
    />
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <button
      id="toggle-password"
      type="button"
      aria-pressed="false"
      aria-label="Show password"
      aria-describedby="toggle-warning"
    >
      <img
        class="icon-eye"
        src="/icons/eye.svg"
        alt=""
        width="20"
        height="20"
      />
      <img
        class="icon-eye-off"
        src="/icons/eye-off.svg"
        alt=""
        width="20"
        height="20"
      />
    </button>
    <span id="toggle-warning" class="visually-hidden"
      >Warning: this will display your password on the screen.</span
    >
    <input
      id="password"
      name="password"
      type="password"
      autocomplete="new-password"
      minlength="8"
      aria-describedby="password-constraints"
      required
    />
    <div id="password-constraints">Eight or more characters.</div>
  </div>

  <button id="sign-up">Sign up</button>
</form>
```

## 9. 住所の収集

### ガイドライン

- **DO** 名前には単一のフィールドを使用してください。
- **DO** `autocomplete="street-address"`を使用してください。
- 異なる国にユーザーがいるサイトでは、地理的地域ごとの異なる住所形式に対応するため、住所には`<textarea>`要素を**DO**使用してください。フォームが住所のパーツ(例: 番地、市など)に別々の入力を使用する場合は、`address-line1`、`address-line2`などの`autocomplete`値を**DO**使用してください。
- **DO** 郵便番号を任意にしてください。

- **DON'T** グローバルなユーザーのために、名前入力を固定的な変数(「名」「姓」)に分割しないでください。
- **DON'T** 名前やユーザー名にラテン文字のみを強制しないでください。

### コード例

```html
<!-- Accessible Address Form with Autofill -->
<form action="/save-address" method="POST">
  <div class="form-group">
    <label for="full-name">Full name</label>
    <input
      type="text"
      id="full-name"
      name="full_name"
      maxlength="100"
      required
      autocomplete="name"
    />
  </div>

  <div class="form-group">
    <label for="address">Address</label>
    <textarea
      id="address"
      name="address"
      required
      autocomplete="street-address"
      maxlength="300"
    ></textarea>
  </div>

  <button type="submit">Save Address</button>
</form>
```

## 10. ユーザビリティテストと分析

### ガイドライン

- **DO** 複数のデバイス、ブラウザ、画面サイズでフォームをテストしてください。
- **DO** キーボードのみのナビゲーション(`Tab`と`Shift+Tab`)をテストし、視覚的なフォーカスを確認してください。
- **DO** ブラウザツールを使ってさまざまな障害(視覚、運動)をエミュレートしてください。
- **DO** フォームの完了率と離脱ポイントを監視するために分析を使用してください。
- **DO** マイクロ摩擦ポイントを見つけるために離散的なイベント(例: フィールドフォーカス、クリック)を追跡してください。

- **DON'T** ユーザビリティに対して自動化されたツール(Lighthouse)だけに依存しないでください。実際のユーザーでテストしてください。
- **DON'T** 標準的なイベントラベル内で機密の個人データを追跡しないでください。

### コード例

```html
<form action="/submit" method="POST" id="track-form">
  <label for="postal-code">ZIP or postal code</label>
  <input
    type="text"
    id="postal-code"
    name="postal-code"
    autocomplete="postal-code"
    maxlength="20"
    required
  />
  <button type="submit" id="submit-btn">Submit</button>
</form>

<script>
  const trackForm = document.getElementById('track-form');
  const trackBtn = document.getElementById('submit-btn');

  trackBtn.addEventListener('click', () => {
    console.log('Analytics Event: Submit clicked');
  });
</script>
```

## 11. マルチページフォーム

### ガイドライン

- **DO** 明確なラベルと進捗インジケータでマルチページフォームの進行状況をはっきり表示してください。
- **DO** ユーザーがページ間を前後にナビゲートできるようにしてください。
- **DO** オンスクリーンキーボードを介したナビゲーションをガイドするために、コンテキスト固有の`enterkeyhint`値(例: `"previous"`、`"next"`)を使用してください。
- **DO** モバイルキーボードが入力やボタンを覆わないようにレイアウトを設計してください(例: フォーカス時にビューポート上半分に配置するか、CSSの`scroll-padding`を使用)。

### コード例

```html
<nav aria-label="Progress">
  <ol class="progress-tracker">
    <li class="step-done">Step 1: Account</li>
    <li class="step-active" aria-current="step">Step 2: Shipping</li>
    <li class="step-todo">Step 3: Payment</li>
  </ol>
</nav>

<button type="button" onclick="history.back()" enterkeyhint="previous">
  Previous
</button>
<button type="submit" enterkeyhint="next">Next</button>
```
