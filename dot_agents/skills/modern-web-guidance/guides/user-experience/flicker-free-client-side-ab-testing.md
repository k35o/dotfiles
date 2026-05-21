# フリッカーのないクライアントサイド A/B テスト

## 課題

クライアントサイドの A/B テストツールは、ブラウザがすでにページの構築を始めた後に DOM を変更するスクリプトを読み込むことで動作します。何も対策をしないと、ユーザーは一瞬だけ元のコンテンツを目にしてから、実験のバリアントへとフリッカーやフラッシュのように切り替わってしまいます。テストプラットフォームは歴史的に、実験スクリプトの完了か任意のタイムアウト（通常 4 秒）の経過まで、ページ全体を `opacity: 0` で隠す「アンチフリッカースニペット」でこの問題を回避してきました。このアプローチはプログレッシブレンダリングを犠牲にし、見えないコンテンツへの誤クリックを許し、不要なペイントサイクルを引き起こします。

## 解決策

`blocking=render` 属性を使うと、`<head>` 内に配置した `<script>` または `<link>` 要素は、リソースがフェッチされ実行されるまでパースではなくレンダリングだけをブロックできます。これによって、デフォルトでスタイルシートがもつのと同じレンダリングブロックの挙動を実験スクリプトに与えられるため、実験のバリアントが適用されるまでブラウザはページを描画しません。透明度のトリックも任意のタイムアウトも不要で、フリッカーも発生しません。

### 実装戦略

1. **必須:** 実験スクリプトはドキュメントの `<head>` に配置し、`blocking="render"` を追加してください。
2. **必須:** スクリプトには `type="module"`（インラインスクリプトに推奨）または `async`（`src` を持つ外部スクリプトに推奨）を必ず付けてください。
3. **DO**: 実験スクリプトは小さく高速に保ってください。スクリプトが実行されるまでレンダリングがブロックされるため、大きく低速なスクリプトは First Paint を直接遅らせます。
4. **DO NOT**: First Paint より前に実行する必要がないスクリプトに `blocking="render"` を使わないでください。これは、初期描画で結果が見える必要があるスクリプト専用です。
5. **DO NOT**: `<head>` 外のスクリプトに `blocking="render"` を適用しないでください。レンダリングをブロックできるのは `<head>` 内のスクリプトだけです。

## 実装ガイド

### 基本セットアップ

必須: 実験スクリプトは `async` と `blocking="render"` の両方を付けて読み込みます。`async` 属性により、スクリプトが HTML パースをブロックしません（ブラウザはスクリプトをフェッチしながら DOM を構築します）。`blocking="render"` 属性により、スクリプトの実行が完了するまでブラウザは何も描画しません。

```html
<head>
  <!--
    MANDATORY: Both `async` and `blocking="render"` are required.
    - `async`: Prevents parser-blocking, so the DOM is built in parallel.
    - `blocking="render"`: Holds rendering until the script executes,
      ensuring experiment changes are applied before the user sees anything.
  -->
  <script
    src="https://cdn.example.com/experiment-sdk.js"
    async
    blocking="render"
  ></script>
</head>
```

### 実験用スタイルの読み込み

実験がバリアント用のスタイルシートを必要とする場合は、`<link>` 要素に `blocking="render"` を付けます。`<head>` 内のスタイルシートはデフォルトでレンダリングをブロックしますが、動的に挿入されたスタイルシートやスクリプト経由で追加されたものはブロックしません。スタイルシートが動的に追加される場合、あるいは意図を明示したい場合は、明示的に `blocking="render"` を使ってください。

```html
<head>
  <!--
    DO: Use blocking="render" on experiment stylesheets that are
    dynamically inserted or conditionally loaded by the experiment SDK.
    This ensures variant styles are applied before first paint.
  -->
  <link
    rel="stylesheet"
    href="https://cdn.example.com/experiment-variant-b.css"
    blocking="render"
  >
</head>
```

### インライン実験スクリプト

実験ロジックがインライン化できるほど軽量な場合は、`blocking="render"` 付きのインラインモジュールスクリプトを使います。実験ロジックが設定をフェッチして直接 DOM を変更する場合に便利です。

```html
<head>
  <!--
    DO: Use an inline module script when the experiment logic is small.
    Module scripts are deferred by default (non-parser-blocking),
    and blocking="render" ensures rendering waits for execution.
  -->
  <script type="module" blocking="render">
    // Fetch the experiment configuration from your testing platform.
    const config = await fetch('/api/experiment?id=homepage-cta')
      .then(res => res.json());

    // Apply the variant by setting a data attribute on <html>.
    // CSS rules keyed to this attribute will style the variant.
    document.documentElement.dataset.variant = config.variant;
  </script>

  <style>
    /* Default styles (control group) */
    .cta-button {
      background-color: blue;
    }

    /* Variant B styles, activated by the data attribute */
    [data-variant="b"] .cta-button {
      background-color: green;
    }
  </style>
</head>
```

## ベストプラクティス

- **必須:** 実験スクリプトは高速に実行されなければなりません。低速なスクリプトはすべての描画を遅らせます。レンダリングブロックスクリプトには（例: 実行時間 100ms 以内など）パフォーマンスバジェットを設定してください。
- **DO**: 重い実験ロジックはレンダリングブロックスクリプトから分離してください。バリアントを適用する小さなレンダリングブロック用スタブを読み込み、より重いトラッキングや分析スクリプトは `async` または `defer` で（`blocking="render"` なしで）別途読み込みます。
- **DO**: `<html>` または `<body>` に data 属性を付けてアクティブなバリアントを示し、その属性に応じた CSS セレクタでバリアントをスタイリングします。これによって、レンダリングブロックスクリプト内での直接的な DOM 操作を避けられます。
- **DO NOT**: 分析、トラッキング、その他のビジュアル以外のスクリプトに `blocking="render"` を使わないでください。First Paint で見える内容に影響するスクリプトだけが、レンダリングをブロックすべきです。
- **DO NOT**: `blocking="render"` を従来のアンチフリッカースニペットと併用しないでください。同じ問題に対する解決策であり、両方を使うと不要な遅延を生みます。

## フォールバック戦略

blocking="render" は限定的に利用可能です。
対応ブラウザ: Chrome 105（2022 年 9 月）、Edge 105（2022 年 9 月）、Safari 18.2（2024 年 12 月）。
未対応: Firefox。

`blocking` 属性はすべてのブラウザでサポートされているわけではありません。サポートされていないブラウザでは属性は無視され、スクリプトはデフォルトの動作（上記の例では `async`）で読み込まれるため、フリッカーが発生する可能性があります。未対応ブラウザでのフリッカーを防ぐにはフォールバックが必要です。

### フォールバック: アンチフリッカースニペット

DO: `blocking="render"` がサポートされていない場合のフォールバックとして、軽量なアンチフリッカースニペットを使ってください。機能検出を行い、ネイティブで対応しているブラウザではフォールバックをスキップします。

```html
<head>
  <!--
    DO: Load the experiment script with blocking="render" for
    browsers that support it. This is the preferred approach.
  -->
  <script
    src="https://cdn.example.com/experiment-sdk.js"
    async
    blocking="render"
  ></script>

  <script>
    // DO: Only apply the anti-flicker fallback in browsers
    // that do not support blocking="render".
    if (!Object.hasOwn(HTMLScriptElement.prototype, 'blocking')) {
      // Hide the page until the experiment script runs.
      document.documentElement.classList.add('ab-loading');

      // DO: Set a timeout to reveal the page if the experiment
      // script takes too long. This prevents an indefinitely
      // blank page on slow connections. Adjust the timeout
      // to match your experiment SDK's expected load time.
      setTimeout(() => {
        document.documentElement.classList.remove('ab-loading');
      }, 4000);
    }
  </script>

  <style>
    /*
      DO: Use opacity to hide content during experiment loading.
      This is only applied when blocking="render" is unsupported.
    */
    .ab-loading {
      opacity: 0 !important;
    }
  </style>
</head>
```

```javascript
// DO: In your experiment SDK's initialization callback,
// remove the fallback class to reveal the page.
function onExperimentReady() {
  document.documentElement.classList.remove('ab-loading');
}
```

## その他の考慮事項

1. **パフォーマンスへの影響**: `blocking="render"` は First Paint の速度を視覚的な正しさと引き換えにします。実験スクリプトが過剰な遅延を生じていないか、Largest Contentful Paint（LCP）と First Contentful Paint（FCP）を監視してください。
2. **サードパーティスクリプトの信頼性**: 実験 SDK がサードパーティの CDN にホストされている場合、CDN の障害がレンダリング全体をブロックしうるので注意してください。ブラウザは独自のタイムアウト経験則を適用しますが（4 秒より長くなる場合もあります）、`blocking="render"` には開発者が制御できるタイムアウトはありません。サードパーティプロバイダの稼働保証が強固であることを確認してください。
3. **サーバーサイドの代替**: パフォーマンスがクリティカルなページでは、クライアントサイドテストの代わりにサーバーサイド A/B テスト（サーバーが直接正しいバリアントをレンダリングする）を検討してください。サーバーサイドのアプローチはレンダリングブロックのコストを伴わず、フリッカーを完全に排除します。サーバーサイドテストが現実的でない場合のみ、クライアントサイドの `blocking="render"` を使ってください。
