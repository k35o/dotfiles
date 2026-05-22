# オーバーフロークリッピングの制御

`overflow: hidden`はほぼ常にpadding-boxで厳密にコンテンツをクリップする「粗い道具」ですが、`overflow: clip`と`overflow-clip-margin`を組み合わせれば、ブロックコンテナ間のレイアウトを細かく制御するための「メス」として使えます。

`overflow: clip`と`overflow-clip-margin`で、クリッピングが起こる位置を正確に指定できます。境界を内側のボックスモデルの端にぴったり合わせたり、要素のボックスから指定したオフセットだけクリッピング境界を外側に広げたり（セーフティーマージン）できます。このモダンなアプローチは非常にパフォーマンスが高く、子要素の派手なシャドウなどの視覚効果がクリップされずにレンダリングできるよう、カスタムなパディングや負のマージン付きのラッパーコンテナを追加するというレガシーな要件を解消します。

置換要素（`<img>`、`<video>`、`<canvas>`など）はデフォルトで`overflow: clip`と`overflow-clip-margin: content-box`になっており、`object-fit`や`border-radius`を使う画像をきれいに収めるための制御権を与えてくれます。

## 実装方法

1. **`overflow: clip`を適用する**: 対象要素で`overflow: clip`を有効にしてください。ブロックレイアウトのコンテナで`overflow-clip-margin`を有効にするには、`overflow: clip`を設定することが**必須**です。`overflow`が`hidden`、`auto`、`scroll`になっていると、`overflow-clip-margin`プロパティはブラウザに無視されます。`overflow: clip`は（ユーザー操作・JavaScriptによるプログラム的なものを含む）あらゆるスクロールを無効化します。
2. **ボックスのエッジに揃える**: キーワードを使ってクリッピング境界を内側のボックスモデルのエッジに正確に揃えます:
   - `content-box`: コンテンツ領域の開始位置でちょうどクリップし、パディング領域は完全にクリーンに保ちます。コンテンツはパディングの端で止まります。入れ子のレイアウトモジュールに最適です。
   - `padding-box`（デフォルト）: ボーダーの内側の端でクリップします。
   - `border-box`: ボーダーの外側の端でクリップし、半透明のボーダーの下に部分的にコンテンツが乗ったり重なったりできます。
3. **指定オフセット（ブリード）を定義する**: 長さの値（例: `15px`や`5px`）を指定して、ピクセルが切り取られる前のセーフティーゾーンを作ります。これにより、子要素の派手なシャドウがレイアウトジオメトリを広げずに境界線を越えてレンダリングできるようになります。
4. **ボックスエッジとオフセットを組み合わせる**: ボックスエッジと長さオフセットを同時に指定すれば（例: `content-box 15px`）、特定のボックスエッジからのオフセットを表現できます。

## コード例

以下の例では、入れ子の角丸フレーミングや子要素のシャドウ保護を、プログレッシブエンハンスメントのフォールバックと一緒に動的にコンテナレイアウト制御するさまをデモします。

### ブロックコンテナ: 入れ子になった角丸カーブ

- 角丸とカスタムなパディングを持つ親コンテナに`overflow-clip-margin: content-box`を適用します。
- 内側の子メディアやフッターコンポーネントにも、同心円状の内側コンテンツボックス境界に沿うような角丸を適用すれば、カスタム`calc()`ロジックなしでぎこちない入れ子カーブを解消できます。

```html
<div class="nested-curve-parent">
  <img src="avatar.jpg" alt="Nested Curve Demo" />
  <div class="nested-curve-footer">Card Footer</div>
</div>
```

```css
/**
 * Standard block layout container with outer corner radii and padding.
 * Keeps base level 1 fallback clipping roughly at the inner padding box.
 */
.nested-curve-parent {
  /* Level 1 Fallback: clips child roughly at the padding box */
  overflow: hidden;
}

/* Inner footer component with 12px rounded to visually demonstrate automatic concentric corner clipping */
.nested-curve-footer {
  background: #111;
  color: #fff;
}

@supports (overflow-clip-margin: content-box) {
  .nested-curve-parent {
    /* MANDATORY: overflow: clip is required on non-replaced elements */
    overflow: clip;
    /* Automatically curves clipping edge to match inner content-box radius */
    overflow-clip-margin: content-box;
  }
}
```

### ブロックコンテナ: 子要素のシャドウブリード

- `overflow: clip`を適用し、`overflow-clip-margin`に長さオフセットを定義して、子のシャドウが親コンテナの外側にクリップされずにレンダリングできるよう、レイアウトジオメトリを変えずに視覚的なセーフティーゾーンを作ります。これを行わないと、子のシャドウは親の境界でクリップされてしまいます。

```html
<div class="safety-zone-parent">
  <h4>Clipped Container</h4>
  <p>Inner content boundaries safely contained.</p>
  <!-- Child button element positioned inside with a prominent shadow -->
  <button class="demo-glowing-btn">Submit</button>
</div>
```

```css
/**
 * Standard block layout container clipping inner content.
 * Base fallback uses overflow: hidden, which abruptly slices child element shadows.
 */
.safety-zone-parent {
  /* Level 1 Fallback: clips overflowing content but truncates child shadows */
  overflow: hidden;
}

/* Child button element positioned inside with an expanded shadow */
.demo-glowing-btn {
  display: block;
  box-shadow: 0 8px 13px rgba(229, 46, 113, 0.7);
}

@supports (overflow-clip-margin: 15px) {
  .safety-zone-parent {
    overflow: clip;
    /* Establishes a visible safety zone allowing child element shadows to render safely outside */
    overflow-clip-margin: 15px;
  }
}
```

## 戦略的な実装とベストプラクティス

- **DO** `overflow-clip-margin`を使うときは対象要素に`overflow: clip`を適用してください。標準的なブロックレイアウトコンテナでカスタムまたは内側カーブのクリップマージンを有効化するには、`overflow`を厳密に`clip`に設定することが**必須**です。
- **DO** 角丸とパディングのある親コンテナには`overflow-clip-margin: content-box`を設定して、内側の角丸でない子要素を数学的に完璧な入れ子ボーダーカーブで自動的にクリップしてください。手動でパディングを減算するロジックは不要です。
- **DO** 外部の視覚効果（`filter: drop-shadow()`など）を適用する際は、`overflow-clip-margin`に長さオフセットを指定してください。レイアウトジオメトリを変更・拡張せずに、バウンディングボックスでの急峻な切り落としを防げます。
- **DO NOT** JavaScriptでスクロールを操作する必要があるコンテナや、`position: sticky`要素の直接のレイアウトコンテキストとなるコンテナでは`overflow: clip`を使わないでください。`clip`はスクロールを完全に無効化します。

## フォールバック戦略

Baseline status for overflow: clip: Widely available. It's been Baseline since 2022-09-12.
Supported by: Chrome 90 (Apr 2021), Edge 90 (Apr 2021), Firefox 81 (Sep 2020), and Safari 16 (Sep 2022).
overflow-clip-margin has limited availability.
Supported by: Firefox 148 (Feb 2026).
Unsupported in: Chrome, Edge, and Safari.

`overflow: clip`や`overflow-clip-margin`のネイティブサポートがない環境では、プログレッシブエンハンスメントのフォールバック戦略を視覚的な意図に応じて使い分けます:

- 基本の体験を保証するため、コア境界を維持するフォールバックとして`overflow: hidden`を使う。
- ドロップシャドウや外側のコーナーバッジが切り落とされてはいけない要素では、フォールバックとして`overflow: visible`を使う。

### プログレッシブエンハンスメントのフォールバック実装一式

```html
<!-- 1. Nested rounded edges fallback -->
<div class="demo-container-fallback">
  <img src="example.jpg" alt="Nested Curve Fallback" />
  <div class="demo-footer-fallback">Footer</div>
</div>

<!-- 2. Child element shadow bleed fallback -->
<div class="demo-safety-parent">
  <h4>Container</h4>
  <p>Inner boundaries contained.</p>
  <button class="demo-glowing-btn">Submit</button>
</div>
```

```css
/**
 * 1. Block Container Nested Curves Fallback
 * Keeps base level 1 fallback clipping roughly at the inner padding box.
 */
.demo-container-fallback {
  /* Level 1 Fallback: clip child roughly at padding box */
  overflow: hidden;
}

.demo-container-fallback img {
  object-fit: cover;
  display: block;
}

@supports (overflow-clip-margin: content-box) {
  .demo-container-fallback {
    overflow: clip;
    overflow-clip-margin: content-box;
  }
}

/**
 * 2. Child Element Shadow Bleed Fallback
 * Base fallback clips content using overflow: hidden, abruptly truncating child element shadows.
 */
.demo-safety-parent {
  /* Level 1 Fallback */
  overflow: hidden;
}

.demo-glowing-btn {
  display: block;
  width: 100%;
  padding: 6px 12px;
  background: #e52e71;
  box-shadow: 0 8px 13px rgba(229, 46, 113, 0.65);
}

@supports (overflow-clip-margin: 15px) {
  .demo-safety-parent {
    overflow: clip;
    overflow-clip-margin: 15px;
  }
}
```
