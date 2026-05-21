## 概要
CSSマスキングを使うと、カードにノッチを加えたり成形されたボーダーを作ったりと、要素をカスタム形状にクリッピングできます。複雑なレイアウト向けに形を組み合わせる場合、要素が含むコンテンツの種類に応じてマスキング戦略を選びましょう。

| マスキング戦略                | 適した用途                        | テキストへの影響                    |
| ------------------------------- | ------------------------------- | ------------------------------ |
| 要素への直接的なSVGマスキング      | 画像、アイコン、装飾的な形、複雑な形 | 推奨しない(テキストが切れる可能性あり) |
| 隣接要素へのSVGマスキング    | テキスト付きカード、重要なコンテンツ | テキストは完全に可読のまま    |
| 純粋なCSSグラデーション              | シンプルな幾何学的な形           | 推奨しない(テキストが切れる可能性あり) |

---

## 実装
カスタム形状の切り抜きを実装するには:

### SVGマスクを使う
SVGマスクでは、白(表示)と黒(非表示)の塗りで、表示領域から差し引いたり加えたりする形状を定義できます。

> **輝度マスキング vs アルファマスキング**: SVGマスクはデフォルトで **輝度** (明るさ)モードのため、`fill="white"` で領域を表示し `fill="black"` で切り抜きます。色ではなくSVGの透明度(アルファチャンネル)を使いたい場合は、CSSで `mask-type: alpha;`、またはSVGの `<mask>` 要素に `mask-type="alpha"` を設定できます。

#### 要素への直接的なSVGマスキング
プロフィールアバター、商品画像、イラストなど要素内にテキストが無い場合は、要素にSVGマスクを直接適用できます。

SVGマスク内で `maskContentUnits="objectBoundingBox"` を使うと、マスクが適用先要素の幅と高さに自動でスケールします。

```html
<!-- 1. Define the mask in SVG (hidden from view) -->
<svg width="0" height="0" style="position: absolute;" aria-hidden="true">
  <defs>
    <!-- objectBoundingBox makes the mask scale from 0 to 1 along the element's borders -->
    <mask id="splat-mask" maskContentUnits="objectBoundingBox">
      <!-- Organic Bezier path defining an artistic paint splat shape -->
      <path d="M 0.5 0.05 C 0.58 0.05, 0.58 0.21, 0.67 0.18 C 0.76 0.15, 0.79 0.08, 0.85 0.15 C 0.91 0.22, 0.83 0.32, 0.89 0.38 C 0.95 0.44, 1.03 0.45, 0.99 0.55 C 0.95 0.65, 0.82 0.62, 0.8 0.72 C 0.78 0.82, 0.89 0.92, 0.8 0.97 C 0.71 1.02, 0.64 0.88, 0.55 0.93 C 0.46 0.98, 0.44 1.06, 0.35 1.01 C 0.26 0.96, 0.31 0.81, 0.22 0.79 C 0.13 0.77, 0.01 0.88, 0.01 0.77 C 0.01 0.66, 0.16 0.62, 0.14 0.52 C 0.12 0.42, -0.02 0.39, 0.03 0.29 C 0.08 0.19, 0.23 0.27, 0.29 0.19 C 0.35 0.11, 0.3 0.01, 0.4 0.01 C 0.5 0.01, 0.42 0.05, 0.5 0.05 Z" fill="white" />
    </mask>
  </defs>
</svg>

<!-- 2. Apply the mask to the image element -->
<img src="avatar.jpg" alt="User Profile" class="shaped-avatar">

<style>
.shaped-avatar {
  width: 200px;
  height: 200px;
  object-fit: cover;
  
  /* Apply the SVG mask ID with standard and webkit-prefixed properties */
  -webkit-mask-image: url(#splat-mask);
  mask-image: url(#splat-mask);
}
</style>
```

#### 隣接要素へのSVGマスキング
テキストを含む親要素ではなく、隣接要素にマスクを適用します。これによりテキストがクリッピングされず、可読性を保てます。

これを実現するには、コンポーネントを2部構成に分けます:
1. すべての可読コンテンツを置く **安全な、マスクされないテキストコンテナ** (`.card-body`)。
2. その隣に置く **空の装飾用 `div`** (`.card-accent`) で、こちらにカスタムSVGマスクを適用します。

両者に同じ背景色を割り当てることで、視覚的に1つのカスタム形状のコンポーネントに統合されます。

```html
<!-- 1. Define the SVG mask (hidden from view) -->
<svg width="0" height="0" style="position: absolute;" aria-hidden="true">
  <defs>
    <!-- Use objectBoundingBox to make the mask scale with the element -->
    <mask id="accent-stencil" maskContentUnits="objectBoundingBox">
      <!-- Fill the entire area with white (fully visible) -->
      <rect width="1" height="1" fill="white" />
      <!-- Draw a black shape to cut out a concave curve. Extending the path to x=1.1 guarantees it fully clears the right edge, preventing subpixel lines -->
      <path d="M 1.1,0 C 0.4,0.1 0.4,0.9 1.1,1 L 1.1,0 Z" fill="black" />
    </mask>
  </defs>
</svg>

<!-- 2. Create the unified card layout -->
<div class="unified-card">
  <!-- The text-bearing element remains unmasked and perfectly rectangular -->
  <div class="card-body">
    <h3>Premium Membership</h3>
    <p>Get exclusive weekly updates on modern web standards and premium UI designs.</p>
  </div>
  <!-- The empty accent element next to it is masked to form the custom shape -->
  <div class="card-accent"></div>
</div>

<style>
.unified-card {
  display: flex;
  width: 400px;
}

.card-body {
  flex: 1;
  background-color: #1e293b; /* Elegant slate color */
  color: #f8fafc;
  padding: 24px;
  border-top-left-radius: 16px;
  border-bottom-left-radius: 16px;
}

.card-accent {
  width: 60px;
  background-color: #1e293b; /* Same background color so they merge visually without seams */
  border-top-right-radius: 16px;
  border-bottom-right-radius: 16px;

  /* Reference the SVG mask */
  -webkit-mask-image: url(#card-accent-mask);
  mask-image: url(#card-accent-mask);
}
</style>
```

### シンプルな切り抜きには単一のCSSグラデーションを使う
半円形のノッチ、サイドのへこみ、直線的な斜めカットなど、シンプルな幾何学的切り抜きだけが必要な場合は、外部SVGを書いたり参照したりする必要はありません。代わりに、`mask-image` プロパティ内に直接CSSのラジアルまたはリニアグラデーションを定義できます。

```html
<div class="gradient-masked-card">
  <h3>Notched Coupon Card</h3>
  <p>This card uses a pure CSS radial gradient to cut out a semi-circular notch along its top edge.</p>
</div>

<style>
.gradient-masked-card {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 40px 24px 24px 24px; /* Extra top padding ensures content clears the notch */
  border-radius: 16px;
  text-align: center;

  /* radial-gradient places a circle at 50% (horizontal center) and 0% (top edge), cutting out a 20px transparent notch */
  -webkit-mask-image: radial-gradient(circle at 50% 0%, transparent 20px, black 21px);
  mask-image: radial-gradient(circle at 50% 0%, transparent 20px, black 21px);
}
</style>
```

## フォールバック戦略
マスクのBaselineステータス: Newly available。2023年12月7日以降Baseline。
対応ブラウザ: Chrome 120 (2023年12月)、Edge 120 (2023年12月)、Firefox 53 (2017年4月)、Safari 15.4 (2022年3月)。

ブラウザが `mask-image` やそのプレフィックス版をサポートしない場合:
- **形状付き画像の場合**: 要素はグレースフルにデグレードし、デフォルトのフォールバックスタイルで通常の長方形要素として表示されます。
- **形状付きカードの場合**: 隣接する装飾用 `.card-accent` 要素は、マスクが適用されないソリッドな長方形のまま残ります。テキストコンテナと同じ背景色を共有しているため、カード全体は標準のクリーンな長方形のコンテナとしてレンダリングされます。
- **プログレッシブエンハンスメント**: テキストレイヤーをマスクの外に保つことで、古いブラウザでもコンテンツが完全に可読、構造化、アクセシブルのまま保たれます。
