# リッチメディアピッカー(カスタマイズ可能なセレクト)

ネイティブの`<select>`要素は、歴史的にスタイル付けが難しく、プレーンテキストのオプションしか含めることができませんでした。`appearance: base-select`プロパティは、`<select>`要素のカスタマイズ可能な状態にオプトインするための、宣言的でCSSのみの方法を提供します。これにより、開発者は、ネイティブのキーボードアクセシビリティとフォーム統合を維持しながら、`<option>`要素内に画像、SVG、複雑なレイアウトなどのリッチなHTMLコンテンツを含めることができます。このパターンを使用して、重いカスタムビルドのセレクトコンポーネントを標準的なネイティブ要素に置き換えてください。

## 実装方法

カスタマイズ可能なセレクトAPIを使用してリッチメディアピッカーを実装するには:

1. **ベーススタイルへのオプトイン**: `<select>`要素とその内部ピッカーの両方に対して、`::picker(select)`疑似要素を使用して`appearance: base-select`を適用します。これにより、`<select>`内のコンテンツに対するブラウザのHTMLパーサーが変更されます。
2. **ボタンコンテンツの定義**: `<select>`内で標準の`<button>`要素と`<selectedcontent>`要素を使用して、ピッカーが閉じているときに表示される内容を定義します。`<selectedcontent>`要素は、選択されたオプションのコンテンツを自動的にミラーリングします。ボタンに現在選択されているリッチコンテンツを表示したい場合、これは必須です。
3. **オプション内でのリッチコンテンツの使用**: `<option>`タグ内に画像、SVG、その他のHTMLタグを配置できるようになりました。このAPIが登場する前は、ブラウザは`<option>`タグからタグを取り除き、プレーンテキストのみをレンダリングしていました。
4. **ポップオーバーのスタイリング**: `::picker(select)`疑似要素を対象にすることで、ドロップダウンされたオプションリストをスタイル付けします。これはトップレイヤーにレンダリングされるため、`z-index`と格闘する必要はありません。オプションは、Anchor Positioning APIを使用してネイティブに配置されます。

## サンプルコード: リッチな役割ピッカー

```html
<label for="role-picker">Select your role</label>
<select class="custom-select" name="role" id="role-picker">
  <button>
    <selectedcontent></selectedcontent> <!-- Mirrors the selected option's content automatically so you do not need JS to update the button -->
  </button>

  <!-- Define concise aria-label values on options whose mirrored rich content would otherwise read awkwardly as a concatenated string -->
  <option value="frontend" aria-label="Frontend Developer">
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    </svg>
    <div class="option-text">
      <span class="option-title">Frontend Developer</span>
      <span class="option-desc">React, Vue, CSS</span>
    </div>
  </option>

  <option value="backend" aria-label="Backend Developer">
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="2" y="12" width="20" height="14" rx="2" ry="2"></rect>
    </svg>
    <div class="option-text">
      <span class="option-title">Backend Developer</span>
      <span class="option-desc">Node.js, Python</span>
    </div>
  </option>
</select>
```

```css
select.custom-select,
select.custom-select::picker(select) {
  appearance: base-select; /* MUST opt-in both the select and its picker to enable the customizable state, otherwise browser standard rendering applies */
}

select.custom-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f1f5f9;
  cursor: pointer;
}

select.custom-select::picker(select) {
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  width: anchor-size(width); /* Uses Anchor Positioning API to keep the dropdown precisely aligned to the button trigger width */
}

select.custom-select option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
}

select.custom-select option:hover {
  background-color: #1e293b;
}

/* Remove standard OS checkmark for base-select */
select.custom-select option::before {
  display: none;
}

/* MANDATORY: Provide multiple visual indicators (e.g., prominent background color and bold title font) to communicate the checked state cleanly */
select.custom-select option:checked {
  background-color: #3b82f6;
  color: #ffffff;
}
select.custom-select option:checked .option-title {
  font-weight: 700;
}
```

## 戦略的な実装とベストプラクティス

- **DO** 以前は重いJavaScript UIフレームワークでしか実現できなかった複雑なオプションレイアウト(アイコン、説明、画像)が必要な場合は、`appearance: base-select`を使用してください。
- **DO NOT** パフォーマンスの遅延に気付いた場合は、場当たり的な要素を使用しないでください。ブラウザはネイティブのキーボードフォーカスをネイティブに処理します。
- **DO** トップレイヤーのレンダリングを考慮してください。ピッカーはトップレイヤーでレンダリングされるため、ページコンテンツの相対`z-index`を上書きします。
- **DO** ボタンの状態でセカンダリの詳細(説明など)があまりにもスペースを取りすぎる場合は、`.custom-select selectedcontent .option-desc { display: none; }`をスタイル付けして隠してください。
- **DO** レイアウトの挙動をテストしてください。`appearance: base-select`を設定すると、最長のオプションの幅に基づいてセレクトのサイズを決めるデフォルトのブラウザ挙動が解除されます。レイアウトシフトを防ぐために、固定幅を設定したり、flex/gridの制約を使用する必要がある場合があります。
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
document.addEventListener("DOMContentLoaded", () => {
  // Check if browser supports base-select value
  if (!CSS.supports("appearance", "base-select")) {
    // Custom select overrides are not supported natively.
  }
});
```
