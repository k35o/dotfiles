# 同一ドキュメント内のトランジション

## 課題

Webサイトでは、商品一覧と各商品の詳細ページのように、同じオブジェクトの複数のビューを提供することがよくあります。2つのビュー間の遷移はしばしば不連続に感じられます。ユーザーが商品サムネイルをクリックして詳細を表示すると、サムネイルが消えて、画面の別の場所に新しい大きな画像が瞬時に現れます。この連続性の欠如は、ユーザーが要素間の関係を追うのを難しくします。

## 解決策

**View Transitions API**を使えば、トランジションの前後で異なる状態に存在する要素ペアを指定できます。Single Page Navigation（SPA）で`document.startViewTransition()`によってトランジションを起動すると、ブラウザは共有された一意の`view-transition-name`によって共有要素を識別します。そして自動的に位置、サイズ、スタイリングの差分を計算し、古い状態から新しい状態へとスムーズにアニメーションさせます。このトランジションは最上位レイヤーで発生し、高い`z-index`値を持つ要素の上にも表示されます。

## 実装ガイド

### ステップ1: 状態変化を`startViewTransition`で包む

シングルページアプリケーション（SPA）や単純な状態変化では、DOMを更新するロジックを`document.startViewTransition`で包みます。ブラウザは現在の状態のスナップショットを取得し、更新を実行し、次に新しい状態のスナップショットを取得します。

```javascript
function navigate(view) {
  // MANDATORY: Wrap the update in startViewTransition
  document.startViewTransition(() => updateDOM(view));
}
```

### ステップ2: 共有のトランジション名を割り当てる

`view-transition-name` CSSプロパティを使って、どの要素をモーフィングするかをブラウザに伝えます。名前は何でも構いません（`none`以外）。**MANDATORY**: 同じ`view-transition-name`を持つ要素は、前後でそれぞれ1つを超えてはなりません。同じ`view-transition-name`を持つ要素が2つ以上ある場合、トランジションなしでDOMが新しい状態に即座に更新されます。

複数のペアの要素をモーフィングするために複数の`view-transition-name`を使えます。例えば、商品画像とタイトルの両方を別々のトランジションで遷移させたいケースなどです。

リストビューには複数のアイテムがあるため、すべてに同じ`view-transition-name`を付けることはできません。SPAでは2つの方法で解決できます。

1. **動的な詳細ページ:** リストページの各アイテムに一意の`view-transition-name`を割り当て、リストアイテムが選択されたときに、詳細ページの該当要素にその名前を動的に適用します。

```css
/* In the list view, give each */
#product-1 { view-transition-name: p1 }
#product-2 { view-transition-name: p2 }
#product-3 { view-transition-name: p3 }
```

```js
function updateDOM(clickedTransitionName){
  const hero = document.getElementById("hero");
  hero.style.viewTransitionName = clickedTransitionName;
}
```

2. **動的なリストアイテム:** 詳細ページの要素に`view-transition-name`を割り当て、リストページで選択されたアイテムにもその名前を適用します。リストページに戻るときは、リストページのアイテムから`view-transition-name`を削除します。

詳細ページの`#hero`要素と、リストページで選択された`.thumbnail`要素が`view-transition-name`を共有します。

```css
#hero{
  view-transition-name: hero;
}
.thumbnail.selected {
  view-transition-name: hero;
}
```

サムネイルがクリックされたら、`.selected`クラスセレクタを使って`view-transition-name`を割り当て、トランジション開始前にDOMの変更を行ってリストビューを準備する必要があります。

その後、`document.startViewTransition()`を呼び出して、ページを詳細ビューからリストビューへ遷移させる変更を適用できます。

リストビューに戻った後は、次のナビゲーションでエラーにならないようにview transitionクラスをクリーンアップする必要があります。このクリーンアップはトランジションの`finished`プロミスが解決した後に行えます。

```javascript
// Function called when a thumbnail is clicked
function goFromListToDetail(e){
  e.currentTarget.classList.add("selected");
  const hero = document.getElementById("hero");
  const bgColor = getComputedStyle(e.currentTarget).backgroundColor;
  hero.style.background = bgColor;

  // Trigger the transition, checking for support
  if (!document.startViewTransition) {
    document.body.classList.add("detail");
    // MANDATORY Accessibility Routing: Route focus to the newly revealed heading to announce context and preserve logical tab flow
    document.getElementById("detail-heading")?.focus();
    return; // MANDATORY: End function execution if view transitions are not supported.  
  }
  const transition = document.startViewTransition(() => {
    document.body.classList.add("detail");
  });
  // MANDATORY Accessibility Routing: Route focus after the view transition resolves
  transition.finished.finally(() => {
    document.getElementById("detail-heading")?.focus();
  });
}

// Function called when navigating from detail back to list view
function goFromDetailToList() {
  if (!document.startViewTransition) {
    document.body.classList.remove("detail");
    document.getElementById("list-heading")?.focus();
    return;
  }
  const transition = document.startViewTransition(() => {
    document.body.classList.remove("detail");
  });
  // Clean up the list view and route focus
  transition.finished.finally(() => {
    // Route focus back to list view
    document.getElementById("list-heading")?.focus();
    // Remove selected classList to remove view-transition-names
    document.querySelectorAll(".selected").forEach(
      (element) => {
        element.classList.remove("selected");
      },
    );
  });
}
```

どちらを選ぶかはユースケースに依存します。動的なリストアイテムはCSSの重複が少なくて済みますが、手動のJavaScriptクリーンアップが多くなります。


### ステップ3: アスペクト比の「ストレッチ」を解消する

デフォルトでは、ブラウザは新旧両方に収まるよう引き伸ばされたグループ内で、古いスナップショットと新しいスナップショットをクロスフェードします。テキストを遷移させる場合は、古いビューと新しいビューの両方でテキスト要素の幅を`fit-content`に設定し、遷移する要素のアスペクト比が安定するようにしてください。

```css
#list-page .title {
  width: fit-content;
}

#detail-page #title {
  width: fit-content;
}
```

アスペクト比が変わる要素を遷移させる場合は、古い・新しい擬似要素の高さを`::view-transition-pair()`擬似要素の100%に設定する必要があるかもしれません。

```css
::view-transition-old(hero),
::view-transition-new(hero){
  height: 100%;
}
```

擬似要素はライブ要素のスナップショットなので、遷移の効果をさらに制御するために`object-fit`や`object-position`の宣言も使えます。

## ベストプラクティス

-   **DO NOT** トランジションを多用しすぎないでください。ユーザーがアクティブに追跡している主要コンテンツ（例: ヒーロー画像、見出し）にのみ共有要素を使ってください。
-   **DO** 一時的な`view-transition-name`値はトランジション終了後に削除し、今後のトランジションへの副作用を避けてください。
-   **DO NOT** アクティブなアニメーションを持つ要素を遷移させないでください。view transitionはスナップショットを使うので、ビュートランジション中はアニメーションが停止して見えます。
-   **DO** `prefers-reduced-motion`メディアクエリで、動きを減らすユーザーの設定を尊重してください。
-   **MANDATORY アクセシビリティルーティング**: View transitionはページレイアウトを動的にモーフィングしますが、プログラムによるフォーカスは管理しません。トランジション中に隠されたり削除されたりした要素にフォーカスが残ると、フォーカスが放置され、キーボードユーザーや支援技術ユーザーは文脈を失います。DOM更新の直後やview transitionの`finished`プロミスが解決したときに、更新されたページ見出しまたはビューコンテナ（`tabindex="-1"`を使用）にプログラム的にフォーカスを移動してください。

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

## フォールバック戦略

Baseline status for View transitions: Newly available. It's been Baseline since 2025-10-14.
Supported by: Chrome 111 (Mar 2023), Edge 111 (Mar 2023), Firefox 144 (Oct 2025), and Safari 18 (Sep 2024).

View Transitions APIはプログレッシブエンハンスメント向けに設計されています。サポートしないブラウザは、アニメーションなしで単にDOM更新を即座に実行します。

```javascript
function navigate(){
  if (!document.startViewTransition) {
    // Fallback: Just update the DOM
    updateDOM();
  } else {
    document.startViewTransition(() => updateDOM());
  }
}
```
