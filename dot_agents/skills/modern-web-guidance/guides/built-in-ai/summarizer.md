**Summarizer API**を使うと、Webデベロッパーは**ChromeのGemini NanoまたはEdgeのPhi**を使って、ブラウザ内で直接ローカルなAI駆動のテキスト要約を提供できます。このAPIは、キーポイント、見出し、TL;DRなどさまざまな形式をサポートし、すべての処理をデバイス上で実行することでユーザーのプライバシーを確保します。

---

## はじめに

Summarizer APIは**Chromeおよび Edge 138**から利用可能です。Gemini NanoまたはPhi（それぞれ）の一度限りのモデルダウンロードが必要です。


### ハードウェアおよびソフトウェア要件

- **OS**: Windows 10/11、macOS 13以降、Linux、または ChromeOS（Chromebook Plus）。
- **ストレージ**: プロファイルボリュームに22GBの空き容量。
- **RAM/CPU**: 16GB以上のRAMと4コア以上のCPU。
- **VRAM**: 4GB以上（GPU使用時）。

### モデルダウンロードと可用性

モデルが準備済みか、ダウンロードが必要か、利用できないかを確認します。

**オプション渡しの必須事項:** `Summarizer.availability(options)` と `Summarizer.create(options)` の両方に、同一の設定オプションオブジェクトを渡す必要があります。非推奨の `window.ai.summarizer` API面は使用しないでください。

**進捗監視の必須事項:** モデルダウンロードの進捗を監視するために、`Summarizer.create()` に `monitor(m)` コールバックを提供し、`downloadprogress` イベントのリスナーを追加する必要があります。

**ユーザージェスチャ要件:** `availability` が `'downloadable'` や `'downloading'` の場合、`Summarizer.create()` で実際のダウンロードをトリガーするにはユーザージェスチャ（ユーザークリックなど）が必要です。`NotAllowedError` を防ぐため、ページ読み込み時に無条件で呼ぶのではなく、イベントリスナーの中で作成呼び出しを行ってください。

```javascript
const options = {
  type: 'key-points',
  format: 'plain-text',
  length: 'medium'
};

const availability = await Summarizer.availability(options);

if (availability === 'available') {
  const summarizer = await Summarizer.create(options);
  // Ready to use immediately
} else if (availability === 'downloadable') {
  // A user gesture is strictly required to start the download
  document.getElementById('start-download-btn').addEventListener('click', async () => {
    const summarizer = await Summarizer.create({
      ...options,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Downloaded ${Math.round((e.loaded / e.total) * 100)}%`);
        });
      },
    });
  });
}
```

## API関数と設定

`Summarizer.create(options)` でサマライザーを作成する際、出力をカスタマイズできます。

| パラメータ    | オプション                                    | 説明                             |
| :----------- | :----------------------------------------- | :-------------------------------------- |
| `type`       | `key-points`、`tldr`、`teaser`、`headline` | 要約の戦略を定義します。           |
| `format`     | `markdown`、`plain-text`                   | 出力構文のスタイル。                    |
| `length`     | `short`、`medium`、`long`                  | 目標の長さ（例: 1文 vs 5文）。 |
| `preference` | `auto`、`speed`、`capability`              | レイテンシと品質のバランス。           |

### 設定例

```javascript
const options = {
  sharedContext: 'This is a scientific article',
  type: 'key-points',
  format: 'markdown',
  length: 'medium',
};

if (navigator.userActivation.isActive) {
  const summarizer = await Summarizer.create(options);
}
```

### 言語サポート

ブラウザが特定の要約リクエストを処理できることを確認するために、期待される言語を指定できます。

```javascript
const summarizer = await Summarizer.create({
  type: 'key-points',
  expectedInputLanguages: ['en', 'ja'],
  outputLanguage: 'es',
});
```

## 要約メソッド

### 1. バッチ要約

テキスト全体を一度に処理して結果を返します。

```javascript
const longText = document.querySelector('article').innerText;
const summary = await summarizer.summarize(longText, {
  context: 'This article is intended for a tech-savvy audience.',
});
console.log(summary);
```

### 2. ストリーム要約

モデルが生成するにつれリアルタイムで結果を返し、よりレスポンシブなUIを提供します。

```javascript
const stream = summarizer.summarizeStreaming(longText);
for await (const chunk of stream) {
  console.log(chunk);
}
```

## セキュリティと権限

- **データプライバシー**: Googleにデータは送信されません。処理はローカルデバイスで行われます。
- **クロスオリジン**: Permission Policyを使ってiframeへのアクセスを許可できます。
  ```html
  <iframe src="https://example.com/" allow="summarizer"></iframe>
  ```
- **Web Worker**: 現在サポートされていません。

## フォールバック戦略

Summarizerの利用可能性は限定的です。
サポート: Chrome 138（2025年6月）。
非対応: Edge、Firefox、Safari。

初期化や可用性のクエリを行う前に、ブラウザが `Summarizer` APIをサポートしているかを確認します。

```javascript
if ('Summarizer' in self) {
  // The Summarizer API is supported.
} else {
  // Execute fallback strategy
}
```

`Summarizer` APIがサポートされていない、または可用性チェックが `'unavailable'` を返した場合、グレースフルなフォールバックが必要です。

推奨オプション:
1. **リモートAPIフォールバック**: 要約リクエストをサーバーエンドポイントやリモートAPI（Vertex AI Gemini APIなど）にリダイレクトし、ユーザーが引き続き要約を取得できるようにします。
2. **グレースフルデグラデーション**: UI上で要約コントロールを視覚的に無効化するか、ボタンを隠したうえでフレンドリーなメッセージ（例: `"Local summarization is currently unsupported in this browser"`）を表示します。汎用的な未処理のランタイム例外をトリガーするようなインタラクションを許可しないでください。
3. **ポリフィルフォールバック**: コミュニティが保守する `built-in-ai-task-apis-polyfills` や `prompt-api-polyfill` などのポリフィルを使って、クラウドのモデルを使うリモートサービスやローカルモデルを使うデバイス内推論でAPI面をエミュレートできます。

> **プライバシーとコストへの影響:** これらのポリフィルはリモートサーバー（クラウド経由のGemini APIなど）にリクエストをプロキシする場合があります。これにより、ネイティブのBuilt-in AI APIのデバイス上プライバシー保証は完全に失われ、サーバーサイドのAPI利用コストが発生します。
