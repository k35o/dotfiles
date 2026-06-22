# シークレット（fnox）

秘密は fnox 管理で、エージェントのシェルには常駐しない（対話シェル(個人機)では tier1 を起動時に自動ロード）。

- **tier1**（`[secrets]`: `SAKANA_API_KEY` など日常使う API キー）: `fnox exec -- <command>`。
- **tier2**（`[profiles.bot]`: GitHub App 秘密鍵 `K35O_BOT_*` など機密）: `fnox exec -P bot -- <command>`。

新しい秘密は「常駐させてよい API キー → `[secrets]`」「機密 → `[profiles.bot]` 等の profile」に振り分ける。

注意: `mcp__fnox__exec` は値が空のことがある（`[mcp] secrets=[]` / 起動時スナップショット）。確実なのは Bash CLI の `fnox exec`。
