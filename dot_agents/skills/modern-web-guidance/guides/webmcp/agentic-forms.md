Declarative APIは、属性を用いて標準的なHTMLの`<form>`要素をWebMCPツールに変換します。ブラウザはフォーム入力からJSONスキーマを合成し、エージェントとのやり取りを処理します。

## フォーム属性

*   `toolname`: ツールの一意な名前。
*   `tooldescription`: ツールの目的。
*   `toolautosubmit`: （任意）指定すると、エージェントはユーザー操作を待たずにフォームを送信できます。
*   `toolparamdescription`: （任意）JSONスキーマ内のプロパティ説明を定義する手段を提供します。
    *   **解決順序**: ブラウザは`toolparamdescription`があればそれを使用します。ない場合は、関連付けられた`<label>`の`textContent`（labelable な子孫はスキップ）を使用します。labelがない場合は`aria-description`にフォールバックします。
    *   **グルーピング（fieldset）**: 関連する複数の要素（例: `<input type="radio">`ボタン）に対してまとめて説明を付与したい場合は、`toolparamdescription`を最も近い親の`<fieldset>`要素に付与し、パラメータグループ全体に適用します。

### 例

```html
<form toolname="search-cars" 
      tooldescription="Perform a car make/model search" 
      toolautosubmit>
  <label for="make">Vehicle Make</label>
  <input type="text" id="make" name="make" required>
  
  <label for="model">Vehicle Model</label>
  <input type="text" id="model" name="model" toolparamdescription="e.g., 330i, F-150" required>
  
  <button type="submit">Search</button>
</form>
```

## JavaScriptでの送信処理

エージェントがフォームを送信すると、`SubmitEvent`には`agentInvoked`（boolean）と`respondWith(promise)`が含まれます。

```javascript
document.querySelector('form').addEventListener('submit', (event) => {
  event.preventDefault();

  // Validate the form
  const formValidationErrors = myFormIsValid();

  if (formValidationErrors.length > 0) {
    if (event.agentInvoked) {
      const errorString =
        'Validation failed: ' +
        formValidationErrors
          .map((err) => `${err.field} (${err.message})`)
          .join(', ');

      event.respondWith(Promise.resolve(errorString));
    }
    return;
  }

  const resultPromise = performAsyncSearch(new FormData(event.target));

  // Return the result directly to the agent without navigation
  if (event.agentInvoked) {
    event.respondWith(resultPromise);
  }
});
```

## ライフサイクルイベント

エージェントがツールとの対話を開始/終了したときに、windowがイベントを発火します。

```javascript
window.addEventListener('toolactivated', ({ toolName }) => {
  console.log(`Tool "${toolName}" was activated by the agent.`);
});

window.addEventListener('toolcancel', ({ toolName }) => {
  console.log(`Tool "${toolName}" interaction was cancelled.`);
});
```

## ビジュアルフィードバック（CSS）

擬似クラスを使ってエージェントが操作しているフォームを強調表示できます。

*   `:tool-form-active`: エージェントが現在使用している`<form>`要素に適用されます。
*   `:tool-submit-active`: `toolautosubmit`が省略されていてブラウザがユーザーレビューのために一時停止しているときに、送信ボタンに適用されます。

```css
form:tool-form-active {
  outline: 2px dashed blue;
  background-color: rgba(0, 0, 255, 0.05);
}

button:tool-submit-active {
  outline: 2px dashed red;
  animation: pulse 2s infinite;
}
```

## フォームの適性（避けるべき場面）

Declarative APIは、自己完結した標準的なフォームに最適です。以下のような場面では適していません。

* **依存性の高いフィールド**: 入力に応じて他の入力の選択肢や可視性が変わるフォーム。合成されたスキーマでは依存関係をうまく表現できません。
* **カスタムUIコンポーネント**: canvasやリッチテキストエディタなど、値を自動的にシリアライズしない非標準入力に依存するフォーム。
* **マルチステップウィザード**: 複数回のフォーム送信を必要とする複雑なワークフロー。Imperative APIや標準的なDOM操作の方が適しています。

## toolautosubmitを使うべきとき
* **読み取り専用操作・クエリ**: 検索、フィルタ、詳細取得、状態確認（例: 車種検索、ディレクトリ検索、在庫確認）。
* **低リスクで取り消し可能なアクション**: ユーザーが手動で簡単に取り消し・調整できるフォーム操作（例: カートへの追加、クーポンコードの適用、下書き保存、一時的なレイアウト設定の変更）。

## toolautosubmitを省略すべきとき
* **破壊的・不可逆なアクション**: レコード削除、システム設定リセット、データベースクリアなど。
* **金融・取引アクション**: チェックアウトの送信、送金、サブスクリプション支払いの承認、最終的な注文確定など。
* **影響の大きいユーザーコミュニケーション**: 最終的な求人応募の送信、他の実ユーザーへのメール/メッセージ送信、公開コンテンツの公開など。
* **機微なアカウント設定**: パスワード変更、ユーザーの役割/権限変更、請求/プロフィール情報の更新など。

## フォールバック戦略

フォーム関連のWebMCP属性は、現時点で主要ブラウザのいずれもネイティブにはサポートしていません。

WebMCP Declarative APIは、すべてのブラウザで安全に利用できます。WebMCPをサポートしないブラウザは`tool*`属性を無視し、`<form>`は通常のHTMLフォームとして動作し続けます。機能検出は不要です。
