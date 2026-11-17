#!/usr/bin/env bun
/**
 * コメントの追加を一度差し戻す PreToolUse フック（matcher = "Edit|Write"）。
 *
 * 判断の要る「残してよいコメント」を正規表現では決められないので、禁止ではなく
 * 差し戻しにしている。差し戻したコメントは RETRY_WINDOW_MS のあいだ覚えておき、
 * 同じ文面で出し直されたら通す。
 *
 * Edit の old_string / new_string だけを比べると、ブロックコメントの途中を
 * 触る編集で開始位置を見失う。そのためディスク上のファイルに編集を当てた結果と
 * ファイル全体で比べる。
 *
 * Disable: ENABLE_COMMENT_GUARD=0
 * 常に exit 0（fail open）。
 */

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, extname, join } from 'node:path';
import process from 'node:process';

type HookPayload = {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
};

export type Syntax = { line: string | null; block: boolean };

const SLASH: Syntax = { line: '//', block: true };
const BLOCK_ONLY: Syntax = { line: null, block: true };
const HASH: Syntax = { line: '#', block: false };

const SYNTAX_BY_EXTENSION = new Map<string, Syntax>([
  ...[
    ['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs', 'jsonc'],
    ['go', 'rs', 'java', 'kt', 'kts', 'swift', 'c', 'h', 'cc', 'cpp', 'hpp'],
    ['cs', 'php', 'dart', 'scala', 'zig', 'scss', 'less'],
  ]
    .flat()
    .map((ext): [string, Syntax] => [ext, SLASH]),
  ['css', BLOCK_ONLY],
  ...['sh', 'bash', 'zsh', 'fish', 'py', 'rb', 'yaml', 'yml', 'toml', 'tf'].map(
    (ext): [string, Syntax] => [ext, HASH],
  ),
]);

const HASH_BASENAME =
  /^(?:(?:dot_|\.)(?:zshrc|zshenv|zprofile|bashrc|bash_profile)|Dockerfile|Makefile)$/u;

const DIRECTIVE =
  /^(?:!|\/ ?<reference|@ts-(?:expect-error|ignore|nocheck|check)|eslint-|oxlint-|biome-ignore|prettier-ignore|(?:istanbul|c8|v8) ignore|@(?:vitest|jest)-environment|shellcheck |zizmor:|noqa|type: ?ignore|pragma|nolint|go:|@license|@preserve|copyright|spdx-license-identifier|[@#]__(?:PURE|NO_SIDE_EFFECTS)__|@vite-ignore|webpack\w+:|renovate:|yaml-language-server:|syntax=)/iu;

const RETRY_WINDOW_MS = 10 * 60 * 1000;
const STATE_DIR = join(homedir(), '.cache', 'security-hooks', 'comments');
const MAX_LISTED = 8;

export function syntaxOf(filePath: string, content: string): Syntax | null {
  const name = basename(filePath).replace(/\.tmpl$/u, '');
  const byExtension = SYNTAX_BY_EXTENSION.get(
    extname(name).slice(1).toLowerCase(),
  );
  if (byExtension) return byExtension;
  return HASH_BASENAME.test(name) || content.startsWith('#!') ? HASH : null;
}

function findMarker(
  line: string,
  syntax: Syntax,
): { index: number; block: boolean } | null {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\') {
      i++;
    } else if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
    } else if (syntax.block && line.startsWith('/*', i)) {
      return { index: i, block: true };
    } else if (
      syntax.line &&
      line.startsWith(syntax.line, i) &&
      // `https://…` や `$#` のように、前が空白でない記号はコメントの開始ではない
      (i === 0 || /\s/u.test(line[i - 1] ?? ''))
    ) {
      return { index: i, block: false };
    }
  }
  return null;
}

export function extractComments(text: string, syntax: Syntax): string[] {
  const comments: string[] = [];
  const push = (raw: string): void => {
    const body = raw.replace(/^[*\s]+/u, '').trim();
    if (body && !DIRECTIVE.test(body)) comments.push(body);
  };

  let inBlock = false;
  for (const line of text.split('\n')) {
    if (inBlock) {
      const end = line.indexOf('*/');
      push(end === -1 ? line : line.slice(0, end));
      inBlock = end === -1;
      continue;
    }
    const marker = findMarker(line, syntax);
    if (!marker) continue;
    if (!marker.block) {
      push(line.slice(marker.index + (syntax.line?.length ?? 0)));
      continue;
    }
    const body = line.slice(marker.index + 2);
    const end = body.indexOf('*/');
    push(end === -1 ? body : body.slice(0, end));
    inBlock = end === -1;
  }
  return comments;
}

export function addedComments(
  before: string,
  after: string,
  syntax: Syntax,
): string[] {
  const existing = new Map<string, number>();
  for (const comment of extractComments(before, syntax)) {
    existing.set(comment, (existing.get(comment) ?? 0) + 1);
  }
  return extractComments(after, syntax).filter((comment) => {
    const count = existing.get(comment) ?? 0;
    if (count === 0) return true;
    existing.set(comment, count - 1);
    return false;
  });
}

export function proposedContent(
  toolName: string,
  input: Record<string, unknown>,
  current: string,
): string | null {
  if (toolName === 'Write') {
    const { content } = input;
    return typeof content === 'string' ? content : null;
  }
  if (toolName !== 'Edit') return null;

  const oldString = input['old_string'];
  const newString = input['new_string'];
  if (typeof oldString !== 'string' || typeof newString !== 'string') {
    return null;
  }
  if (!current.includes(oldString)) return null;
  return input['replace_all'] === true
    ? current.split(oldString).join(newString)
    : // 関数で渡さないと new_string の中の `$&` などが置換パターンとして解釈される
      current.replace(oldString, () => newString);
}

function markerPath(dir: string, filePath: string, comment: string): string {
  const hash = createHash('sha256')
    .update(`${filePath}\0${comment}`)
    .digest('hex');
  return join(dir, hash);
}

function isFresh(path: string, now: number): boolean {
  try {
    return now - statSync(path).mtimeMs <= RETRY_WINDOW_MS;
  } catch {
    return false;
  }
}

export function bounce(
  dir: string,
  filePath: string,
  added: string[],
  now: number,
): string[] {
  const unseen = added.filter(
    (comment) => !isFresh(markerPath(dir, filePath, comment), now),
  );
  if (unseen.length === 0) return [];

  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    if (!isFresh(join(dir, name), now))
      rmSync(join(dir, name), { force: true });
  }
  for (const comment of unseen) {
    const path = markerPath(dir, filePath, comment);
    writeFileSync(path, '');
    utimesSync(path, new Date(now), new Date(now));
  }
  return unseen;
}

function denyReason(comments: string[]): string {
  const listed = comments
    .slice(0, MAX_LISTED)
    .map((comment) => `- ${comment.slice(0, 80)}`);
  if (comments.length > MAX_LISTED) {
    listed.push(`- ほか ${comments.length - MAX_LISTED} 件`);
  }
  return [
    'コメントを追加しようとしています:',
    ...listed,
    '処理の内容はコードで、仕様はテストで、経緯はコミットメッセージで伝えます。コメントに残すのは「なぜ素直な書き方をしなかったか」と、export した API の利用者向けドキュメントだけです。当てはまらないものを消して出し直してください。残すと判断したコメントは、同じ文面のまま出し直せば通ります。',
  ].join('\n');
}

function readCurrent(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function readPayload(): Promise<HookPayload> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw.trim() ? (JSON.parse(raw) as HookPayload) : {};
}

async function main(): Promise<number> {
  if (process.env['ENABLE_COMMENT_GUARD'] === '0') return 0;

  const payload = await readPayload();
  const input = payload.tool_input ?? {};
  const filePath = String(input['file_path'] ?? '');
  if (!filePath) return 0;

  const current = readCurrent(filePath);
  const proposed = proposedContent(payload.tool_name ?? '', input, current);
  if (proposed === null) return 0;

  const syntax = syntaxOf(filePath, proposed);
  if (!syntax) return 0;

  const bounced = bounce(
    STATE_DIR,
    filePath,
    addedComments(current, proposed, syntax),
    Date.now(),
  );
  if (bounced.length === 0) return 0;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: denyReason(bounced),
      },
    }),
  );
  return 0;
}

if (import.meta.main) {
  try {
    process.exit(await main());
  } catch {
    process.exit(0);
  }
}
