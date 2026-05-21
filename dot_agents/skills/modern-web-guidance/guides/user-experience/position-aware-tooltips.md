CSSアンカーポジショニングでツールチップやポップオーバーを構築すると、ブラウザは要素がビューポートからはみ出る場合に自動的にフォールバック位置へ「フリップ」できます。これが発生したときに、位置決めされたコンテンツのスタイルを調整したくなることがあります。例えば、ポジショニングされたコンテンツからアンカーを指す矢印の位置を変えるためです。

**アンカード コンテナクエリ**は、要素のアクティブなポジショニング状態をクエリしてスタイルを適用できるようにすることで、この問題を解決します。

## 課題

デフォルトではアンカーの上に表示されるツールチップを想像してください。下に「下向き」の矢印が付いています。もしユーザーがスクロールしてツールチップがアンカーの*下*に表示されるようフリップすると、矢印は今や逆方向を向いており、ツールチップの間違った側に位置することになります。

## 解決策: アンカード コンテナクエリ

ポジショニング対象の要素に`container-type: anchored`を設定すると、自身のアンカー位置決め状態を知っているクエリコンテナになります。その後、`@container anchored()`クエリでその子孫や擬似要素を更新できます。

### 1. ツールチップとトリガーを作成する

Popover APIを使ってツールチップを作成します。これにより、ポジショニングに使える暗黙のアンカー接続が作られます。

```html
<button popovertarget="tooltip" id="anchor" aria-describedby="tooltip">
  anchor
</button>
<div id="tooltip" popover role="tooltip"></div>
```

アンカーポジショニング用にポップオーバーのinsetとmarginスタイルをリセットしますが、アンカーポジショニングがサポートされている場合のみです。

```css
@supports (anchor-name: --my-anchor) {
  [popover] {
    inset: auto;
    margin: unset;
  }
}
```

### 2. コンテナを設定する

ポジショニング対象の要素に`container-type: anchored`を適用します。この要素にはフリップ挙動を有効化するため`position-try-fallbacks`も定義する必要があります。

```css
#tooltip {
  position: fixed;
  position-area: block-start;
  position-try-fallbacks: flip-block;

  /* Enable anchored container queries */
  container-type: anchored;
}
```

### 3. フォールバックに基づいてスタイルを適用する

`@container anchored(fallback: <value>)`を使って、特定のフォールバックがアクティブなときにスタイルを適用します。

すべてのコンテナクエリと同様に、`@container`はコンテナの**子孫**のみスタイルできます。矢印を作る一般的な戦略は`::before`や`::after`擬似要素を使うことで、これらは子孫として扱われ直接スタイルできます。ただし、ツールチップ自体をスタイルする場合（手順4参照）は、ツールチップに子要素を追加し、その`::before`擬似要素で矢印を作ります。

```html
<div id="tooltip" popover role="tooltip">
  <div class="tooltip-content">Tooltip</div>
</div>
```

```css
.tooltip-content::before {
  /* Default "down" arrow for the 'top' position */
  content: '▼';
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 1rem;
}

/* Update to an "up" arrow when the 'flip-block' fallback (bottom) is active */
@container anchored(fallback: flip-block) {
  .tooltip-content::before {
    content: '▲';
    inset-block-start: 0;
    inset-block-end: auto;
  }
}
```

## 4. コンテナ自体をスタイルする

コンテナがフリップしたときにコンテナ自身のプロパティ（`margin`や`background-color`など）を変更する必要がある場合は、**内側のラッパー要素**を使うべきです。

1. 外側のポジショニング対象要素に`container-type: anchored`を適用します。
2. `@container`ブロック内で内側の要素をターゲットにします。

```css
@container anchored(fallback: flip-block) {
  .tooltip-content {
    border-radius: 0 0 0.5rem 0.5rem;
    margin-block-start: 0.25rem;
  }
}
```

## ベストプラクティス

- **論理的フォールバックを優先する**: `position-try-fallbacks`では`flip-block`や`flip-inline`のようなキーワードを使い、RTLや異なる書字方向を自動的に扱える、よりシンプルなクエリにします。
- **矢印には擬似要素を使う**: ツールチップの矢印は純粋に装飾的なので、`::before`や`::after`の格好の対象です。余計なDOMなしにアンカード コンテナクエリでスタイルできます。

## フォールバック戦略

Anchor position container queries has limited availability.
Supported by: Chrome 143 (Dec 2025) and Edge 143 (Dec 2025).
Unsupported in: Firefox and Safari.

適用されたフォールバックに基づく矢印の位置決めはプログレッシブエンハンスメントであり、フォールバック位置に反応する他の方法はありません。アンカー位置コンテナクエリ非対応のブラウザで矢印を非表示にするには、`@supports (container-type: anchored)`でCSSサポートをテストしてください。

```css
@supports (container-type: anchored) {
  .tooltip-content::before {
    content: '▼';
  }
}
```

### Popover属性のポリフィル

Baseline status for Popover: Newly available. It's been Baseline since 2025-01-27.
Supported by: Chrome 116 (Aug 2023), Edge 116 (Aug 2023), Firefox 125 (Apr 2024), Safari 17 (Sep 2023), and Safari iOS 18.3 (Jan 2025).

古いブラウザで`popover`属性をサポートするには、`@oddbird/popover-polyfill`を使ってください。

MANDATORY: `HTMLElement`プロトタイプに`popover`プロパティがあるかを確認することで、Popoverサポートを機能検出してください。ネイティブサポートがない場合のみ、条件付きでポリフィルを初期化します。

**オプション1: パッケージマネージャを使う**
パッケージをインストールします（`npm install @oddbird/popover-polyfill`）。

```javascript
// MANDATORY: Feature detect 'popover' on HTMLElement.prototype.
if (!('popover' in HTMLElement.prototype)) {
  import('@oddbird/popover-polyfill/fn').then(({ apply }) => {
    apply();
  });
}
```

**オプション2: npmを使わない手動インストール**
パッケージマネージャを使っていない場合は、`<script type="module">`の中でCDN（unpkgなど）から直接ポリフィルを動的インポートしてください。

```html
<script type="module">
  // MANDATORY: Feature detect 'popover' on HTMLElement.prototype.
  // Conditionally load the popover-polyfill from a CDN only in browsers lacking native support.
  if (!('popover' in HTMLElement.prototype)) {
    import('https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover-fn.js').then(
      ({ apply }) => {
        apply();
      },
    );
  }
</script>
```

Popover APIをサポートしていないブラウザは、アンカーポジショニングもサポートしていません。そのため、ツールチップは画面中央に表示されます。
