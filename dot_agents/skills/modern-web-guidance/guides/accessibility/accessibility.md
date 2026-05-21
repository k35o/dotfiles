# アクセシビリティのコーディングガイドライン

このガイドは、AIコーディングエージェントが、支援技術を利用する人を含むすべてのユーザーにとってアクセシブルなWebアプリケーションを構築できるよう、実践的なDOとDON'Tを提供します。

以下の原則を常に念頭に置いてください。

- **アクセシビリティは最低基準であり、上限ではありません。** 標準への準拠はあくまで出発点であり、真の使いやすさを目指してください。
- **パターンはユースケースに依存します。** どんなチェックリストも、実際のテスト（障害のあるユーザーによるテストを含む）の代替にはなりません。実装が文脈において本当にアクセシブルかどうかは、テストで確認する必要があります。

## 1. コンテンツのナビゲーション性と構造

### 実践ガイドライン

#### DOs

- **すべてのコンテンツをランドマーク内に配置する**: ページを `<header>`、`<nav>`、`<main>`、`<aside>`、`<footer>` で包み、支援技術のユーザーが領域間を移動できるようにします。
- **見出しで主要コンテンツを構造化する**: `<h1>`〜`<h6>` を順番に使用し（`<h1>` から `<h4>` へ飛ばさない）、スクリーンリーダーのユーザーがナビゲーション可能なアウトラインを得られるようにします。
- **繰り返される連続したコンテンツにはリストを使用する**: `<ul>`/`<ol>` は支援技術にあらかじめ件数を伝え、ユーザーがグループ全体をスキップできるようにします。
- **繰り返されるコンテンツ（ナビゲーション付きのサイトヘッダーや長い・無限のリストなど）の前にスキップリンクを提供する**ことで、キーボードユーザーが簡単にそれらをバイパスできるようにします。ターゲットがフォーカス可能であることを確認してください（例: `<main id="content" tabindex="-1">`）。
- **セマンティックなテーブル**: データテーブルでは `<caption>` と `<th scope="col">`（または `<th scope="row">`）を使用します。

#### DON'Ts

- **偽の見出しを使わない**: `<div>` や `<span>` を標準の `<h1>`〜`<h6>` タグなしで見出しのようにスタイリングしてはいけません。
- **`<summary>` 内に見出しを配置しない、また `<details>` のコンテンツ内の見出しに依存しない**: `<summary>` 内の見出しはスクリーンリーダーの見出しリストや見出しナビゲーションショートカットから完全に隠される可能性があります。`<details>` のコンテンツ内の見出しは、開示が開いている場合のみ見出しナビゲーションで到達できます。
  - **注意**: 見出しが開示トリガーとして機能する必要がある場合は、`<details>`/`<summary>` の代わりに、より堅牢な代替手段を使用してください。例えば、アコーディオンや、見出しがボタンを包むARIAで実装された開示などです。
- **レイアウトにテーブルを使わない**: 視覚的なレイアウトにはCSS GridやFlexboxを使用してください。
- **ランドマークを乱用しない**: ランドマークが多すぎると価値が薄れます。特に、`<section>` にラベルを付けること（`region` ランドマークになる）は避けてください。`region` は他のランドマークが当てはまらない場合の最終手段にすべきです。

### コード例

```html
<!-- Good: Semantic landmarks, heading hierarchy, skip link -->
<header>
  <a href="#content" class="skip-link visually-hidden">Skip to content</a>
  <nav aria-label="Primary">
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
<main id="content" tabindex="-1">
  <h1>Platform Dashboard</h1>
  <section>
    <h2>User Statistics</h2>
    <table>
      <caption>
        Monthly active users
      </caption>
      <tr>
        <th scope="col">Month</th>
        <th scope="col">Users</th>
      </tr>
      <tr>
        <td>January</td>
        <td>12,000</td>
      </tr>
    </table>
  </section>
</main>
```

## 2. セマンティックHTMLとARIA

### 実践ガイドライン

#### DOs

- **ARIAよりもHTML要素・属性を優先する**: ネイティブ要素には適切なロールと挙動が備わっています。`<button>` はすでに `role="button"` を含意し、`required` はすでに `aria-required` を含意します。
- **ARIAの実装を実際の挙動に合わせる**: `role="tab"` を設定するなら、その要素はキーボード操作を含めタブのように振る舞う必要があります。多くのARIAパターンはCSSだけでは実装できず、JavaScriptが必要です。
- **`disabled` と `aria-disabled` を意識的に使い分ける**: `disabled` は要素をフォーカス順から完全に取り除きます（`tabindex="0"` を付けても戻りません）。ツールバーのボタンやリンクではこれが望ましくないことがよくあります。`aria-disabled="true"` は要素をフォーカス可能なまま残し、ユーザーがそこに到達して無効状態であることを認識できるようにします。

#### DON'Ts

- **ネイティブHTMLがある場合はARIAを使わない**: `<button>` が使えるなら `<div role="button">` や `<a role="button">` を避けてください。
- **冗長なARIAロールやプロパティを追加しない**: `<ul role="list">`、`<nav role="navigation">`、`<input required aria-required="true">` などは避けてください。
  - **注意**: Safariは `<nav>` の外で `list-style: none` や `display: flex`/`grid` が適用されている `<ul>`/`<ol>` からリストのセマンティクスを取り除きます。その場合は `role="list"` で復元する必要があります。
- **カスタム要素にARIAがないと決めつけない**: カスタム要素は `ElementInternals` 経由でARIAを付加できますが、これは自動テストツールから見えない場合があります。マークアップに `role`/`aria-*` 属性がないからといって、その要素にセマンティクスがないとは限りません。ブラウザのアクセシビリティツリーインスペクタで検証してください。

## 3. アクセシブルな名前と説明

すべてのインタラクティブ要素と一部のランドマークにはアクセシブルな名前が必要で、多くの場合はアクセシブルな説明があるとよりよくなります。名前は短く要素を識別するもので、説明は文脈を補完するものです。

### 実践ガイドライン

#### DOs

- **ネイティブの命名メカニズムを優先する**: フォームコントロールには `<label>`、`<table>` には `<caption>`、`<fieldset>` には `<legend>`、`<figure>` には `<figcaption>` を使用します。
- **`<label>` を `for`/`id` を使ってコントロールに明示的に関連付ける**。inputをlabelの中にネストしている場合でも、明示的な関連付けは支援技術のサポートを向上させます。
- **可視ラベルが存在する場合は `aria-label` よりも `aria-labelledby` を優先する**: 重複を避け、保守性を高め、翻訳しやすくなります。
- **同じ `href` を共有するハイパーリンクには同じアクセシブル名を再利用することを優先する。**
- **視覚的には同じでも異なる動作をするコントロール**（リスト内の複数の「編集」ボタンなど）を区別するには、視覚的に隠したテキストを使用します。

#### DON'Ts

- **名前を付けるべきでない要素に `aria-label`/`aria-labelledby` を付けない** — 例えば、ロールのないプレーンな `<div>`、`<span>`、カスタム要素などです。カスタム要素は `ElementInternals` を介して暗黙のロールを持つ場合があるため、`role` 属性がないことは決定的な根拠にはなりません。
- **同一ビュー内で異なる効果を持つコントロール間でアクセシブル名を再利用しない**（2つの異なるオープン中ダイアログの閉じるボタンは、同時に到達可能なのは1つだけなので問題ありません。異なるコンテンツに対する複数の「編集」ボタンはダメです）。
- **異なる `href` を指すハイパーリンク間でアクセシブル名を再利用しない。**
- **説明、エラーメッセージ、指示をラベルに詰め込まない。**
- **すでにARIAで公開されている状態**（`aria-expanded`、`aria-checked`、`aria-selected`、`aria-pressed`）をアクセシブル名の中で繰り返さない。冗長性と曖昧さが生じます。
- **ラベルにロール名を含めない**: `<nav aria-label="Primary navigation">` は「Primary navigation navigation」と読まれてしまいます。
- **命名メカニズムとして `title` や `placeholder` を使わない。**
- **`aria-describedby` のターゲットにインタラクティブ要素を含めない**。ただし、そのテキストコンテンツがそれ自体で説明として意味をなす場合は例外です（例: リンクのテキストが他の場所でのラベル付けと同じなら、説明内に含めても構いません）。

### コード例: 視覚的に隠すユーティリティ

`.visually-hidden` ユーティリティを使うと、テキストを視覚的にレンダリングせずにスクリーンリーダーに提供できます。スキップリンク、アイコンのみのボタンへの追加コンテキスト、補助ラベルなどによく使われます。

```css
/* Hides content visually but keeps it in the accessibility tree.
   :focus-within / :active opt elements out — useful for skip links and
   any focusable content wrapped in this class. */
.visually-hidden:where(:not(:focus-within, :active)) {
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
```

隠されたコンテンツがフォーカス可能である場合（スキップリンク、フォーカスを受け取るラッパー）、`:focus-within`/`:active` の例外によって可視化できます。可視状態のスタイルは状況に応じて調整します。例えば、メインコンテンツへのスキップリンクは、通常ビューポートの左上に固定配置し、残りのページがずれないようにします。

## 4. ドキュメントメタデータと言語

### 実践ガイドライン

#### DOs

- **表示言語を宣言する**: 常に `<html lang="en">`（または適切なコード）を設定します。
- **一意なページタイトル**: `<title>` の前方に一意な文脈を配置します（例: `Page Topic | Site Name`）。
- **インラインの言語切り替え**: 引用や異なる言語のテキストには `lang="..."` を使います。
- **iframeタイトル**: `<iframe>` には必ず説明的な `title="..."` を付けます。
- **SPAでのページ遷移時にドキュメントタイトルを更新する**: 更新されたタイトルにフォーカスを移します。

#### DON'Ts

- **iframeのスクロールを無効化しない**: `scrolling="no"`（非推奨）や iframe への `overflow: hidden` は避けてください。ズームインしたり文字を拡大したりするユーザーは、はみ出したコンテンツに到達するためにスクロールする必要があります。

### コード例

```html
<!-- Good: Distinct title and language declaration -->
<html lang="en">
  <head>
    <title>Analytics Reports | Guidance Platform</title>
  </head>
  <body>
    <p>The motto is <span lang="la">"Carpe diem"</span>.</p>
    <iframe title="Interactive Sales Chart" src="/chart"></iframe>
  </body>
</html>
```

## 5. キーボードとフォーカスの管理

### 実践ガイドライン

#### DOs

- **論理的なタブ順**: タブ順が視覚的レイアウト（上から下へ）と一致するようにします。
- **可視のフォーカスインジケータ**: 常に `:focus-visible` の状態を明示的にスタイリングします。デフォルトを無効化する場合は、十分なコントラストを持つオーバーライドを提供します。
- **カスタムトリガーのキーボード**: シミュレートしたカスタムインタラクティブ要素にEnter/Spaceハンドラを付けます。ボタンのような要素のカスタムキーボードハンドラを実装する場合、`Enter` は `keydown` ハンドラ、`Space` は `keyup` ハンドラとします（`Enter` は繰り返し発火し、`Space` は離した時に発火するネイティブ `<button>` の挙動に合わせるため）。
- **`tabindex` を意識的に使う**: フォーカス可能なものは（キーボードでもプログラム的でも）暗黙または明示的なARIAロールを持つべきなので、すべての要素をフォーカス可能にしてはいけません。フォーカスが必要な場合、要素をタブ順に追加するなら `tabindex="0"`、プログラムからのみフォーカス可能にするなら `tabindex="-1"`（例: スキップリンクのターゲット）を選びます。
- **トグル状態を管理する**: カスタムコントロールのトグル状態を伝えるために `aria-expanded` と `aria-pressed` を活用します。

#### DON'Ts

- **代替なしにアウトラインを無効化しない**: 代替スタイリングなしの `outline: none` は避けてください。
- **正の `tabindex` 値を使わない**: `tabindex="1"` 以上は決して使わないでください。
- **インタラクティブ要素をスクリーンリーダーから隠さない**: フォーカスを受け取れる要素への `aria-hidden="true"` や `role="presentation"` は避けてください。

### コード例

```css
/* Good: High contrast focus border */
:where(a:any-link, button):focus-visible {
  outline: 3px solid #ff0055;
  outline-offset: 3px;
}
```

```html
<!-- Good: Skip to main content -->
<a href="#content" class="skip-link">Skip to main content</a>
<main id="content" tabindex="-1">...</main>
```

```javascript
// Good: Keyboard handlers for complex custom widgets (e.g., Tree items, tabs).
// NOTE: This pattern applies ONLY to non-standard UI where no native HTML tag exists.
// Always prioritize native <button> or <input> elements for standard interactions.
// Elements MUST have the appropriate ARIA role (e.g., role="treeitem" or role="tab").
customWidget.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    toggleWidgetState();
  }
  if (e.key === ' ') {
    e.preventDefault(); // Prevent page scrolling on Spacebar keydown
  }
});

customWidget.addEventListener('keyup', (e) => {
  if (e.key === ' ') {
    toggleWidgetState();
  }
});

function toggleWidgetState() {
  // E.g., Manage toggle/expanded states for custom controls
  const isExpanded = customWidget.getAttribute('aria-expanded') === 'true';
  customWidget.setAttribute('aria-expanded', !isExpanded);
}
```

## 6. 代替テキストとメディア

### 実践ガイドライン

#### DOs

- **目的を伝える視覚的説明**: 画像の目的を説明します（例: 「虫眼鏡」ではなく「検索」）。
- **装飾的なビジュアルには空のalt属性を**: 装飾的な画像をアクセシビリティツリーから除去して読み上げられないようにするには `alt=""` を使います。
- **動画には同期型キャプション**: 動画トラックにWebVTTキャプションを提供します。
- **音声には文字起こし**: 純粋に音声のポッドキャストにはテキストの文字起こしを提供します。
- **インラインSVGに情報的な説明を**: 情報を伝えるビジュアルには `role="img"` とネストした `<title>` タグを適用します。
- **装飾的なSVGの除去**: 装飾的なSVGを読み上げ順から取り除くには `aria-hidden="true"` を適用します。
- **複雑な画像には長い説明**: チャートやインフォグラフィックには `<figure>`/`<figcaption>` または `aria-describedby` を使います。
- **代替としてデータテーブルを提供する**: チャートや他の複雑なデータ可視化のためのアクセシブルな代替として、セマンティックなデータテーブルの提供を検討してください。

#### DON'Ts

- **決まり文句のプレフィックスを使わない**: 「Image of...」や「Picture of...」は避けてください。
- **ファイル名にアンダースコアを使わない**: ファイル名がフォールバックとして読み上げられる可能性がある場合は、ダッシュを使ってください。

### コード例

```html
<!-- Decorative -->
<img src="divider.png" alt="" />

<!-- Inline Decorative SVG (remove from tab flow) -->
<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
</svg>

<!-- Informative (Functional) -->
<a href="/search">
  <img src="glass.png" alt="Search the platform" />
</a>

<!-- Video with Captions tracks -->
<video controls>
  <source src="intro.mp4" type="video/mp4" />
  <track src="caps.vtt" kind="captions" srclang="en" label="English" />
</video>

<!-- Complex graph with figcaption -->
<figure>
  <img src="chart.png" alt="Sales growth graph 2024." />
  <figcaption>Sales grew 20% in Q3 due to new platform launch.</figcaption>
</figure>

<!-- Audio with expandable transcript details -->
<audio controls src="podcast.mp3" aria-details="podcast-transcript"></audio>
<details id="podcast-transcript">
  <summary>View Transcript</summary>
  <div class="transcript-content">Welcome to the show...</div>
</details>
```

### コンテンツ可視性の判断マトリクス

| 意図                       | 視覚的 | スクリーンリーダー | フォーカス可能                 | 構造的パターン                                       |
| :------------------------- | :----- | :----------------- | :----------------------------- | :--------------------------------------------------- |
| **全員に表示**             | はい   | はい               | はい                           | 標準のレンダリング                                   |
| **スクリーンリーダーのみ** | いいえ | はい               | はい（インタラクティブな場合） | 視覚的に隠すユーティリティ（例: `.visually-hidden`） |
| **視覚のみ**               | はい   | いいえ             | いいえ                         | `aria-hidden="true"` / `role="presentation"`         |
| **全員に非表示**           | いいえ | いいえ             | いいえ                         | `hidden` 属性 / `display: none`                      |

**ヒューリスティックルール**: 要素がキーボードフォーカスを受け取れる場合、`aria-hidden="true"` で隠してはいけません。

## 7. フォームと入力コントロール

### 実践ガイドライン

#### DOs

- **ラベルをプログラム的に接続する**: `<input id="id">` にリンクされた `<label for="id">` を使います。
- **autocomplete を使う**: ユーザープロファイル用に有効な標準 `autocomplete` オプションを設定します（例: `"email"` や `"given-name"`）。
- **ヒントを `aria-describedby` で入力に紐付ける**: ヘルプテキストを入力に関連付け、編集中にオートコンプリートのポップオーバーがヒントを覆わないように、ヒントを入力の上に配置します。
- **動的なエラーをライブリージョンでアナウンスする**: `aria-live` を使うか、エラーリストにフォーカスを移します。
- **フォーム検証の制約を提供する**: 必須入力を示すには `required`（`required` が適用できない場合のみ `aria-required="true"`）を使います。

#### DON'Ts

- **プレースホルダーをラベルとして使わない**: プレースホルダーは永続的なラベルではありません。
- **フォーカス変更で文脈の切り替えを発生させない**: フォーカス変更イベント単独で、自動送信やページ遷移を発生させないでください。

### コード例

```html
<!-- Good: Semantic forms with hints for passwords -->
<form>
  <label for="pwd">Password:</label>
  <span id="pwd-hint">Must contain at least 8 characters.</span>
  <input
    id="pwd"
    type="password"
    aria-describedby="pwd-hint"
    autocomplete="current-password"
    required
  />
</form>
```

## 8. ライブリージョン

ライブリージョンを使うと、支援技術はナビゲーションやフォーカス変更に紐付かないコンテンツの更新をアナウンスできます。誤用しやすく、リージョンが多すぎたり騒がしすぎたりすると、スクリーンリーダーユーザーにとってすぐにスパムになってしまいます。

### ライブリージョンの緊急度テーブル

| 緊急度           | 視覚的アナロジー    | `aria-live` の値                     | 動作への影響                           | 例                              |
| :--------------- | :------------------ | :----------------------------------- | :------------------------------------- | :------------------------------ |
| **クリティカル** | モーダル / アラート | `assertive`（または `role="alert"`） | 即座に割り込み、読み上げキューをクリア | セッションタイムアウト、API障害 |
| **標準**         | トースト / バナー   | `polite`                             | 次の自然な区切りでアナウンス           | 検索結果、「保存しました」状態  |
| **パッシブ**     | 静かなテキスト      | `off`                                | ユーザーがそこに移動した場合のみ       | ライブ文字数カウント            |

**ヒューリスティックルール**: `assertive` は、即座の注意が必要、または安全な継続を妨げる、クリティカルで時間制約のある更新（例: データ消失、セッションタイムアウト、ネットワーク切断）にのみ使用します。

### 実践ガイドライン

#### DOs

- **可視でないアナウンスのためにライブリージョンを集約する**: ページあたり1つの `polite` リージョンと1つの `assertive` リージョン（必要に応じた `aria-atomic` 設定とともに）を持つことで、アナウンスの一貫性と保守性が高まります。多くのフレームワークが独自のアナウンサー抽象を提供しているので、それを使いましょう。
- **頻繁に変化するリージョンはデバウンスする**: リージョンが秒間に何度も更新される場合（例: ユーザーがタイプ中のコンボボックスの結果件数）、ユーザーがスパムされないようにデバウンスします。
- **他のアナウンスと衝突する可能性がある場合は少し遅延させる**: ユーザーがタイプ中やフォーカスが管理されている時、アナウンス前に小さな遅延を入れることで、ライブリージョンの更新が他の読み上げと重ならないようにします。

#### DON'Ts

- **「読み込み中…」や「更新中…」のような中間状態にライブリージョンを使わない**。意味のある情報でない限り、たいてい単なるノイズになります。
- **inert なDOMにライブリージョンの更新を追加しない**: ダイアログが開いたりセクションが `inert` になったりすると、キューに入った（あるいはデバウンスされた）メッセージがアナウンスされなくなったり、ユーザーが到達できないDOMからアナウンスされたりする可能性があります。ライブリージョンの更新を dialog/inert の状態変更と連動させてください。

### コード例

```html
<!-- Session Timeout Warning with controls -->
<div role="alert" aria-live="assertive" class="timeout-warning">
  Your session will expire in 2 minutes.
  <button onclick="extendSession()">Extend Session</button>
</div>
```

## 9. 色、コントラスト、タイポグラフィ

### 実践ガイドライン

#### DOs

- **最低コントラスト基準**: 通常テキストは4.5:1、大きなテキストやアイコンは3:1を維持します。
- **非テキストのコントラスト基準を確保する**: ユーザーインターフェースコンポーネントの境界と状態には、最低3:1のコントラスト比を維持します。
  - これには、UIコンポーネントの境界を形成するか、その存在を示す視覚要素（ボーダー、背景、box-shadow、下線など。例: 入力フィールドのボーダー）が含まれます。
  - これには、コンポーネント内のアクティブ状態を示す視覚要素（例: チェックボックスのチェックマークやスイッチのつまみ）も含まれます。
  - **注意**: 3:1の非テキストコントラストを満たすのは、ミニマルなデザインでは難しい場合があります。柔らかいグラデーションや控えめなインセット/アウトセットのシャドウを使えば、視覚的な境界を柔らかくしながらアクセシビリティ要件を満たすことができます。
- **複数の状態インジケータを使う**: 成功やエラーを色だけで示してはいけません。アイコンやテキストを使います。
- **相対的なフォントサイズ単位**: フォントサイズには `px` ではなく `rem` または `em` を使います。
- **一貫した、または始端揃え**: `justify` の整列は読みにくくなる可能性があるため避けます。
- **長いテキスト行を避ける**: 段落ブロックは最大80文字幅に制限します。
- **ユーザーのズーム設定をサポートする**: コンテンツや機能を損なわずに、ユーザーがテキストを200%まで拡大できるようにします。
- **ライトとダークのカラースキームをサポートする**: `@media (prefers-color-scheme: dark)` を尊重し、`color-scheme` CSSプロパティと組み合わせて、フォームコントロール、スクロールバー、その他のUA描画サーフェスが一致するようにします。
- **`prefers-contrast` は必要な場合だけ使う**: 低コントラストのアクセント（例: 微妙なボーダーや薄い二次的なテキスト）を強化する必要がある場合は `@media (prefers-contrast: more)` を使います。すでに基本コントラストを満たしているサイトでは、ほとんど必要ありません。

#### DON'Ts

- **ユーザーインターフェースコンポーネントの存在や状態を色だけで示さない**: アイコンや形状を使って区別を補強します。
- **テキストを両端揃えにしない**: `text-align: justify` は避けてください。
- **装飾的なフォントを使わない**: 本文の主要な読み物には筆記体フォントを避けてください。
- **強調のために全大文字に頼らない**: 視覚的な強調にはボールドを優先し、強調が意味的なものなら `<em>`/`<strong>` を使います。
- **全体的に強調を制限する**: 強調はあらゆる場所にあると意味を失います。コンテンツの読み方が変わる箇所にのみ適用してください。

### コード例

```css
/* Good: Relative sizing and line caps */
body {
  line-height: 1.5;
  text-align: start; /* Supports LTR and RTL */
}
article {
  max-width: 80ch; /* Caps line length to ~80 characters for readability */
}
```

```html
<!-- Good: Denotes state without colors alone -->
<div class="error-msg">
  <span aria-hidden="true">❌</span>
  <span>The password entered was invalid.</span>
</div>
```

```css
/* Dark Mode support variables */
:root {
  --bg-color: #ffffff;
  --text-color: #212529;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #121212;
    --text-color: #f8f9fa;
  }
}
```

## 10. モーションと設定

### 実践ガイドライン

#### DOs

- **Reduced Motion メディアクエリをサポートする**: `@media (prefers-reduced-motion: reduce)` メディアクエリをサポートします。
- **一時停止メカニズムを提供する**: 自動再生のカルーセルバナーやその他持続的なアニメーションをユーザーが停止できるようにします。
- **静的ビューをデフォルトにする**: 静的状態をデフォルトとし、ユーザーがモーションをオプトインできるようにすることを検討してください。

#### DON'Ts

- **フラッシュ制限（1秒間に3回）を超えない**: 明暗の急速な点滅を絶対に含めないでください。発作を引き起こす可能性があります。

### コード例

```css
/* Good: Dampen spin states for reduced motion queries */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    opacity: 0.5;
  }
}
```

## 11. モーダルとネイティブダイアログ

最近のブラウザは、モーダルダイアログを作成するためのネイティブソリューションを提供しています。これにより、フォーカストラップ、外部コンテンツのアクセシビリティ管理、コンテンツを最前面に置くこと、背景のコンテンツの調光などが不要になります。これらはすべてエラーが起きやすく、維持するために大量のJavaScriptイベント追跡を必要とします。

### 実践ガイドライン

#### DOs

- **ネイティブの `<dialog>` 要素を使う**: `.showModal()` メソッドでダイアログを呼び出し、モーダル状態で開きます。モーダル状態の時、ブラウザは外部コンテンツを inert にします（つまり、外部コンテンツはアクセシビリティツリーから隠され、操作もフォーカスもできません）。
- **カスタムオーバーレイには `inert` 属性を使う**: `<dialog>` が使えない場合（例: 一部の非モーダルオーバーレイ、フレームワークの制約、`<dialog>` のトップレイヤー/配置動作がデザインと衝突するレイアウトなど）、外部コンテンツに `inert` を適用して、キーボード、ポインタ、支援技術から操作できないようにします。これには、カスタムオーバーレイが `inert` を設定する要素の子孫にならないように構造化する必要があります。

#### DON'Ts

- **ネイティブのモーダルダイアログ用にフォーカストラップを実装しない**: `<dialog>` 要素がモーダル状態で開かれると、ブラウザは外部コンテンツを inert にします。これでダイアログのコンテンツだけがフォーカス可能であることを確保するには十分です。

### コード例

**HTML & JS: 標準のクローズイベントを使ったネイティブ `<dialog>`**

```html
<!-- Dialog opens natively with showModal() and locks focus -->
<button id="open-btn">Open Dialog</button>

<dialog id="accessible-modal" aria-labelledby="title-id">
  <h2 id="title-id">Account Settings</h2>
  <p>Update your details here.</p>
  <button onclick="this.closest('dialog').close()">Close Dialog</button>
</dialog>

<script>
  document.getElementById('open-btn').addEventListener('click', () => {
    document.getElementById('accessible-modal').showModal();
  });
</script>
```

## 12. テストによる検証

### 実践ガイドライン

#### DOs

- **axe-core や Lighthouse の監査で自動チェックを実行する**: 欠落しているalt属性や低コントラストを検出します（例: Chrome DevTools MCPのLighthouse経由）。
- **キーボードのみで連続ナビゲーションを検証する**: Tab/Shift+Tab、矢印キー、Enter、Space、Esc などのキーボードショートカットのみを使い、すべてのインタラクティブ要素に到達でき操作可能で、フォーカスが詰まらないことを確認します。
- **キャリブレーションされたブラウザでスクリーンリーダーをテストする**: 標準的な組み合わせに従ってください（例: ChromeとJAWS、FirefoxとNVDA、EdgeとNarrator、macOSとiOSのSafariとVoiceOver、AndroidのChromeとTalkBack）。

#### DON'Ts

- **スコアだけに頼らない**: 100%のスコアは実際の使いやすさを保証しません。
