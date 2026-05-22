# ブラウザによってオートフィルされ、ユーザーが編集していないフォームフィールドをCSSの:autofill疑似クラスでハイライトする

CSSの`:autofill`を使用して、オートフィルされた(またはされていない)フィールドをハイライトし、ユーザーのフォーム入力完了をガイドしてください。

## 実装方法

ブラウザによってオートフィルされた(かつユーザーが編集していない)フォームフィールドをハイライトするには、CSSに`:autofill`クラスを使用したセレクタを追加します。これは`<input>`、`<select>`、`<textarea>`要素に使用できます。

オートフィル状態をスタイル付けする際は、アクセシビリティのベストプラクティスに従う必要があります:

- **複数の状態インジケータ**: オートフィル状態を示すために、ボーダーカラーだけに頼らないでください。状態が知覚可能であることを保証するために、ボーダーの太さやカスタム背景シェーディングなど、複数のインジケータを使用してください。
- **フォーカスインジケータの保持**: キーボードユーザー向けの明確で高コントラストな代替を提供せずにフォーカスアウトライン(`outline: none`)を削除しないでください。

次の例では、`:autofill`を使用してカスタムボーダーと背景を設定し、明示的なフォーカススタイルも併用しています:

```css
input:autofill,
input:-webkit-autofill {
  /* Multiple indicators: use both a distinct border and background color via box-shadow to avoid color-only state */
  border: 2px solid #2e7d32;
  box-shadow: 0 0 0 100vmax #e8f5e9 inset;
}

/* MANDATORY: Always provide an explicit focus indicator when styling autofilled states */
input:autofill:focus-visible,
input:-webkit-autofill:focus-visible {
  outline: 3px solid #000;
  outline-offset: 2px;
}
```

この例にあるように、オートフィルされたフィールドでは`background-color`を直接上書きできないため、背景をカスタマイズするには`box-shadow`プロパティを使用します。

## 正しいCSS疑似クラス名を使用する

**Do not**`:auto-fill`を使用しないでください。これは誤りです。

MANDATORY: 正しい疑似クラス名は`:autofill`なので、これを使用してください。

### フォールバック戦略

:autofill has limited availability.
Supported by: Chrome 110 (Feb 2023), Edge 110 (Feb 2023), and Safari 15 (Sep 2021).
Unsupported in: Firefox.

`:autofill`疑似クラスはプログレッシブエンハンスメントです。サポートされていないブラウザでも、フォームは通常通り機能しますが、入力はカスタムのオートフィルハイライトを受けないだけです。ユーザーはフォームを正常に完了できます。追加のJavaScriptフォールバックは使用すべきではありません。
