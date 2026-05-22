# ブランド対応のセレクトスタイリング

カスタマイズ可能なセレクトAPIは、`<select>`要素をブランドのデザインシステムに完全に合わせてスタイル付けする、宣言的でCSS駆動の方法を提供します。`appearance: base-select`にオプトインすることで、セレクト要素の内部シャドウDOMにアクセスでき、標準のCSSプロパティを使用してボタン、オプションのピッカーリスト、矢印アイコン、チェックマークインジケータをスタイル付けできます。

これまで、完全にブランド対応したセレクトを実現するにはJavaScriptでコントロールをゼロから再構築する必要があり、その結果、アクセシビリティ、キーボードナビゲーション、ネイティブフォーム統合がしばしば壊れていました。`appearance: base-select`を使えば、ブラウザがフォーカス管理、トップレイヤーレンダリング、アクセシビリティバインディングを処理しながら、カスタムな見た目を得ることができます。

## 実装方法

ブランド対応のセレクトスタイリングを実装するには:

1. **カスタマイズへのオプトイン:** `<select>`要素と`::picker(select)`疑似要素(オプションのドロップダウンリストを対象とする)の両方に`appearance: base-select`を適用します。
2. **カスタムボタンを構造化する(任意):** デフォルトのトリガーを置き換えるために、`<select>`の直下に`<button>`要素を定義します。このボタン内で`<selectedcontent>`要素を使用すると、現在選択されているオプションのテキストやコンテンツを表現できます。
3. **ピッカーリストのスタイリング:** `::picker(select)`疑似要素を使用して、ドロップダウンリストにタイポグラフィ、背景色、ボーダー、シャドウを適用します。ブラウザはこれをトップレイヤーでレンダリングするため、`z-index`の競合は過去のものになります。
4. **内部アイコンのスタイリング:**
   - `select::picker-icon`を使用して矢印アイコンをスタイル付けまたは置き換えます。
   - `option::checkmark`を使用してアクティブなオプション横のチェックマークインジケータをスタイル付けします。
5. **オプションのスタイリング:** `<option>`要素にホバー状態、パディング、レイアウトのスタイルを適用します。

## サンプルコード: ブランド対応の宅配セレクト

以下の例では、特定の「小包」ブランドの美学に合わせて、モノスペースフォントと破線ボーダーでスタイル付けされたカスタムセレクトを示します。

```css
/* Enable customization for the select and its picker */
.brand-select,
.brand-select::picker(select) {
  appearance: base-select;
}

/* Style the visible trigger button */
.brand-select {
  font-family: 'Courier New', monospace;
  background-color: #fffaf0;
  color: #8b4513;
  border: 2px dashed #8b4513;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

/* Style the dropdown options list */
.brand-select::picker(select) {
  font-family: 'Courier New', monospace;
  background-color: #fffaf0;
  border: 2px dashed #8b4513;
  border-radius: 4px;
  padding: 0.5rem;
}

/* Customize internal part colors to match text */
.brand-select::picker-icon {
  color: #8b4513;
}

.brand-select option::checkmark {
  color: #8b4513;
}

/* Style individual options and hover effects */
.brand-select option {
  padding: 0.5rem;
  border-radius: 4px;
  color: #8b4513;
  cursor: pointer;
}

.brand-select option:hover {
  background-color: #fdf5e6;
}
```

```html
<label for="preferences">Select shipping preference</label>
<select class="brand-select" id="preferences" name="preferences">
  <button>
    <selectedcontent></selectedcontent>
  </button>
  <option value="standard">Standard Shipping</option>
  <option value="express" selected>Express Shipping</option>
  <option value="overnight">Overnight Delivery</option>
</select>
```

## 戦略的な実装とベストプラクティス

- **DO** デザインシステムが、標準的なクロスブラウザのセレクト上書きでは実現できないすべてのフォームコントロールにおいて、高い忠実度の視覚的な一貫性を必要とする場合は、`appearance: base-select`を使用してください。
- **DO NOT** OS標準のピッカー体験(iOSデバイスの標準スクロールホイールピッカーなど)に依存している場合は、これを使用しないでください。`base-select`にオプトインすると、ネイティブなモバイルUIコントロールをオプトアウトし、Webでレンダリングされるトップレイヤーメニューを優先することになります。
- **DO** 色のコントラストがWCAG基準を満たしていることを確認してください。カスタマイズ可能なピッカーでは場当たり的に色を設定できますが、カスタム背景に対してテキストが読みやすいことを保証する責任はあなたにあります。
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
document.addEventListener('DOMContentLoaded', () => {
  // Check if browser supports base-select value
  if (!CSS.supports('appearance', 'base-select')) {
    // Custom select overrides are not supported natively.
  }
});
```
