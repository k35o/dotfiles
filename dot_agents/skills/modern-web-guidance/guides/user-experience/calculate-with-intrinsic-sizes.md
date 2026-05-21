`calc-size()` は、`auto`、`min-content`、`fit-content` のような内在サイズキーワードに対して数値演算を行うためのCSS関数です。**MANDATORY**: 内在サイズを計算または制約で修正する必要がある場合のみ `calc-size()` を使用してください。単純なキーワードベースのアニメーション（例: `0` から `auto`）には `interpolate-size: allow-keywords` を使用してください。

## 実装手順

1. **内在基準を特定する**: 計算の基礎となる内在キーワード（`auto`、`min-content` など）を決定します。
2. **制約を定義する**: 第2引数内で `clamp()`、`min()`、`max()` などのCSS数学関数を使って、内在サイズにデザイン上の制約を強制します。
3. **MANDATORY: フォールバックを提供する**: `calc-size()` を使うプロパティの直前に、必ず標準のサイズキーワードまたは長さを宣言して、非対応ブラウザでもレイアウトが機能するようにします。
4. **論理プロパティを適用する**: 文書の書字方向を尊重するように、`inline-size` や `block-size` のような論理プロパティをデフォルトで使用します。
5. **任意: プログレッシブエンハンスメント**: 複雑なレイアウトロジックやアニメーションを `@supports (inline-size: calc-size(auto, size + 0px))` ブロックで囲み、対応ブラウザにのみ高度な機能を提供します。

## 基本構文

```css
/* calc-size(<calc-size-basis>, <calc-sum>) — mathematical operations on intrinsic sizing keywords */
.element {
  /* MANDATORY: Always provide a fallback for browsers that do not support calc-size() */
  inline-size: min-content;
  
  /* DO: Use calc-size to modify an intrinsic basis with a calculation or function */
  inline-size: calc-size(min-content, size + 2rem);
}
```

### 有効な基準引数（`<calc-size-basis>`）
第1引数は計算の「基準」サイズを定義します。

**標準キーワード:**
- `auto`: 要素のデフォルトサイジング。
- `min-content`: 要素がオーバーフローせずに取り得る最小サイズ。
- `max-content`: コンテンツを1行に収めるサイズ。
- `fit-content`: `clamp(min-content, auto, max-content)` と同等。
- `content`: `flex-basis` プロパティ内で `calc-size()` を使う場合のみ有効。

**特別な引数:**
- `any`: 特定の内在型が不明な場合や、計算をネストする場合に使う汎用基準。
- ネストされた `calc-size()`: 多段階や条件付き計算が可能。
- `<calc-sum>`: 特定の長さ、パーセンテージ、または数学式（例: `100px` や `20%`）。固定値を基準として使う場合、**`size` キーワードは依然として使用可能**（ただし第2引数内のみ）で、その基準の解決値を参照します。

**MANDATORY**: `size` キーワードは第1引数（`<calc-size-basis>`）自体では**有効ではありません**。これは第2引数（`<calc-sum>`）内から基準を参照するためのみに存在するローカル変数です。

### 有効な計算引数（`<calc-sum>`）
第2引数は数学式です。
- 通常 `size` キーワードを使って基準の値を参照します。
- `size` キーワードは技術的にはオプションですが、省略すると計算は固定値に解決され、基準は完全に無視されます。
- 標準の数学演算子（`+`、`-`、`*`、`/`）を含められます。
- `clamp()`、`min()`、`max()`、`round()` などのCSS数学関数を含められます。
- **MANDATORY**: `calc-size()` は各計算において**1つの**内在サイズ値（基準）のみを許可します。同じ `calc-size()` 呼び出し内で内在サイズキーワードを混在させることはできません。

## ユースケース

### 内在サイズへ・からのアニメーション
デフォルトではブラウザは長さ（例: `0px`）と内在キーワード（例: `auto`）の間を補間できません。キーワードを `calc-size()` で包むことで補間可能な値になります。

#### アニメーションに適切なツールを選ぶ
- **MANDATORY: `interpolate-size: allow-keywords` を使う**: 数学的な変更なしの内在サイズへ・からのシンプルなアニメーション（例: `height: 0` から `height: auto`）に使用します。シンプルなキーワード補間に必須のアプローチであり、`:root` でグローバルに適用するのが理想的です。

  ```css
  :root {
    /* Best practice: Enable keyword interpolation globally */
    interpolate-size: allow-keywords;
  }

  .item {
    height: 0;
    transition: height 0.3s ease;
  }

  .item.open {
    /* Simple interpolation from 0 to auto now works without calc-size() */
    height: auto;
  }
  ```

- **`calc-size()` を使う**: トランジション中に内在サイズに対して数学的計算を実行する必要がある場合のみ（例: パディングを追加したりサイズをクランプしたりする場合）。

```css
.accordion-content {
  display: block;
  overflow: hidden;
  /* MANDATORY: Fallback value for closed state */
  block-size: 0;
  transition: block-size 0.3s ease-out;
}

.accordion-content.open {
  /* MANDATORY: Fallback value for open state */
  block-size: auto;

  /* 
    DO: Use calc-size(auto, ...) to enable animation from 0 to the element's 
    intrinsic size while doing a calculation (in this case, adding a space of 2rem).
  */
  block-size: calc-size(auto, size + 2rem);
}
```

**MANDATORY**: 2つの内在サイズキーワード間の補間は直接行えません。トランジションの一方は長さまたはパーセンテージである必要があります。

#### ユーザーのモーション設定を尊重する
大きなレイアウト領域のサイズを変えるアニメーションは、前庭障害のあるユーザーにとって特に不快なものとなり得ます。**MANDATORY**: `prefers-reduced-motion` メディアクエリを使って、必須ではないアニメーションを簡素化または最小化することで、ユーザーのモーション設定を尊重してください。一般的な戦略には、モーションを完全に無効化する、再生時間を短縮する、レイアウトの変化を控えめな不透明度のトランジションに置き換えるなどがあります。

```css
.accordion-content {
  opacity: 0;
  transition: block-size 0.3s ease, opacity 0.3s ease;
}

.accordion-content.open {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .accordion-content {
    /* 
       EXAMPLE: Replacing disruptive layout animations with a subtle fade-in.
       Setting the block-size instantly and transitioning opacity 
       provides a clear state change without large-scale motion.
    */
    transition: opacity 1.5s ease;
  }

  .accordion-content.open {
    /* Jump the size instantly */
    block-size: auto;
  }
}
```


### 内在サイズへの制約の適用
`calc-size()` をCSSの任意の数学関数—`min()`、`max()`、`clamp()`、`round()` など—と組み合わせて使い、要素の内在サイズをデザインの境界内に収めることができます。

```css
.dynamic-container {
  /* MANDATORY: Always provide a fallback for browsers that do not support calc-size() */
  inline-size: fit-content;

  /* 
    DO: Establish a dynamic size based on content, while:
    1. Enforcing boundaries using CSS math functions (min, clamp, etc.)
    2. Modifying the intrinsic size with fixed or relative offsets
  */
  inline-size: calc-size(fit-content, min(size + var(--extra-space), var(--max-allowed)));
}
```

## 重要な考慮事項

- **パーセンテージの落とし穴**: `<calc-sum>` 内のパーセンテージは `size` キーワードに対してではなく、**コンテナのサイズ**に対して解決されます。たとえば、`calc-size(auto, size + 10%)` は要素の `auto` 幅に*親*の幅の10%を加算し、予期しない結果やオーバーフローを生むことがあります。
- **計算要件**: **MANDATORY**: シンプルなアニメーション（例: `0` から `auto`）には `calc-size()` ではなく `interpolate-size: allow-keywords` を使用してください。`calc-size()` は、内在ベースに対する動的な数学的調整がレイアウトに必要な場合にのみ使用してください。
- **パフォーマンス注意**: `inline-size` や `block-size` のようなボックスモデルプロパティのアニメーションはレイアウト再計算をトリガーし、コストが高くなります。`calc-size()` のアニメーションは、レイアウト以外の代替手段が不十分なレイアウト重要要素に限って使ってください。

## フォールバック戦略

calc-size() は limited availability。
対応ブラウザ: Chrome 129 (Sep 2024)、Edge 129 (Sep 2024)。
非対応: Firefox、Safari。
interpolate-size は limited availability。
対応ブラウザ: Chrome 129 (Sep 2024)、Edge 129 (Sep 2024)。
非対応: Firefox、Safari。

`calc-size()` と `interpolate-size` は**プログレッシブエンハンスメント**です。サポートしないブラウザでは、これらのプロパティは無視され、レイアウトは機能したままになりますが、内在キーワードへのアニメーションはトランジションせずにジャンプします。常に標準のキーワードまたは長さをフォールバックとして提供してください。

```css
.element {
  /* Fallback for browsers that don't support calc-size() */
  inline-size: fit-content; 
  /* Modern browsers will override the fallback */
  inline-size: calc-size(fit-content, size + 2rem);
}
```

### アニメーションとトランジションのフォールバック
`calc-size()` や `interpolate-size` をサポートしないブラウザでは、内在サイズキーワードを伴うトランジションは補間に失敗します。

- **グレースフルデグラデーション**: デフォルトのフォールバックは状態間の「即時ジャンプ」（例: `0` から `auto`）です。これはレイアウトが機能するため、しばしば受容可能です。
- **強化体験**: `@supports` を使って、スムーズな内在アニメーションが可能なときにのみ意味のある複雑なレイアウトロジックや追加のスタイリングを適用してください。
- **JSベースの測定は避ける**: JavaScriptで要素を測定して寸法を手動でアニメーションさせることもできますが、不要であることが多く、レイアウトスラッシングにつながる可能性があります。最新のWebアプリケーションでは、ネイティブの「即時ジャンプ」フォールバックに依存することが推奨されます。

アニメーションでは、フォールバック体験は最終サイズへの即時ジャンプとなります。CSSまたはJavaScriptでサポートを検出するには:

```css
/* CSS Feature Detection */
@supports (inline-size: calc-size(auto, size + 0px)) {
  .element {
    /* Apply advanced logic only when supported */
  }
}
```

```javascript
/* JavaScript Feature Detection */
if (CSS.supports('inline-size', 'calc-size(auto, size + 0px)')) {
  // Apply advanced sizing or animations
}
```
