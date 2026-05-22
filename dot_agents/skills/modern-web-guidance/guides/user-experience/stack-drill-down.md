# スタック型ドリルダウン

## 概要

スタック型ドリルダウンは階層的なナビゲーションパターンで、モバイルアプリでよく見られます。リンクをアクティブ化すると新しい全画面ビューが直前のビューの上にプッシュされます。ビューの内容はアプリケーション側で定義され、設定のサブページ、フィード内のスレッド、ファイルブラウザ内のフォルダ、ギャラリー内の詳細ページなど多様です。ユーザーは現在のビューを右にスワイプして画面外に出すか、戻るボタンをタップして戻ります。ブラウザの履歴も同期されるため、OSレベルの戻るジェスチャー、ディープリンク、進む/戻るナビゲーションがすべて一貫して動作します。

このガイドではスタックを次のように実装します。

- 各ビューがちょうど1つのスナップ位置となる、CSSスクロールスナップによる横方向のスクロールコンテナ。ドリルダウンすると新しいビューが追加され、それに向かってスムーズスクロールします。スワイプバックのジェスチャーはブラウザがネイティブに処理するので、慣性、速度、中断の追跡もポインターイベントのJavaScriptなしで利用できます。
- スナップ対象が変わると発火する `scrollsnapchange` イベントリスナーをスタックに付与します。これを「アクティブビューが変わった」ための唯一の真実の源として用いることで、スワイプ、クリック、プログラム的スクロール、`popstate` のすべての経路が、`inert` の更新、フォーカス復元、ユーザーがスワイプして通り過ぎたビューの削除、ブラウザ履歴の整合化を行う1つのコールバックへ収束します。
- すべてのドリルダウンが履歴エントリを追加するように `pushState` / `popstate` を統合します。OSレベルの戻るジェスチャーが機能し、ディープリンクから直接対応するビューを開けるようになります。
- (任意)各ビューにスクロール駆動の `view()` アニメーションを設定し、パララックス + 暗化 + シャドウの効果をスワイプジェスチャーに直接結びつけます。これにより、見える動きはトゥイーンではなくユーザーの指によって駆動されます。

このアプローチはJavaScriptで `transform` をアニメーションさせる方法よりも好まれます。スナップ機構によりユーザーがパネルの位置をジェスチャーで直接コントロールでき(指が動かす、トゥイーンではない)、ネイティブモバイルアプリでユーザーが期待するインタラクションパターンに合致するためです。

## 実装

### 1. マークアップ

静的なHTMLは空のスタックコンテナだけです。ビューはJavaScriptで構築され、ユーザーがナビゲートするにつれて追加されていきます。

```html
<div class="Stack">
  <!-- Intentionally empty. The initial view is appended by JavaScript
       at init time (step 8). -->
</div>
```

各ビューは `.Stack` の直下の子要素 `.Stack-view`(スナップ対象)で、その中にビュー内容を入れる `.Stack-viewContent` ラッパー(パララックスのトランスフォームが適用される場所、ステップ2参照)があります。任意の時点でスタックにはアクティブな履歴エントリごとに1つのビューが、ドリルダウン順で左から右に並びます。ユーザーがルートから2階層分ドリルダウンした後のレンダリングされたDOMは次のようになります。

```html
<div class="Stack">
  <!-- Root view. Has whatever content makes sense as the entry point
       of this section of the app. No back button — there is nothing
       behind the root in the stack. -->
  <div class="Stack-view" inert>
    <div class="Stack-viewContent">
      <!-- Root content; includes <a href> links that drill in. -->
    </div>
  </div>

  <!-- First-level drill-down view. The user got here by activating a
       link in the root view. -->
  <div class="Stack-view" inert>
    <div class="Stack-viewContent">
      <header>
        <!-- DO include a back button. The swipe gesture only works on
             touch — keyboard and pointer users need an explicit control. -->
        <button class="back" aria-label="Back"></button>
        <!-- Title / breadcrumb / etc. -->
      </header>
      <main>
        <!-- View content; may include further drill-down <a href> links. -->
      </main>
    </div>
  </div>

  <!-- Second-level drill-down view. Currently visible — no `inert`
       attribute. Same shape as the first-level view. -->
  <div class="Stack-view">
    <div class="Stack-viewContent">
      <header>
        <button class="back" aria-label="Back"></button>
        <!-- ... -->
      </header>
      <main><!-- ... --></main>
    </div>
  </div>
</div>
```

注意点:

- 現在表示中のもの以外のすべてのビューは `inert` 属性を持ちます。これはステップ7の `scrollsnapchange` ハンドラーによって自動的に付与/解除されるので、ビュービルダー側からは設定しないでください。
- ユーザーがスワイプで戻って通り過ぎたビューはDOMから削除され(これもステップ7で行います)、スタックの子要素が `currentDepth + 1` を超えないように保たれます。これらは前進ナビゲーションで戻ってきたときにキャッシュ済みのURLパスからオンデマンドで再構築されます。

### 2. スタイル

#### スタックスクローラー

スタックは横方向のグリッドで、各子ビューはコンテナの幅にぴったり一致し、CSSスクロールスナップが「1ビュー1スナップ」を強制します。これによりスワイプバックジェスチャーにネイティブの感触が生まれます。

```css
.Stack {
  /* Use dvh so the height tracks the dynamic viewport on mobile, where
     the address bar can show/hide. svh would clip during the address bar
     animation; vh leaks under it. */
  height: 100dvh;

  /* Lay views out left-to-right, each one full-width, so horizontal
     scrolling moves between them one at a time. */
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  grid-template-rows: 100%;
  overflow-x: auto;

  /* `mandatory` guarantees the stack always settles fully on a view —
     never half-way between two. */
  scroll-snap-type: x mandatory;
  /* Prevent the swipe-back gesture from chaining into the browser's
     own history-back gesture (iOS, some Android) or the page's vertical
     scroll. The user is navigating the stack, not the page. */
  overscroll-behavior-x: none;
}

/* Hide the visual scrollbar — the snap and the parallax are the
   affordances; a horizontal scrollbar would look out of place. */
.Stack::-webkit-scrollbar {
  display: none;
}

/* MANDATORY: Opt into smooth programmatic scrolling via CSS, gated on
   prefers-reduced-motion. JS code calls scrollTo/scrollBy with
   behavior: 'auto' which defers to this rule, so the OS-level reduced-
   motion preference automatically downgrades to instant scrolling
   without any per-call JS branching. */
@media (prefers-reduced-motion: no-preference) {
  .Stack {
    scroll-behavior: smooth;
  }
}

.Stack-view {
  scroll-snap-align: start;
  /* `always` prevents the user from blowing through more than one view
     per gesture, so depth changes always happen one step at a time. */
  scroll-snap-stop: always;
}

/* MANDATORY: A separate inner element is required for the parallax
   transform below. Applying transforms directly to the snap target
   (.Stack-view) would feed back into the scroll container's snap
   geometry and the scroller would jump mid-gesture. */
.Stack-viewContent {
  width: 100%;
  height: 100%;
  background-color: #fff;
  /* Each view scrolls its own content vertically, independent of the
     stack's horizontal scroll. */
  overflow-y: auto;
}
```

#### 「スタック」効果(パララックス / 暗化 / シャドウ)

各ビューのスタックスクローラー内での進行をスクロール駆動の `view(inline)` アニメーションで追跡し、退出するビューにパララックス + 暗化を適用しつつ、新たに入ってくるドリルダウンビューにはシャドウを付けて、前のビューの上にスタックされる「カード」のように見せます。

```css
/* MANDATORY: Wrap the animation block in @supports. Browsers without
   scroll-driven animations still parse the @keyframes and would
   apply the `to` state as a static style, leaving every view
   permanently transformed. The @supports gate confines the animation
   to browsers where it actually animates. */
@supports (animation-timeline: view()) {
  .Stack-viewContent {
    /* view(inline) tracks this element's progress through its nearest
       scrollable ancestor on the inline (x) axis. */
    animation: parallax linear both;
    animation-timeline: view(inline);
    /* Only animate the EXIT phase — when this view is being covered
       by a deeper one. During its own entry the view stays at rest,
       so the fresh content is fully bright and in position throughout. */
    animation-range: exit 0% exit 100%;
  }

  /* Drill-down views (everything except the root) also get a shadow on
     their left edge during the transition so they feel like cards
     stacking over the previous view. */
  .Stack-view:not(:first-child) .Stack-viewContent {
    animation:
      parallax linear both,
      shadow-fade linear both;
    animation-timeline: view(inline), view(inline);
    /* parallax: only exit (the view sliding back as a deeper one comes in).
       shadow-fade: entry through exit (visible the whole time the view is
       transitioning, not when it's at rest). */
    animation-range:
      exit 0% exit 100%,
      entry 0% exit 100%;
  }

  @keyframes parallax {
    /* translateX(75%) and brightness(0.8) are examples — adjust to taste. */
    to {
      transform: translateX(75%);
      filter: brightness(0.8);
    }
  }

  @keyframes shadow-fade {
    /* Shadow ramps in during entry, holds across the middle of the
       gesture, and ramps out during exit — so it's only visible while
       the view is mid-transition, not when at rest. */
    0%,
    100% {
      box-shadow: 0 0 1.5rem #0000;
    }
    25%,
    75% {
      box-shadow: 0 0 1.5rem #0004;
    }
  }
}
```

NOTE: この効果はモダンなネイティブスタックアプリケーションで人気があり、出発点として良いものですが、既存の遷移スタイルに合わせて視覚効果を自由にカスタマイズできます。

### 3. モジュールの状態

スタックはモジュールスコープで4つの状態を追跡します。

```js
const stack = document.querySelector('.Stack');

// Reference to the root view DOM element. The Stack starts empty, so
// this is null until the root view is created — either at init (step 8,
// when the URL is '/') or later by synthesizeRootEntry() (when the user
// landed on a deep link and then navigates back). Held as a mutable
// reference because other code (the scrollsnapchange handler, init, etc.)
// uses identity comparisons against it.
let rootView = null;

// Tracks which element to restore focus to when the user swipes back
// into a previous view. Keyed by the view element itself so entries
// are garbage-collected automatically when the view is pruned.
const returnFocus = new WeakMap();

// Maps history depth -> {urlPath, view}. We MUST maintain this map
// ourselves because the History API does not expose state for entries
// other than the current one — so when a view is pruned on swipe-back,
// we still need to remember which URL it represented in case the user
// later forward-navigates back into it.
const entriesByDepth = new Map();

// Tracked manually because history.state on a popstate event tells us
// the destination depth but not where we came from. We need both to
// compute the direction (back vs forward) and the distance.
let currentDepth = 0;
```

加えて、アプリケーション固有のヘルパーが3つあります。これらはアプリのルーティングとビュー描画が組み込まれる唯一の場所です。

```js
// Resolve a URL path to the data your app needs to render the
// corresponding drill-down view, or return null for paths this section
// of the app does not handle (the root path '/', external links,
// unknown routes). resolveUrl() is for drill-down routes only — the
// root view is rendered separately by createRootView() below.
function resolveUrl(urlPath) {
  // Replace with your routing logic. For example, match `/view/:id`
  // and look the id up in your app state.
}

// Build the root (home) view of the stack. Application-specific content;
// preserve the .Stack-view / .Stack-viewContent wrapper structure (the
// inner element is required for the parallax — see step 2) and DO NOT
// render a back button — the root view has nothing behind it in the
// stack.
function createRootView() {
  const view = document.createElement('div');
  view.className = 'Stack-view';
  view.innerHTML = `
    <div class="Stack-viewContent">
      <!-- Root content. Include <a href> elements pointing at URL paths
           that resolveUrl() accepts, to enable drill-down from here. -->
    </div>
  `;
  return view;
}

// Build a drill-down view DOM element from the resolved route data.
// Customize the inner content freely, but DO preserve the .Stack-view
// / .Stack-viewContent wrapper structure and DO include a back button
// (the swipe gesture only works on touch).
function createDrillDownView(routeData) {
  const view = document.createElement('div');
  view.className = 'Stack-view';
  view.innerHTML = `
    <div class="Stack-viewContent">
      <header>
        <button class="back" aria-label="Back"></button>
        <!-- Title, breadcrumb, or other view chrome derived from
             routeData. -->
      </header>
      <main>
        <!-- View body, also from routeData. Include further <a href>
             elements pointing at URL paths that resolveUrl() also
             accepts, to enable additional drill-downs from this view. -->
      </main>
    </div>
  `;
  return view;
}

function getCurrentUrlPath() {
  return location.pathname;
}
```

### 4. ドリルダウン

ドリルダウンでは次の4つを順に行います: 履歴エントリのプッシュ、新規ビューの構築、追加、スムーズスクロール。あとはステップ7の `scrollsnapchange` ハンドラーが、スナップが落ち着いた後に処理を引き継ぎます。

```js
function drillDown(urlPath) {
  const routeData = resolveUrl(urlPath);
  if (!routeData) return;

  const newDepth = currentDepth + 1;
  // Push BEFORE creating the view so the URL is correct if anything
  // observing history (analytics, etc.) reads it during view creation.
  history.pushState({ depth: newDepth }, '', urlPath);

  // pushState truncates forward entries in real browser history;
  // mirror that truncation in our depth map so we don't hold references
  // to views the user can no longer reach.
  for (const d of entriesByDepth.keys()) {
    if (d >= newDepth) entriesByDepth.delete(d);
  }
  currentDepth = newDepth;

  const newView = createDrillDownView(routeData);
  stack.appendChild(newView);
  entriesByDepth.set(newDepth, { urlPath, view: newView });

  // Scroll one viewport-width to the right. behavior: 'auto' defers to
  // the CSS `scroll-behavior` set in step 2, which is smooth unless
  // prefers-reduced-motion is set. The snap container locks onto the
  // new view; the scrollsnapchange listener (step 7) fires when the
  // snap settles.
  stack.scrollBy({ left: stack.clientWidth, behavior: 'auto' });
}
```

### 5. クリックと戻るボタンの処理

スタック内のリンククリックを横取りしてドリルダウンへ変換します。修飾キーの挙動を残し、cmd/中クリックで新規タブを開けるようにします。

```js
stack.addEventListener('click', (e) => {
  // Back button: defer to goBack() (defined below), which handles both
  // the normal in-app case and the deep-link case.
  if (e.target.closest('.back')) {
    goBack();
    return;
  }

  // Drill-down link.
  const link = e.target.closest('a');
  if (!link || !stack.contains(link)) return;
  // Let the browser handle modified clicks so users can open links
  // in new tabs / windows. e.button !== 0 filters out middle-clicks.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

  const urlPath = new URL(link.href).pathname;
  const parentView = link.closest('.Stack-view');
  // If the URL isn't handled by this section of the app (resolveUrl
  // returns null), fall through so the browser navigates normally.
  if (!resolveUrl(urlPath) || !parentView) return;

  e.preventDefault();
  // Record which link the user activated so focus can be restored to
  // it when they swipe (or click) back into this view.
  returnFocus.set(parentView, link);
  drillDown(urlPath);
});

// Going back is usually just history.back(), but there's an important
// edge case: when the user lands directly on a deep-linked URL, there
// is no in-app history entry behind it. Calling history.back() in that
// situation would take them out of the app entirely. MANDATORY: detect
// this case and synthesize a root entry instead, so an in-app Back from
// a deep link lands on the root view and the platform Back from there
// returns the user to where they came from.
function goBack() {
  const atDeepLinkRoot =
    currentDepth === 0 && entriesByDepth.get(0)?.view !== rootView;
  if (atDeepLinkRoot) {
    synthesizeRootEntry();
  } else {
    // history.back() fires popstate, which routes through
    // updateFromHistoryState (step 6) and scrolls the stack — the
    // same path a swipe-back converges on.
    history.back();
  }
}

function synthesizeRootEntry() {
  // Push a new history entry pointing at the root URL. This becomes the
  // entry the user "came from"; the original deep-linked entry is now
  // behind us, so platform Back from the root view will return there.
  const newDepth = currentDepth + 1;
  history.pushState({ depth: newDepth }, '', '/');

  // Create the root view if it doesn't exist yet (we landed on a deep
  // link and never needed it before now), and insert it at the LEFT end
  // of the stack. Adjust scrollLeft by one viewport width so the user's
  // view doesn't visually jump — they should still be looking at the
  // deep-linked view until the scroll animation below runs.
  if (!rootView) {
    rootView = createRootView();
    stack.prepend(rootView);
    stack.scrollLeft += stack.clientWidth;
  }
  entriesByDepth.set(newDepth, { urlPath: '/', view: rootView });

  // Now scroll to the new entry (the root view). updateFromHistoryState
  // smooth-scrolls one step left, the parallax plays, and
  // scrollsnapchange fires when the root view settles.
  updateFromHistoryState(history.state);
}
```

### 6. 履歴からの同期(popstate)

`popstate` はユーザーがブラウザ/OSの戻る・進むボタンを使ったとき、もしくはJavaScriptが `history.back()` / `.go()` を呼んだときに発火します。このハンドラーが履歴変更に応じてスタックをスクロールする唯一の経路です。

```js
window.addEventListener('popstate', (event) => {
  updateFromHistoryState(event.state);
});

function updateFromHistoryState(state, behaviorOverride) {
  const newDepth = state?.depth ?? 0;
  const urlPath = getCurrentUrlPath();

  // Ensure entriesByDepth has an entry for the destination depth.
  // If the URL changed (e.g. forward-nav into a previously-pruned
  // view), clear the cached view reference so the loop below rebuilds.
  const entry = entriesByDepth.get(newDepth) ?? { view: null };
  if (entry.urlPath !== urlPath) {
    entry.urlPath = urlPath;
    entry.view = urlPath === '/' ? rootView : null;
  }
  entriesByDepth.set(newDepth, entry);

  // Rebuild any views between root and the destination that were
  // pruned earlier (when the user swiped back past them). Without
  // this, forward-navigating to a previously-pruned view would have
  // no element to scroll to.
  for (let d = 0; d <= newDepth; d++) {
    const e = entriesByDepth.get(d);
    if (!e || e.view) continue;
    const routeData = resolveUrl(e.urlPath);
    if (!routeData) continue;
    const rebuilt = createDrillDownView(routeData);
    stack.appendChild(rebuilt);
    e.view = rebuilt;
  }

  currentDepth = newDepth;

  const targetView = entriesByDepth.get(newDepth)?.view;
  if (!targetView) return;

  // Compare destination index against current scroll position so we
  // can bail if they're already aligned. This is reached when the
  // scrollsnapchange handler below calls history.go() to sync history
  // after a swipe-back that already completed visually — there's
  // nothing more to scroll.
  const toIdx = [...stack.children].indexOf(targetView);
  const fromIdx = Math.round(stack.scrollLeft / stack.clientWidth);
  if (fromIdx === toIdx) return;

  // Pick a scroll behavior:
  //   - multi-step jumps (e.g. history.go(-3)): 'instant' to skip
  //     intermediate snap points — otherwise smooth-scrolling would
  //     fire scrollsnapchange for each one and do N rounds of
  //     state-transition work for no reason.
  //   - rightward (forward) single-step: 'instant'. Browser-forward is
  //     rare on the web and is often spurious (e.g. iOS Safari treats
  //     edge swipes as forward navigation, even with overscroll-behavior
  //     set). An instant swap reads as "snap" rather than a misleading
  //     drilldown animation the user didn't ask for. The user-initiated
  //     drill-down path (drillDown, step 4) is unaffected — it calls
  //     scrollBy directly and never reaches this code.
  //   - leftward (back) single-step: 'auto' so the CSS `scroll-behavior`
  //     (smooth unless prefers-reduced-motion is set — see step 2)
  //     applies. Back is the common, expected case and benefits from
  //     the animation.
  // NOTE: "forward" here means spatial direction (toIdx > fromIdx),
  // NOT depth direction. synthesizeRootEntry (step 5) pushes a new
  // depth but scrolls LEFT to the root view, which correctly reads as
  // back-style (smooth).
  const forward = toIdx > fromIdx;
  const multiStep = Math.abs(toIdx - fromIdx) > 1;
  const behavior =
    behaviorOverride ?? (forward || multiStep ? 'instant' : 'auto');
  stack.scrollTo({ left: toIdx * stack.clientWidth, behavior });
}
```

### 7. `scrollsnapchange`: 唯一の真実の源

スナップがコミットされるたびに(スワイプ、クリック、プログラム的スクロールのいずれで起きても)、ブラウザはスクロールコンテナで `scrollsnapchange` イベントを発火し、新たにスナップされた要素を `event.snapTargetInline` (横スナップの場合)として公開します。すべての状態遷移をこの単一のハンドラーに集約することが、スワイプ経路・クリック経路・`popstate` 経路を一貫させる秘訣です。

ハンドラーは独立した `onActiveViewChanged` 関数に切り出しており、フォールバック(後述「フォールバック戦略」)もロジックを重複させずに再利用できるようにしています。

```js
function onActiveViewChanged(currentView) {
  // Walk the stack in DOM order to update each view's role:
  //  - Views at or before currentView stay in the DOM but get
  //    `inert` (except currentView) so focus, pointer events, and
  //    AT navigation cannot leak into views hidden behind the
  //    parallax.
  //  - Views after currentView are unreachable (the user swiped
  //    back past them) so we drop them from the DOM to free memory.
  //    Their urlPath stays in entriesByDepth so a later forward
  //    navigation can rebuild the view from scratch.
  let seenCurrent = false;
  for (const view of [...stack.children]) {
    if (seenCurrent) {
      for (const e of entriesByDepth.values()) {
        if (e.view === view) e.view = null;
      }
      view.remove();
    } else {
      // MANDATORY: inert non-current views. Without this, tabbing
      // and screen-reader navigation can reach content hidden behind
      // the parallax — a severe accessibility failure that's
      // invisible to sighted users.
      view.toggleAttribute('inert', view !== currentView);
      if (view === currentView) seenCurrent = true;
    }
  }

  // If the visible view's depth doesn't match `currentDepth`, the
  // user got here by swiping (not clicking) — sync history so the
  // browser back/forward buttons stay coherent with what's on screen.
  let currentViewDepth;
  for (const [d, e] of entriesByDepth) {
    if (e.view === currentView) currentViewDepth = d;
  }
  if (currentViewDepth !== undefined && currentViewDepth !== currentDepth) {
    // history.go fires popstate, which re-enters updateFromHistoryState.
    // That call's fromIdx === toIdx check bails out without scrolling.
    history.go(currentViewDepth - currentDepth);
  }

  // Restore focus on the now-active view:
  //  - If we recorded which link the user activated to drill out
  //    of this view, return focus there so a swipe-back lands them
  //    exactly where they left off.
  //  - Otherwise (a freshly-pushed drill-down view), move focus to
  //    the back button so keyboard users have an obvious next action.
  //  - preventScroll is REQUIRED: without it, .focus() scrolls the
  //    snap container to bring the focused element into view, which
  //    fights the snap and can land the user mid-snap.
  const stored = returnFocus.get(currentView);
  if (stored) {
    stored.focus({ preventScroll: true });
    returnFocus.delete(currentView);
  } else if (currentView !== rootView) {
    currentView.querySelector('.back')?.focus({ preventScroll: true });
  }
}

stack.addEventListener('scrollsnapchange', (event) => {
  // snapTargetInline is the element that was just snapped to on the
  // inline (horizontal) axis. For this stack — where each view is one
  // horizontal snap stop — that's the new active view.
  onActiveViewChanged(event.snapTargetInline);
});
```

### 8. 初期化(ディープリンクを含む)

ページがロードされたとき、URLがすでに深いビューを指していることがあります(共有リンク、ブックマーク、深いページでのリロードなど)。URLに合致する初期ビュー(ルートかディープリンク先、ただし両方ではない)を構築し、空のスタックに追加し、深さ0の履歴エントリをシードし、`behavior: 'instant'` で初回スクロールを行い、最初のペイントでパララックスがアニメーションしないようにします。

```js
const initialUrlPath = getCurrentUrlPath();
const initialRouteData = resolveUrl(initialUrlPath);

// Build the initial view: a drill-down view if the URL maps to one,
// otherwise the root view. Whichever it is, that's the only view in
// the stack right now — the other will be created lazily by
// synthesizeRootEntry (step 5) or drillDown (step 4) if the user
// navigates to it.
let initialView;
if (initialRouteData) {
  initialView = createDrillDownView(initialRouteData);
} else {
  rootView = createRootView();
  initialView = rootView;
}
stack.appendChild(initialView);

entriesByDepth.set(0, { urlPath: initialUrlPath, view: initialView });
// replaceState attaches a `depth` to the entry the user landed on, so
// any subsequent pushState / popstate has a base depth to count from.
history.replaceState({ depth: 0 }, '');

updateFromHistoryState(history.state, 'instant');
```

### ベストプラクティス

- **DO** スクロールイベント座標ではなく、`scrollsnapchange` イベント(`IntersectionObserver` フォールバック付き、後述「フォールバック戦略」)を「アクティブビューが変わった」の真実の源として使ってください。スナップのコミットは、スワイプ、クリック、プログラム的スクロール、`popstate` の各経路で一貫して発火する唯一のイベントです。
- **DO** トランスフォームはスナップ対象そのものではなく、その子要素に適用してください。スナップ対象へのトランスフォームはスクロールコンテナのスナップジオメトリにフィードバックし、ジェスチャー中にスクローラーが破綻します。
- **DO** 現在表示中のビュー以外すべてに `inert` を適用してください。これがないと、フォーカスやスクリーンリーダーのナビゲーションがパララックスの裏に隠れたビューに漏れてしまい、晴眼ユーザーには見えない深刻なアクセシビリティ障害となります。
- **DO** ドリルダウンごとに履歴エントリをプッシュし、`popstate` を処理してOSレベルの戻るジェスチャーとブラウザの戻る/進むボタンが機能するようにしてください。これがパターンをネイティブアプリのように感じさせます。
- **DO** スワイプバックが `currentDepth` と一致しない深さのビューに着地した場合、アクティブビュー変更ハンドラーから履歴を整合してください。これがないと、その後のOS戻る操作で、ブラウザの履歴カーソルが画面上の表示とずれているためユーザーが予期せぬ場所に戻されます。
- **DO** ユーザーがスワイプして通り過ぎたビューをDOMから削除してください。さもないと長いドリルダウンセッションの間に数十の切り離されたサブツリーが蓄積する可能性があります。前進ナビゲーションで戻ってきても、`entriesByDepth` にキャッシュされたURLパスからビューを再構築できます。
- **DO** スタック内でフォーカスを復元する際は `.focus({preventScroll: true})` を呼んでください。デフォルトの `preventScroll: false` はブラウザにフォーカス対象を視界に入れるためのスクロールを行わせ、それがスナップコンテナと競合してユーザーがスナップ途中に着地する可能性があります。
- **DO** 内部リンクの cmd/ctrl/中クリックは保持し、URLを共有可能・新規タブで開ける状態に保ってください。
- **DO** 複数ステップの履歴ジャンプおよび空間的に前進する `popstate` 遷移(`toIdx > fromIdx`)には `behavior: 'instant'` を使ってください。さもないと複数ステップジャンプは中間のスナップごとに `scrollsnapchange` を発火し、N回分の inert/フォーカス/履歴処理を無駄に行います。前進 `popstate` はしばしばスプリアスで、iOS Safari は `overscroll-behavior-x: none` を設定してもエッジスワイプをブラウザの前進として扱います。ユーザーが意図しない「ドリルダウン」アニメーションよりインスタントスワップの方がはるかに誤解が少ないです。ユーザー起動のドリルダウン経路(`drillDown`)は直接スクロールするため影響を受けず、`popstate` を経由しません。
- **DO** `prefers-reduced-motion` を尊重し、`scroll-behavior: smooth` は `@media (prefers-reduced-motion: no-preference)` の中だけで宣言し、`scrollTo` / `scrollBy` は `behavior: 'smooth'` ではなく `behavior: 'auto'` で呼び出して、OSレベルの設定が反映されるようにしてください。`behavior: 'smooth'` をハードコードするとユーザー設定が無視されます。
- **DO** ドリルダウンのトリガーには `<button onclick>` や `<div>` ではなく実際の `<a href>` 要素を描画してください。実際のアンカーは、ホバー時のURLプレビュー、共有性、中クリック、スクリーンリーダーの役割、SEOを自動で得られます。
- **DO** 各ドリルダウンビューに明示的な戻るボタンを入れてください。スワイプジェスチャーはタッチでのみ動作するため、キーボード、ポインター、デスクトップユーザーには見えるアフォーダンスが必要です。
- **DO NOT** `popstate` ハンドラーから `history.pushState` を呼ばないでください。ユーザーが戻ろうとしている最中に _新しい_ エントリをプッシュし、ブラウザの戻るボタンを壊します。
- **DO NOT** スクロール駆動アニメーションが利用可能なときに `scroll` イベントリスナーでパララックスを駆動しないでください。CSS経路はコンポジターで動きますが、JSのスクロールリスナーはメインスレッドで動作し、ジェスチャー中に目に見えてフレームを落とします。
- **DO NOT** スワイプバック後にDOMから取り除いたビューを変更しないでください。`entriesByDepth` を正規の記録として扱い、削除済みエントリは `view: null` として、必要に応じて `updateFromHistoryState` で再構築してください。

### フォールバック戦略

本ガイドで使われている機能の大半はBaseline Widely available で、フォールバックは不要です。広く利用可能ではないのは scroll-snap-events と scroll-driven-animations だけですが、どちらも堅牢なフォールバックまたはプログレッシブエンハンスメントが用意されており、このユースケースで安全に利用できます。

#### スクロールスナップイベント

スクロールスナップイベントは限定的に利用可能です。
対応ブラウザ: Chrome 129 (2024年9月)、Edge 129 (2024年9月)。
未対応: Firefox、Safari。

`scrollsnapchange` イベントは「アクティブビューが変わった」を検出する最もきれいな方法で、スタックに1つのリスナーで、スナップコミットごとにちょうど1回発火します。これがないブラウザでも、スタック内で各ビューが完全に表示されているかを監視する `IntersectionObserver` で同じ効果をポリフィルできます。フォールバックはプライマリ経路と同じ `onActiveViewChanged` 関数に処理を流すため、すべての状態遷移ロジックが1か所に集約されたままです。

```js
// MANDATORY when supporting browsers that haven't shipped scroll-snap-events
// yet. Check `HTMLElement.prototype` (not `window` or `document`) — the
// event handler IDL attribute is added to the prototype when the feature
// is supported, regardless of whether any element has the handler set.
if (!('onscrollsnapchange' in HTMLElement.prototype)) {
  const viewObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // threshold:1 only fires for fully-visible entries, but the
        // observer also emits a "leaving" entry per view that drops below
        // ratio 1. Filter to the entering side, which is the snap-commit
        // moment we're trying to detect.
        if (entry.intersectionRatio === 1) {
          onActiveViewChanged(entry.target);
        }
      }
    },
    { root: stack, threshold: 1 },
  );

  // Auto-observe every .Stack-view as it's added to the stack, and stop
  // observing as it's removed. Using a MutationObserver lets the primary
  // code (drillDown, updateFromHistoryState, synthesizeRootEntry, init)
  // stay free of fallback wiring.
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.classList?.contains('Stack-view')) viewObserver.observe(node);
      }
      for (const node of m.removedNodes) {
        if (node.classList?.contains('Stack-view'))
          viewObserver.unobserve(node);
      }
    }
  }).observe(stack, { childList: true });

  // Catch up to any views already in the stack at the time this code
  // runs (typically the initial view appended in step 8).
  for (const view of stack.children) viewObserver.observe(view);
}
```

#### スクロール駆動アニメーション

スクロール駆動アニメーションは限定的に利用可能です。
対応ブラウザ: Chrome 115 (2023年7月)、Edge 115 (2023年7月)、Safari 26 (2025年9月)。
未対応: Firefox。

スクロール駆動のパララックス / 暗化 / シャドウ効果は、ナビゲーションの中核機能の上に乗るプログレッシブエンハンスメントです。CSSの `@supports (animation-timeline: view())` ゲート(ステップ2参照)がアニメーションを対応ブラウザに限定し、それ以外では遷移なしでスナップ位置間を切り替えます。スナップ、履歴同期、フォーカス管理、`inert` はすべて動作するので、パララックスがなくてもコンポーネントは完全に機能します。

旧Baselineターゲット向けにパララックスのフォールバックが必要な場合は、スタックに `scroll` リスナーを付けて、各ビューのスクロールポート内での進捗を表すCSSカスタムプロパティを書き出し、そのプロパティから `transform` と `filter` を駆動してください。

```js
if (!CSS.supports('animation-timeline: view()')) {
  stack.addEventListener('scroll', () => {
    const viewWidth = stack.clientWidth;
    for (const view of stack.children) {
      // Progress: 0 when this view is centered, 1 when it has fully
      // exited to the left. Matches the @keyframes mapping above.
      const offsetLeft = view.offsetLeft - stack.scrollLeft;
      const progress = Math.min(1, Math.max(0, -offsetLeft / viewWidth));
      const content = view.querySelector('.Stack-viewContent');
      content.style.transform = `translateX(${progress * 75}%)`;
      content.style.filter = `brightness(${1 - progress * 0.2})`;
    }
  });
}
```
