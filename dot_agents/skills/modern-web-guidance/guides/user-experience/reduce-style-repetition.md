# CSS関数でスタイルの重複を減らす

大きなスタイルシートを保守していると、特にグラデーションのようなデザインシステムトークンやレスポンシブレイアウトのパターンを扱う際に、ロジックの重複に悩まされがちです。

CSSの`@function`アットルールを使えば、こうしたロジックを再利用可能でパラメーター化された関数にカプセル化でき、CSSを保守しやすく、一貫性のある、DRY（Don't Repeat Yourself）な状態に保てます。

## `@function`の構文

カスタム関数は`@function`ルールに続けてダッシュ付きの名前とパラメーターのリストを指定して定義します。関数は`result`プロパティで値を返します。

```css
@function --my-function(--input1 <length>, --input2: default-value) returns
  <length> {
  /* Logic goes here */
  result: var(--input1);
}
```

### 主な概念

- **パラメーター:** 必ずダブルダッシュ（`--`）から始める必要があります。
- **デフォルト:** コロン（`:`）でデフォルト値を指定できます。
- **戻り値:** `result`プロパティが関数の返す値を決定します。関数本体で最後に宣言された`result`が採用されます。
- **スコープ:** 関数内で定義されたパラメーターと変数は局所スコープです。
- **型:** ブラケット記法（例: `<color>`）でパラメーターと戻り値にCSS型を要求でき、`type`関数で複数の型を許可できます（例: `type(<number> | <percentage>)`）。

## 実践例

### 1. デザインシステムトークン（グラデーション）

グラデーションのロジックをカプセル化することで、アプリ全体で一貫した色のグラデーションを保証します。`--angle`にはデフォルト値があり、一貫性を提供しつつ上書きも可能です。

```css
@function --fancy-gradient(
    --start-color <color>,
    --end-color <color>,
    --angle: 98deg
  )
  returns <image> {
  result: linear-gradient(
    in oklab var(--angle),
    var(--start-color),
    var(--end-color)
  );
}

.card {
  background: --fancy-gradient(#ed73d7, #5d87e9);
}
```

### 2. 条件付きレイアウトロジック

関数の中で`@media`や他のクエリを直接使い、環境に応じて異なる値を返せます。関数で条件付きロジックを使うとき、`@function`は最初の`result`の値で「returnする」のではなく、CSSのカスケードに従い、画面サイズ・コンテナサイズ・その他のクエリにマッチした最後の値に解決される点に注意してください。

```css
@function --grid-template(--count <number>) {
  /* MANDATORY: Put default value first. */
  result: 1fr; /* Default: stack */
  @media (min-width: 800px) {
    result: repeat(var(--count), 1fr); /* Grid on larger screens */
  }
}

main {
  display: grid;
  grid-template-columns: --grid-template(2);
}
```

## ベストプラクティス

- **ダッシュ付きの名前を使う:** 関数名とパラメーターは必ず`--`で始めてください。
- **デフォルトを提供する:** 妥当なデフォルト値を用意して関数を堅牢にしましょう。
- **シンプルに保つ:** 実際に繰り返されているか複雑なロジックにのみ関数を使ってください。単純なプロパティと値のペアを過剰にエンジニアリングしないでください。
- **型を活用する:** パラメーターと戻り値が期待する型と一致するようにしてください。
- **プリコンパイル代替も検討する:** ユーザー入力やメディアクエリ、その他のクライアントサイドの変動に依存しない関数では、クライアントで不要な作業を行わないようCSSプリコンパイラの利用を検討してください。

### フォールバック戦略

@function has limited availability.
Supported by: Chrome 139 (Aug 2025) and Edge 139 (Aug 2025).
Unsupported in: Firefox and Safari.

CSS関数をサポートしないブラウザでは、CSS関数で設定した値は無効になります。他のブラウザもサポートするには、まずプロパティにフォールバック値を提供してください。CSS関数をサポートするブラウザではそれが上書きされます。

```css
.card {
  /* Provide fallback, in this case a solid color. */
  background: #5d87e9;
  background: --fancy-gradient(#ed73d7, #5d87e9);
}

main {
  /* Provide fallback, in this case a simple stacked default. */
  grid-template-columns: 1fr;
  grid-template-columns: --grid-template(2);
}
```

他のブラウザもサポートしつつスタイルの重複を減らすことが必須要件であれば、Sassのような関数を備えたCSSプリコンパイラを検討してください。
