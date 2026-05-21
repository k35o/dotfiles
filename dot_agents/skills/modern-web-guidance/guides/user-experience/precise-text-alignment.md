# 精密なテキスト配置

## 課題

ブラウザはline-heightや、アセンダー・ディセンダーといったフォント固有のメトリクスを考慮するため、テキスト文字の上下に追加の余白を自動で加えます。この「ゴーストスペース」のせいで、標準のCSSではピクセルパーフェクトな垂直配置が不可能になります。

よくある問題には以下があります:

- **アイコンの位置ズレ**: `align-items: center`を使っても、テキストが隣のアイコンより視覚的に下や上にずれて見えます。
- **不正確なパディング**: `padding: 12px`を持つボタンが、フォントの内側のレディング（行間）のせいで上下の余白が多めに見えます。
- **端揃え**: 大文字の上端を、コンテナや隣の画像の上端にぴったり合わせるためには、「マジックナンバー」の負のマージンを使うしかありません。

## 解決策

`text-box-trim`と`text-box-edge`プロパティ（ショートハンドは`text-box`）を使えば、特定のフォントメトリクスに基づいてこの内側のレディングを取り除けます。テキストボックスを**cap-height**（大文字の上端）と**アルファベットベースライン**（ほとんどの文字の下端）でトリミングすれば、要素のバウンディングボックスを視覚的なコンテンツに一致させられます。

### 実装戦略

1. **必須**: テキストを含む要素に`text-box-trim: trim-both`（または`text-box`ショートハンド）を適用します。
2. **必須**: トリミングに使うメトリクスを`text-box-edge`で指定します。ほとんどのUI配置には`cap alphabetic`を使ってください。
3. **DO** フレックスやグリッドコンテナ内での視覚的な垂直センタリングに使ってください。
4. **DO** CSSの`padding`値が、テキストとコンテナの端の間の視覚的な余白と一致するようにするために使ってください。
5. **DO NOT** 可読性のために伝統的な行間が必要な長文の本文には使わないでください。見出し、ボタン、UIラベルに最適です。

## 実装ガイド

### ユースケース1: バッジの内側のレディングをトリムする

フォントごとにテキストの上下の組み込みスペース量は異なります。これはデザインを一致させたり、バッジでテキストを視覚的にセンタリングしたりする際の課題になります。コンテナのパディングをテキストにぴったり寄せたいときには、`text-box: trim-both cap alphabetic`を使ってください。これはバッジやタグのような密度の高いUIコンポーネントに特に有用です。これによって、パディングを四方すべてでテキストエッジから始められます。

```css
.badge {
  padding: 10px;
  background: hotpink;
  border-radius: 10px;
  /* 
    Trims the top to the cap-height and 
    the bottom to the alphabetic baseline.
  */
  text-box: trim-both cap alphabetic;
}
```

### ユースケース2: アイコン付きテキストのセンタリング

Flexboxでテキストとアイコンを配置すると、「ゴーストスペース」のせいでテキストが少し中心からズレて見えがちです。ボックスをトリムすれば、レイアウトエンジンが見える文字の高さを使って配置するようになります。

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
/* 
  text-box does NOT inherit, and must be applied directly to the text element.
*/
.button-text {
  /* 
    The flex container now centers against the 
    visible letters, not the invisible font box.
  */
  text-box: trim-both cap alphabetic;
}
```

### ユースケース3: テキストを上端にぴったり合わせる

見出しを隣の画像や装飾要素の上端と完璧に揃えるには、`trim-start cap alphabetic`を使ってください。下端はトリムされませんが、下端のエッジも定義する必要があります。

```css
.hero {
  display: flex;
  align-items: flex-start;
}

h1 {
  /* MANDATORY: The bottom edge must also be defined, even though only the top is trimmed. */
  text-box: trim-start cap alphabetic;
}
```

## ベストプラクティス

- **DO** 簡潔さのため`text-box`ショートハンドを使う: `text-box: <trim-direction> <edges>`。
- **DO** 片方のエッジしかトリムしない場合でも、両方のエッジを常に指定する（デフォルトの`text`エッジを使う場合を除く）。
- **DO** `line-height`と組み合わせて制御された間隔を確保する。トリミングは最初と最後の行の前後のレディングを除去しますが、複数行テキストの行間距離には依然として`line-height`が影響します。
- **DO NOT** すべての要素に適用しないでください。精密な配置が必須の場所だけで使ってください。

### フォールバック戦略

text-box has limited availability.
Supported by: Chrome 133 (Feb 2025), Edge 133 (Feb 2025), and Safari 18.2 (Dec 2024).
Unsupported in: Firefox.

`text-box`はプログレッシブエンハンスメントです。サポートしないブラウザでは、テキストは単にデフォルトのレディングでレンダリングされます。レイアウトは機能しますが、精度はやや劣ります。古いブラウザはプロパティを安全に無視するため、特別なフォールバックコードは不要です。

## その他の考慮事項

1. **フォントメトリクス**: フォントごとに内部メトリクスが異なります。`cap alphabetic`は信頼できるデフォルトですが、フォントやユースケースによっては小文字の位置調整のために`ex`（x-height）が必要なこともあります。
2. **複数行テキスト**: トリミングはブロックの最初と最後の行に適用されます。内部の行は影響を受けません。
