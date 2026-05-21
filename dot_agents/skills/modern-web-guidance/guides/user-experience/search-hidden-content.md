# 非表示コンテンツを検索可能にする

Webインターフェースでは、ユーザー体験の向上、画面領域の節約、ページパフォーマンスの改善のためにコンテンツを画面から隠すことがよくあります。`display: none` や `visibility: hidden` といった従来の方法はコンテンツを視覚的に隠せますが、それらの方法はスクリーンリーダーやブラウザの「ページ内検索」機能からも完全にアクセス不可能にしてしまいます。

視覚的に隠しつつ、ユーザーが検索可能なまま、URLフラグメントや「Scroll to Text Fragment」リンクからのディープリンクも有効にしたい場合は、HTMLの `<details>` 要素か `hidden="until-found"` 属性のいずれかを使用できます。`<details>` 要素は実装と保守がシンプルなため一般的に推奨されますが、`<details>` では不十分で `hidden="until-found"` が必要となる複雑なケースもあります。

例えば次のような場合です。

- 表示/非表示の仕組みのスタイリングを完全に制御したい場合。
- 表示/非表示を制御するUIがDOM上の別の場所にある場合。
- 一度表示したコンテンツを再び隠すことをサポートしたくない場合。

## 実装方法

`<details>` 要素はデフォルトで検索可能でアクセシブルなテキストを持ち、特別な実装は不要です。可能であれば `hidden="until-found"` よりも `<details>` を優先してください。

代わりに `hidden="until-found"` を使う必要がある場合は、次の手順に従ってください。

1. **属性を適用する:** 非表示にしたいコンテンツを含む要素に直接 `hidden="until-found"` HTML属性を追加します。
2. **UI状態を同期する:** インターフェースにコンテンツの可視性に依存する関連状態がある場合(ARIA属性の更新、開閉用CSSクラスの切り替え、アコーディオンアイコンの回転など):
   - `beforematch` イベントのリスナーを **必ず** 追加してください。
   - `beforematch` イベントリスナーは `hidden="until-found"` を持つ要素そのものに直接登録します。イベントはバブルするため、代わりに親要素(タブコンテナなど)に1つのリスナーを登録するイベント委譲で複数の非表示セクションをまとめて管理することもできます。
   - イベントリスナー内で、関連するUI要素を同期するロジック(他の開いているタブを閉じる、トグルボタンの状態を変更するなど)を実行します。

## サンプルコード

**目標:** ユーザーがそのセクション内の単語を検索するまではコンテンツがユーザーから不可視のままになる、非表示コンテナを描画します。

### `<details>` 要素を使う

```html
<details>
  <summary>Click to expand</summary>
  <p>This content is visually hidden.</p>
</details>
```

#### 相互排他的な開閉

排他的アコーディオンのような、相互排他的なコンテンツ領域を扱う際は、共有の `name` 属性を持つネイティブHTMLの `<details>` 要素を使ってください。

```html
<div class="accordion-group">
  <!-- The name attribute creates an exclusive disclosure group -->
  <details class="disclosure" name="my-accordion">
    <summary>Section 1</summary>
    <p>Section 1 content</p>
  </details>

  <details class="disclosure" name="my-accordion" open>
    <summary>Section 2</summary>
    <p>Section 2 content</p>
  </details>

  <details class="disclosure" name="my-accordion">
    <summary>Section 3</summary>
    <p>Section 3 content</p>
  </details>
</div>
```

### `hidden="until-found"` 属性を使う

```html
<!-- The browser automatically removes hidden="until-found" upon a search match -->
<div class="hidden-container" hidden="until-found">
  <p>This content is visually hidden.</p>
</div>
```

#### カスタムの相互排他的な開閉

外部のボタンで制御するカスタムの相互排他領域を扱う際は、マッチしたパネルだけが表示されたままになるようにしてください。`beforematch` イベントハンドラーでは、制御ボタンに `aria-expanded="true"` を設定するなど、関連するARIA状態を **必ず** 同期してください。

```html
<div class="custom-accordion">
  <div class="controls">
    <button aria-expanded="true" aria-controls="panel-1" id="btn-1">Section 1</button>
    <button aria-expanded="false" aria-controls="panel-2" id="btn-2">Section 2</button>
  </div>

  <div id="panel-1" class="panel">
    <p>Section 1 content (visible)</p>
  </div>

  <div id="panel-2" class="panel" hidden="until-found">
    <p>Section 2 content (hidden)</p>
  </div>
</div>
```

```javascript
const accordion = document.querySelector('.custom-accordion');

accordion.addEventListener('beforematch', (e) => {
  // Hide all panels and synchronize button states before the browser reveals the matched panel
  accordion.querySelectorAll('.panel').forEach((panel) => {
    if (panel !== e.target) {
      panel.hidden = 'until-found';
    }
  });
  accordion.querySelectorAll('button').forEach((btn) => {
    const controls = btn.getAttribute('aria-controls');
    btn.setAttribute('aria-expanded', controls === e.target.id ? 'true' : 'false');
  });
});
```

## `hidden="until-found"` のベストプラクティス

- **DO** ボーダー、パディング、背景は `hidden="until-found"` 属性を持つ要素に直接適用するのではなく、ネストした子のラッパーに適用してください。これにより、要素が非表示の状態で意図せぬレイアウトシフトや視覚的な残骸が発生するのを防げます。
- **DO NOT** `hidden="until-found"` 属性を持つ要素に直接 `display: none`、`visibility: hidden`、その他関連する `display` や `visibility` のCSSプロパティを適用しないでください。ネイティブの機能が壊れ、コンテンツが検索インデックスから永久に隠されてしまいます。
- **DO NOT** 機密情報、内部データトークン、検索で露出すべきでない無関係なデータに `hidden="until-found"` を使用しないでください。
- **DO NOT** 「スクリーンリーダー専用」(.sr-only)テキストの代替として `hidden="until-found"` を使用しないでください。

## ブラウザサポートとフォールバック戦略

`<details>` 要素はBaseline Widely available なため、フォールバック戦略は不要です。

`hidden="until-found"` 属性はまだ Baseline Widely available ではありませんが、未対応ブラウザ向けのフォールバックを用意すれば安全に使用できます。アクセシビリティ上のメリットがフォールバック実装のコストを大きく上回るため、ブラウザサポートが足りないからといって `hidden="until-found"` を **避けないでください**。

#### `hidden="until-found"` のフォールバック

アコーディオンや「もっと読む」セクションのような標準的なUI要素には、JavaScriptで機能検出を行い、未対応の場合はすべてのコンテンツを表示するようにします。

```javascript
if (!('onbeforematch' in HTMLElement.prototype)) {
  // Expand all hidden content for unsupported browsers
  document.querySelectorAll('[hidden="until-found"]').forEach((el) => {
    el.removeAttribute('hidden');
    // MANDATORY: also update any aria references to this element.
  });
}
```

コンテンツが同じ視覚領域を共有するカスタム排他パネルのような相互排他的なUIパラダイムの場合、フォールバックでは主要な操作領域の下にすべてのコンテンツを線形に展開し、URLアンカーフラグメントによってそれぞれのセクションへ直接遷移できるようにします。
