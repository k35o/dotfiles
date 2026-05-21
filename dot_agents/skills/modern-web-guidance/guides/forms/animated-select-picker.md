# アニメーション付きセレクトピッカー

カスタマイズ可能なセレクトAPIは、`<select>`要素とそのドロップダウンピッカーをアニメーションさせるための、宣言的でCSS駆動の方法を提供します。`appearance: base-select`を`@starting-style`や`allow-discrete`のトランジション挙動などのモダンなCSSアニメーション技術と組み合わせることで、重いJavaScriptライブラリに頼ることなく、トップレイヤー要素に対して滑らかでプレミアムなUIトランジションを作成できます。

これまでネイティブのセレクトドロップダウンをアニメーションさせることは不可能でした。なぜなら、それらのUIはアクセス可能なビューポートの制約外でレンダリングされていたためです。`appearance: base-select`により、ピッカーは他のページ要素と同じようにスタイル指定およびアニメーション可能になります。

## 実装方法

アニメーション付きセレクトピッカーを実装するには:

1. **カスタマイズへのオプトイン:** `<select>`要素と`::picker(select)`疑似要素の両方に`appearance: base-select`を適用します。
2. **自動サイズトランジションの有効化(任意):** `interpolate-size: allow-keywords`を定義(通常は`:root`)して、`height: auto`と`height: 0`のような離散的なメトリック値の間をブラウザがトランジションできるようにします。
3. **トップレイヤーコンテナのアニメーション:** 標準的な入退場スタイルを`::picker(select)`に適用します。`display: none`から`display: block`へ移行する際にopacityのトランジションが確実に機能するようにするには、`transition-behavior: allow-discrete`を使用する必要があります(よくインラインで`transition: display 0.3s allow-discrete`と記述されます)。
4. **`@starting-style`でオープン状態にフックする:** `@starting-style`を使用して、トランジション開始*前*にブラウザが計算すべきベースラインスタイルを定義します。例えば、フェードインさせたい場合は、`@starting-style`ブロック内でopacityを`0`に設定します。
5. **アイコンの回転:** `:open::picker-icon`のような疑似要素のフォーカスやアクティブセレクタを使用して、矢印インジケータにトランジション(回転や移動など)を適用します。

## サンプルコード: スムーズなセレクトのスケールとフェード

以下の例では、標準的なページアニメーションでスタイルされたカスタムセレクトのピッカーコンテナを示します。

```html
<!-- Always use a <label> linked via 'for' to the select for accessibility -->
<label for="theme-select">Visual Theme</label>
<select id="theme-select" class="animated-select" name="theme">
  <!-- The <button> inside <select> becomes the visible trigger when appearance: base-select is used -->
  <button>
    <!-- <selectedcontent> automatically displays the content of the chosen <option> -->
    <selectedcontent></selectedcontent>
  </button>
  <option value="system">
    <!-- MANDATORY: Decorative inline SVGs MUST set aria-hidden="true" to prevent redundant screen reader announcement -->
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
    System Default
  </option>
  <option value="light">
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
    Light UI
  </option>
</select>
```

```css
/* Opt-in to customizable select */
.animated-select,
.animated-select::picker(select) {
  appearance: base-select;
}

/* Enable auto-keyword transitions (usually set globally at :root) */
:root {
  interpolate-size: allow-keywords;
}

/* Style the visible trigger and icon rotation */
.animated-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.animated-select::picker-icon {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.animated-select:open::picker-icon {
  transform: rotate(180deg);
}

/*
 * The Picker Container
 * Uses top-layer animations with `allow-discrete` visibility hooks
 */
.animated-select::picker(select) {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  margin-top: 0.25rem;
  width: anchor-size(width);
  overflow: hidden;

  /* The crucial transition setting for popover animations */
  transition:
    display 0.4s allow-discrete,
    overlay 0.4s allow-discrete,
    opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0;
  height: 0;
}

/* Open State */
.animated-select:open::picker(select) {
  opacity: 1;
  height: auto;
}

/* @starting-style to hook the transition on initial popover open */
@starting-style {
  .animated-select:open::picker(select) {
    opacity: 0;
    height: 0;
  }
}

/* Support for SVG inside Options and Selected Content */
.animated-select option svg,
.animated-select selectedcontent svg {
  flex-shrink: 0; /* Prevent icons from shrinking */
  width: 1.25rem;
  height: 1.25rem;
}

/* MANDATORY: Provide multiple indicators (e.g. bold font and distinct background) for the checked state to avoid color-only state communication */
.animated-select option:checked {
  font-weight: 700;
  background-color: #f1f5f9;
}

/* Ensure copy-paste safety for users with motion sensitivities */
@media (prefers-reduced-motion: reduce) {
  .animated-select::picker(select),
  .animated-select::picker-icon {
    transition: none !important;
  }
}
```

## 戦略的な実装とベストプラクティス

- **DO** 要素が`display: none`から表示状態に遷移する瞬間に正確にアニメーションをトリガーする必要がある場合は、`@starting-style`を使用してください。
- **DO NOT** 場当たり的なスクロールロックを使用しないでください。'base-select'で管理されるトップレイヤー要素は、自然な背景のクリック解除挙動を許可するべきです。
- **DO** 動きに敏感なユーザーのために、`prefers-reduced-motion`メディアクエリでアニメーションの制約を必ずラップして、アクセシブルな環境を確保するためにモーション設定を確認してください。
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
