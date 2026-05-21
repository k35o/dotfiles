これまでCSSセレクタは下方向にしかトラバースできず、親に基づいて子をスタイルすることはできても、子に基づいて親をスタイルすることはできませんでした。`:has()` 擬似クラスはこれを変え、子孫の存在や状態に応じてコンテナ要素を条件付きでスタイルすることを可能にします。

`:has()` を状態擬似クラス（`:checked`、`:focus`、`:valid`、`:invalid`、`:not()` など）と組み合わせることで、親要素に「修飾子」クラス（`.is-active` や `.has-error` など）を切り替えるJavaScriptを必要とせず、CSSだけで複雑でインタラクティブなUIコンポーネントを構築できます。

これは特に、内部のインタラクションに反応する必要があるコンポーネントに有用です。たとえば、チェックボックス（`:checked`）に反応するローカルテーマトグル、エラー（`:invalid`）をハイライトするフォームグループ、子リンクがフォーカスされたとき（`:focus-within`）に浮き上がるカードなどです。

### 状態に基づくコンテナスタイリングの実装

**MANDATORY**: コンテナ要素で `:has()` セレクタを使って、その対象となるインタラクティブな子要素の特定の状態（例: `:checked`、`:focus`、`:invalid`）を検出する必要があります。

子の状態に基づいてスタイリングを変えるコンポーネントを構築するには:

1. **デフォルトのスタイリングを定義する**: コンテナにCSS変数を設定し、ベース状態を定義します。
2. **状態ベースのオーバーライドを適用する**: `:has([child-selector]:[state])` でコンテナをターゲットし、アクティブまたは代替状態のCSS変数を再定義します。

_例: 子のトグルに基づいてテーマが変わるコンポーネント。_

```css
/* 1. Define the default state on the component container */
.theme-card {
  /* Using custom properties makes state-switching cleaner */
  --card-bg: #ffffff;
  --card-text: #333333;
  --card-border: #cccccc;

  background-color: var(--card-bg);
  color: var(--card-text);
  border: 1px solid var(--card-border);

  /* Use a transition for smooth state changes */
  transition:
    background-color 0.3s,
    color 0.3s;
}

/* 2. Apply styles when the child enters the specific state */
/* MANDATORY: Target the container and use :has() to check the descendant's state */
.theme-card:has(.theme-toggle:checked) {
  /* Override the properties for the active or alternate state */
  --card-bg: #222222;
  --card-text: #f0f0f0;
  --card-border: #555555;
}
/* You can also combine :has() and :not() to target specific negative states */
/* This selects a card that DOES NOT have a toggle in the checked state */
.theme-card:not(:has(.theme-toggle:checked)) {
  /* Optional: Explicit styles for the unchecked state if needed */
}
```

```html
<!-- The container element that receives the styling -->
<div class="theme-card">
  <!-- The child element whose state controls the parent -->
  <label>
    <input type="checkbox" class="theme-toggle" />
    Enable Dark Mode
  </label>

  <h2>Card Title</h2>
  <p>The style of this entire card is controlled by the checkbox above.</p>
</div>
```

**パフォーマンスのヒント**: `:has()` を使う際は、セレクタを可能な限り具体的なコンテナ（例: `.theme-card`）にスコープしてください。スタイリングの変化が局所的なのに、`body:has(...)` のような非常に高レベルな要素にアンカーするのは避けてください。広範な `:has()` クエリはより多くのレイアウト再計算をトリガーする可能性があるためです。

### フォールバック戦略

:has() のBaselineステータス: Newly available。2023-12-19からBaselineです。
対応ブラウザ: Chrome 105 (Sep 2022)、Edge 105 (Sep 2022)、Firefox 121 (Dec 2023)、Safari 15.4 (Mar 2022)。

状態ベースのスタイリングがユーザー体験やページレイアウトにとって重要な場合は、`:has()` セレクタをサポートしないブラウザ向けにフォールバックを提供する必要があります。純粋に装飾的なエフェクトであれば、`:has()` はフォールバックなしのプログレッシブエンハンスメントとして使用できます。

**MANDATORY**: 重要な機能のフォールバックを実装する際は、CSSで `@supports not selector(:has(*))` を使って、従来のクラスベースのフォールバックを定義する必要があります。重要な状態変化がユーザーのインタラクションに依存する場合は、`CSS.supports()` を使った小さなインラインスクリプトで、状態変化を表す同等のJavaScriptイベント（例: `change`、`focus`、`blur`）に基づいてそのクラスを切り替える必要もあります。

```css
/* Fallback CSS for older browsers */
/* We check if the browser DOES NOT support the :has() selector */
@supports not selector(:has(*)) {
  /* Define a traditional modifier class that applies the exact same overrides */
  .theme-card.is-active {
    --card-bg: #222222;
    --card-text: #f0f0f0;
    --card-border: #555555;
  }
}
```

```javascript
/* Fallback JavaScript for older browsers */
/* Check for support before running the script to avoid unnecessary work in modern browsers */
if (!CSS.supports('selector(:has(*))')) {
  const toggle = document.querySelector('.theme-toggle');
  const card = document.querySelector('.theme-card');

  if (toggle && card) {
    // Manually toggle the fallback class when the input state changes
    toggle.addEventListener('change', (e) => {
      card.classList.toggle('is-active', e.target.checked);
    });
  }
}
```
