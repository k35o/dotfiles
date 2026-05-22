# スクロールバーをハイコントラスト設定に適応させる

OSやブラウザでハイコントラストモードを有効にしているユーザーは、UI要素（スクロールバーなど）が極めて読みやすいことを期待しています。微妙なグレーやテーマカラーではなく、はっきりとした前景と背景のコントラストに頼ることが多いためです。

このガイドでは、`@media (prefers-contrast: more)` CSSメディア機能を使ってハイコントラストのスクロールバースタイリングを強制する任意の方法を紹介します。

## 視認性の向上

`scrollbar-color` やカスタム変数でスクロールバーをカスタマイズしている場合、ハイコントラストモード向けに明示的なオーバーライドを提供できます。これは、メインのアプリテーマが美観的な理由で低コントラストのスクロールバーを使っている場合に特に有効です。

OPTIONAL: `@media (prefers-contrast: more)` ブロックを使って、サムとトラックに濃く明確な色を定義してください。

```css
/* Define default standard colors as variables */
.scroller {
  --scrollbar-thumb: #bbb;
  --scrollbar-track: #f1f1f1;

  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  scrollbar-width: thin;
  scrollbar-gutter: stable;
}

/* OPTIONAL: Provide clear, high-contrast overrides */
@media (prefers-contrast: more) {
  .scroller {
    /* Use extremely distinct colors like solid black against white */
    --scrollbar-thumb: #000000;
    --scrollbar-track: #ffffff;
  }
}
```

### scrollbar-color 使用時の注意点

- `scrollbar-color` をアニメーションまたはトランジションさせてはいけません。[WebKitのバグ](https://bugs.webkit.org/show_bug.cgi?id=311752)により、`scrollbar-color` が変化するたびにスクロールバーがちらつきます。
- macOSでは、`scrollbar-color`（標準）と `::-webkit-scrollbar`（レガシー）プロパティはデフォルトで無視されます。macOSはネイティブの「オーバーレイ」スクロールバーを使うためです。macOSでこれらを描画させるには、カスタムカラーと `scrollbar-width`（例: `thin` または `auto`）を必ず併用してください。
- `scrollbar-width` を適用しても、macOSのオーバーレイスクロールバーはデフォルトでトラック（ガター）を透明として描画します。macOSでトラックに見える背景色をデザインで要求する場合、スクロール可能なコンテナに `scrollbar-gutter: stable;` を適用しなければなりませんが、ユーザーがスクロールバーにホバーしたあとにのみ表示される点に注意してください。
- `scrollbar-gutter: stable` を指定してもmacOSではトラックが透明になることがあります。サムはトラックの色に依存して見えないようにしてはいけません。

## フォールバックとブラウザサポート

### scrollbar-color のフォールバックとブラウザサポート

scrollbar-color のBaselineステータス: Newly available。2025-12-12からBaselineです。
対応ブラウザ: Chrome 121 (Jan 2024)、Edge 121 (Jan 2024)、Firefox 64 (Dec 2018)、Safari 26.2 (Dec 2025)。

この機能はプログレッシブエンハンスメントであり、必ずしもフォールバックは必要ありません。

スタイリングが重要であり、ユーザーのBaselineターゲットが「Baseline Widely Available」以前である場合、非標準の `::-webkit-scrollbar` 擬似要素をフォールバックとして含めるべきです。

レガシーなフォールバックは `@supports not (scrollbar-color: auto)` ブロックで囲み、両方をネイティブにサポートするブラウザで標準プロパティとレガシーWebKitセレクタが衝突するのを防いでください。

色をカスタムプロパティで定義している場合、それらは自動的にレガシーWebKitセレクタへカスケードします。重複して定義する必要はありません。

```css
/* Legacy fallback for WebKit/Blink browsers */
@supports not (scrollbar-color: auto) {
  .scroller::-webkit-scrollbar {
    /* Must define base size in WebKit for custom colors to be visual */
    width: 12px;
    height: 12px;
  }

  .scroller::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
  }

  .scroller::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }
}
```
