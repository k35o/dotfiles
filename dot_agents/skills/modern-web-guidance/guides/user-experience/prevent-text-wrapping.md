# テキストの折り返しを防ぐ

モダンCSSはコンテナ内のテキスト折り返しを制御するための`text-wrap`プロパティを提供します。テキストを1行に維持し、コンテナの境界を無視するには、`text-wrap: nowrap`を使ってください。これは`white-space: nowrap`をよりセマンティックに置き換えるモダンな方法です。

ナビゲーションタブ、水平スクロールするチップ、改行がレイアウトや視覚デザインを壊してしまうあらゆるシナリオなど、テキスト折り返しを防ぎたいUI要素で有用です。

## `text-wrap: nowrap`の実装方法

### 基本的な使い方

自動的な改行をすべて防ぐには、テキストを含む要素に`text-wrap: nowrap`を適用します。

1. **必須**: 対象の要素に`text-wrap: nowrap`を適用してください。
2. **任意**: `overflow`プロパティ（`hidden`、`scroll`、`auto`など）を使ってあふれた部分を管理してください。
3. **任意**: テキストが切り詰められたときに視覚的な手がかりを示すために`text-overflow: ellipsis`を使ってください。注: これには`overflow: hidden`が必要です。

### コード例

```css
.no-wrap-text {
  /* MANDATORY: Prevents automatic line breaks */
  text-wrap: nowrap;

  /* OPTIONAL: Handles the overflow visually */
  overflow: hidden;
  text-overflow: ellipsis;

  /* OPTIONAL: Constrain width to force and handle overflow within this element */
  max-width: 200px;
}
```

### ロングハンドによる細かい制御

`text-wrap`プロパティは`text-wrap-mode`（テキストが折り返すかどうか）と`text-wrap-style`（どう折り返すか）のショートハンドです。折り返しが無効化されると`text-wrap-style`は無視されるので、基本的には`text-wrap`ショートハンドを使ってください。

ロングハンドの`text-wrap-mode: nowrap`も存在しますが、このプロパティ名は現在CSS Working Groupによってプレースホルダーとみなされており、将来変更される可能性があります。

```css
.granular-control {
  /* Modern longhand equivalent to white-space: nowrap */
  /* Preferred: text-wrap: nowrap; */
  text-wrap-mode: nowrap;
}
```

### フォールバック戦略

Baseline status for text-wrap: Newly available. It's been Baseline since 2024-10-17.
Supported by: Chrome 130 (Oct 2024), Edge 130 (Oct 2024), Firefox 124 (Mar 2024), and Safari 17.5 (May 2024).

`text-wrap`をまだサポートしないブラウザでは、レガシーな`white-space`プロパティを使ってください。モダンなブラウザは`white-space`を`text-wrap-mode`と`white-space-collapse`の両方を設定するショートハンドとして扱います。

```css
.no-wrap-with-fallback {
  /* Fallback for older browsers */
  white-space: nowrap;

  /* Modern standard */
  text-wrap: nowrap;
}
```
