ページが最初にバックグラウンドで読み込まれたか（例: バックグラウンドの新しいタブで開かれた）を判定することは、正確なパフォーマンス監視にとって重要です。バックグラウンドで読み込まれたページは、レンダリングが遅延し、First Contentful Paint のようなメトリクスの値が長くなることがよくあります。これらのページを特定することで、パフォーマンスアナリティクスからフィルタリングし、データの歪みを防げます。

これを最も正確に計測する方法は、`VisibilityStateEntry` APIを使用することです。このAPIは、スクリプトが実際にいつ実行されたかに関係なく、ブラウザのパフォーマンスタイムラインに可視状態の変化を確実に記録します。

### 初期可視状態とバックグラウンド時間を検出する

MANDATORY: `performance.getEntriesByType('visibility-state')` を使用して、可視状態の正確な履歴にアクセスしてください。実行時に `document.visibilityState` を確認するだけに依存しないでください。これは競合状態の影響を受けやすいためです。

```javascript
/**
 * Accurately determines visibility state history using the Performance API.
 */
function getVisibilityInfo() {
  // Retrieve VisibilityStateEntry members:
  const entries = performance.getEntriesByType('visibility-state');
  
  if (entries.length > 0) {
    const firstEntry = entries[0];
    
    // If the first performance entry for visibility is 'hidden',
    // the page was loaded in the background.
    const initiallyBackgrounded = firstEntry.name === 'hidden';
    
    // Find the precise, high-resolution timestamp of when the page 
    // was first backgrounded.
    let timeBackgrounded = null;
    for (const entry of entries) {
      if (entry.name === 'hidden') {
        // entry.startTime is used because it provides the exact browser 
        // timestamp of the visibility change, which is required for precision
        timeBackgrounded = entry.startTime;
        break;
      }
    }

    return {
      initiallyBackgrounded,
      timeBackgrounded
    };
  }
}
```

### フォールバック戦略

Page visibility state は限定的に利用可能です。
対応ブラウザ: Chrome 115（2023年7月）および Edge 115（2023年7月）。
未対応: Firefox および Safari。

未対応の環境では、`document.visibilityState` プロパティの確認や `visibilitychange` イベントの購読にフォールバックできます。

**MANDATORY:** このフォールバックアプローチは、**初期のバックグラウンド状態を判定するには非常に不正確** であることが多いことを理解しておく必要があります。スクリプトは非同期で読み込まれて実行されることがあるため、ページがバックグラウンドタブで開かれたあと、スクリプトのダウンロードと実行が完了する *前に* ユーザーによってフォアグラウンドに切り替えられる可能性があります。スクリプトが最終的に実行されたとき、`document.visibilityState` は同期的に `'visible'` と読み取れるため、ページがフォアグラウンドで読み込まれたと誤って判断し、初期の hidden 状態を完全に見逃してしまいます。さらに、フォールバックのタイムスタンプはPerformance APIの内部精度を欠いています。精度が重要であれば、フォールバックを使用しないでください。

```javascript
/**
 * Fallback implementation using document.visibilityState.
 * This approach is prone to race conditions if the script loads asynchronously.
 */
function getFallbackVisibilityInfo() {
  // Check the state exactly when this script executes.
  // This will fail to detect an initial background state if the user 
  // foregrounded the page before this script executed.
  let initiallyBackgrounded = document.visibilityState === 'hidden';
  
  // If it's hidden now, we approximate that it was hidden from load (time 0).
  let timeBackgrounded = initiallyBackgrounded ? 0 : null;

  // Listen for future visibility changes to capture if it is backgrounded later.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timeBackgrounded === null) {
      // performance.now() is used here as a fallback, but it only gives 
      // us the time the event listener fired, not the precise internal 
      // browser time the visibility actually changed.
      timeBackgrounded = performance.now();
    }
  });

  return {
    get initiallyBackgrounded() { return initiallyBackgrounded; },
    get timeBackgrounded() { return timeBackgrounded; }
  };
}

// Modern implementation using VisibilityStateEntry API.
function getVisibilityInfo() {
  // Code omitted here would be the same modern
  // implementation shown earlier in this guide
  // ...
}

// DO: Detect if the VisibilityStateEntry API is available
if ('VisibilityStateEntry' in window) {
  // DO: If VisibilityStateEntry is available, use it first:
  getVisibilityInfo();
} else {
  // DO: If VisibilityStateEntry is unavailable, fall back to `document.visibilityState`:
  getFallbackVisibilityInfo();
}
```
