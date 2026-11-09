---
name: commit-creator
description: 変更をコミットするとき、コミットメッセージを書くときに使う。変更を独立してrevertできる単位に分け、Conventional Commitsのアトミックなコミットにする。「コミットして」「コミットを分けて」「メッセージ考えて」と言われたときや、作業の区切りで変更を記録するときにも使う。
---

# Commit

独立してrevertできるアトミックなコミットを、Conventional Commitsで作る。

## Gotcha

- 会話中に出てきた外部リポジトリのIssueやPRのURL、`owner/repo#123`をメッセージに書かない。GitHubが相手のリポジトリに被リンクを残してしまう。参照してよいのは作業中のリポジトリの`#123`だけで、どうしても外部に触れるときはバッククォートで囲んでオートリンクを止める。
- ユーザーの依頼文（「〜してください」「〜を修正して」）をメッセージに転記しない。変更の事実と理由を書く。
- `git add -p`や`git add -i`は対話的なので使えない。hunk単位で分けるときはパッチを作って`git apply --cached`で載せる。

## 進め方

1. `git status`と`git diff`で変更を見る。
2. `git log --oneline -20`で既存のコミットの構造、スコープの命名、言語を確かめ、それに合わせる。
3. hunkごとに、独立してrevertできる単位を決める。「これをrevertしたら他の機能が壊れるか」で判断し、迷ったら小さく分ける（あとでsquashはできるが、分割は難しい）。
4. 単位ごとにステージしてコミットし、`git show HEAD`で中身を確かめる。

## メッセージ

```
<type>(<scope>): <subject>

<body>
```

typeは`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`のいずれか。bodyには何が変わったかとなぜ変えたかを、後から読み返してわかる形で書き、72文字で折り返す。
