# トースト通知を作成する

トースト通知は一時的なステータスメッセージです。メニューと違い、ユーザーがページの他の部分を操作しても閉じてはいけません。popover="manual"の状態は「ライトディスミス」の挙動を持たず、複数の通知を共存させられるため理想的です。

### 実装ガイドライン

- **MANDATORY:** popover="manual"を使い、スクリプトによって明示的に閉じられるかタイムアウトするまで通知を表示し続けてください。
- **DO** 複数のトーストのスタッキングを管理するためのコンテナを使ってください。最上位レイヤーのポップオーバーは親のz-indexを無視するため、個別に位置調整するか、共通のレイアウトグループ内に配置する必要があります。
- **DO** sibling-index()を使ってトースト通知間にマージンを追加し、スタックの下にあるアイテムも見えるようにしてください。
- **DO** popovertargetaction="hide"を使った明示的な「閉じる」ボタンをトースト内に用意してください。
- **DO** 自動消失タイマー（例: 3000ms後にhidePopover()を呼ぶ）にはJavaScriptを使ってください。
- **DO** 最上位レイヤーへの出入りをアニメーションさせるために、transition-behavior: allow-discreteを活用してください。

### フォールバック戦略

#### popover

- **ガイダンス:** [Popover Polyfill](https://github.com/oddbird/popover-polyfill)を使ってください。レガシーブラウザでは、高いz-indexを持つfixed配置のdivへフォールバックします。

#### sibling-index()

- **ガイダンス:** sibling-index()がサポートされていない場合は、`+`演算子で手動でマージンを追加してください。例: `popover + popover { margin-top: 1rem }`

#### anchor-positioning

- **ガイダンス:** [CSS Anchor Positioningポリフィル](https://github.com/oddbird/css-anchor-positioning)を使ってください。ポリフィルを使わないフォールバックでは、`@supports not (anchor-name: --foo)`を使ってツールチップをビューポート下部の固定位置にデフォルト配置します。

#### transition-behavior

- **ガイダンス:** transition-behaviorがサポートされていない場合は、トースト要素のトランジションのイン・アウトに合わせてクラスでアニメーションを追加するJavaScriptを使ってください。
