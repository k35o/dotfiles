モーダルダイアログが開いているとき、ユーザーは慣れ親しんだコントロールでそれを閉じることを期待します。キーボードの<kbd>Esc</kbd>キーを押す、モバイルプラットフォームの戻るボタンやジェスチャーを使う、支援技術の閉じるジェスチャーを使うなどです。

`<dialog>`要素が最初に導入されたとき、<kbd>Esc</kbd>キーで閉じることはできましたが、モバイルの戻るボタン／ジェスチャーなど他のプラットフォームコントロールでは閉じられませんでした。`<dialog>`要素に`closedby`属性が追加されたことで、モーダル状態（JavaScriptで`<dialog>`要素の`showModal()`メソッドを使って命令的に開いたり、`show-modal`インボーカーコマンドで宣言的に開いたりした場合）で開かれた`<dialog>`要素に対して、より多くのプラットフォーム固有のコントロールから来るクローズリクエストに応答する拡張挙動が適用されるようになりました。したがって、すでに`<dialog>`要素を使っている開発者が特別な変更を加える必要はありません。

```html
<!-- MANDATORY: must be opened with either `showModal()` with JavaScript or the `show-modal` command using declarative command invokers in order respond to close requests including platform-specific controls. -->
<dialog aria-labelledby="example">
  <h1 id="example">Example</h1>
  <p>Modal that can be dismissed with close requests.</p>
</dialog>
```

モーダル状態で開かれた場合、`closedby`属性を持たないダイアログは、`closedby`属性を`closerequest`に明示設定したのと同じようにクローズリクエストに応答します。

```html
<!-- This is unnecessary as it is the default behavior for modal dialogs -->
<dialog closedby="closerequest" aria-labelledby="example">
  <h1 id="example">Example</h1>
  <p>Modal that can be dismissed with close requests.</p>
</dialog>
```

「ライトディスミス」の挙動も欲しい場合は、`closedby`を`any`に設定してください:

```html
<dialog closedby="any" aria-labelledby="example">
  <h1 id="example">Example</h1>
  <p>Modal that can be dismissed with close requests and light dismiss.</p>
</dialog>
```

## フォールバック戦略

<dialog closedby> has limited availability.
Supported by: Chrome 134 (Mar 2025), Edge 134 (Mar 2025), and Firefox 141 (Jul 2025).
Unsupported in: Safari.

モーダル状態で開かれた`<dialog>`要素はもともと<kbd>Esc</kbd>で閉じられるため、フォールバックは不要です。モバイルの戻るボタン／ジェスチャーからのクローズリクエストをうまく実装する方法はないので、モーダルダイアログを閉じる手段は他にもインクルーシブにあるという点を踏まえても、この機能はプログレッシブエンハンスメントとして受け入れる方がシンプルです。同様に、`closedby="any"`を使った`<dialog>`要素のライトディスミス挙動もプログレッシブエンハンスメントとみなせます。
