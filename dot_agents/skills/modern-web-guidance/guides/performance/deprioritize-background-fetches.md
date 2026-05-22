# バックグラウンドフェッチの優先度を下げる

ページが複数のネットワークリクエストを同時に実行すると、同じ帯域幅を奪い合うことになります。アナリティクス、ロギング、バックグラウンド同期など、重要度の低いデータは優先度を下げて、ユーザーが起点となるリクエストや重要なデータフェッチがより早く完了するようにすべきです。

## 実装方法

1. **バックグラウンドリクエストを特定する**: 即時のユーザー体験に影響しない非必須データのための `fetch()` 呼び出しを特定します。
2. **Fetch Priority を適用する**: `fetch()` の初期化オブジェクトに `priority: 'low'` オプションを追加します。

## サンプルコード

```javascript
// Use high priority (default) for critical UI updates
const criticalData = await fetch('/api/data');

// Explicitly deprioritize background analytics
fetch('/api/analytics', {
  method: 'POST',
  body: JSON.stringify(eventData),
  // Lower the priority to prevent network contention
  priority: 'low',
});
```

## ベストプラクティス

- **DO** 現在のビューで必要のないアナリティクス、ビーコン、テレメトリのデータには `priority: 'low'` を使ってください。
- **DO** 後にユーザーが必要にする _かもしれない_ データを「プリフェッチ」するときは、現在必要なものを遅らせないよう `priority: 'low'` を使ってください。
- **DO NOT** ユーザー体験に重要なフェッチに対して `priority: 'low'` を使わないでください。
- **DO NOT** フェッチオプションオブジェクトで非推奨の `importance` キーを使わないでください。正しいキーは `priority` です。

## フォールバック戦略

Fetch priority のBaselineステータス: Newly available。2024年10月29日からBaselineです。
対応ブラウザ: Chrome 103（2022年6月）、Edge 103（2022年6月）、Firefox 132（2024年10月）、Safari 17.2（2023年12月）。

Fetch APIの `priority` オプションはプログレッシブエンハンスメントです。サポートしないブラウザはこのオプションを無視し、リクエストをデフォルト優先度で扱います。基本的な使用には、明示的な Feature Detection やフォールバックロジックは不要です。
