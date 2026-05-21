# INPの悪化原因を特定する

インタラクションへの応答性が悪いと、ページが遅い、あるいは完全に壊れているという悪い印象を与えます。Interaction to Next Paint (INP) は Event Timing APIに基づくメトリクスで、ページの応答性の指標として、最悪のインタラクション（いくつかの外れ値を除く）を計測します。

応答しないWebページの根本原因を特定するのは難しく、特にユーザーのインタラクションやデバイス性能、ネットワーク条件などの環境要因に依存するため、ページ読み込みのような再現性が高く予測可能なシナリオに比べて診断がさらに困難です。ラボデータは実ユーザーシナリオのごく一部しか再現できないため、フィールドでINPの悪化原因を計測することが不可欠です。

Event Timing APIを使うと、INPの時間を3つの副要素に分解できます。Input Delay（インタラクション発生時にすでに実行されていた処理）、Processing Duration（インタラクションの直接の結果として発生する遅延）、Presentation Delay（インタラクション後の次のフレームのレンダリングによる遅延）です。これにより、インタラクションコードに直接飛びつくのではなく、他のコード、インタラクションのJavaScriptコード、ブラウザのレンダリング処理のどれが原因かを特定するのに役立ちます。

インタラクションを遅らせるJavaScriptコードについて、さらに詳しい知見を得ることも可能です。JS Self-Profiling APIを使った完全なパフォーマンストレースは重量級のソリューションで、それ自体がパフォーマンスの問題を引き起こしがちです。Long Animation Frames APIは、INPインタラクションのために、フィールドで実行が遅いJavaScriptを特定するのに使える軽量なAPIです。

## 実装方法

生のEvent Timing APIからINPを算出するのは複雑で、いくつかのニュアンスがあります。このデータを収集するには、RUMツールやライブラリの使用を推奨します。

`web-vitals` は、INPを含むCore Web Vitalsを算出するGoogleのオープンソースライブラリであり、INPインタラクションについて副要素やLong Animation Frame データも含めて提供しています。

## web-vitals ライブラリを使ってINPインタラクションのアトリビューションを取得する

`web-vitals` ライブラリは、Core Web Vitalsや他のパフォーマンスメトリクスを計測するための小さなライブラリです。`onINP()` 関数を使うと、最も遅いインタラクションを特定でき、INPの副要素やLong Animation Frames APIを使ってインタラクション中に実行されたスクリプトに関する情報を含められます。

```javascript
// Use the attribution build to get Long Animation Frame data
// alongside the INP metric value.
import { onINP } from 'web-vitals/attribution';

onINP((metric) => {
  // Beacon script attribution for the longest script during the INP
  // interaction, so you can identify the root cause in production.
  navigator.sendBeacon(
    '/analytics',
    JSON.stringify({
      name: 'INP',
      value: metric.value,
      // These fields give the INP subparts:
      inputDelay: metric.attribution.inputDelay,
      presentationDelay: metric.attribution.presentationDelay,
      processingDuration: metric.attribution.processingDuration,
      interactionTarget: metric.attribution.interactionTarget,
      // These fields identify which script function was responsible
      // for the longest processing during the INP interaction.
      invokerType: metric.attribution.longestScript.entry?.invokerType,
      sourceURL: metric.attribution.longestScript.entry?.sourceURL,
      sourceFunctionName: metric.attribution.longestScript.entry?.sourceFunctionName,
      sourceCharPosition: metric.attribution.longestScript.entry?.sourceCharPosition,
      // subpart indicates which phase (input delay, processing, or
      // presentation delay) the longest script overlapped with most.
      subpart: metric.attribution.longestScript.subpart,
      intersectingDuration: metric.attribution.longestScript.intersectingDuration
    })
  );
});
```

## ベストプラクティス

- **DO** まずINPの副要素を使って、遅延がすでに実行されているJavaScript（input delay）、インタラクション用のイベントハンドラJavaScript（processing duration）、それに続くレンダリング（presentation delay）のいずれにあるかを特定してください。
- **DO** 特にinput delayとprocessing durationについて、最大のブロッキングJavaScriptをさらなる詳細として特定してみてください。
- **DO** これらの追加詳細を提供するために、ランタイムオーバーヘッドの大きいJS Self-Profiling APIのような代替よりも、Long Animation Frames APIを優先してください。
- **DO** 他のRUMソリューションがなければ `web-vitals` ライブラリを使ってください。これはINPインタラクションを特定でき、Long Animation Frames APIを使って副要素やインタラクション中に実行されたスクリプトに関する情報を含めます。
- **DO** ローカルにログ出力するだけではなく、必要な情報をアナリティクスサービスへビーコン送信してください。

## ブラウザサポートとフォールバック戦略

Event timing のBaselineステータス: Newly available。2025年12月12日からBaselineです。
対応ブラウザ: Chrome 76（2019年7月）、Edge 79（2020年1月）、Firefox 89（2021年6月）、Safari 26.2（2025年12月）。

Event Timing APIはほとんどのモダンブラウザで利用可能であり、INPとINPの副要素を算出するのに必要です。このAPIをサポートしないブラウザではINPを計測できません。

Long animation frames は限定的に利用可能です。
対応ブラウザ: Chrome 123（2024年3月）および Edge 123（2024年3月）。
未対応: Firefox および Safari。

Long Animation Frames APIはオプションの追加詳細を提供します。フォールバックなしで安全に使用できます。多くの場合、このAPIが特定するパフォーマンス改善の機会は他のブラウザにも適用できます。
