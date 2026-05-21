表示されるアクションパネルやポップオーバーボタングループは、最小のスペースで追加機能にアクセスさせるための便利なパターンです。このオーバーレイパターンには、パネルをトリガー要素にテザリングしつつビューポートの制約に適応させるというレイアウトの複雑さがあります。従来は、複雑なJavaScriptライブラリ（Popper.jsやFloating UIなど）で位置を計算し衝突を扱う必要がありました。

CSSアンカーポジショニングは、これらの関係を完全にCSSで宣言的かつ高パフォーマンスに扱う方法を提供し、ブラウザがネイティブに位置決めとオーバーフローのロジックを管理できるようにします。

> [!NOTE]
> このガイドはアンカーポジショニングとポップオーバーの仕組みを解説するもので、特定のアクセシブルなUIパターンを規定するものではありません。以下のトリガーとパネルは、**ボタンが別のボタングループを表示する**シンプルな形で示しています。真のARIAメニュー（`role="menu"`に矢印キーナビゲーション）、コンボボックス、ディスクロージャウィジェット、その他の名前付きパターンが必要な場合は、ここで示すポジショニング技術の上に、そのパターン固有のセマンティクスとキーボード操作の取り決めをすべて重ねてください。

### 1. ボタンとパネルの関係を定義する

最初のステップは、Popover APIを使ってオーバーレイコンテナを開くトリガーボタンを作成することです。

**MANDATORY アクセシビリティの区別:** このパターンは真のARIAメニューではなく、明示的に**ポップオーバー内に現れるボタングループ**をモデル化します。対応するキーボードナビゲーション契約（例: アイテム間の空間的な矢印キーナビゲーションを処理する）を完全に実装しない限り、`role="menu"`や`role="menuitem"`を適用しないでください。同じ理由で、トリガーに`aria-haspopup`を追加しないでください。その値（`menu`、`listbox`、`tree`、`grid`、レガシーな`true`）はターゲットが対応するロールを公開しているという約束ですが、このパターンはそうではありません。

```html
<button popovertarget="action-panel">
  Open Actions
</button>
<!-- Use the Popover API (`popover="auto"`) for the overlay to ensure it is placed in the top layer and handled accessibly by the browser. -->
<div id="action-panel" popover="auto" class="panel">
  <button class="action-item" type="button">Edit</button>
</div>
```

これにより、ボタンとパネルの間に*暗黙の*アンカー関連付けが作られ、ボタンを基準にパネルを位置決めできるようになります。

### 2. `position-area`で位置決めする

手動の`top`／`left`オフセットの代わりに、`position-area`を使ってアンカーを基準とした3x3グリッド上にターゲットを配置します。

```css
.panel {
  /* 
     Position the panel below the anchor (block-end), 
     aligned to the start of the anchor and spanning to its end (span-inline-end).
  */
  position-area: block-end span-inline-end;
  
  /* Reset insets to allow the grid to take control */
  inset: auto;
}
```

物理キーワード（`left`、`top`）よりも論理キーワード（`span-inline-end`、`block-start`）を優先することで、RTLや異なる書字方向を自動的にサポートできます。

**MANDATORY**: `position-area`で物理キーワードと論理キーワードを混在させないでください。

### 3. エッジレジリエンスを実装する（フォールバック）

パネルが画面端で切り落とされないように、デフォルト位置がはみ出した場合にブラウザが試行すべき「フォールバック方針」を定義します。

```css
.panel {
  /* 
     If the panel overflows the bottom, flip it to the top (flip-block).
     If it overflows the inline edges, flip it horizontally (flip-inline).
  */
  position-try-fallbacks: flip-block, flip-inline;
}
```

## フォールバック戦略

Baseline status for Popover: Newly available. It's been Baseline since 2025-01-27.
Supported by: Chrome 116 (Aug 2023), Edge 116 (Aug 2023), Firefox 125 (Apr 2024), Safari 17 (Sep 2023), and Safari iOS 18.3 (Jan 2025).

Popoverは`@oddbird/popover-polyfill`ポリフィルを条件付きで適用する必要があります。

```html
<script type="module">
  if(!HTMLElement.prototype.hasOwnProperty("popover")){
    await import("https://unpkg.com/@oddbird/popover-polyfill@latest");
  }
</script>
```

アンカーポジショニングは現在、主要ブラウザではネイティブにはサポートされていません。

アンカーポジショニング非対応のブラウザに対応するには、合理的な位置を指定する必要があります。ポップオーバーはデフォルトで画面中央に配置されますが、これでもユースケースによっては機能します。

ユースケースによっては、いくつかのアンカーポジショニングのユースケースをサポートする`@oddbird/css-anchor-positioning`ポリフィルを使えることもあります。このポリフィルは暗黙アンカーをサポートしないため、トリガーには必ずアンカー名を追加する必要があります。さらに、ポリフィルはポップオーバー上での`position-area`をサポートしないため、目的のinsetには必ず`anchor()`を使う必要があります。

```html
<!-- MANDATORY: Conditionally install the anchor positioning polyfill -->
<script type="module">
  if (!("anchorName" in document.documentElement.style)) {
    await import("https://unpkg.com/@oddbird/css-anchor-positioning");
  }
</script>
```

```css
.panel {
  /* Mandatory: use explicit anchor name */
  position-anchor: --kebab-anchor;
  /* Mandatory: use insets rather that position-area for positioning */
  bottom: auto;
  right: auto;
  top: anchor(bottom);
  left: anchor(left);
  margin: 0;
}
```
