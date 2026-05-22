Webフォントがロードされると、フォールバックフォントを置き換えますが、両方を同じ `font-size` に設定していてもしばしば寸法が異なります。これは「レイアウトシフト」(累積レイアウトシフト)を引き起こし、フォールバックの小文字のサイズ(x-height)が優先フォントと大きく異なる場合、テキストが読みにくくなる可能性があります。

`font-size-adjust` プロパティはこの問題を解決し、特定のメトリック(通常はx-height)に基づいてフォントサイズを正規化します。これにより、どのフォントが現在アクティブであるかに関わらず、テキストが同じ視覚的スペースを占めるようになります。

## 実装手順

### 1. 優先フォントのアスペクト比を特定する

フォールバックを正規化するには、優先フォントの「アスペクト値」(小文字とフォントサイズの比率)が必要です。

- **自動検出(推奨):** `from-font` キーワードを使い、ブラウザに優先Webフォントから比率を抽出させます。
- **手動計算:** 具体的な値(例: Verdana は 0.545)を知っているなら、直接指定してより精密に制御できます。

### 2. テキストコンテナに font-size-adjust を適用する

要素または親コンテナにこのプロパティを適用します。これにより、優先フォントの読み込みが失敗したり読み込み中であったりしても、フォールバックフォントが優先フォントの視覚的サイズに合わせてスケールされます。

```css
.text-content {
  /* Define your font stack as usual */
  font-family: 'MyWebFont', 'Arial', sans-serif;
  font-size: 1rem;

  /* MANDATORY: Normalize the font size based on the primary font's x-height.
     This ensures that if 'Arial' is used as a fallback, it is scaled 
     to match the x-height of 'MyWebFont'. */
  font-size-adjust: from-font;
}
```

### 3. (任意)特定のメトリック向けに調整する

x-height がデフォルトで最も一般的ですが、`cap-height` (オールキャップスのヘッダーに有用)や `ch-width` (等幅フォントに有用)など他のメトリックで正規化することもできます。

```css
h1 {
  /* Normalize based on the height of capital letters */
  font-size-adjust: cap-height from-font;
}
```

### 4. 視覚的な安定性を検証する

`font-size-adjust` の値がフォールバックを正しく整列しているかを確認します。Webフォントを一時的にブロックしたり、ブラウザのDevToolsで `font-family` 宣言を調整したりして、テキストのレイアウトが安定したままであることを検証します。

## フォールバック戦略

font-size-adjust のBaselineステータス: Newly available。2024年7月25日以降Baseline。
対応ブラウザ: Chrome 127 (2024年7月)、Edge 127 (2024年7月)、Firefox 118 (2023年9月)、Safari 17 (2023年9月)。

`font-size-adjust` をサポートしないブラウザでは、フォントはデフォルトのスケールで描画されます。これによりフォント切り替え時にレイアウトシフトや可読性の変化が発生する可能性があります。

`font-size-adjust` なしでこれを緩和するには、`@font-face` ディスクリプタの `size-adjust`、`ascent-override`、`descent-override` でフォールバックフォントを手動で調整できますが、単一の `font-size-adjust` 値より計算が複雑です。
