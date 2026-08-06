/**
 * Claude Code / Codex CLI / GitHub Copilot CLI 3 対応のフック共通ユーティリティ。
 *
 * 設計方針:
 * - Bun ランタイム前提。追加の npm install は避ける（標準APIで完結）
 * - 例外で hook を落とさない（fail open）。エラーは log() に流す
 * - ツール検出は環境変数で行い、出力フォーマットを切り替える
 * - 個人情報や秘密値をログに出さない
 *
 * Copilot は hooks 設定を PascalCase イベント名（PreToolUse 等）で書くと
 * Claude Code 互換の snake_case ペイロードを受け取れる一方、出力側は
 * hookSpecificOutput に包まない素の (flat) トップレベルフィールドを期待する。
 * emitInject / emitPreToolDecision は Claude 向けのネスト形式と Copilot 向けの
 * flat 形式を両方同時に出力し、どちらの実行環境でも解釈できるようにしている。
 */

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';

export const HOME = homedir();
export const LOG_FILE = join(HOME, '.cache', 'security-hooks', 'log.txt');
export const STATE_DIR = join(HOME, '.cache', 'security-hooks');
export const GUIDANCE_FILE = join(
  HOME,
  '.claude',
  'claude-security-guidance.md',
);
export const PATTERNS_FILE = join(HOME, '.claude', 'security-patterns.json');

export const MAX_FILE_BYTES = 512 * 1024;

const RISKY_NESTED = /\([^)]*[+*][^)]*\)[+*]/u;
const GREEDY_WILDCARD = /\.[*+]/gu;

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Stop';

export type Runtime = 'claude' | 'codex' | 'copilot';

export type HookPayload = {
  session_id?: string;
  cwd?: string;
  transcript_path?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  stop_hook_active?: boolean;
  [k: string]: unknown;
};

export type PatternRule = {
  rule_name?: string;
  regex?: string;
  substrings?: string[];
  paths?: string[];
  exclude_paths?: string[];
  reminder?: string;
};

export function log(component: string, msg: string): void {
  // Best-effort append; never throw.
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
  } catch {
    /* ignore */
  }
  appendFile(LOG_FILE, `[${component}] ${msg}\n`).catch(() => {
    /* ignore */
  });
}

export function globallyDisabled(): boolean {
  return process.env['SECURITY_GUIDANCE_DISABLE'] === '1';
}

export async function readPayload(): Promise<HookPayload> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw) as HookPayload;
  } catch (e) {
    log('common', `stdin parse failed: ${stringifyError(e)}`);
    return {};
  }
}

export function detectRuntime(payload: HookPayload): Runtime {
  const explicit = (process.env['SECURITY_HOOK_RUNTIME'] ?? '').toLowerCase();
  if (explicit === 'claude' || explicit === 'codex' || explicit === 'copilot') {
    return explicit;
  }
  if (process.env['CLAUDECODE'] || 'CLAUDE_PROJECT_DIR' in process.env) {
    return 'claude';
  }
  if ('CODEX_HOME' in process.env || process.env['CODEX_SANDBOX_ENV_VAR']) {
    return 'codex';
  }
  if (process.env['COPILOT_CLI']) {
    return 'copilot';
  }
  const tp = (payload.transcript_path ?? '').toLowerCase();
  if (tp.includes('/.codex/')) return 'codex';
  return 'claude';
}

export function emitInject(text: string, event: HookEvent): void {
  const output: Record<string, unknown> = { systemMessage: text };
  if (event === 'PostToolUse') {
    // Copilot reads a flat top-level `additionalContext`; Claude Code reads
    // the same value nested under `hookSpecificOutput`. Emit both so either
    // runtime picks up the injected context.
    output['additionalContext'] = text;
    output['hookSpecificOutput'] = {
      hookEventName: 'PostToolUse',
      additionalContext: text,
    };
  }
  process.stdout.write(JSON.stringify(output));
}

export function emitReprompt(reason: string, runtime: Runtime): void {
  // Claude and Copilot's Stop/agentStop hooks both read a flat
  // { decision: "block", reason } shape; only Codex's Stop contract differs.
  const output =
    runtime === 'codex'
      ? { continue: false, stopReason: reason, systemMessage: reason }
      : { decision: 'block', reason, systemMessage: reason };
  process.stdout.write(JSON.stringify(output));
}

/**
 * Claude Code / Copilot 共通の PreToolUse 決定出力。ツール実行の前に
 * allow/ask/deny を返す。Claude は hookSpecificOutput にネストした形式を、
 * Copilot はトップレベルの flat フィールドを読むため両方を同時に出力する。
 * Codex は PreToolUse の出力契約が異なるため、呼び出し側で claude/copilot に
 * 限定する。
 */
export function emitPreToolDecision(
  decision: 'deny' | 'ask',
  reason: string,
): void {
  process.stdout.write(
    JSON.stringify({
      permissionDecision: decision,
      permissionDecisionReason: reason,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  );
}

export function matchesAnyGlob(globs: Iterable<string>, path: string): boolean {
  for (const g of globs) {
    if (fnmatch(path, g)) return true;
  }
  return false;
}

/**
 * Python fnmatch.fnmatch 互換のグロブ。`*` は path separator も含めて任意一致。
 */
export function fnmatch(name: string, pattern: string): boolean {
  return globToRegex(pattern).test(name);
}

function globToRegex(pattern: string): RegExp {
  let re = '';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === '*') {
      re += '.*';
      i++;
    } else if (c === '?') {
      re += '.';
      i++;
    } else if (c === '[') {
      const close = pattern.indexOf(']', i + 1);
      if (close === -1) {
        re += '\\[';
        i++;
      } else {
        let cls = pattern.slice(i + 1, close);
        if (cls.startsWith('!')) cls = `^${cls.slice(1)}`;
        re += `[${cls}]`;
        i = close + 1;
      }
    } else {
      re += c!.replaceAll(/[$()*+.?[\\\]^{|}]/gu, '\\$&');
      i++;
    }
  }
  return new RegExp(`^${re}$`, 'su');
}

export function isRiskyRegex(pattern: string): boolean {
  if (RISKY_NESTED.test(pattern)) return true;
  GREEDY_WILDCARD.lastIndex = 0;
  const hits = pattern.match(GREEDY_WILDCARD);
  if (hits && hits.length >= 3) return true;
  return false;
}

export async function loadPatterns(): Promise<PatternRule[]> {
  let raw: unknown;
  try {
    const text = await readFile(PATTERNS_FILE, 'utf8');
    raw = JSON.parse(text);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      log('common', `patterns file not found: ${PATTERNS_FILE}`);
    } else {
      log('common', `patterns parse failed: ${stringifyError(e)}`);
    }
    return [];
  }
  const list = Array.isArray((raw as { patterns?: unknown }).patterns)
    ? ((raw as { patterns: unknown[] }).patterns.slice(0, 50) as PatternRule[])
    : [];
  const safe: PatternRule[] = [];
  for (const rule of list) {
    if (rule.regex && isRiskyRegex(rule.regex)) {
      log(
        'common',
        `skipping risky regex rule: ${rule.rule_name ?? 'unnamed'}`,
      );
      continue;
    }
    safe.push(rule);
  }
  return safe;
}

export async function loadGlobalExcludePaths(): Promise<string[]> {
  try {
    const text = await readFile(PATTERNS_FILE, 'utf8');
    const raw = JSON.parse(text) as { global_exclude_paths?: unknown };
    const arr = raw.global_exclude_paths;
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function loadGuidance(): Promise<string> {
  try {
    const text = await readFile(GUIDANCE_FILE, 'utf8');
    return text.slice(0, 8192);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return '';
    log('common', `guidance read failed: ${stringifyError(e)}`);
    return '';
  }
}

/**
 * tmp + rename で原子的に書き込む。失敗しても throw しない。
 */
export function atomicWriteText(path: string, text: string): boolean {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, text);
    renameSync(tmp, path);
    return true;
  } catch (e) {
    log('common', `atomic_write ${path} failed: ${stringifyError(e)}`);
    return false;
  }
}

export function safeSessionKey(sessionId: string): string {
  const sid = sessionId || 'default';
  return createHash('sha256').update(sid, 'utf8').digest('hex').slice(0, 16);
}

export function extractEditedPaths(payload: HookPayload): string[] {
  const tool = payload.tool_name ?? '';
  const inp = (payload.tool_input ?? {}) as Record<string, unknown>;
  const cwd = resolve(payload.cwd ?? '.');

  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit') {
    // Claude/Codex send `file_path`; Copilot's PascalCase compat mode renames
    // the tool name (create/edit -> Write/Edit) but keeps its native
    // `edit`/`create` tool's own `path` argument name unchanged.
    const p = inp['file_path'] ?? inp['path'];
    return typeof p === 'string' && p ? [absPath(p, cwd)] : [];
  }
  if (tool === 'NotebookEdit') {
    const p = inp['notebook_path'] ?? inp['file_path'];
    return typeof p === 'string' && p ? [absPath(p, cwd)] : [];
  }
  if (tool === 'apply_patch') {
    const patch = inp['input'];
    return parseCodexPatch(typeof patch === 'string' ? patch : '', cwd);
  }
  return [];
}

function absPath(p: string, cwd: string): string {
  return isAbsolute(p) ? p : join(cwd, p);
}

const CODEX_FILE_HEADER = /^\*\*\*\s+(?:Update|Add)\s+File:\s+(.+?)\s*$/u;
const CODEX_MOVE_HEADER = /^\*\*\*\s+Move\s+to:\s+(.+?)\s*$/u;

export function parseCodexPatch(patch: string, cwd: string): string[] {
  const paths: string[] = [];
  for (const line of patch.split('\n')) {
    const m = CODEX_FILE_HEADER.exec(line);
    if (m && m[1]) {
      paths.push(absPath(m[1].trim(), cwd));
      continue;
    }
    const mv = CODEX_MOVE_HEADER.exec(line);
    if (mv && mv[1] && paths.length > 0) {
      paths[paths.length - 1] = absPath(mv[1].trim(), cwd);
    }
  }
  return paths;
}

export async function readFileCapped(path: string): Promise<string | null> {
  let st;
  try {
    st = statSync(path);
  } catch {
    return null;
  }
  if (st.size > MAX_FILE_BYTES) {
    log('common', `skip oversize ${path} (${st.size}B)`);
    return null;
  }
  try {
    return await readFile(path, 'utf8');
  } catch (e) {
    log('common', `read ${path} failed: ${stringifyError(e)}`);
    return null;
  }
}

export function pathExists(p: string): boolean {
  return existsSync(p);
}

export function stringifyError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
