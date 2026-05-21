**Translator API**を使うと、開発者はChromeのビルトインAIモデルを使ってクライアントサイドのテキスト翻訳を実行できます。このアプローチにより、一時的なコンテンツに対するクラウドベースの翻訳サービスが不要になり、コストを削減しデータをユーザーのデバイス上に保持することでプライバシーを向上させます。


## 前提条件と要件

### ブラウザサポート

- **Chrome:** バージョン138以上（デスクトップのみ）。
- **未サポート:** モバイル（Android/iOS）、Edge、Firefox、Safari。

### ハードウェア要件

Gemini Nanoと関連モデルを実行するには、システムに以下が必要です。

- **オペレーティングシステム:** Windows 10/11、macOS 13以降、Linux、またはChromeOS（Chromebook
  Plus）。
- **ストレージ:** Chromeのプロファイルボリュームに少なくとも**22 GB**の空き容量。
- **メモリ/CPU:** 16 GB以上のRAMと4コア以上のCPU。
- **GPU:** 4 GB以上のVRAM（音声付きPrompt APIには必須）。
- **ネットワーク:** 言語パック/モデルの初回ダウンロード時のみ必要。

## 実装とコードサンプル

### 1. 可用性の確認とモデルのダウンロード

**オプション渡しの必須事項:** `Translator.availability(options)` と `Translator.create(options)` の両方に、同一の設定オプションオブジェクトを渡す必要があります。

**進捗監視の必須事項:** モデルダウンロードの進捗を監視するために、`Translator.create()` に `monitor(m)` コールバックを提供し、`downloadprogress` イベントのリスナーを追加する必要があります。

**ユーザージェスチャ要件:** `availability` が `'downloadable'` の場合、`Translator.create()` でモデルダウンロードをトリガーするにはユーザージェスチャ（ボタンクリックリスナーのコンテキストなど）が必要です。ページ読み込み時の無条件の呼び出しは `NotAllowedError` をトリガーします。

```javascript
const options = {
  sourceLanguage: 'es',
  targetLanguage: 'fr',
};

const availability = await Translator.availability(options);

if (availability === 'available' || availability === 'downloadable') {
  // A user gesture is strictly required to trigger create when downloadable
  document.getElementById('start-translation-btn').addEventListener('click', async () => {
    const translator = await Translator.create({
      ...options,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Downloaded ${Math.round(e.loaded * 100)}%`);
        });
      },
    });
  });
}
```

### 3. 翻訳の実行

このAPIは静的応答とストリーミング応答の両方をサポートしています。

**標準翻訳:**

```javascript
const translator = await Translator.create({
  sourceLanguage: 'en',
  targetLanguage: 'fr',
});

const result = await translator.translate(
  'Where is the next bus stop, please?',
);
console.log(result);
// Output: "Où est le prochain arrêt de bus, s'il vous plaît ?"
```

**ストリーミング翻訳（長文向け）:**

```javascript
const stream = translator.translateStreaming(longText);
for await (const chunk of stream) {
  console.log(chunk);
}
```

## サポートされている言語

このAPIは幅広いBCP 47言語コードをサポートしています。以下はChromeのTranslator API実装でサポートされている言語です。

- **ar**: アラビア語
- **bg**: ブルガリア語
- **bn**: ベンガル語
- **cs**: チェコ語
- **da**: デンマーク語
- **de**: ドイツ語
- **el**: ギリシャ語
- **en**: 英語
- **es**: スペイン語
- **fi**: フィンランド語
- **fr**: フランス語
- **hi**: ヒンディー語
- **hr**: クロアチア語
- **hu**: ハンガリー語
- **id**: インドネシア語
- **it**: イタリア語
- **iw**: ヘブライ語
- **ja**: 日本語
- **kn**: カンナダ語
- **ko**: 韓国語
- **lt**: リトアニア語
- **mr**: マラーティー語
- **nl**: オランダ語
- **no**: ノルウェー語
- **pl**: ポーランド語
- **pt**: ポルトガル語
- **ro**: ルーマニア語
- **ru**: ロシア語
- **sk**: スロバキア語
- **sl**: スロベニア語
- **sv**: スウェーデン語
- **ta**: タミル語
- **te**: テルグ語
- **th**: タイ語
- **tr**: トルコ語
- **uk**: ウクライナ語
- **vi**: ベトナム語
- **zh**: 中国語
- **zh-Hant**: 中国語（繁体）

## セキュリティとパフォーマンス

- **Permissions Policy:** クロスオリジンのiframeには明示的な権限が必要です。
  ```html
  <iframe src="https://example.com/" allow="translator"></iframe>
  ```
- **Web Worker:** Permission Policyの複雑さのため、現在**サポートされていません**。
- **プライバシー:** モデルがダウンロードされたあとは、翻訳処理中にGoogleのサーバーへデータは送信されません。

## フォールバック戦略

Translatorの利用可能性は限定的です。
サポート: Chrome 138（2025年6月）。
非対応: Edge、Firefox、Safari。

使用前に、グローバルスコープに `Translator` オブジェクトが利用可能かを確認します。

```javascript
if ('Translator' in self) {
  // The Translator API is supported.
} else {
  // Execute fallback strategy
}
```

`Translator` APIがサポートされていない、または可用性チェックが `'unavailable'` を返した場合、グレースフルなフォールバックが必要です。

推奨オプション:
1. **リモートAPIフォールバック**: 翻訳リクエストをサーバーエンドポイントやクラウドリモートAPI（Vertex AI Gemini APIなど）にリダイレクトして、翻訳機能を提供します。
2. **グレースフルデグラデーション**: 翻訳コントロール要素やボタンを視覚的に無効化し、エンドユーザー向けのフレンドリーな注記（例: `"Client-side translation is currently unsupported in this browser"`）を表示します。未処理の例外を許可しないでください。
3. **ポリフィルフォールバック**: コミュニティが保守する `built-in-ai-task-apis-polyfills` や `prompt-api-polyfill` などのポリフィルを使って、リモートサービスでAPI面をエミュレートできます。

> **プライバシーとコストへの影響:** これらのポリフィルはリモートサーバー（クラウド経由のGemini APIなど）にリクエストをプロキシします。これにより、ネイティブのBuilt-in AI APIのデバイス上プライバシー保証は完全に失われ、サーバーサイドのAPI利用コストが発生します。
