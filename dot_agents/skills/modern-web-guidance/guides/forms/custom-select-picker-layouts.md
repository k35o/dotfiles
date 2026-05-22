# カスタムセレクトピッカーレイアウト

「カスタムセレクトピッカーレイアウト」を使うと、開発者は`<select>`ドロップダウンの従来の縦並びオプションリストから脱却できます。`appearance: base-select`と`::picker(select)`疑似要素を使用することで、GridやFlexboxなどのモダンなCSSレイアウト手法を使ってオプションリストをスタイル付けできます。これは、ビジュアルメニューがリストより効果的なカラーピッカー、絵文字セレクタ、商品バリエーションに最適です。

CSSプロパティ`appearance: base-select`は、`<select>`要素の内部パーツをスタイル付けする機能を解放します。`select::picker(select)`をターゲットにすることで、`display: grid`を適用し、オプションを列に配置して、カスタムJavaScriptなしで豊かなビジュアル体験を作成できます。

## 実装方法

カスタムセレクトピッカーレイアウトを実装するには:

1. **ベーススタイリングの有効化:** `<select>`要素とその内部ピッカー疑似要素`select::picker(select)`の両方に`appearance: base-select`を適用します。
2. **ピッカーコンテナのスタイリング:** `select::picker(select)`を対象に`display: grid`(または`display: flex`)を適用します。任意のコンテナに対するように列とギャップを定義します。
3. **オプションのスタイリング:** `<option>`要素を対象に、グリッドアイテムやカードとしてスタイル付けします。画像、SVG、複雑なレイアウトを内部に追加できます。
4. **トリガーのカスタマイズ(任意):** `<button>`内で`<selectedcontent>`を使用して、選択された値のリッチコンテンツをレンダリングします。

## サンプルコード: カスタムグリッドピッカー

```html
<label for="weather-picker">Select weather</label>
<select class="grid-picker" name="weather" id="weather-picker">
  <button>
    <selectedcontent></selectedcontent>
  </button>
  <option value="sunny">
    <span class="icon">☀️</span>
    <span class="label">Sunny</span>
  </option>
  <option value="cloudy">
    <span class="icon">☁️</span>
    <span class="label">Cloudy</span>
  </option>
  <!-- More options... -->
</select>
```

```css
/* Activate the customizable select state */
.grid-picker,
.grid-picker::picker(select) {
  appearance: base-select;
}

/* Style the dropdown list as a grid */
.grid-picker::picker(select) {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 2 columns */
  gap: 10px;
  padding: 15px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
}

/* Style options as grid cards */
.grid-picker option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
}

/* MANDATORY: Use multiple visual indicators (distinct border thickness, background shift, and font weight) for the checked state to avoid color-only state communication */
.grid-picker option:checked {
  border: 2px solid #007bff;
  background-color: #f0f7ff;
  font-weight: 700;
}
```

## 戦略的な実装とベストプラクティス

- **DO** オプションの視覚レイアウトを標準のリストから2Dグリッドやカスタムflexフローに変更する必要がある場合は、`appearance: base-select`を使用してください。
- **DO NOT** スタイルがすべてのブラウザで等しく適用されると現時点で想定しないでください。サポートを確認しフォールバックを提供してください。
- **MANDATORY アクセシビリティルーティング**: ネイティブの`<select>`要素は、一次元的な直線的な矢印キーナビゲーション(上/下)を強制します。オプションを2Dの視覚的なグリッドに配置すると、左/右矢印キーを押しても隣接する列の間でフォーカスが水平に移動しないという空間的なミスマッチが生じます。真の2次元キーボードナビゲーションがユーザビリティに必須の場合は、ネイティブの`<select>`を使用せず、代わりに手動JavaScriptマトリクスベースの矢印キーナビゲーションでカスタムのARIA `role="listbox"`複合ウィジェットを実装してください。
- **DO** トリガーボタンに選択されたオプションの画像やアイコンを自動的に表示したい場合は、`<selectedcontent>`を使用してください。
- **DO** フォーム送信が以前と全く同じように動作するように、オプションに標準の`value`属性を使用してください。
- **DO** `<select>`に`name`属性と関連付けられた`<label>`があることを確認してください。これにより、カスタムUIであってもコンポーネントがスクリーンリーダーにアクセス可能で、標準のフォーム送信と正しく動作するようになります。

## フォールバック戦略

### カスタマイズ可能な<select>のフォールバックとブラウザサポート

Customizable <select> has limited availability.
Supported by: Chrome 135 (Apr 2025) and Edge 135 (Apr 2025).
Unsupported in: Firefox and Safari.

`appearance: base-select`をまだサポートしていないブラウザでは、`<select>`要素は標準のオペレーティングシステムのドロップダウンに優雅にフォールバックします。

- **非テキストコンテンツの無視**: 古いブラウザは`<option>`タグ内の(`<svg>`や`<div>`などの)HTMLタグを取り除き、テキストノードのみをレンダリングします。`<option>`のテキストコンテンツがそれ単体で読みやすく意味のあるものになっていることを確認してください。
- **HTML構造の処理**: 標準的なパーサーは`<select>`内の`<button>`や`<selectedcontent>`タグを無視するか、無効なものとして扱う可能性があります。標準的なテキストを読みやすいフォールバックとして見るならば、プログレッシブエンハンスメントのために重いJavaScriptポリフィルは厳密には必要ありません。

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Check if browser supports base-select value
  if (!CSS.supports('appearance', 'base-select')) {
    // Custom select overrides are not supported natively.
  }
});
```
