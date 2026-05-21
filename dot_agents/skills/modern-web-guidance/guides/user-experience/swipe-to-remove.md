# スワイプで削除

スワイプで削除するパターンはモバイルアプリで一般的ですが、Webできれいに実装するのは難しい場合があります。CSSスクロールスナップを使えば、ブラウザのスクロールエンジンに直接フックするスムーズでネイティブのような感触のスワイプインタラクションを作成できます。これにより、複雑なJavaScriptジェスチャーライブラリを使わずとも高いパフォーマンスと物理ベースの慣性が得られます。

同じパターンは単一アクションのスワイプ(削除、アーカイブ、既読にする、スヌーズ)に応用できます。アクションの見た目は変わっても、メカニクスは変わりません。

## 実装方法

コンポーネントは **リスト** (`<ul>`)と、その中の **アイテム** の2層構造になっています。各アイテムは外側の `<li>`、内側のスクロール **トラック** (スナップポイントを持つスクロールコンテナ)、可視行となる **コンテンツ** 要素で構成されます。アクションで現れるUI(ゴミ箱アイコン、アーカイブラベルなど)はコンテンツの両側に配置します。リストは共通の配線(アイテムの遅延セットアップや新規追加アイテムの検知)を担当し、各アイテムは自身のスワイプ検出を担当します。

### ステップ1: トラックとコンテンツでリストをマークアップする

```html
<ul class="SwipeableList">
  <li id="list-item-1" class="SwipeableList-item">
    <div class="SwipeableList-track">
      <div class="SwipeableList-content">Item One</div>
    </div>
  </li>
  <li id="list-item-2" class="SwipeableList-item">
    <div class="SwipeableList-track">
      <div class="SwipeableList-content">Item Two</div>
    </div>
  </li>
  <!-- ...more items... -->
</ul>
```

### ステップ2: 3つのスナップポイントを持つ横方向スナップコンテナとしてトラックを構成する

トラックには3つのフル幅カラムがあります: 左のスペーサー(`::before`)、コンテンツ、右のスペーサー(`::after`)。スペーサーにスナップするとコンテンツが完全に画面外になり、これがスワイプコミット後の停止位置になります。

トラックの構成はリスト項目の `.is-initialized` クラスでゲートされています。JSが行をアップグレードする前は、アイテムは横スクローラーのない単純なコンテンツとしてだけ描画されます。クラスはステップ4でスワイプ検出のJavaScriptが配線された後に追加され、機能準備前にユーザーがスワイプできないようにします。

```css
.SwipeableList {
  list-style: none;
}

.SwipeableList-item {
  /* Establishes a containing block for the absolutely positioned action
     icons (Step 3) and clips overflow during the row's removal
     animation (Step 4). */
  contain: content;
}

/* The track only becomes a scroll snap container after JS upgrades
   the row by adding `.is-initialized` (see Step 4). */
.SwipeableList-item.is-initialized .SwipeableList-track {
  /* Three full-width columns: left spacer | content | right spacer.
     Width is 100% of the track, so each column fills the viewport row. */
  display: grid;
  grid-template-columns: 100% 100% 100%;

  /* Horizontal scroll only; vertical overflow is clipped so the
     reveal stays inside the row. */
  overflow: scroll clip;

  /* Prevent the swipe from chaining into the page scroll or browser
     back-gesture on iOS/Android. */
  overscroll-behavior-x: none;

  /* Hide the scrollbar; the gesture is the affordance. */
  scrollbar-width: none;

  /* `mandatory` ensures the track always rests on a snap point
     (spacer or content), never partially scrolled. */
  scroll-snap-type: x mandatory;
}

/* Spacers act as the left and right snap targets, AND carry the action's
   reveal color. As the user swipes, the colored spacer slides into view,
   which is what the user sees behind the content. */
.SwipeableList-item.is-initialized .SwipeableList-track::before,
.SwipeableList-item.is-initialized .SwipeableList-track::after {
  content: '';

  /* `scroll-snap-align` is required to make this a valid snap target,
     but the specific value (`start`/`center`/`end`) doesn't matter here
     because each snap point spans the full width of the scroll
     container, so all alignments resolve to the same resting position. */
  scroll-snap-align: start;

  /* `hsl(0 65% 50%)` is an example value; pick whatever fits your
     design (red here signals "delete"; use a different color for
     archive, mark-as-read, etc.). */
  background-color: hsl(0 65% 50%);
}

.SwipeableList-content {
  /* The content sits above the action icons (Step 3), so it covers
     them until the user swipes. */
  position: relative;
  z-index: 2;

  /* Required to make the content a valid snap target (its resting
     position). As with the spacers above, the specific value doesn't
     matter because the snap points are full-width. */
  scroll-snap-align: start;

  /* The content must paint over the revealed spacer color. */
  background: Canvas;

  /* Row separator (example value; customize to taste). */
  border-bottom: 1px solid #eee;
}

/* Gate `scroll-initial-target` behind `.is-initialized` so it only
   applies once the track is actually a scroll container. Setting it on
   the content before then would let the property walk up to the nearest
   scrollable ancestor (typically the document) and shift the page's
   initial scroll position to bring this row's content into view. With
   the gate, the rule is only live when the row's own track can satisfy
   it, so the initial scroll happens inside the track as intended. */
.SwipeableList-item.is-initialized .SwipeableList-content {
  scroll-initial-target: nearest;
}

/* The track is the focusable scroll container, but its overflow is clipped
   so a default focus ring on the track itself would be invisible. Project
   the focus affordance onto the content element (which paints above the
   track) using `:focus-visible` on the track. */
.SwipeableList-track:focus-visible .SwipeableList-content {
  outline: auto;
  outline-offset: -2px;
}
```

### ステップ3: リスト項目にアクションアイコンを追加する

アクションの色はスペーサー(ステップ2)にあります。アクションの **アイコン** はリスト項目そのものに、行の左右の端に固定して描画します。

> **注:** 本ガイドを通じて、「左」は *行の左側* (右にスワイプすると現れる)を指し、「右」は *行の右側* (左にスワイプすると現れる)を指します。

以下に示すアイコンの配置、サイズ、動きは **出発点としての提案** であり、必須ではありません。アイコンサイズ、エッジのインセット、しきい値到達時のスケール、遷移時間、さらには擬似要素 vs 実DOMノードの選択など、デザインに合わせて調整してください。機械的に必要なのは、アイコンが(スワイプ前にコンテンツで覆えるように)コンテンツの後ろにあり、(スペーサーと一緒にスクロールしないように)リスト項目の内側にあることだけです。それ以外は好みの問題です。

```css
/* Action icons painted on the list item. They're absolutely positioned
   inside the row (which is a containing block thanks to `contain: content`
   on `.SwipeableList-item` from Step 2) and sit at z-index 1, so the
   content element (z-index 2) covers them until the user swipes far
   enough. */
.SwipeableList-item.is-initialized::before,
.SwipeableList-item.is-initialized::after {
  /* Inline an SVG as the action icon. Replace this with whatever icon
     fits the action (archive, checkmark, clock, etc.). The `fill='white'`
     is baked into the SVG so it contrasts with the red spacer background;
     adjust if your background color is light. */
  --action-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><path d='M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm0 5h2v9H9V8zm4 0h2v9h-2V8z'/></svg>");

  content: '';
  position: absolute;
  z-index: 1;

  /* The size (`width`) and insets (`left`/`right` below) are example
     values, tune them to match your row height and visual weight.
     The icon fills its box via `background-size: contain`, so changing
     `width` resizes it. */
  width: 1.5em; /* example value, adjust to taste */
  aspect-ratio: 1;
  top: 50%;
  translate: 0 -50%;

  /* Smooth transitions for the icon's visual states: the activate-point
     pop (`scale`, see `.is-activating` below) and the removal fade
     (`scale` + `opacity`, see `.is-removing` below). 0.2s is an example
     duration. */
  transition: scale 0.2s ease, opacity 0.2s ease;

  background: var(--action-icon) center / contain no-repeat;
}
/* Inset from the row edge (example values; adjust to match your layout). */
.SwipeableList-item.is-initialized::before { left: 1.5em; }
.SwipeableList-item.is-initialized::after  { right: 1.5em; }

/* Activating pop: scale the icon up when the user is past the visual
   activate point, so the row's affordance feels reactive. Toggled by JS
   in Step 4. */
.SwipeableList-item.is-activating::before,
.SwipeableList-item.is-activating::after {
  scale: 1.333;
}

/* Removal affordance: fade and shrink the icons as the row collapses.
   Driven by the `is-removing` class added in Step 4 at commit time;
   the existing `transition` on the icons animates the change. */
.SwipeableList-item.is-removing::before,
.SwipeableList-item.is-removing::after {
  scale: 0.5;
  opacity: 0;
}

/* Only show the icon on the *leading* side of the swipe; hide the
   trailing-side one. `data-swipe-direction` is set by JS in Step 4. */
.SwipeableList-item.is-activating[data-swipe-direction="left"]::after,
.SwipeableList-item.is-activating[data-swipe-direction="right"]::before {
  visibility: hidden;
}
```

### ステップ4: `IntersectionObserver` でコミットジェスチャーを検出する

`IntersectionObserver` をトラックにルートし、コンテンツを観測します。ユーザーがスワイプするにつれて、コンテンツのトラックとの交差比率が下がります。ここでは **2つのしきい値** を使います。

- `activateThreshold`: 高い比率(例: 0.8)。コンテンツの可視部分がこれを下回ると、ユーザーは視覚的なアクティブ化点を越えたとみなされます。アイコンのポップアフォーダンスを切り替えます。
- `commitThreshold`: 低い比率(例: 0.2)。コンテンツの可視部分がこれを下回ると、ユーザーがコミットしたとみなします。スナップジェスチャーが完全に収まるのを待たずに、**ただちに** 削除アニメーションを開始します。崩れていく行はユーザーの継続するスワイプ慣性に溶け込み、スナップ着地を待ってから反応するよりも応答性が良く感じられます。

ここではさらに2つの懸念点も扱います。

- **アイテム単位の遅延セットアップ**: ビューポートをルートとした単一の外側 `IntersectionObserver` が、セットアップと内側のスワイプ用オブザーバーの開始/停止を駆動します。アイテムは初めてビューポートに入ったときにだけ配線され、画面外に出たアイテムはスワイプ用オブザーバーを一時停止します。これによりアクティブなオブザーバー数を有限に保ち、レイアウト依存値(`clientWidth` など)をアイテムがレンダリングされる前に読まないようにします。
- **動的アイテム**: 実際のリストは時間とともに増えます(初期レンダリング、無限スクロール、サーバープッシュ)。`<ul>` の `MutationObserver` が新規追加アイテムを外側オブザーバーに登録します。

```js
// Per-item handles. Populated when an item is first lazily wired up; read by
// the outer viewport observer to start/stop the inner observer as items enter
// and leave the viewport.
const swipeObservers = new WeakMap();

// Outer observer: drives the entire swipe lifecycle off viewport visibility.
// On first entry, lazily wires the item up (`setupItem` reads layout-dependent
// values like `clientWidth`, which return 0 until the item is rendered). After
// setup, starts the inner observer. On exit, stops the inner observer so
// offscreen items don't track scroll positions.
const viewportObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const item = entry.target;
    if (entry.isIntersecting) {
      const handle = swipeObservers.get(item) ?? setupItem(item);
      handle.observer.observe(handle.content);
    } else {
      const handle = swipeObservers.get(item);
      if (handle) handle.observer.unobserve(handle.content);
    }
  }
});

function setupItem(item) {
  const track = item.querySelector('.SwipeableList-track');
  const content = track.querySelector('.SwipeableList-content');

  // Upgrade the row into "swipeable" mode. This is the gate for all the CSS
  // from Steps 2 and 3 (the track becomes a snap container, the action icons
  // appear). Done *before* the inner observer is attached so the snap
  // container exists by the time intersection callbacks can fire.
  item.classList.add('is-initialized');

  // Tunable thresholds. `activateThreshold` is the visual feedback point
  // (icon pops). `commitThreshold` is the point of no return: once the
  // content is past this point of being off-screen, we commit even if the
  // user releases mid-gesture and the track snaps back. A low value (~0.2)
  // commits before the snap settles, so the remove animation can start
  // during the swipe.
  const activateThreshold = 0.8;
  const commitThreshold = 0.2;

  // One inner observer per item, rooted at the track. Vertical scrolling of
  // the outer list moves root and target together, so the callback only fires
  // for the horizontal swipe.
  const observer = new IntersectionObserver((entries, observer) => {
    const entry = entries.at(-1);
    const ratio = entry.intersectionRatio;

    // Direction the user is swiping toward. A positive offset from the
    // track's left edge means the content has been pulled right (left
    // spacer revealed), so the leading icon is on the left.
    const direction = (entry.boundingClientRect.x - entry.rootBounds.x) > 0
      ? 'left'
      : 'right';

    if (ratio < commitThreshold) {
      // The IO entry's boundingClientRect is the last reliable measurement
      // before the animation starts; reuse it for both the pre-collapse
      // height and the slide-off translate distance.
      removeItem(item, content, direction, entry);
      viewportObserver.unobserve(item);
      observer.disconnect();
      return;
    }

    // Scale up the leading icon while the content is past the activate
    // point; restore it at rest.
    item.classList.toggle('is-activating', ratio < activateThreshold);

    // Hold the previous direction at rest so the icon's exit animation
    // finishes on the side the user was swiping toward.
    if (entry.boundingClientRect.x !== entry.rootBounds.x) {
      item.dataset.swipeDirection = direction;
    }
  }, {
    root: track,
    threshold: [commitThreshold, activateThreshold],
  });

  // Return the handle without starting observation; the outer viewport observer
  // calls `observer.observe(content)` once the item is in view.
  const handle = {observer, content};
  swipeObservers.set(item, handle);
  return handle;
}

async function removeItem(item, content, direction, entry) {
  const opts = { duration: 300, easing: 'ease', fill: 'forwards' };

  const rect = entry.boundingClientRect;
  // Content's pixel offset from the track's left edge.
  const x = rect.x - entry.rootBounds.x;
  // Pixel distance the content needs to travel to be fully out of view.
  const translate = direction === 'left'
    ? rect.width - x
    : -(x + rect.width);

  // Use a combination of CSS transitions (for declarative styles) and
  // WAAPI animations (for computed values) to remove the element,
  // then await the completion of all of them.
  // Note: the content translate animation is important because the
  // height-collapse animation can otherwise finish before the browser's
  // smooth scroll-snap has scrolled the content fully off-screen.
  item.classList.add('is-removing');
  item.animate([{ height: `${rect.height}px` }, { height: '0px' }], opts);
  content.animate([{ translate: `${translate}px` }], opts);
  await Promise.allSettled(
    item.getAnimations({ subtree: true }).map((a) => a.finished),
  );

  // Safari has a scroll-latching bug: removing the node while the swipe
  // gesture's momentum is still resolving causes the next item (which
  // slides up into this one's place) to inherit the scroll and
  // immediately scroll itself off-screen. Detect Safari via
  // `GestureEvent` (a Safari-only API) and defer the actual DOM removal
  // until the gesture has fully settled. The 5s delay is conservative;
  // anything longer than the momentum tail is fine. Mark the row inert
  // so it can't be interacted with during the delay.
  if (globalThis.GestureEvent) {
    item.inert = true;
    setTimeout(() => item.remove(), 5000);
  } else {
    item.remove();
  }
}

function setupList(list) {
  // Observe items already in the list.
  for (const item of list.children) {
    if (item.matches('.SwipeableList-item')) {
      viewportObserver.observe(item);
    }
  }

  // Pick up items added later (initial render after data loads, infinite
  // scroll, server push). Removals don't need MutationObserver handling —
  // the commit branch above already unobserves the item before removing it
  // from the DOM.
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE &&
            node.matches('.SwipeableList-item')) {
          viewportObserver.observe(node);
        }
      }
    }
  }).observe(list, { childList: true });
}

document.querySelectorAll('.SwipeableList').forEach(setupList);
```

### ステップ5: ユースケースに合わせたアクションとラベルを使う

削除以外のバリアントでは、見た目とコミットハンドラの中身だけを変更します。

- **アーカイブ**: 緑/青の背景、アーカイブアイコン。削除せずアイテムをアーカイブリストへ移動します。
- **既読にする**: 落ち着いた背景、チェックマークアイコン。アイテムの状態を更新して再描画する(あるいは `.unread` クラスを取り除くだけ)。
- **スヌーズ**: 青の背景、時計アイコン。指定時刻まで非表示にします。

スクロール/スナップ/観測のメカニクスは変わりません。

#### スワイプ方向ごとに異なるアクション

1つの行が **2つの異なるアクション** を見せることもできます。多くのネイティブメールアプリのように、左スワイプ用と右スワイプ用に別アクション(例: 右に「アーカイブ」、左に「削除」)を割り当てます。スクロール、スナップ、コミット検出のメカニクスは一切変わりません。変わるのはコミット時に何をするかだけです。

ステップ4のコミット分岐は常に `removeItem(...)` を呼んでいました。2つのアクションをサポートするには、`direction` に応じてハンドラを選択します。

```js
if (ratio < commitThreshold) {
  const handler = direction === 'left' ? archiveItem : removeItem;
  handler(item, content, direction, entry);
  viewportObserver.unobserve(item);
  observer.disconnect();
  return;
}
```

命名についての補足: `removeItem` は破壊的なケースを意識した名前ですが、実際に行う処理(行の高さを潰す、コンテンツを画面外へスライドさせる、ノードを取り除く)は「この行は終了したのでアニメーションして消す」という汎用ルーチンに過ぎません。アーカイブ、既読にする、スヌーズでも同様に動作します。いずれにせよ行は *このリスト* から消えます。ハンドラが実際には何も削除しない(例: 両方が要素を他へ移す)場合は、`dismissItem` のような中立的な名前にリネームしてコードが正しく読めるようにしてください。

2つのアクションを視覚的に区別するため、各方向の色とアイコンをリスト項目にホイストし、トラックを分割グラデーションで塗り、同じ変数から2つの擬似要素アイコンを描画します。

```css
.SwipeableList-item {
  /* Action color + icon per swipe direction. `--left-*` is revealed
     when the user swipes RIGHT (e.g., archive); `--right-*` is revealed
     when the user swipes LEFT (e.g., delete). */
  --left-action-color: hsl(140 50% 40%);
  --left-action-icon: url("…archive svg…");
  --right-action-color: hsl(0 65% 50%);
  --right-action-icon: url("…trash svg…");
}

.SwipeableList-item.is-initialized .SwipeableList-track {
  /* Split reveal: left half of the scrollable area gets the left-action
     color, right half gets the right-action color. `background-attachment:
     local` makes the gradient's positioning area the scrollable area
     (3x the visible width), so the default size fills it and the 50% hard
     stop lines up exactly with the midpoint of the resting content column.
     The track's color also stays continuous behind the content as it
     translates off, so the leading-direction color shows the whole way. */
  background-image: linear-gradient(
    to right,
    var(--left-action-color) 50%,
    var(--right-action-color) 50%
  );
  background-attachment: local;
}

/* Per-side icons read from the same variables. */
.SwipeableList-item.is-initialized::before { background-image: var(--left-action-icon); }
.SwipeableList-item.is-initialized::after  { background-image: var(--right-action-icon); }
```

この構成では、スペーサーに独自の背景色は不要になります(トラックのグラデーションが表示色を担うため)。デュアルアクションバリアントを使う場合は、ステップ2の `.SwipeableList-track::before, ::after` の `background-color` ルールを削除して構いません。

## ベストプラクティスと落とし穴

- **DO** `proximity` ではなく `mandatory` のスナップを使ってください。`proximity` だと行が部分的にスクロールした状態で止まり、アクションの背景が半分見えたままになる可能性があります。
- **DO** トラックに `overscroll-behavior-x: none` を設定してください。これがないと、過剰スワイプでiOS/Androidのブラウザの戻るジェスチャーが発動する可能性があります。
- **DO** コンテンツが完全に画面外になるのを待たず、スナップが落ち着く *前* のしきい値(例: `commitThreshold ≈ 0.2`)でコミットしてください。これにより削除アニメーションをジェスチャー中に開始でき、スナップの着地待ちよりはるかに応答性が良く感じられます。
- **DO** アイテム単位のセットアップはページロード時に全アイテムを配線するのではなく、ビューポートの外側 `IntersectionObserver` で駆動してください。これにより、レイアウト依存値(`clientWidth` など)をアイテム描画前に読むことを避け、アクティブなオブザーバー数をユーザーが実際に見える範囲に比例した数に保てます。
- **DO** アイテムが動的に追加されるとき(データ読み込み後の初期描画、無限スクロール、サーバープッシュ)はリストに `MutationObserver` を使ってください。これがないと、ページロード後に追加されたアイテムが配線されません。
- **DO NOT** 手動のトランスフォームを駆動するために `pointerdown`/`pointermove`/`pointerup` に頼らないでください。ブラウザが無償で提供してくれる慣性、スナップバック、キーボードアクセシビリティ、reduced-motion対応を失います。
- **DO** 適切な場合は破壊的アクションを確認してください。「削除」の場合、スワイプ完了後にUndoトーストを表示することを検討してください。ジェスチャーは速く、誤発動しやすいです。
- **DO** スクロールトラックがフォーカス可能でキーボードアクセシブルであり、視覚的なフォーカスアフォーダンスが存在することを保証してください。
- **DO** スワイプでトリガーされるアクション(可視ボタン、コンテキストメニュー、編集モードなど)にアクセシブルな代替手段を提供してください。

## フォールバック戦略

このパターンを支えるスクロールスナップのメカニクス(`scroll-snap-type`、`scroll-snap-align`)、`IntersectionObserver`、`MutationObserver`、`ResizeObserver`、Web Animations API はすべてBaseline Widely Available なので、ジェスチャー、コミット検出、ライフサイクル管理、削除アニメーションは広く動作します。使用される新しい機能はすべて、体験の中核ではないか、いまそのまま使える堅牢なフォールバックを備えています。

### `overscroll-behavior` のフォールバック

overscroll-behavior は限定的に利用可能です。
対応ブラウザ: Chrome 144 (2026年1月)、Edge 144 (2026年1月)、Firefox 150 (2026年4月)。
未対応: Safari。

このユースケースではフォールバックは不要です。`overscroll-behavior` はかつてBaseline Widely Available でしたが、スクロール可能なオーバーフローを持たないコンテナでのみ顕在化する相互運用性の問題のため、現在はそうではありません。しかしここでのトラックは常に横方向にスクロール可能(100%幅のコンテナ内に3つの100%幅カラム)なので、プロパティはブラウザ間で一貫して挙動し、スワイプジェスチャーは確実に閉じ込められます。

### `scrollbar-width` のフォールバック

scrollbar-width のBaselineステータス: Newly available。2024年12月11日以降Baseline。
対応ブラウザ: Chrome 121 (2024年1月)、Edge 121 (2024年1月)、Firefox 64 (2018年12月)、Safari 18.2 (2024年12月)。

スクロールバーの非表示は視覚的なエンハンスメントであり、スワイプ削除を成り立たせる仕組みではありません。Baselineターゲットが `scrollbar-width` を含まない場合、行は正しくスクロールし、スナップし、コミットを検出し、削除されます。未対応の体験では単に横スクロールバーが表示されるだけです。古いWebKit由来ブラウザでスクロールバーを隠す必要があるなら、スワイプトラックに対して狭くスコープした `::-webkit-scrollbar { display: none; }` のルールを追加してください。

### `scroll-initial-target` のフォールバック

scroll-initial-target は限定的に利用可能です。
対応ブラウザ: Chrome 133 (2025年2月)、Edge 133 (2025年2月)。
未対応: Firefox、Safari。

Baselineターゲットが `scroll-initial-target` を含まない場合、`setupItem` 内でプログラム的にトラックをコンテンツへスクロールします。`CSS.supports` で検出してください。

```js
// Hoist the feature detect so the conditional `ResizeObserver` below can be
// skipped entirely when the property is supported.
const needsScrollWorkaround = !CSS.supports('scroll-initial-target', 'nearest');

function setupItem(item) {
  // ...existing setup from Step 4...

  if (needsScrollWorkaround) {
    track.scrollLeft = track.clientWidth;
  }

  // ...attach the inner IntersectionObserver, etc.
}
```

**呼び出し順序が重要です。** プログラム的スクロールは次のように実行する **必要があります**。

1. `.is-initialized` がリスト項目に追加された **後** (このクラスがトラックをスクロールコンテナにします。スクロール不能な要素に `scrollLeft` を設定しても何も起きません)。
2. ステップ4の内側 `IntersectionObserver` がアタッチされる **前** 。さもないと初期のプログラム的スクロールが左スペーサーを越える動きが「スワイプ」として観測され、即座にコミットハンドラが発火してしまいます。

セットアップを外側ビューポートオブザーバー(ステップ4)から駆動することが信頼性の鍵です。`setupItem` はアイテムが描画された後に動くので、`track.clientWidth` は `0` ではなく実際の値を返します。

一部のブラウザ(特にSafari)はトラックがリサイズされるたびにスナップコンテナのスクロール位置をリセットします(URLバーの表示/非表示、ビューポートのリサイズ、コンテナクエリなど)。各トラックに `ResizeObserver` を使ってスクロールを再適用してください。`scroll-initial-target` が対応されているときはブラウザがリサイズ時のスクロール復元を自前で処理するので、同じ `CSS.supports` チェックの後ろにゲートしてください。

```js
const trackResizeObserver = needsScrollWorkaround
  ? new ResizeObserver((entries) => {
      for (const entry of entries) {
        entry.target.scrollLeft = entry.target.clientWidth;
      }
    })
  : null;

function setupItem(item) {
  // ...existing setup...

  if (needsScrollWorkaround) {
    track.scrollLeft = track.clientWidth;
    trackResizeObserver.observe(track);
  }

  // ...attach the inner IntersectionObserver, etc.
}
```

`removeItem` で行の高さアニメーションが走る前にトラックの監視を解除してください。さもないと高さの変更が削除中にリサイズコールバックを再トリガーします。コミット分岐の既存の `viewportObserver.unobserve(item)` に並べて追加してください。

```js
if (ratio < commitThreshold) {
  removeItem(item, content, direction, entry);
  viewportObserver.unobserve(item);
  if (needsScrollWorkaround) trackResizeObserver.unobserve(track);
  observer.disconnect();
  return;
}
```
