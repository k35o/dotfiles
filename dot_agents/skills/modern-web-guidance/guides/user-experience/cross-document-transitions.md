クロスドキュメントView Transitionsを使うと、マルチページアプリケーション（MPA）の異なるページ間でスムーズでアプリのようなトランジションを作成できます。デフォルトではブラウザはクロスフェードを行いますが、サイトの美観に合わせてカスタマイズできます。

### 実装手順

#### 1. クロスドキュメントView Transitionsへのオプトイン

ブラウザがナビゲーション時にトランジションを発動するには、ソースページとデスティネーションページの両方でView Transitionsをオプトインする必要があります。

```css
/* Respect user's preference for reduced motion */
@media (prefers-reduced-motion: no-preference) {
  /* Add to a global stylesheet shared by both pages */
  @view-transition {
    /* Enables transitions for same-origin navigations */
    navigation: auto;
  }
}
```

#### 2. トランジションアニメーションのカスタマイズ（任意）

擬似要素を使ってトランジションの古い状態と新しい状態をターゲットし、スライドやリビールのようなエフェクトを作成できます。

```css
/* Customizing the outgoing page animation */
::view-transition-old(root) {
  /* Move the old page out to the left */
  animation: 0.4s ease-in both slide-out;
}

/* Customizing the incoming page animation */
::view-transition-new(root) {
  /* Move the new page in from the right */
  animation: 0.4s ease-out both slide-in;
}

@keyframes slide-out {
  to { transform: translateX(-20%); opacity: 0; }
}

@keyframes slide-in {
  from { transform: translateX(100%); }
}
```

#### 3. 方向性のあるトランジションの作成（任意）

ナビゲーションするページに応じて異なるトランジション効果を使いたい場合があります。たとえば、ホームページから連絡先ページへのナビゲーションでは、新しいコンテンツが右から入ってくるエフェクトが欲しいかもしれません。ホームページへ戻る際に同じエフェクトを使うのは意味がありません。

ナビゲート先ページが、どこから来ても常に同じトランジションタイプである場合、`@view-transition` ルールの `types` で指定できます。

```css
@media (prefers-reduced-motion: no-preference) {
  @view-transition {
    navigation: auto;
    /* Specify the types of view transitions that will always be used on this page. */
    types: previous;
  }
}
```

`pagereveal` のイベントリスナー内でトランジションタイプを条件付きで指定することもできます。

```js
window.addEventListener("pagereveal", async (e) => {
  if (e.viewTransition && window.navigation?.activation) {
    // Use application-specific logic to compute a transition type
     const transitionType = yourTransitionTypeLogic(navigation.activation.from, navigation.activation.entry);
    e.viewTransition.types.add(transitionType);
  }
});
```

そして、`:active-view-transition-type()` 擬似セレクタを使って、各タイプごとに異なるアニメーションを適用します。

```css
:active-view-transition-type(next) {
  &::view-transition-old(root) {
    animation-name: slide-out-next;
  }

  &::view-transition-new(root) {
    animation-name: slide-in-next;
  }
}
:active-view-transition-type(previous) {
  &::view-transition-old(root) {
    animation-name: slide-out-previous;
  }

  &::view-transition-new(root) {
    animation-name: slide-in-previous;
  }
}
```

### フォールバック戦略

View TransitionsのBaselineステータス: Newly available。2025-10-14からBaselineです。
対応ブラウザ: Chrome 111 (Mar 2023)、Edge 111 (Mar 2023)、Firefox 144 (Oct 2025)、Safari 18 (Sep 2024)。

クロスドキュメントView Transitionsは limited availability。
対応ブラウザ: Chrome 126 (Jun 2024)、Edge 126 (Jun 2024)、Safari 18.2 (Dec 2024)。
非対応: Firefox。

ブラウザがView Transitions（あるいはクロスドキュメントView Transitions）をサポートしない場合、標準の即時ページナビゲーションが実行されます。クロスドキュメントView Transitionsはプログレッシブエンハンスメントであり、サイトのコア機能は影響を受けません。

JavaScriptでサポート状況を確認するには:

```javascript
if ('onpagereveal' in window) {
  // Browser supports cross-document view transitions
}
```

Navigation API のBaselineステータス: Newly available。2026-01-13からBaselineです。
対応ブラウザ: Chrome 102 (May 2022)、Edge 102 (May 2022)、Firefox 147 (Jan 2026)、Safari 26.2 (Dec 2025)。

ブラウザがNavigation APIをサポートしていない場合、それを使ってトランジションタイプを判定することはできません。トランジションタイプを判定する別の方法を使うか、フォールバックのトランジションタイプを提供してください。そうしないと、ブラウザは標準の即時ページナビゲーションを実行します。

JavaScriptでサポート状況を確認するには:

```javascript
if (window.navigation?.activation) {
  // Browser supports the Navigation API
}
```
