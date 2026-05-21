## 概要
コンテナの端に透明度のグラデーションを適用する場合(スクロール可能な領域でさらにコンテンツがあることを示したり、テキストをフェードアウトさせたりする場合など)は、CSSマスキングとリニアグラデーションを使います。この手法は半透明のオーバーレイを使うよりも優れています。なぜなら、実際にコンテンツ自体がフェードし、背景が自然に透けて見え、テキスト選択やポインターイベントを妨げないためです。

## 実装
ソフトエッジのフェードを実装するには:

### コンテナの下端をフェードさせる
スクロール可能な領域で、下にさらにコンテンツがあることを示すのに有用です。

```css
.container {
  /* Enable scrolling */
  overflow-y: auto;
  
  /* MANDATORY: Use vendor prefix for wider support in older browsers */
  -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
  
  /* Standard property for modern browsers */
  mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
}
```

### 上端と下端の両方をフェードさせる
複数のカラーストップを持つ単一のグラデーションで両端をフェードできます。

```css
.dual-fade-container {
  /* Content is visible between 10% and 90% of the height */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
}
```

## フォールバック戦略
マスクのBaselineステータス: Newly available。2023年12月7日以降Baseline。
対応ブラウザ: Chrome 120 (2023年12月)、Edge 120 (2023年12月)、Firefox 53 (2017年4月)、Safari 15.4 (2022年3月)。

ブラウザが `mask-image` やそのプレフィックス版をサポートしない場合:
- コンテンツはフェードせず、鋭いエッジで表示されます。
- フェードが無くてもインターフェースが機能し、コンテンツが可読であることを保証してください(プログレッシブエンハンスメント)。
- フォールバックとして半透明のオーバーレイを使うこともできますが、背景色を知る必要があり、`pointer-events: none` を使わない限りテキスト選択を妨げる可能性があることに注意してください。

```css
/* Fallback using an overlay for browsers that do not support masking */
@supports (not (mask-image: linear-gradient(to bottom, black, transparent))) and (not (-webkit-mask-image: linear-gradient(to bottom, black, transparent))) {
  .container {
    position: relative;
  }
  
  .container::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20%;
    /* Fallback assumes a solid background color (e.g., white) */
    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1));
    pointer-events: none; /* Allow interaction with text underneath */
  }
}
```
