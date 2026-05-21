# ブランドに統一感のあるフォーム

チェックボックスやラジオボタンなどの標準的なHTMLフォーム要素のカスタマイズは、歴史的に難しいものでした。開発者はブラウザのデフォルトを使うか、カスタムコンポーネントをゼロから構築するかの選択を迫られることが多くありました。カスタムコントロールの構築は時間がかかり、アクセシビリティの問題や状態の欠落(チェックボックスの不定状態など)を簡単に引き起こす可能性があります。

CSSプロパティ`accent-color`は、アクセシビリティや組み込みのブラウザ機能を犠牲にすることなく、CSSの1行で組み込みのHTMLフォーム入力にブランドカラーを適用するシンプルな方法を提供します。

## 実装方法

ブランドカラーをフォームコントロールに適用するには:

1. **ブランドカラーを特定する:** ブランドを代表する色を選択します。
2. **`accent-color`プロパティを適用する:** CSSの要素やコンテナ要素(`body`や特定のフォームなど)に`accent-color`を追加します。
3. **ダークモードのサポート(任意ですが推奨):** サイトがダークモードをサポートすることをブラウザに知らせるために`color-scheme`を使用し、よりよいコントラストのために必要に応じて`accent-color`を調整します。

## サンプルコード: ブランドに統一感のあるフォームコントロール

```css
:root {
  --brand-color: #6200ee;
}

/* Apply accent-color to the body or a specific container */
body {
  accent-color: var(--brand-color);
}

/* Optional: Adjust for dark mode if needed */
@media (prefers-color-scheme: dark) {
  :root {
    --brand-color: #bb86fc; /* A lighter shade for dark mode */
  }
}
```

```html
<form>
  <!-- Checkbox -->
  <label for="subscribe">
    <input type="checkbox" id="subscribe" checked />
    Subscribe to newsletter
  </label>

  <!-- Radio Buttons -->
  <label for="plan-monthly">
    <input type="radio" id="plan-monthly" name="plan" value="monthly" />
    Monthly
  </label>
  <label for="plan-yearly">
    <input type="radio" id="plan-yearly" name="plan" value="yearly" checked />
    Yearly
  </label>

  <!-- Range Slider -->
  <label for="volume">Volume:</label>
  <input type="range" id="volume" min="0" max="100" value="70" />

  <!-- Progress Bar -->
  <label for="file">Upload Progress:</label>
  <progress id="file" max="100" value="70">70%</progress>
</form>
```

## 戦略的な実装とベストプラクティス

- **DO** `accent-color`を使用して、ブランドに合わせたフォームコントロールのテーマ設定を簡単に行ってください。
- **DO NOT** コントラストの処理をブラウザに盲目的に信頼しないでください。ブラウザは自動的に適格なコントラスト色を判定することになっていますが、**Safari**(WebKitバグ244233)や**Android Chrome**(Chromiumバグ343503163)などの実装には既知のバグがあり、背景に対して十分なコントラストを欠く色(例えば、ライトモードでの明るい色、ダークモードでの暗い色)を使用すると、チェックマークの色を反転できず、コントロールが見えにくくなったり見えなくなったりすることがあります。
- **DO** `accent-color`と`color-scheme: light dark`を組み合わせて、フォームコントロールがライトテーマとダークテーマの両方で見栄えがよくなるようにしてください。
- **DO NOT** ブラウザがコントラストを保証しようとしても、背景色に近すぎる色を使用しないでください。良好なベースコントラストを持つ色を提供するのが最善です。
- **DO NOT** `accent-color`がすべてのフォーム要素で機能すると仮定しないでください。現在のところ、これは`checkbox`、`radio`、`range`、`progress`要素のみを着色します。

## フォールバック戦略

accent-color has limited availability.
Supported by: Chrome 93 (Aug 2021), Edge 93 (Sep 2021), and Firefox 92 (Sep 2021).
Unsupported in: Safari.

`accent-color`をサポートしていないブラウザでは、フォームコントロールはブラウザのデフォルト表示にフォールバックします。すべての環境で完全なブランドの一貫性と高い信頼性を確保するには、確立された「視覚的に隠された入力」テクニックを使用してカスタムフォールバック戦略を実装する必要があります。

### `@supports not`によるプログレッシブエンハンスメント

`accent-color`がサポートされていない場合のみカスタムフォールバックスタイルを適用するには、`@supports not`ルールを使用しなければなりません。これにより、モダンブラウザでは`accent-color`のシンプルさを活用しつつ、古いブラウザに対しても一貫したブランド体験を保証できます。

#### 1. HTML構造

CSSの兄弟セレクタを使えるように、ラベルがテキストを`<span>`でラップしていることを確認してください:

```html
<label for="subscribe-fallback">
  <input
    type="checkbox"
    id="subscribe-fallback"
    class="visually-hidden"
    checked
  />
  <span>Subscribe to newsletter</span>
</label>
```

#### 2. CSSフォールバック

`@supports not`ブロック内でカスタムスタイルを適用します:

```css
/* Fallback for older browsers without accent-color */
@supports not (accent-color: var(--brand-color)) {
  /* Visually hide the native input using the canonical accessible recipe */
  form input[type='checkbox'].visually-hidden {
    position: absolute !important;
    clip-path: inset(50%) !important;
    overflow: hidden !important;
    width: 1px !important;
    height: 1px !important;
    margin: -1px !important;
    padding: 0 !important;
    border: 0 !important;
    white-space: nowrap !important;
  }

  /* Style the wrapper label */
  label {
    position: relative;
    padding-left: 2rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }

  /* Custom box for checkbox */
  input[type='checkbox'] + span::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1.2rem;
    height: 1.2rem;
    border: 2px solid #ccc;
    background: white;
    border-radius: 4px;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  /* Ensure custom checkbox shows focus for keyboard users */
  input[type='checkbox']:focus-visible + span::before {
    outline: 2px solid #000;
    outline-offset: 2px;
  }

  /* Checked State */
  input[type='checkbox']:checked + span::before {
    background-color: var(--brand-color, #6200ee);
    border-color: var(--brand-color, #6200ee);
  }

  /* Checkmark (Unicode) */
  input[type='checkbox']:checked + span::after {
    content: '✓';
    position: absolute;
    left: 0.25rem;
    top: 50%;
    transform: translateY(-50%);
    color: white;
    font-weight: bold;
    font-size: 0.9rem;
  }

  /* Fallback for Range Slider */
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  /* Webkit (Chrome, Safari, Edge) */
  input[type='range']::-webkit-slider-runnable-track {
    width: 100%;
    height: 8px;
    /* Use gradient to show progress for a static value (e.g., 70%) or update with JS */
    background: linear-gradient(
      to right,
      var(--brand-color, #6200ee) 70%,
      #ccc 70%
    );
    border-radius: 4px;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: var(--brand-color, #6200ee);
    cursor: pointer;
    margin-top: -4px; /* Center vertically */
  }

  /* Firefox */
  input[type='range']::-moz-range-track {
    width: 100%;
    height: 8px;
    background: #ccc;
    border-radius: 4px;
  }

  input[type='range']::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: var(--brand-color, #6200ee);
    cursor: pointer;
  }

  /* Firefox specific progress bar */
  input[type='range']::-moz-range-progress {
    background-color: var(--brand-color, #6200ee);
    height: 8px;
    border-radius: 4px;
  }

  /* Fallback for Progress Bar */
  progress {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    background: #ccc;
    height: 8px;
    border-radius: 4px;
  }

  progress::-webkit-progress-bar {
    background-color: #ccc;
    border-radius: 4px;
  }

  progress::-webkit-progress-value {
    background-color: var(--brand-color, #6200ee);
    border-radius: 4px;
  }

  progress::-moz-progress-bar {
    background-color: var(--brand-color, #6200ee);
    border-radius: 4px;
  }
}
```

### Webkitフォールバックでの動的なレンジ進捗表示

(accent-colorなしで)Webkitブラウザのレンジスライダーで進捗の塗りつぶしをサムと共に動かすには、CSS変数とわずかなJavaScriptを使用できます。

1. **CSSの更新**: グラデーションのストップにCSS変数を使用します:

```css
input[type='range']::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    var(--brand-color) var(--progress, 0%),
    #ccc var(--progress, 0%)
  );
}
```

2. **JavaScriptの追加**: `input`イベントで変数を更新します:

```javascript
if (!CSS.supports('accent-color')) {
  const slider = document.getElementById('volume');
  slider.addEventListener('input', (e) => {
    e.target.style.setProperty('--progress', `${e.target.value}%`);
  });
}
```
