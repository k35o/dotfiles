# WebMCP（Web Model Context Protocol）

WebMCPはブラウザネイティブのJavaScript APIであり、Webページが自身のクライアントサイド機能を構造化された「ツール」として、AIエージェント、ブラウザアシスタント、支援技術に公開できるようにします。

IMPORTANT: WebMCPは現在、Chromium系ブラウザ（ChromeやEdgeなど）でアーリープレビュー段階です。Chromiumバージョン`146.0.7672.0`以上と、`#enable-webmcp-testing`フラグの有効化が必要です。

**重要な区別:** WebMCPはブラウザタブ内で完全に**クライアントサイド**で動作します。バックエンドサーバーでは*なく*、HTTP、Server-Sent Events（SSE）、`stdio`のトランスポートも*使用しません*。Webページそのものがツールレジストリとして機能します。

現時点でWebMCPは**ツール（Tools）のみをサポート**します。バックエンド版のModel Context Protocolにある「Resources」や「Prompts」プリミティブはサポートしません。

## 概要

- **Imperative API**: 複雑なロジックや動的なインタラクションには`navigator.modelContext.registerTool()`を使用します。
- **Declarative API**: 標準的なHTMLの`<form>`要素に`toolname`と`tooldescription`を付与してツール化します。

## ベストプラクティス

- **命名とセマンティクス**: 正確な振る舞いを表す具体的な動詞を使います（例: `start-event-creation-process`ではなく`create-event`）。制約を列挙するより、肯定的な記述を好みます。
- **スキーマ設計**: ユーザーの生の入力をそのまま受け取ります（エージェントに計算をさせないようにします）。すべてのパラメータには具体的な型を付け、オプションの目的を説明します。
- **信頼性**: 制約はコードで検証し、リトライを促す説明的なエラーを返します。レート制限を優雅に扱います。一貫性のため、UIの状態更新が完了した*後*に関数が戻るようにします。
- **ツール戦略**: ツールはアトミックかつ合成可能で、明確に区別できる必要があります。フロー制御を強制する指示（「AのあとにBを呼ばないで」など）は書かず、エージェントの判断に委ねます。現在のページコンテキストに応じてツールを動的に登録/解除します。状態を変更しないツールには`annotations: { readOnlyHint: true }`（`execute`の後に配置）を付け、安全に実行できることをエージェントに伝えます。
- **クリーンアップ**: ページ遷移やリソース解放時にツールの登録を解除するため、必ず`AbortSignal`を使ってリークや衝突を防ぎます。`unregisterTool`は使用しません。
- **Web開発のベストプラクティス**: WebMCPツールはブラウザタブ内のクライアントサイドJavaScriptとして動作します。通常のWeb開発のベストプラクティス（例: シークレットをクライアントサイドのコードに含めない、バックエンドDBにはセキュアなAPI層経由でアクセスする、重い計算にはWeb Workers、WASM、WebGPUを使う）を遵守してください。

### WebMCPを推奨しない場面

- **ガードレールのない高リスクなアクション**: 破壊的または不可逆なアクション（例: データ削除）に対して自動送信のツールを使うのは避けます。エージェントの制御外でユーザーが手動確認するUIが必要です。
- **超高頻度に変化する状態**: エージェントが反応するよりも速くデータが変化する場合、古いコンテキストで動作してしまう可能性があります。

### アンチパターンと注意（やってはいけないこと）

- **バックエンドのトランスポートを使わない**: WebMCPはブラウザタブ用であり、Node.jsのバックグラウンドプロセス用ではありません。
- **ResourcesやPromptsを含めない**: 現行のWebMCP仕様ではサポートされていません。
- **`inputSchema`の構造を軽視しない**: エージェントのハルシネーションを最小化するため、すべてのパラメータに明確な説明を必ず記述します。
- **セキュアコンテキスト（HTTPS）の外で使わない**。

## 実装状況

WebMCPは現在、Chromium系ブラウザ（例: Chrome、Edge）でアーリープレビュー段階にあります。

- **現在の状況**: Early preview。
- **必要バージョン**: Chromium `146.0.7672.0`以上。
- **有効化**: `chrome://flags/#enable-webmcp-testing`または`edge://flags/#enable-webmcp-testing`フラグの有効化が必要です。
- **仕様**: 進化中の[Draft Community Group specification](https://webmachinelearning.github.io/webmcp/)であり、まだstandards-track recommendationではありません。
