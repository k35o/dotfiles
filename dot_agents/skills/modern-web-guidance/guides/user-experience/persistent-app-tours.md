# 永続的なアプリツアーを作成する

オンボーディングツアーでは、ユーザーがハイライト対象の機能を操作している間も表示し続けるオーバーレイが必要です。自動ポップオーバーとは異なり、手動ポップオーバーはユーザーがページの他の場所をクリックしても閉じません。`popover="manual"`とCSSアンカーポジショニングを組み合わせれば、非モーダルでテザリングされたツアーステップを作成できます。

### 推奨実装

#### HTML

```html
<div id="feature-target">Highlight this feature</div>

<!-- MANDATORY: Enforce overlay dialog semantics and accessible name bindings -->
<div id="tour-step" popover="manual" role="dialog" aria-labelledby="tour-title">
  <!-- Assume an <h1> precedes this element in the full document outline -->
  <h2 id="tour-title">Step 1</h2>
  <p>Learn how to use this feature.</p>
  <button popovertarget="tour-step" popovertargetaction="hide">Got it</button>
</div>
```

#### CSS

```css
#feature-target {
  anchor-name: --feature-target;
}

#tour-step {
  popover: manual;
  position-anchor: --feature-target;
  position-area: right center;
  inset: auto;
  margin: 1rem;
  padding: 1rem;
  border: 1px solid blue;
  border-radius: 0.5rem;
  background: aliceblue;
}
```

#### JavaScript

```javascript
const tourStep = document.getElementById('tour-step');
tourStep.showPopover();
// MANDATORY: Programmatically route focus into the non-modal popover so keyboard/assistive technology users immediately perceive the new context
tourStep.querySelector('button').focus();
```

### 実装ガイドライン

- **MANDATORY:** ユーザー操作中にツアーステップが誤って閉じないよう、`popover="manual"`を使ってください。
- **MANDATORY:** コンテナに`role="dialog"`を付け、見出しを`aria-labelledby`でリンクしてください。
- **MANDATORY:** 開いた直後にプログラム的にポップオーバー内へフォーカスを移動し、フォーカスの放置を防いでください。
- **DO** CSSアンカーポジショニングを使い、ツアーステップを説明対象の特定の機能にテザリングしてください。
- **DO** ポップオーバー内に、`popovertargetaction="hide"`を使う明示的な「閉じる」または「次へ」ボタンを用意してください。

### フォールバック戦略

Baseline status for Popover: Newly available. It's been Baseline since 2025-01-27.
Supported by: Chrome 116 (Aug 2023), Edge 116 (Aug 2023), Firefox 125 (Apr 2024), Safari 17 (Sep 2023), and Safari iOS 18.3 (Jan 2025).

ブラウザがPopoverをサポートしていない場合は、`@oddbird/popover-polyfill`を使ってください。

```html
<script type="module">
  if (!HTMLElement.prototype.hasOwnProperty('popover')) {
    await import('https://unpkg.com/@oddbird/popover-polyfill');
  }
</script>
```

あるいは、ポリフィルを使わないレガシーサポートでは、`position: fixed`を使い、JavaScriptの`getBoundingClientRect()`で座標を手動計算します。

#### anchor-positioning

アンカーポジショニングは現在、主要ブラウザではネイティブにはサポートされていません。

アンカーポジショニング非対応のブラウザに対応するには、ポリフィルか純粋なCSSフォールバックのいずれかを選べます。

##### オプション1: ポリフィルによるフォールバック

`@oddbird/css-anchor-positioning`ポリフィルでアンカーポジショニングをエミュレートできます。暗黙アンカーはサポートされていないため、トリガーには明示的なアンカー名を**必ず**追加してください。さらに、このポリフィルはポップオーバー上での`position-area`をサポートしないため、目的のinsetには`position-area`ではなく**`anchor()`を必ず**使ってください。

```html
<script type="module">
  if (!CSS.supports('anchor-name: --foo')) {
    await import('https://unpkg.com/@oddbird/css-anchor-positioning');
  }
</script>
```

```css
#tour-step {
  /* If using the anchor positioning polyfill with a popover, DO use `anchor()` functions instead of `position-area`. */
  left: anchor(right);
  top: anchor(top);
}
```

##### オプション2: ポリフィルを使わないCSSフォールバック

ポリフィルを避けたい場合は、`@supports not`を使ってツールチップをビューポート下部の固定位置にデフォルトで配置できます。

```css
@supports not (anchor-name: --foo) {
  #tour-step {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    margin: 0;
    border-radius: 0;
  }
}
```
