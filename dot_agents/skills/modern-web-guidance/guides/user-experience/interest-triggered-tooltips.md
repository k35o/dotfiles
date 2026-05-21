# ホバーでツールチップを表示する

ユーザーは、コンテキストを完全に切り替えずに関連する追加情報を確認したいと考えるものです。ツールチップは、ユーザーがより詳しい情報に関心を示したときに表示するのに便利で、用語の定義、アイコンのみのボタンが行うアクションの明確化、フォームフィールドの追加ガイダンスなどに利用できます。

## ツールチップを作成する

`<div>` などの意味的に適切な要素に `popover="hint"` 属性を追加することで、必要な挙動を備えたポップオーバーを作成できます。ユーザーがツールチップを開くと、他の `popover="hint"` のツールチップは隠れますが、`auto` や `manual` のツールチップは隠れません。ネストされたツールチップの dismiss も適切に処理されます。

また、ライトディスミスの挙動も備えており、ユーザーがポップオーバーの外側をクリックしたり別の場所にフォーカスを移したりすると、ポップオーバーは閉じます。

ツールチップ要素には、一意の値を持つ `id` 属性が必要です。

```html
<!-- MANDATORY: The tooltip container `<div>` must have a `popover` attribute.
     the value of `"hint"` ensures it can be "light dismissed". -->
<div popover="hint" id="tooltip">Tooltip content</div>
```

ユーザーは `<a>` または `<button>` 要素にホバーしたりフォーカスを当てたりすることで追加情報への関心を示します。その要素には、ツールチップの `id` 属性と一致する `interestfor` 属性を付ける必要があります。

```html
<!-- The `interestfor` attribute can be applied to a `<button>` element: -->
<button interestfor="tooltip">Tooltip trigger</button>

<!-- The `interestfor` attribute can also be applied to an `<a>` element: -->
<a interestfor="tooltip" href="">Tooltip trigger</a>
```

トリガーには、インタラクションすると追加情報が得られることを示す視覚的な手がかりが必要です。

### `interestfor` に組み込まれたアクセシビリティ

`interestfor` は支援技術との連携を内部で処理するため、通常は手動で ARIA 属性を追加する必要はありません。

- `popover="hint"` を持つターゲットは、暗黙の最小ロールとして `tooltip` を持ちます。**DO NOT** `role="tooltip"` を自分で設定しないでください。
- ターゲットがプレーンテキストなら `aria-describedby` を、インタラクティブなコンテンツを含むなら `aria-details` を使って、ブラウザがソース要素とターゲットを暗黙的に関連付けます。**DO NOT** トリガーに `aria-describedby` や `aria-details` を追加しないでください。
- 関連付けは必要に応じて `aria-details` に切り替わるので、ターゲットはインタラクティブなコンテンツを含むことができます（例: 「interest card」内のリンクなど）。

### アクセシビリティ上の制約（WCAG 1.4.13）

`interestfor` が上記のセマンティクスを処理してくれても、実装は WCAG 1.4.13（Content on Hover or Focus）を満たす必要があります。
- **Dismissible（解除可能）:** ポインタのホバーやキーボードフォーカスを動かさずに、ユーザーがツールチップを解除できる必要があります（例: `Escape` キーで）。ネイティブの `popover` 属性がこのバインドを自動で管理します。
- **Hoverable（ホバー可能）:** ポインタがツールチップのコンテンツ自身の上に移動してもツールチップは消えてはいけません。これにより、拡大ツールを使うユーザーが安全にツールチップを読めます。
- **Persistent（持続）:** ツールチップは、ホバーやフォーカスのトリガーが外れるか、ユーザーが明示的に解除するか、コンテンツが無効になるまで表示され続ける必要があります。

### ツールチップの配置

ツールチップはアンカーポジショニングで配置できます。`interestfor` でツールチップが開かれると、トリガーはツールチップの暗黙のアンカーになるため、`anchor-name` や `position-anchor` CSS プロパティを追加する必要はありません。ただし、アンカーポジショニングをサポートしないブラウザに対応するにはアンカーポジショニングのポリフィルを使う必要があり、これにはポップオーバーに関するいくつかの制限があります。**必須:** 暗黙のアンカーはポリフィルでサポートされていないため、トリガーに `anchor-name` を、ポップオーバーに `position-anchor` を必ず明示的に設定してください。


```css
/* MANDATORY: use explicit anchor names for compatibility with the polyfill */
button[interestfor="tooltip-dom"] {
  anchor-name: --tooltip-dom;
}
#tooltip-dom {
  position-anchor: --tooltip-dom;
}
```

また、このポリフィルはポップオーバーで `position-area` をサポートしないため、**必須:** `anchor()` 関数で配置し、`position-try` のフォールバック（例: `flip-block` や `flip-inline`）を必ず含めてください。

```css
[popover]{
  /* MANDATORY: use anchor functions and a position-try fallback for the polyfill */
  top: anchor(bottom);
  left: anchor(center);
  position-try: flip-block;
  margin: unset;
}
```


### フォールバック戦略

Interest invokers は限定的に利用可能です。
対応ブラウザ: Chrome 142（2025 年 10 月）、Edge 142（2025 年 10 月）。
未対応: Firefox、Safari。

Interest invokers は、NPM の `interestfor` ポリフィルパッケージを使って条件付きでポリフィルする必要があります。CDN ではなく、バンドル方式を優先してください。

```html
<script type="module">
  if(!HTMLButtonElement.prototype.hasOwnProperty("interestForElement")){
    // CDN link only used for example, prefer bundling.
    await import("https://unpkg.com/interestfor@latest");
  }
</script>
```

Popover の Baseline ステータス: Newly available。2025-01-27 から Baseline です。
対応ブラウザ: Chrome 116（2023 年 8 月）、Edge 116（2023 年 8 月）、Firefox 125（2024 年 4 月）、Safari 17（2023 年 9 月）、Safari iOS 18.3（2025 年 1 月）。
popover="hint" は限定的に利用可能です。
対応ブラウザ: Chrome 133（2025 年 2 月）、Edge 133（2025 年 2 月）、Firefox 149（2026 年 3 月）。
未対応: Safari。

Popover と popover hint は `@oddbird/popover-polyfill` で条件付きにポリフィルする必要があります。`popover` はサポートしているが `popover="hint"` をサポートしていないブラウザでは、hint の挙動はポリフィルされません。そのため、フォーカスで開いたツールチップが、別のホバーで開いたツールチップが現れたときに閉じずに残ることがあります。

```html
<script type="module">
  if(!HTMLElement.prototype.hasOwnProperty("popover")){
    await import("https://unpkg.com/@oddbird/popover-polyfill@latest");
  }
</script>
```

アンカーポジショニングは現状どの主要ブラウザでもネイティブにはサポートされていません。

**必須:** アンカーポジショニングをサポートしないブラウザに対応するには、`@oddbird/css-anchor-positioning` ポリフィルを必ず使用してください。暗黙のアンカーはサポートされないので、トリガーにアンカー名を必ず追加します。さらに、ポップオーバーに対する `position-area` はポリフィルでサポートされていないため、目的のインセットに対して `anchor()` を必ず使用してください。

```html
<!-- MANDATORY: Conditionally install the anchor positioning polyfill -->
<script type="module">
  if (!("anchorName" in document.documentElement.style)) {
    await import("https://unpkg.com/@oddbird/css-anchor-positioning");
  }
</script>
```

```css
button[interestfor="tooltip-attrs"] {
  /* MANDATORY: Each trigger and popover pair must have a unique anchor name, referenced by `anchor-name` on the trigger and `position-anchor` on the popover. */
  anchor-name: --tooltip-attrs;
}
#tooltip-attrs {
  position-anchor: --tooltip-attrs;
  /* If using the anchor positioning polyfill with a popover, DO use `anchor()` functions, and not `position-area. */
  top: anchor(bottom);
  left: anchor(right);
  margin: unset;
}
```
