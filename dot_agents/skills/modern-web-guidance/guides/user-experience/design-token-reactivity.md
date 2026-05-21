## 背景と概要

開発者はコンポーネントのデザインを文脈に応じて変更する必要がある場合がよくあります。歴史的に、開発者はそのような変更を適用するためにセレクタを使う必要がありました。これは多くの場合、デザイントークンの多くをカスタムプロパティとして表現できる一方で、より上位のデザイントークンはセレクタパターン（クラス名や属性の慣習）として、あるいは JavaScript フレームワークの props/context としてのみ表現できることを意味していました。

**コンテナスタイルクエリ**を使うと、開発者は祖先要素のカスタムプロパティの計算値に基づいて要素にスタイルを適用できます。これにより、開発者は表現をマークアップや JavaScript に依存せず、スタイルシート内に意味のあるデザイントークンの値として記述できるようになります。

## 実装方法

コンテナスタイルクエリを使ったリアクティブなデザイントークンの実装は非常にシンプルです。

1. 上位のデザイントークンをコンテナにカスタムプロパティとして設定します。これは登録済みのカスタムプロパティである必要はありません。
2. `@container style()` ルールでそのカスタムプロパティの値をクエリします。
3. コンテナ内の子孫要素に適切なスタイルを適用します。

いくつか注意点があります。

- スタイルクエリでクエリ対象となるコンテナには `container-type` や `container-name` を設定する必要はありませんが、`container-name` を設定するとより特定のクエリが可能になります。
- コンテナ自身はコンテナスタイルクエリによってスタイル付けすることはできません。

以下は上記の実装手順の基本的な例です。

```html
<div class="features">
  <div class="card"></div>
  <div class="card"></div>
</div>
<div class="bugs">
  <div class="card"></div>
  <div class="card"></div>
  <div class="card"></div>
  <div class="card"></div>
</div>
```

```css
.features {
  --density: spacious;
}

.bugs {
  --density: compact;
}

@container style(--density: compact) {
  .card {
    padding: 8px;
  }
}

@container style(--density: spacious) {
  .card {
    padding: 24px;
  }
}
```

## フォールバック戦略

コンテナスタイルクエリは限定的に利用可能です。
対応ブラウザ: Chrome 111（2023 年 3 月）、Edge 111（2023 年 3 月）、Safari 18（2024 年 9 月）。
未対応: Firefox。

コンテナスタイルクエリが Baseline サポートになるまでは、すべてのブラウザで利用可能でなければならないコア機能には使用しないことを推奨します。なぜなら、メリットを損なわず、それ自身に制限のないフォールバックを作るのが容易ではないからです。たとえば、UI 密度のユーザー設定をすべての体験で必須となるコア機能と見なさない場合は、フォールバックなしでコンテナスタイルクエリを使って実装できます。

### 代替としてセレクタを使う

コア機能の場合、代替アプローチとしてセレクタを使うべきです。次の例では `data-density` 属性を使って密度のデザイントークンをカスタムプロパティではなくマークアップで表現しています。

```html
<div class="features" data-density="spacious">
  <div class="card"></div>
  <div class="card"></div>
</div>
<div class="bugs" data-density="compact">
  <div class="card"></div>
  <div class="card"></div>
  <div class="card"></div>
  <div class="card"></div>
</div>
```

```css
/* This example uses `:where()` to avoid increasing specificity */
:where([data-density='compact']) .card {
  padding: var(--card-padding-compact);
}

:where([data-density='spacious']) .card {
  padding: var(--card-padding-spacious);
}
```

このフォールバックアプローチの主な制限は、`data-density` 属性が設定された要素のネストをサポートしないことです。セレクタの詳細度が同じため、出現順でスタイルが決定されます（つまり `[data-density="spacious"]` は常に `[data-density="compact"]` より優先されます）。

### スタイルクエリをプログレッシブエンハンスメントとして使う

推奨はされませんが、コア機能のプログレッシブエンハンスメントとしてスタイルクエリを使いたい場合は、重複を避けるためにカスタムプロパティを作成し、その後にスタイルクエリを記述できます。フォールバックアプローチでは、詳細度を上げないようにコンテナ要素の選択時に `:where()` を使用してください。

```css
.card {
  --card-padding-compact: 8px;
  --card-padding-spacious: 24px;
}

:where([data-density='compact']) .card {
  padding: var(--card-padding-compact);
}

:where([data-density='spacious']) .card {
  padding: var(--card-padding-spacious);
}

/* Use style queries as a progressive enhancement: same specificity, so order of appearance is used */

@container style(--density: compact) {
  .card {
    padding: var(--card-padding-compact);
  }
}

@container style(--density: spacious) {
  .card {
    padding: var(--card-padding-spacious);
  }
}
```

### CSS だけで機能検出する

コンテナスタイルクエリの機能検出を行い、それに依存する UI を条件付きで表示したい場合は、スタイルクエリそのものでチェックできます。

```css
:root {
  --style-queries-supported: check;
}

.density-toggle {
  display: none;
}

@container style(--style-queries-supported) {
  .density-toggle {
    display: revert;
  }
}
```

### JavaScript で機能検出する

JavaScript で機能検出する場合は少し複雑です。`CSSContainerRule` インターフェイスはコンテナスタイルクエリが追加される前から存在していたため、この目的では信頼できません。代わりに、スタイルクエリで設定された既知のプロパティの計算値を確認する必要があります。

次の例ではカスタムプロパティを使用しているため、視覚的な影響はありません。

```css
:root {
  --style-queries-supported: check;
}

@container style(--style-queries-supported: check) {
  body {
    --style-queries-supported: yes;
  }
}
```

そして JavaScript で次のように計算値をチェックします。

```js
if (
  getComputedStyle(document.body).getPropertyValue(
    '--style-queries-supported',
  ) === 'yes'
) {
  // Use container style queries
} else {
  // Use fallback strategy
}
```
