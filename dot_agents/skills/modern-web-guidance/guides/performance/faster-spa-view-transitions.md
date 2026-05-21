# 状態キャッシュによるSPAビュー遷移の高速化

非アクティブなビューを破棄するのではなく、レンダリング済みの状態をキャッシュすることで、シングルページアプリケーション（SPA）におけるビュー間の即時ナビゲーションを実現します。

## 概要

これまで、ユーザーがSPA内でタブやビューを移動するとき、開発者は古いビューを破棄するか、`display: none` を使って非表示にするかのどちらかでした。どちらのアプローチでも、ユーザーがそのビューに戻ったときにブラウザは完全なレイアウト計算とペイントを再生成しなければなりません。

非アクティブなビューに `content-visibility: hidden` を使用すると、ブラウザは要素のコンテンツをレイアウトフローから取り除き、描画を停止しますが、そのキャッシュされたレンダリング状態をメモリに *保持* します。ユーザーが戻ってきたとき、ビューはほぼ瞬時に復元されます。

### CPU と RAM のトレードオフ

このアプローチは大きなパフォーマンス上の利点を提供しますが、慎重に管理すべき具体的なトレードオフがあります。

*   **CPUの節約:** 大きい。ブラウザは隠れたビューのレイアウトとペイントのパスを完全にスキップします。
*   **RAMコスト:** 高い。ブラウザは非表示のビューのすべてのDOMノード、イベントリスナー、状態をメモリに保持します。

#### このトレードオフが危険になるとき

*   **DO** ビュー数が少なく予測可能なシンプルなアプリケーション（例: 3〜5のタブインターフェース）でこの戦略を使ってください。
*   **DO NOT** 数十のユニークなレポートを生成する、または無限の動的ルートを使う高度に動的なアプリケーションで、すべてのビューを無条件にキャッシュしないでください。そうすると、最終的に深刻なメモリ肥大化を招き、ローエンドデバイスではブラウザがクラッシュする可能性があります。
*   **MANDATORY:** アプリケーションが高度に動的な場合、メモリのしきい値に達したときに古いビューを破棄するための **エビクション戦略**（Least Recently Used キャッシュなど）を実装する必要があります。

## 実装

### 1. ビューコンテナを構成する

現在アクティブでないビューに `content-visibility: hidden` を設定します。

> **注:** `content-visibility: hidden` プロパティは要素の *コンテンツ* を非表示にしますが、要素自体はスタイル付きで表示されたままです。背景、ボーダー、パディング、マージンは引き続きブラウザによって描画されます。

```css
.spa-view.inactive {
  /* MANDATORY: Use hidden to cache the rendering state of inactive views */
  content-visibility: hidden;
  
  /* Optional: Prevent hidden views from taking up physical space in layout flow */
  position: absolute;
}
```

### 2. フォーカスを管理する

ビューを切り替えるときは、アクセシビリティを維持するためにキーボードフォーカスを正しく管理してください。

```javascript
function switchToView(viewId) {
  // Hide all views
  document.querySelectorAll('.spa-view').forEach(view => {
    view.classList.add('inactive');
    view.setAttribute('aria-hidden', 'true');
  });
  
  // Show the target view
  const activeView = document.getElementById(viewId);
  activeView.classList.remove('inactive');
  activeView.setAttribute('aria-hidden', 'false');
  
  // MANDATORY: Move focus to the new view to ensure a logical tab-order
  activeView.focus();
}
```

### フォールバック戦略

content-visibility のBaselineステータス: Newly available。2025年9月15日からBaselineです。
対応ブラウザ: Chrome 108（2022年11月）、Edge 108（2022年12月）、Firefox 130（2024年9月）、Safari 26（2025年9月）。

`content-visibility` プロパティは段階的に劣化します。サポートしないブラウザでは:
*   プロパティは無視されます。
*   フォールバックのブラウザがすべてのビューを同時にレンダリングしないようにするには、CSSで `display: none` のフォールバックを提供すべきです。

```css
@supports not (content-visibility: hidden) {
  .spa-view.inactive {
    display: none;
  }
}
```
