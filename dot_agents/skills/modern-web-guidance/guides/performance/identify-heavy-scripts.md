# 重いJavaScriptを特定する

重いJavaScriptは、ページのロードパフォーマンスとインタラクティブ性の両方に悪影響を与える可能性があります。最新のWebアプリケーションは、これまで以上にJavaScriptに依存しており、複数のソースを持っています。これにはアプリケーションコード自体（およびそれが依存するフレームワークコード）と、チャットウィジェットや動画プレイヤーなどの機能を追加する3rd partyスクリプトが含まれます。バックグラウンドのアナリティクスやマーケティングスクリプトも一般的な要因であり、見落とされやすい存在です。

応答しないWebページの根本原因を特定するのは難しく、Webパフォーマンスのトレースやプロファイリングを実行し、その結果を解釈するためには一定の専門知識が必要です。さらに、フィールドデータはラボデータと大きく異なることがよくあり、ラボデータは実ユーザーのシナリオのごく一部しか再現できません。これにより、特にインタラクションについて、パフォーマンス低下の根本原因を特定するのが困難になります。

Long Animation Frames APIは、フィールドにおいて重いJavaScriptを特定するために使える軽量なAPIです。重いスクリプトとは、長時間実行される単一のスクリプト、またはページのライフサイクル中に複数回実行されるスクリプトのいずれかを指します。

## 実装方法

Long Animation Frames は `PerformanceObserver` インターフェースを使って監視します。アニメーションフレームのレンダリングに50msを超える時間がかかった場合に `long-animation-frame` エントリが発行されます。このエントリには、長いアニメーションフレームに関する情報（フレームの長さ、その間に実行されたスクリプトなど）が含まれます。

`long-animation-frame` エントリには `scripts` プロパティが含まれており、これは `PerformanceScript` オブジェクトの配列です。各 `PerformanceScript` オブジェクトには、長いアニメーションフレーム中に実行されたスクリプトに関する情報（`sourceURL` や `duration` を含む）が含まれます。

### 長いアニメーションフレームに寄与する最長のスクリプトを特定する例

```javascript
// Accumulate all script entries across the page lifecycle so no
// data is lost between observer callbacks.
const allScripts = [];

const observer = new PerformanceObserver(list => {
  // Collect all script entries across frames to find the biggest offenders.
  allScripts.push(...list.getEntries().flatMap(entry => entry.scripts));

  // Group by sourceURL so you can identify which scripts contribute
  // the most total time, even if each individual invocation is short.
  const scriptSource = [...new Set(allScripts.map(script => script.sourceURL))];
  const scriptsBySource = scriptSource.map(sourceURL => ([sourceURL,
      allScripts.filter(script => script.sourceURL === sourceURL)
  ]));
  const processedScripts = scriptsBySource.map(([sourceURL, scripts]) => ({
    sourceURL,
    count: scripts.length,
    totalDuration: scripts.reduce((subtotal, script) => subtotal + script.duration, 0)
  }));

  // Only include scripts above a certain threshold to reduce noise.
  const heavyScripts = processedScripts.filter(script => {
    return script.totalDuration > 100;
  });

  // Sort by total duration so the worst offenders appear first,
  // making it easier to prioritize optimization efforts.
  heavyScripts.sort((a, b) => b.totalDuration - a.totalDuration);

  // Log to the console for local debugging. In production, replace
  // this with a call to send the data to your analytics service.
  console.table(heavyScripts);
});

// Use buffered: true to capture any long frames that occurred before
// this observer was registered.
observer.observe({type: 'long-animation-frame', buffered: true});
```

## ベストプラクティス

- **DO** ランタイムオーバーヘッドの大きいJS Self-Profiling APIなどの代替よりも、Long Animation Frames APIを優先してください。
- **DO** Long Animation Frames APIは大量の詳細情報を含むため、重要な情報を要約してください。
- **DO** 本番環境では、必要な情報をアナリティクスサービスに送信してください。

## ブラウザサポートとフォールバック戦略

Long animation frames は限定的に利用可能です。
対応ブラウザ: Chrome 123（2024年3月）および Edge 123（2024年3月）。
未対応: Firefox および Safari。

Long Animation Frames APIはサポートしないブラウザでは無視されるため、フォールバックなしで安全に使用できます。多くの場合、このAPIが特定したパフォーマンス改善の機会は他のブラウザにも適用できます。
