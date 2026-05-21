## 概要

ナビゲーションドロワーは、ビューポートの端からページコンテンツの上にスライドインしてくるパネルで、背後のすべてを薄暗くします。トリガーボタンから開かれ、パネルを画面外にスワイプする、薄暗くなった背景をタップする、Escapeキーを押すといった操作で閉じられます。

このガイドではドロワーを次のように実装します。

- `popover="manual"`要素として最上位レイヤーに昇格させ、スタッキングコンテキストに関係なく、パネルとその`::backdrop`がページ上の他のすべての要素を覆うようにする。
- 水平方向にスクロールするコンテナと2つのCSSスクロールスナップ位置（「開」と「閉」の1つずつ）を組み合わせ、スワイプジェスチャーをブラウザネイティブで扱えるようにする。これにより、ポインターイベントのJavaScriptコードを書かなくても、慣性、速度、割り込みのトラッキングが無料で手に入る。
- 背景の不透明度をスクロール位置に連動させるスクロール駆動アニメーションで、ユーザーがパネルをドラッグするとスムーズに暗転がフェードイン・フェードアウトする。
- パネルに対する`IntersectionObserver`がビューポートに完全に入った／完全に出た瞬間を検出し、それらの瞬間にフォーカス、`aria-expanded`、`inert`を更新する。

このアプローチはJavaScriptで`transform`をアニメーションさせる方式より望ましいです。なぜなら、スクロールの仕組みではユーザーがパネルの位置を直接コントロールでき（指の動きがそのまま動かす、トゥイーンではない）、ネイティブモバイルアプリでユーザーが慣れ親しんでいるインタラクションパターンに非常に近いからです。

## 実装

### 1. マークアップ

ドロワーは、水平スクローラーを含む単一のポップオーバーであり、その中に表示される「シート」が入っています。トリガーボタンはページコンテンツの中に置きます。

```html
<!-- popover="manual" is REQUIRED. Do not use popover="auto" or "hint". -->
<div class="Drawer" id="drawer" popover="manual">
  <div class="Drawer-scroller">
    <nav class="Drawer-sheet" tabindex="-1">
      <!-- tabindex="-1" makes the sheet programmatically focusable so we
           can move focus into it when the drawer opens, without adding it
           to the natural tab order. -->
      <ul>
        <li><a href="/page-1">Page 1</a></li>
        <li><a href="/page-2">Page 2</a></li>
        <!-- ... -->
      </ul>
    </nav>
  </div>
</div>

<main>
  <header>
    <!-- aria-controls links the trigger to the drawer; aria-expanded
         reflects the current state for assistive tech. -->
    <button
      id="drawer-open"
      aria-label="Menu"
      aria-expanded="false"
      aria-controls="drawer"
    >
      <!-- MANDATORY: Inline decorative SVGs MUST define aria-hidden="true" -->
      <svg aria-hidden="true" viewBox="0 0 24 24">...</svg>
    </button>
  </header>
  <!-- Page content. -->
</main>
```

### 2. スタイル

#### ポップオーバーをリセットしてビューポートいっぱいに広げる

ポップオーバーはビューポート全体を覆う必要があります。これによって`::backdrop`がページ全体を薄暗くでき、スワイプ面が端から端まで広がります。デフォルトのユーザーエージェントによるポップオーバースタイル（中央配置、自動サイズ、ボーダー付き）は邪魔になるのでリセットします。

```css
.Drawer {
  /* min() caps the sheet width on large screens but on a phone leaves
     a 20% peek of page content visible, which is the affordance that
     tells the user they can tap outside to dismiss. */
  --drawer-width: min(20em, 80dvw);

  /* Custom property driven by the scroll-driven animation below.
     0 = drawer fully closed (transparent backdrop).
     1 = drawer fully open (visible backdrop). */
  --drawer-backdrop: 0;

  /* Reset UA popover style that would constrain the element. */
  width: auto;
  height: auto;
  background: transparent;
  border: 0;
  overflow: visible;
}

/* Style the popover's ::backdrop to achive the overlay effect and
   provide visual affordances indicating that the rest of the page is inert */
.Drawer::backdrop {
  background: #000;
  /* Use calc() to limit the opacity range so the content beneath is visible */
  opacity: calc(var(--drawer-backdrop) / 2);
}
```

#### スクロールスナップでスワイプ面を構築する

スクローラーはビューポートより幅の広い水平グリッドです。1列目はシート（幅は`--drawer-width`）、2列目はビューポート幅の空の擬似要素スペーサーです。2つの列の間でスナップすることでドロワーが開閉します。

```css
.Drawer-scroller {
  position: relative;
  display: grid;
  /* Sheet on the left, full-viewport spacer on the right. The user
     scrolls between the two snap stops to open and close. */
  grid-template-columns: var(--drawer-width) 100%;

  overflow-x: scroll;
  /* Stop the swipe from chaining into the page's vertical scroll
     when the user reaches either snap edge. */
  overscroll-behavior: none;
  scrollbar-width: none;
  /* `mandatory` guarantees the drawer always settles fully open or
     fully closed — never half-open after a partial swipe. */
  scroll-snap-type: x mandatory;
}

/* Enable smooth scrolling natively, but only if the user has not
   requested reduced motion. */
@media (prefers-reduced-motion: no-preference) {
  .Drawer-scroller {
    scroll-behavior: smooth;
  }
}

/* The empty spacer that creates the "closed" snap stop. */
.Drawer-scroller::after {
  content: '';
  scroll-snap-align: end;
  /* Open the popover already scrolled to this stop (drawer off-screen),
     so the JS only needs to scroll to the open position to
     animate it in. */
  scroll-initial-target: nearest;
}

.Drawer-sheet {
  display: grid;
  grid-template-rows: auto 1fr;
  /* Use `svh` (small viewport height) — not `vh` or `dvh` — so the
     sheet height does not jump when the iOS Safari address bar
     resizes mid-swipe. */
  height: 100svh;

  background: #333;
  color: #fff;
  overflow-y: auto;
  scroll-snap-align: start;
  scrollbar-width: none;
}
```

#### 背景の不透明度をスクロール位置と連動させる

スクロール駆動アニメーションでスクローラーの範囲全体にわたって`--drawer-backdrop`を1（開）から0（閉）へとマッピングし、ドラッグと完全に同期して背景がフェードイン・フェードアウトするようにします。

```css
/* MANDATORY: Wrap this entire block in @supports. Browsers that don't
   support animation-timeline still parse the @keyframes and would
   apply the animation's `0%` value (--drawer-backdrop: 1) at all
   times, leaving the backdrop permanently opaque. The @supports gate
   ensures the animation is only registered where it actually works. */
@supports (animation-timeline: scroll()) {
  .Drawer {
    /* timeline-scope lets .Drawer reference a scroll-timeline that
       is defined on its descendant (the scroller). Without this, the
       timeline name is not visible to the .Drawer element. */
    timeline-scope: --drawer-fade;
    animation: fade-drawer-backdrop linear both;
    animation-timeline: --drawer-fade;
  }

  .Drawer-scroller {
    /* The horizontal scroll position of this element drives the
       timeline named `--drawer-fade`. */
    scroll-timeline: --drawer-fade x;
  }

  /* @property is REQUIRED. Without registering --drawer-backdrop with
     a `<number>` syntax, the browser treats it as a string and cannot
     interpolate it — the backdrop would jump from 0 to 1 with no
     fade. */
  @property --drawer-backdrop {
    syntax: '<number>';
    inherits: true;
    initial-value: 0;
  }

  @keyframes fade-drawer-backdrop {
    /* Scroll position 0 = drawer fully open = backdrop visible. */
    0% {
      --drawer-backdrop: 1;
    }
    /* Scroll position 100% = drawer fully closed = backdrop hidden. */
    100% {
      --drawer-backdrop: 0;
    }
  }
}
```

### 3. ドロワーを開閉する

開く処理は2ステップです。ポップオーバーを最上位レイヤーに昇格させ、その後シートをビュー内にスクロールさせます。閉じる処理は1ステップで、スペーサーまで戻すだけです。シートが完全に画面外に出るとオブザーバ（手順4）がポップオーバーを非表示にします。

```js
const drawer = document.getElementById('drawer');
const openBtn = document.getElementById('drawer-open');
const scroller = drawer.querySelector('.Drawer-scroller');
const sheet = drawer.querySelector('.Drawer-sheet');

function openDrawer() {
  // Show the popover first so the element is in the top layer before
  // we trigger any scrolling. `scroll-initial-target` (set on the
  // ::after spacer) places the initial scroll position at the closed
  // stop, so the drawer enters the top layer already off-screen.
  drawer.showPopover();

  // Scroll the sheet into view. The `behavior: 'auto'` option defers
  // to the CSS `scroll-behavior` property, which will be smooth unless
  // the user prefers reduced motion. Snap takes over at the end and
  // locks the drawer fully open.
  scroller.scrollTo({ left: 0, behavior: 'auto' });
}

function closeDrawer() {
  // Scroll back to the spacer. Do NOT call hidePopover() here —
  // doing so would remove the element from the top layer mid-animation
  // and the close animation would not be visible. The
  // IntersectionObserver in step 4 hides the popover once the sheet
  // has actually left the viewport.
  scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'auto' });
}
```

### 4. 開閉状態を検出する

ドロワーの状態の単一の正解として、スクロール位置ではなくシートに対する`IntersectionObserver`を使います。オブザーバはシートがどのように動いたか（ユーザーのスワイプ、プログラムによるスクロール、スナップ収束）にかかわらず発火するので、すべての閉じる経路が同じコールバックに集約されます。

```js
function onDrawerOpened() {
  // Mark the rest of the page inert so keyboard and screen-reader
  // users cannot tab into content hidden behind the drawer.
  document.querySelector('main').inert = true;
  openBtn.setAttribute('aria-expanded', 'true');
  // Move focus into the drawer for keyboard users.
  sheet.focus();
}

function onDrawerClosed() {
  // Hide the popover only after the close animation completes,
  // so the slide-out is visible to the user.
  drawer.hidePopover();
  document.querySelector('main').inert = false;
  openBtn.setAttribute('aria-expanded', 'false');
}

// Treat "any pixel of the sheet visible inside the popover root" as
// "open enough to count as not closed". This threshold is intentionally
// tiny so the closed callback only fires once the sheet is truly gone.
const visibleThreshold = 1 / window.innerWidth;

const observer = new IntersectionObserver(
  (entries) => {
    // During programmatic scrolling the observer can deliver multiple
    // entries in one batch. Only the most recent describes the
    // current state; earlier entries are intermediate positions.
    const entry = entries.at(-1);
    if (entry.intersectionRatio < visibleThreshold) onDrawerClosed();
    if (entry.intersectionRatio === 1) onDrawerOpened();
  },
  // root: drawer makes the popover element the intersection root,
  // so the ratio reflects the sheet's visibility within the popover
  // (i.e. how much of it has been swiped on-screen).
  { root: drawer, threshold: [visibleThreshold, 1] },
);
observer.observe(sheet);
```

### 5. トリガーと閉じる処理のハンドラを配線する

```js
// Open trigger.
openBtn.addEventListener('click', openDrawer);

// Light-dismiss: a tap on the dimmed area (anywhere inside the
// popover but outside the sheet) closes the drawer. We implement
// this manually because popover="manual" disables the browser's
// built-in light-dismiss (which would also fire mid-swipe — see step 1).
drawer.addEventListener('click', (event) => {
  if (!sheet.contains(event.target)) closeDrawer();
});

// Escape key. Listen on document because focus may be inside the
// drawer when the user presses Escape.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawer();
});
```

### フォールバック戦略

Baseline status for Popover: Newly available. It's been Baseline since 2025-01-27.
Supported by: Chrome 116 (Aug 2023), Edge 116 (Aug 2023), Firefox 125 (Apr 2024), Safari 17 (Sep 2023), and Safari iOS 18.3 (Jan 2025).

ドロワーの中核となる仕組み — スクロールスナップ、`IntersectionObserver`、`inert` — はいずれもBaseline Widely availableで、このコンポーネントが機能するために必須です。Popover API、背景をフェードさせるスクロール駆動アニメーション、`scroll-initial-target`はプログレッシブエンハンスメントであり、広いブラウザサポートが必要な場合は簡単なフォールバックを実装できます。

#### 背景フェードのフォールバック（`animation-timeline`非対応）:

Scroll-driven animations has limited availability.
Supported by: Chrome 115 (Jul 2023), Edge 115 (Jul 2023), and Safari 26 (Sep 2025).
Unsupported in: Firefox.

`CSS.supports('animation-timeline: scroll()')`で検出し、非対応の場合は`scroll`イベントリスナから`--drawer-backdrop`を書き込みます。手順2のCSS `@supports`ブロックにより、非対応ブラウザではキーフレームが適用されないので、JavaScriptの値だけが書き込み元となります。

```js
if (!CSS.supports('animation-timeline: scroll()')) {
  scroller.addEventListener('scroll', () => {
    // Same mapping as the @keyframes: 0 scroll = 1 (open),
    // sheet-width scroll = 0 (closed).
    const ratio = 1 - scroller.scrollLeft / sheet.offsetWidth;
    drawer.style.setProperty('--drawer-backdrop', ratio);
  });
}
```

#### 初期スクロール位置のフォールバック（`scroll-initial-target`非対応）:

scroll-initial-target has limited availability.
Supported by: Chrome 133 (Feb 2025) and Edge 133 (Feb 2025).
Unsupported in: Firefox and Safari.

`CSS.supports('scroll-initial-target', 'nearest')`で検出し、`openDrawer()`内で`showPopover()`の直後にスクローラーを閉位置へジャンプスクロールさせます。これがないと、スライドインアニメーションなしにドロワーが開いた状態でいきなり表示されてしまいます。

```js
async function openDrawer() {
  drawer.showPopover();

  if (!CSS.supports('scroll-initial-target', 'nearest')) {
    // Jump-scroll to the closed stop so the scroll below
    // animates the drawer in from off-screen.
    scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'instant' });
    // Wait two animation frames for the jump-scroll to commit.
    // A single rAF is not enough — the second `scrollTo` would
    // cancel the first before the browser has a chance to apply it.
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  }

  scroller.scrollTo({ left: 0, behavior: 'auto' });
}
```

#### `@property`のフォールバック（登録カスタムプロパティ非対応）:

Baseline status for Registered custom properties: Newly available. It's been Baseline since 2024-07-09.
Supported by: Chrome 85 (Aug 2020), Edge 85 (Aug 2020), Firefox 128 (Jul 2024), and Safari 16.4 (Mar 2023).

`@property`が必要なのは、スクロール駆動アニメーションが`--drawer-backdrop`をキーフレーム間で補間するためだけです。登録しないとブラウザはこのプロパティを文字列として扱うため、フェードなしで0と1の間をジャンプすることになります。前述のスクロール駆動アニメーションのフォールバックを導入している場合、そのJavaScriptはスクロールフレームごとに新しい数値文字列を`--drawer-backdrop`に書き込むだけで補間は発生しないので、別途`@property`のフォールバックは不要です。スクロール駆動アニメーションをサポートするブラウザはすべて`@property`もサポートしているからです。

#### Popover APIのフォールバック（`popover`属性非対応）:

Baseline status for the api.HTMLElement.showPopover capability: Newly available. It's been Baseline since 2024-04-16.
Supported by: Chrome 114 (May 2023), Edge 114 (Jun 2023), Firefox 125 (Apr 2024), and Safari 17 (Sep 2023).

このコンポーネントは`popover="manual"`を使い、閉じる処理はすべてJavaScriptで実装しているため、Popover APIの定義的挙動 — ライトディスミス、`popovertarget`属性、最上位レイヤー管理によるEscape処理、フォーカス管理 — には依存していません。実際に使っているPopover機能は、`showPopover()`による最上位レイヤーへの昇格と`::backdrop`擬似要素だけで、これらは2024年4月以降Baselineとなっています。

より広いブラウザサポートが必要な場合は、機能検出による分岐ではなく、Popoverを使わない実装に切り替えるべきです。`popover="manual"`属性を削除し、最上位レイヤーへの昇格は`position: fixed`と高い`z-index`に置き換え、`::backdrop`は同様にスタイル付けした兄弟要素（同じ`--drawer-backdrop`カスタムプロパティを使用）に置き換え、表示の切り替えは`showPopover()`／`hidePopover()`ではなくクラスで行います。コンポーネントの残りの部分（スクロールスナップ、スクロール駆動の背景アニメーション、`IntersectionObserver`、閉じる処理のハンドラ）は変更不要です。
