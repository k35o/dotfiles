# コンポーネント固有のライト／ダークテーマ

`color-scheme` プロパティは通常ルートに設定されますが、個々の要素に設定して、ページの他の部分とは異なるカラースキームを強制することもできます。
これは、特定のカラースキームで常に表示されなければならないコンポーネント（例: 常にダーク／ライトモード）に有用です。

ユースケースの例:
- 美観的な理由でライトモードのページでもダークモードで表示されることが多い要素、たとえばコードブロック、メディアプレイヤー、写真ギャラリーなど。
- ライト背景向けに設計されたメディア（画像、動画、イラスト、印刷プレビューなど）を含む領域は、ページの他の部分がダークモードであってもライトモードに設定できます。
- ユーザーレベルの設定で `color-scheme` を制御する要素（例: コンポーネントプレビュー）。
- ライトとダークの両方をサポートしない埋め込み。
- デザインツール、地図、可視化、ゲームなど。

## 色を変えるか `color-scheme` を強制するか？

ライトモードで暗い背景に明るいテキスト、ダークモードで明るい背景に暗いテキストを使っている要素のすべてに、異なる `color-scheme` が必要なわけではありません。
たとえば、プライマリボタンがライトモードで白文字の青で表示されても、それは `color-scheme: dark` を必要としません。

おおまかな目安として、通常、異なる `color-scheme` を使う要素は、シンプルな浅いコンテナではなく、独自の視覚コンテキストを確立する複雑なサーフェスです。

要素で異なる `color-scheme` を使うかを検討する際は、次を自問してください:

- カスタマイズされていないビルトインのブラウザUI（フォームコントロール、スクロールバーなど）を、そのカラースキームで使うべきか、それともページのカラースキームに従わせるべきか？ -> 前者なら `color-scheme` は使わない。
- `light-dark()` の色がページの他の部分と同様に解決すべきか、それともオーバーライドに基づくべきか？ -> 前者なら `color-scheme` は使わない。
- 子孫がそのカラースキームになるべきか？ ならない場合は `color-scheme` を使わない。

## 基本的な実装

コンポーネント固有のオーバーライドは、通常（厳密ではないものの）グローバルな `color-scheme` で複数のカラースキームをサポートするページで使用されます。
ページ全体のダークモードを適切に実装する方法については、[`dark-mode`](user-experience/dark-mode.md)を参照してください。

ページ全体の `color-scheme` が設定されており、それに敏感な色トークン（例: `light-dark()` 経由）を使用している場合、特定のコンポーネントに `color-scheme` を設定するだけで、そのサブツリーのカラーモードをオーバーライドできます:

```css
pre, code, .dark {
  color-scheme: dark;
}
```

ブラウザによっては、コンポーネントを異なるカラースキームに自動適応させることに注意してください。
すべての場合で指定したカラースキームを強制するには、`only` を使ってください。つまり、`color-scheme: dark;` ではなく `color-scheme: only dark;` のように。

### 非色値の適応

`light-dark()` は現状、色のみで機能します。

## ベストプラクティス

- **MANDATORY**: 背景のない要素に `color-scheme` を設定しないでください。異なるカラースキームの背景色とテキスト色の組み合わせが混ざり、テキストが読めなくなるリスクがあります。
- **OPTIONAL**: ページ全体のダークモードと同じ色のペアを再利用する方が楽ですが、これらのコンポーネント用に異なる色のペアを定義することも _できます_。たとえば、ライトモードのページで使われるダークモードコンポーネントは、ページ全体がダークモードのときに同じコンポーネントが使われる場合よりも少し明るくしたいことがあります。

## 注意すべき既知の問題

### 重要な落とし穴: `light-dark()` の色の継承

**`light-dark()` は計算値の時点で解決されます。**
つまり、`light-dark()` 色に設定された継承される `<color>` プロパティは、子孫に2つの色のうち1つしか渡せず、`light-dark()` 式そのものは渡しません。

これには次が含まれます:
- 継承するビルトインの色プロパティ。たとえば `color`、`accent-color`、`fill`、`stroke`、`text-shadow`、`caret-color`。
- `syntax: <color>` と `inherits: true` で登録された継承可能なカスタムプロパティ。
- `inherit` に設定されたその他の `<color>` プロパティ。

これは以下を意味します:
- *デザイントークン*（例: `--surface-color`）として保持することを意図したカスタムプロパティを `<color>` として**登録しない**でください。トークンは、子孫が異なる `color-scheme` の下で再解決できるよう、`light-dark()` 式を生かしておく必要があります。
- 要素に `color-scheme` を設定する際は、`light-dark()` 値に設定された継承される `<color>` プロパティを（直接または設計トークン経由で）すべて、同じデザイントークンであっても再指定してください。
- `color-scheme` のオーバーライドを持つ要素では、`<color>` プロパティに `inherit` を**使用しない**でください（子孫では使用してかまいません）。
- 反対のユースケースには、登録された `<color>` プロパティを使ってください: 祖先の解決された色を意図的にスナップショット化し、子孫の `color-scheme` の下で再解決されないようにしたい場合です。たとえば、ページの背景を取得して別の場所で使う場合などです。
- 色をアニメーションさせる必要がある場合は、アニメーション対象の要素に別の `@property` 登録された `<color>` プロパティを使用してください（色の補間には登録が必要です）。これはデザイントークンではなく要素ごとのアニメーションターゲットなので、上記のルールと矛盾しません。

例:

```css
:root {
	--accent-color: light-dark(blue, skyblue);
	--surface-color: light-dark(white, #222);
	--text-color: light-dark(#111, white);

	color-scheme: light dark;
	accent-color: var(--accent-color);
	color: var(--text-color);
}

body {
	/* --surface-color dynamically switches despite being inherited because --surface-color is not registered */
	background: var(--surface-color);
}

pre, code {
	color-scheme: dark;
	background: var(--surface-color);

	/* Without this, accent-color would be blue, not skyblue! */
	accent-color: var(--accent-color);

	/* Without this, text-color would be #111, not white! */
	color: var(--text-color);
}
```

### color-scheme 使用時の注意点

- ChromeとFirefoxはiframeに対して `color-scheme` を尊重します。埋め込まれたページを正しいカラースキームでレンダリングし、埋め込みコンテキストの `color-scheme` を反映するように埋め込みページの `prefers-color-scheme` メディアクエリを調整します。Safariはこれを行わず、iframe内でも `prefers-color-scheme` をシステム設定に解決します。
  - **親とiframeの両方を制御する場合:** 親のカラースキームを明示的にiframeに渡してください。iframe構築時のURLパラメータ（`?theme=dark`）経由、または `postMessage()` 経由（実行時の変更にも反応できます）です。iframe側では、`prefers-color-scheme` に頼るのではなく、その信号から `<html>` にクラスを設定（または `:root` に `color-scheme` を設定）してください。
  - **埋め込みページのみを制御する場合:** Safariでは、iframe内から埋め込みコンテキストの `color-scheme` を確実に検出する方法はありません。埋め込みAPIに明示的なテーマパラメータ（例: クエリ文字列や `postMessage` プロトコル）を公開し、埋め込み側に文書化してください。

## フォールバック戦略

### color-scheme のフォールバックとブラウザサポート

color-scheme のBaselineステータス: Widely available。2022-02-03からBaselineです。
対応ブラウザ: Chrome 98 (Feb 2022)、Edge 98 (Feb 2022)、Firefox 96 (Jan 2022)、Safari 13 (Sep 2019)。

`color-scheme` プロパティは**プログレッシブエンハンスメント**です。
サポートしないブラウザはこのプロパティを無視し、デフォルトのライトモードUIを使用します。

古いブラウザでユーザーの設定に適応させるには、`prefers-color-scheme` メディアクエリを使って、ダークモードが優先される場合に異なる色を提供してください。

- DO: `:root` または `html` のカスタムプロパティを切り替えるためにメディアクエリを使用してください。
- 色以外の非常に特殊なダークモードカスタマイズが必要なコンポーネントを除いて、個々のコンポーネントでメディアクエリを使うのは避けてください。

```css
:root {
  /* Define brand colors for each mode */
  --color-brand-light: #0056b3;
  --color-brand-dark: #00e5ff;
  --color-brand: var(--color-brand-light);

  /* MANDATORY: Fallback for browsers without light-dark support */
  @media (prefers-color-scheme: dark) {
    --color-brand: var(--color-brand-dark);
  }

  /* Ignored in older browsers */
  color-scheme: light dark;
}

button.primary {
	background-color: var(--color-brand);
}
```

### light-dark() のフォールバックとブラウザサポート

light-dark() のBaselineステータス: Newly available。2024-05-13からBaselineです。
対応ブラウザ: Chrome 123 (Mar 2024)、Edge 123 (Mar 2024)、Firefox 120 (Nov 2023)、Safari 17.5 (May 2024)。

`color-scheme` をサポートするが `light-dark()` をまだサポートしないブラウザでは、まずカスタムプロパティとしてライトとダークのバージョンの色を定義し、以下の例のように `prefers-color-scheme` メディアクエリを使って対応するモードの色を設定してください:

```css
:root {
  /* Define browser UI accent color for each mode */
  --brand-accent-light: #0056b3;
  --brand-accent-dark: #00e5ff;
  --accent-color: var(--brand-accent-light);

  /* MANDATORY: Fallback for browsers without light-dark support */
  @media (prefers-color-scheme: dark) {
    --accent-color: var(--brand-accent-dark);
  }

  /* OPTIONAL: use light-dark() for more control of built-in UI colors */
  @supports (color: light-dark(white, black)) {
    --accent-color: light-dark(var(--brand-accent-light), var(--brand-accent-dark));
  }

  /* MANDATORY: Automatically adapt native UI to user system preferences */
  color-scheme: light dark;

  /* Example inherited color property */
  accent-color: var(--accent-color);
}

pre, code {
  color-scheme: dark;

  /* **Mandatory**: any inherited color properties must be set again, even if to the same design tokens */
  accent-color: var(--accent-color);
}
```
