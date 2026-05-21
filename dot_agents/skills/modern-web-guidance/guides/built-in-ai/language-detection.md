**Language Detector API** は、与えられたテキスト文字列の言語を識別するために設計されたクライアントサイドのWeb APIです。ブラウザ内でローカルに検出を行うことで、ユーザーのプライバシーを高め、重い外部ライブラリやコストの高いサーバーサイド呼び出しの必要性を減らします。

## 主なユースケース

- **翻訳の準備:** テキストを翻訳ツールに送る前にソース言語を識別する。
- **安全性とフィルタリング:** 毒性検出のようなタスク用に特定のモデルを読み込む。
- **アクセシビリティ:** スクリーンリーダー向けに正しい `lang` 属性でコンテンツをラベル付けする。
- **UIのローカライズ:** ユーザーの入力言語に基づいてアプリケーションのインターフェースを調整する。

## ハードウェアおよびシステム要件

- **OS:** Windows 10/11、macOS 13以降、Linux、または Chromebook Plus。
- **ストレージ:** 22GBの空き容量（空き容量が10GBを下回るとモデルは削除されます）。
- **RAM/CPU:** 16GBのRAMと4コア以上のCPU。
- **VRAM:** GPUを使う場合は4GB以上。

## 実装ガイド

### 1. モデル管理とユーザーアクティベーション

検出器をインスタンス化したりダウンロードをトリガーしたりする前に、モデルの可用性を確認します。

**必須:** `LanguageDetector.create()` で言語検出器をインスタンス化したりモデルダウンロードをトリガーしたりするには、モデルが `downloadable` または `downloading` 状態のときに `NotAllowedError` を防ぐため、ユーザージェスチャ（ボタンクリックなど）から開始する**必要があります**。

```javascript
// Check if the model is available or downloadable
const availability = await LanguageDetector.availability();

if (availability !== 'unavailable') {
  button.addEventListener('click', async () => {
    const detector = await LanguageDetector.create({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Downloaded ${e.loaded * 100}%`);
        });
      },
    });
  });
}
```

### 2. 検出の実行

このAPIは、可能性のある言語と `0.0` から `1.0` までの信頼度スコアによるランク付きリストを返します。

```javascript
const someUserText = 'Hallo und herzlich willkommen!';
const results = await detector.detect(someUserText);

for (const result of results) {
  // result.detectedLanguage (e.g., 'de')
  // result.confidence (e.g., 0.999)
  console.log(result.detectedLanguage, result.confidence);
}
```

非常に短いフレーズや単語に対する検出は精度が大きく落ちるため、避けてください。

## セキュリティと環境

- **iframe:** クロスオリジンのiframeはこのAPIにアクセスするために明示的なPermissions Policyが必要です。
  ```html
  <iframe
    src="https://cross-origin.example.com/"
    allow="language-detector"
  ></iframe>
  ```
- **Web Worker:** Permission Policyの複雑さのため、現在Web WorkerではこのAPIは**利用できません**。
- **プライバシー:** 検出処理中、Googleや第三者にデータは送信されません。

## フォールバック戦略

Language Detectorの利用可能性は限定的です。
サポート: Chrome 138（2025年6月）。
非対応: Edge、Firefox、Safari。

使用前に、グローバルスコープに `LanguageDetector` オブジェクトが利用可能かを確認します。

```javascript
if ('LanguageDetector' in self) {
  // The Language Detector API is supported.
} else {
  // Execute fallback strategy
}
```

`LanguageDetector` APIがサポートされていない、または可用性チェックが `'unavailable'` を返した場合、グレースフルなフォールバックが必要です。

1. **リモートAPIフォールバック**: 検出リクエストをサーバーエンドポイントやクラウドAPI（Vertex AI Gemini APIなど）にリダイレクトして言語を識別します。
2. **グレースフルデグラデーション**: 言語検出の要素やボタンを無効化し、このブラウザではクライアントサイド検出が現在サポートされていないことをユーザーに伝え、未処理の例外やクラッシュを防ぎます。
