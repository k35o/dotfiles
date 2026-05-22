CSS Custom Highlight APIを使うと、DOM構造を変更せずにページ上の任意のテキスト範囲をスタイリングできます。これにより、テキストを追加要素で包んだり `innerHTML` の操作に頼ったりせずに、検索結果のハイライト、シンタックスカラーリング、共同編集のカーソル、スペルや文法エラーマーカーなどを実現できます。

### コア実装

テキスト範囲をハイライトするには、対象のテキストノードを収集し、`Range` と `Highlight` オブジェクトを作成し、`HighlightRegistry` に登録し、`::highlight()` 疑似要素でスタイリングする必要があります。

#### 1. テキストノードを収集してレンジを作成する

`TreeWalker` を使ってターゲット要素内のすべてのテキストノードを収集し、ハイライトしたい文字オフセットを指す `Range` オブジェクトを作成します。

```javascript
const article = document.querySelector('article');

// MANDATORY: Use TreeWalker to collect text nodes — do not manipulate innerHTML.
const treeWalker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
const allTextNodes = [];
let currentNode = treeWalker.nextNode();
while (currentNode) {
  allTextNodes.push(currentNode);
  currentNode = treeWalker.nextNode();
}

// MANDATORY: Set range start/end on text nodes, not element nodes.
const range = new Range();
range.setStart(textNode, matchStartIndex);
range.setEnd(textNode, matchEndIndex);
```

ツリーの走査はコストが高いため、テキストノードのリストをキャッシュし、DOMコンテンツが実際に変わったときだけ再構築してください。

#### 2. レンジからHighlightを作成する

1つ以上の `Range` オブジェクトを `Highlight` にグループ化します。同じスタイルを共有する複数のレンジは1つのhighlightにまとめます。

```javascript
const searchHighlight = new Highlight(...matchingRanges);
```

#### 3. レジストリにハイライトを登録する

`Map` のような `HighlightRegistry` である `CSS.highlights` を使って、各 `Highlight` をカスタム名で登録します。

```javascript
// MANDATORY: Clear previous highlights before registering new ones
// to avoid stale ranges persisting on the page.
CSS.highlights.clear();

CSS.highlights.set('search-results', searchHighlight);
```

複数のハイライトが重なる場合、`priority` プロパティで重なり順を制御します。優先度が高いハイライトが上に描画されます。

```javascript
const primary = new Highlight(...primaryRanges);
primary.priority = 1;

const secondary = new Highlight(...secondaryRanges);
secondary.priority = 0; // painted first (behind primary)

CSS.highlights.set('primary', primary);
CSS.highlights.set('secondary', secondary);
```

#### 4. `::highlight()` でスタイリングする

CSSの `::highlight()` 疑似要素を使い、登録された各ハイライトを名前でスタイリングします。

```css
::highlight(search-results) {
  background-color: #ffdd00;
  color: black;
}
```

`::highlight()` 内で動作するCSSプロパティは限定されています: `color`、`background-color`、`text-decoration` とそのlonghands、`text-shadow`、`-webkit-text-stroke-color`、`-webkit-text-fill-color`、`-webkit-text-stroke-width` です。`background-image`、`font-size`、`padding` などのプロパティは無視されます。

### アクセシビリティ

**避けるべきこと**: カスタムハイライトをセマンティックHTMLの代替として使うこと。

カスタムハイライトは純粋に表現的であり、アクセシビリティツリーには公開されません。ハイライトされたテキストがドキュメントに意味的に関連する場合（例: ユーザーが選択した一節）、代わりに `<mark>` を使用してください。カスタムハイライトは、検索結果やシンタックスカラーリングのような一時的で視覚専用の効果のために確保してください。

ハイライトは意味を伝えるために色のみに依存すべきではありません。ハイライトがエラーを示す場合は、`text-decoration: wavy underline` のような別の視覚インジケータや隣接するテキストラベルと組み合わせてください。ハイライト背景とテキストの色の間に十分なコントラスト（通常テキストで少なくとも4.5:1）があり、WCAG 2.1の要件を満たすようにしてください。

### フォールバック戦略

Custom highlightsのBaselineステータス: Newly available。2026年3月24日からBaseline入りしました。
サポート: Chrome 105（2022年9月）、Edge 105（2022年9月）、Firefox 149（2026年3月）、Safari 17.2（2023年12月）。

CSS Custom Highlight APIをサポートしないブラウザに対しては、視覚的ハイライトがなくてもテキストが読める機能ベース体験を提供する必要があります。

APIを使う前にサポートを検出できます:

```javascript
if (CSS.highlights) {
  // CSS Custom Highlight API is supported.
} else {
  // Fallback: wrap matches in <mark> elements.
}
```

ハイライトがユーザー体験にとって重要な場合、一致するテキストを `<mark>` 要素で包むフォールバックを提供します。これはDOMを変更するため、イベントリスナーを保持し、ドキュメント構造を壊さないように注意してください。

```javascript
if (!CSS.highlights) {
  // Walk text nodes and wrap matches in <mark>, preserving structure.
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);

  const term = searchTerm.toLowerCase();
  for (const textNode of nodes) {
    const text = textNode.textContent;
    let pos = text.toLowerCase().indexOf(term);
    if (pos === -1) continue;

    const frag = document.createDocumentFragment();
    let last = 0;
    while (pos !== -1) {
      frag.append(text.slice(last, pos));
      const mark = document.createElement('mark');
      // textContent assignment avoids HTML injection.
      mark.textContent = text.slice(pos, pos + term.length);
      frag.append(mark);
      last = pos + term.length;
      pos = text.toLowerCase().indexOf(term, last);
    }
    frag.append(text.slice(last));
    textNode.replaceWith(frag);
  }
}
```
