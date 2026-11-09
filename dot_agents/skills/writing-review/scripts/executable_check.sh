#!/usr/bin/env bash
# 文章レビューの機械的に検出できる項目を洗い出す。
# 使い方: check.sh <file>
# (1)〜(4)はコードフェンス内やインラインコード内も拾うので、マッチがコード内なら違反として扱わない。
# (5)〜(7)はコードフェンスを除いた本文だけに当てる（行番号は本文内の通し番号）。
set -u

FILE="${1:?usage: check.sh <file>}"
PROSE=$(awk '/^[[:space:]]*```/{f=!f;next} !f' "$FILE")

section() { printf '\n## %s\n' "$1"; }

section '(1) 太字（中身のない強調・ラベル型の候補）'
rg -n '\*\*[^*]+\*\*' "$FILE" || true

section '(2) ラベル型リスト（- **ラベル**: …）'
rg -n '^\s*[-*+]\s+\*\*[^*]+\*\*\s*[:：]' "$FILE" || true

section '(3) 英語（英数字）と日本語の間のスペース'
rg -n '[A-Za-z0-9] [ぁ-んァ-ヶー一-龥]|[ぁ-んァ-ヶー一-龥] [A-Za-z0-9]' "$FILE" || true

section '(4) 全角英数、emダッシュ、語並列の中黒（固有名詞内の中黒は除外して判断）'
rg -n '[Ａ-Ｚａ-ｚ０-９]|──|—|[ぁ-ん一-龥]・[ぁ-ん一-龥]' "$FILE" || true

section '(5) 読点が4つ以上の一文'
printf '%s' "$PROSE" | awk 'BEGIN{RS="。"} {n=gsub(/、/,"&"); if(n>=4) printf "読点%d: %s。\n", n, $0}'

section '(6) 漢字が7文字以上連続'
printf '%s' "$PROSE" | rg -n '[一-龥]{7,}' || true

section '(7) 文体混在の手がかり（両方1以上なら該当文を目視。だ。は誤検出あり）'
printf 'ですます: %s\n' "$(printf '%s' "$PROSE" | rg -c '(です|ます)。' || echo 0)"
printf 'である/だ: %s\n' "$(printf '%s' "$PROSE" | rg -c '(である|だ)。' || echo 0)"
