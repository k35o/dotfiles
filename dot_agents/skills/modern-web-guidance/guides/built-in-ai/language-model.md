Prompt APIにより、開発者は**Gemini Nano**を使って自然言語処理タスクをブラウザ内で直接実行できます。このビルトインAIアプローチはユーザーのプライバシーを守り、サーバーコストを削減し、オフライン機能を可能にします。

## 1. はじめにとハードウェア要件

Prompt APIは、Windows、macOS、Linux、Chromebook PlusのChromeバージョン148（デスクトップ）以降で現在利用可能です。

### ハードウェア前提条件

- **ストレージ**: 22GBの空き容量（初期プロファイルとモデル用）。
- **メモリ/CPU**: 16GBのRAMと4コア以上のCPU。
- **GPU**: 4GB以上のVRAM（音声入力に必要）。
- **ネットワーク**: 初期のモデルダウンロード時のみ必要。

### APIの初期化

ダウンロードをトリガーする前にモデルの可用性を確認します。

```javascript
const availability = await LanguageModel.availability();

// Do not call create() when unavailable — the model cannot run on this device.
if (availability !== 'unavailable') {
  const session = await LanguageModel.create({
    monitor(m) {
      // Inform the user while the model downloads so the UI doesn't appear frozen.
      m.addEventListener('downloadprogress', (e) => {
        console.log(`Downloaded ${e.loaded * 100}%`);
      });
    },
  });
}
```

## 2. コアなプロンプト機能

このセクションのセッション例では簡潔さのため `session.destroy()` を省略しています。セッションが不要になったら、デバイスメモリを解放するために常に `session.destroy()` を呼び出してください（セクション5を参照）。

### 基本出力とストリーミング出力

短い応答には `prompt()` を、長いコンテンツにはレスポンシブなUIを提供するために `promptStreaming()` を使います。

**必須**: モデル出力を決して `innerHTML` に割り当てないでください。モデル出力は信頼できず、注入されたマークアップを含む可能性があります。常に `textContent` またはサニタイザーを使用してください。

```javascript
const session = await LanguageModel.create();

// prompt() accumulates the full response before resolving — use for short, one-shot output.
const result = await session.prompt('Write a haiku about coding.');
// textContent, not innerHTML — model output is untrusted and must not be parsed as markup.
outputEl.textContent = result;

// promptStreaming() yields independent chunks that must be concatenated;
// use for longer content so each chunk can be rendered progressively.
const stream = session.promptStreaming('Write a long story about a robot.');
let completeResult = '';
for await (const chunk of stream) {
  completeResult += chunk;
  outputEl.append(chunk);
}
console.log('Full story:', completeResult);
```

### マルチモーダル入力

Prompt APIはテキスト、音声、視覚入力（画像、canvas、動画フレーム）をサポートしています。

```javascript
const session = await LanguageModel.create({
  // Declaring expected input types lets the browser optimize model loading.
  expectedInputs: [{ type: 'text' }, { type: 'image' }],
  expectedOutputs: [{ type: 'text' }],
});

const response = await session.prompt([
  {
    role: 'user',
    content: [
      { type: 'text', value: 'What is in this image?' },
      { type: 'image', value: document.querySelector('canvas') },
    ],
  },
]);
```

## 3. 高度なセッション管理

セッションを使うと、モデルは複数のインタラクション間でコンテキストを維持できます。

### コンテキストとクォータ

各セッションには最大トークン数の制限があります。`session.contextUsage` と `session.contextWindow` で使用状況を監視できます。ウィンドウがオーバーフローすると、最も古いメッセージ（システムプロンプトを除く）から削除されます。

### セッションのクローン

クローンは、同じ初期コンテキスト（「システム」パーソナリティのようなもの）を共有する並列会話を再初期化せずに開始する場合に効率的です。

```javascript
const mainSession = await LanguageModel.create({
  initialPrompts: [{ role: 'system', content: 'You speak like a pirate.' }],
});

const branchA = await mainSession.clone();
const branchB = await mainSession.clone();
// Destroy the base after cloning — the clones own their own context from here.
mainSession.destroy();
```

### 過去のセッションの復元

ネイティブの「復元」機能は開発中ですが、以前の履歴を `initialPrompts` にフィードすることでセッションを再作成できます。

**注意**: `localStorage` は暗号化されておらず永続的です。保存された会話履歴にはユーザーのPIIが含まれる場合があります。チャット履歴を永続化する前にプライバシーへの影響を考慮してください。

```javascript
// || '[]' ensures JSON.parse never receives null when the key doesn't exist yet.
const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
const session = await LanguageModel.create({
  initialPrompts: history, // Array of {role, content} objects
});
```

## 4. JSON Schemaによる構造化出力

モデルが「もちろん、こちらがあなたのJSONです:」のような余計な文を付け加えるのを防ぐには、`responseConstraint` フィールド経由で**JSON Schema**を使います。これにより、出力がすぐにパースできる有効なJSONになることが保証されます。

### 例: 感情分類

```javascript
// Pass the schema as a plain object — do not JSON.stringify() it first.
const schema = {
  type: 'object',
  properties: {
    rating: { type: 'number', minimum: 1, maximum: 5 },
    is_positive: { type: 'boolean' },
  },
  required: ['rating', 'is_positive'],
};

const result = await session.prompt(
  "Rate the following feedback: 'The food was great!'",
  { responseConstraint: schema },
);

const data = JSON.parse(result);
console.log(data.rating); // 5
```

### 制約とプレフィックス

`prefix: true` を使ってアシスタントの応答を事前に埋めることで、モデルをさらに誘導できます。

````javascript
const character = await session.prompt([
  { role: 'user', content: 'Create a character sheet' },
  { role: 'assistant', content: '```json\n', prefix: true },
]);
````

## 5. ベストプラクティスと安全性

- **リソースクリーンアップ**: 会話が終了したら、常に `session.destroy()` を呼び出してメモリを解放してください。
- **出力の安全性**: モデル出力は信頼できません。悪意あるモデル出力からのXSS注入を防ぐため、結果は常に `innerHTML` ではなく `textContent` に書き込んでください。
- 限定的なHTMLを許可する必要がある場合は、ネイティブのSanitizer APIやDOMPurifyのようなサニタイザーを使用してください。
- **タスクの中止**: ユーザーが長時間実行される生成を停止できるよう、`AbortController` を使用します。`signal` は `LanguageModel.create()` ではなく、`prompt()` や `promptStreaming()` に渡してください。
- **セキュリティ**: iframeでのアクセスを制御するためにPermission Policyを使用してください: `<iframe src="..." allow="language-model"></iframe>`。
- **デザイン**: 責任あるAI実装を確保するために、[People + AI Guidebook](https://pair.withgoogle.com/guidebook/)を確認してください。

構造化出力と堅牢なセッション管理を組み合わせることで、開発者はユーザーのデバイス上で完全に動作する、複雑でステートフルなAIアプリケーションを構築できます。

## 6. フォールバック戦略

LanguageModelの利用可能性は限定的です。
サポート: Chrome 148（2026年5月）、Edge 148（2026年5月）。
非対応: Firefox、Safari。

使用前に、グローバルスコープにLanguageModelオブジェクトが利用可能かを確認します。

```js
if ('LanguageModel' in self) {
  // The Prompt API is supported.
} else {
  // Execute fallback strategy
}
```

Prompt APIがサポートされていない、または可用性チェックが 'unavailable' を返した場合、グレースフルなフォールバックが必要です。

- リモートAPIフォールバック: 検出リクエストをサーバーエンドポイントやクラウドAPI（Vertex AI Gemini APIなど）にリダイレクトします。
- ローカルAPIフォールバック: 検出リクエストをローカルエンドポイントへ、例えばTransformers.jsを使ってリダイレクトします。
