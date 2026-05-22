# スクリプトの優先度を最適化する

ブラウザは、ドキュメント内のどこに記述されているか、また `async` や `defer` のような属性があるかに基づいてスクリプトにデフォルトの優先度を割り当てます。`fetchpriority` を使うと、開発者は重要なスクリプトを最初に読み込ませ、非必須なスクリプトを邪魔にならないようにするための明示的なコントロールを得られます。

## 実装方法

1. **重要なスクリプトを特定する**: ページの中核機能や初期のユーザーインタラクションに必須なスクリプトを特定します。
2. **重要な非同期スクリプトの優先度を上げる**: `async` または `defer` で読み込まれる重要なスクリプトに `fetchpriority="high"` 属性を追加し、ディスカバリーフェーズで優先されるようにします。
3. **非必須なスクリプトの優先度を下げる**: すぐに必要でないスクリプト（例: アナリティクス、広告、ファーストビュー外のウィジェット）には `fetchpriority="low"` を追加し、ブロックを避けるために `async`、`defer`、`module` 属性のいずれかを付けてください。
4. **パーサーブロッキングスクリプトを順序付ける**: body の末尾にあるパーサーブロッキングスクリプトに `fetchpriority="low"` を使用し、より重要なリソースと帯域幅を奪い合わないようにします。

## サンプルコード

```html
<!-- Elevate the priority of the critical app logic -->
<script src="/js/app.js" async fetchpriority="high"></script>

<!-- Deprioritize non-essential tracking scripts -->
<script src="/js/tracker.js" async fetchpriority="low"></script>

<!-- Deprioritize late-body scripts to favor critical images or CSS -->
<script src="/js/legacy-widgets.js" fetchpriority="low"></script>
```

## ベストプラクティス

- **MANDATORY**: ネットワーク競合や優先度ブーストの希薄化を避けるため、`fetchpriority="high"` は重要なスクリプト1〜2個に限定して使用してください。
- **DO** Interaction to Next Paint (INP) にとって重要であることが分かっている `async` スクリプトに、特に `fetchpriority="high"` を使用してください。
- **DO** 初期のユーザー体験に不要なスクリプトの優先度を `fetchpriority="low"` で下げてください。
- **DO NOT** すべてのスクリプトタグに `fetchpriority` を使用しないでください。ブラウザのデフォルトヒューリスティックが最適でないと分かっているときにのみ使用すべきです。
- **DO NOT** 非推奨の `importance` 属性を使用しないでください。`fetchpriority` に置き換えられています。

## フォールバック戦略

Fetch priority のBaselineステータス: Newly available。2024年10月29日からBaselineです。
対応ブラウザ: Chrome 103（2022年6月）、Edge 103（2022年6月）、Firefox 132（2024年10月）、Safari 17.2（2023年12月）。

`fetchpriority` 属性はプログレッシブエンハンスメントです。サポートしないブラウザはこの属性を無視し、エラーを出さずに内部のスケジューリングロジックを使用します。基本的な使用には、明示的な Feature Detection やフォールバックロジックは不要です。
