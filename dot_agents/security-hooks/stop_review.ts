#!/usr/bin/env bun
/**
 * L2: End-of-turn security review via Codex.
 *
 * Runs as the Stop hook for both Claude Code and Codex CLI. Computes the diff
 * of THIS TURN's changes (compared against the baseline captured at
 * UserPromptSubmit by prompt_submit.ts) and sends it to `codex exec` for a
 * security review using ~/.claude/claude-security-guidance.md.
 *
 * If the review finds issues, re-prompts the originating runtime with the
 * findings. Runtime detection drives the response shape (Claude's
 * `decision=block` vs Codex's `continue=false`).
 *
 * Design notes:
 * - Reviewer is always Codex (k8o's choice). Implements writer != reviewer.
 * - Codex is invoked through `mise exec --` to use the mise-pinned version.
 * - The child process gets SECURITY_GUIDANCE_DISABLE=1 to prevent the reviewer
 *   session's hooks from spawning yet another reviewer (infinite recursion).
 * - Synchronous execution: Stop hooks block the turn end. 120s timeout in
 *   the hook config gives codex room while staying responsive.
 * - Caps at 3 invocations per session. Respects stop_hook_active so we don't
 *   re-prompt twice in a row.
 * - Fails open: any error path returns exit 0 without disturbing the session.
 *
 * Disable:
 * - SECURITY_GUIDANCE_DISABLE=1 (all layers; also propagated to child)
 * - ENABLE_CODE_SECURITY_REVIEW=0 (all model-backed layers)
 * - ENABLE_STOP_REVIEW=0 (this layer only)
 *
 * Tuning env:
 * - SECURITY_REVIEW_MODEL: codex model slug (default: gpt-5-codex)
 * - SECURITY_REVIEW_TIMEOUT: seconds (default: 90)
 * - SECURITY_REVIEW_MAX_RUNS: per-session cap (default: 3)
 * - SECURITY_REVIEW_MAX_DIFF_BYTES: skip if larger (default: 200000)
 * - SECURITY_REVIEW_MISE_PATH: absolute path to mise (default: /opt/homebrew/bin/mise)
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  STATE_DIR,
  atomicWriteText,
  detectRuntime,
  emitReprompt,
  globallyDisabled,
  loadGuidance,
  log,
  readPayload,
  safeSessionKey,
  stringifyError,
} from './lib/common.ts';

const DEFAULT_MODEL = 'gpt-5-codex';
const DEFAULT_TIMEOUT = 90;
const DEFAULT_MAX_RUNS = 3;
const DEFAULT_MAX_DIFF_BYTES = 200_000;
const DEFAULT_MISE_PATH = '/opt/homebrew/bin/mise';
const NEW_FILE_MAX_BYTES = 64 * 1024;

type Baseline = { sha: string; untracked: string[]; cwd: string };

function safeIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    log('stop_review', `bad ${name}=${JSON.stringify(raw)}, using default ${fallback}`);
    return fallback;
  }
  return n;
}

function runsStatePath(sessionId: string): string {
  return join(STATE_DIR, 'stop_runs', `${safeSessionKey(sessionId)}.txt`);
}

function baselineStatePath(sessionId: string): string {
  return join(STATE_DIR, 'baseline', `${safeSessionKey(sessionId)}.json`);
}

function untrackedSnapshotRoot(sessionId: string): string {
  return join(STATE_DIR, 'baseline', `${safeSessionKey(sessionId)}.untracked`);
}

function getRunCount(sessionId: string): number {
  try {
    return Number.parseInt(readFileSync(runsStatePath(sessionId), 'utf8').trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function bumpRunCount(sessionId: string): void {
  atomicWriteText(runsStatePath(sessionId), String(getRunCount(sessionId) + 1));
}

function loadBaseline(sessionId: string): Baseline | null {
  try {
    return JSON.parse(readFileSync(baselineStatePath(sessionId), 'utf8')) as Baseline;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    log('stop_review', `baseline load failed: ${stringifyError(e)}`);
    return null;
  }
}

function gitDiff(cwd: string, baseRef: string): string | null {
  try {
    const r = spawnSync(
      'git',
      ['-C', cwd, 'diff', baseRef, '--no-color', '--unified=3'],
      { encoding: 'utf8', timeout: 15000, maxBuffer: 16 * 1024 * 1024 },
    );
    if (r.status !== 0) {
      log(
        'stop_review',
        `git diff ${baseRef} failed: ${(r.stderr ?? '').trim().slice(0, 200)}`,
      );
      return null;
    }
    return r.stdout ?? '';
  } catch (e) {
    log('stop_review', `git diff error: ${stringifyError(e)}`);
    return null;
  }
}

function listUntracked(cwd: string): string[] {
  try {
    const r = spawnSync(
      'git',
      ['-C', cwd, 'ls-files', '--others', '--exclude-standard'],
      { encoding: 'utf8', timeout: 10000 },
    );
    if (r.status !== 0) return [];
    return (r.stdout ?? '').split('\n').filter((ln) => ln.length > 0);
  } catch (e) {
    log('stop_review', `ls-files failed: ${stringifyError(e)}`);
    return [];
  }
}

function synthesizeNewFileDiff(cwd: string, relPath: string): string {
  const abs = join(cwd, relPath);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return '';
  }
  if (st.size > NEW_FILE_MAX_BYTES) {
    return (
      `\ndiff --git a/${relPath} b/${relPath}\n` +
      'new file mode 100644\n--- /dev/null\n+++ b/' +
      relPath +
      '\n' +
      `@@ NEW FILE TOO LARGE TO INCLUDE (${st.size} bytes) @@\n`
    );
  }
  let content: string;
  try {
    content = readFileSync(abs, 'utf8');
  } catch {
    return '';
  }
  const lines = content.split('\n');
  // split keeps the trailing empty after final newline; drop it for accurate count.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const body = lines.map((ln) => `+${ln}\n`).join('');
  const header =
    `\ndiff --git a/${relPath} b/${relPath}\n` +
    'new file mode 100644\n--- /dev/null\n+++ b/' +
    relPath +
    '\n' +
    `@@ -0,0 +1,${lines.length} @@\n`;
  return header + body;
}

/**
 * For a file that was already untracked at baseline time, compare current
 * content against the snapshot saved by prompt_submit.ts using `diff -u`.
 */
function synthesizeUntrackedModifiedDiff(
  cwd: string,
  snapshotRoot: string,
  relPath: string,
): string {
  const absNow = join(cwd, relPath);
  const absSnap = join(snapshotRoot, relPath);
  if (!existsSync(absSnap)) return '';
  let st;
  try {
    st = statSync(absNow);
  } catch {
    return '';
  }
  if (st.size > NEW_FILE_MAX_BYTES) {
    return (
      `\ndiff --git a/${relPath} b/${relPath}\n` +
      `--- a/${relPath}\n+++ b/${relPath}\n` +
      `@@ UNTRACKED FILE TOO LARGE TO INCLUDE (${st.size} bytes) @@\n`
    );
  }
  try {
    const r = spawnSync(
      'diff',
      [
        '-u',
        '--label',
        `a/${relPath}`,
        '--label',
        `b/${relPath}`,
        absSnap,
        absNow,
      ],
      { encoding: 'utf8', timeout: 10000, maxBuffer: 8 * 1024 * 1024 },
    );
    // diff exit codes: 0 = identical, 1 = differ, >1 = error.
    if (r.status === 0) return '';
    if (r.status !== 1) {
      log(
        'stop_review',
        `diff ${relPath} failed: ${(r.stderr ?? '').trim().slice(0, 200)}`,
      );
      return '';
    }
    const body = r.stdout ?? '';
    if (!body) return '';
    return `\ndiff --git a/${relPath} b/${relPath}\n` + body;
  } catch (e) {
    log('stop_review', `diff ${relPath} failed: ${stringifyError(e)}`);
    return '';
  }
}

function computeTurnDiff(
  cwd: string,
  baseline: Baseline | null,
  sessionId: string,
): string {
  const baseRef = baseline?.sha ?? 'HEAD';
  const baselineUntracked = new Set(baseline?.untracked ?? []);

  let diff = gitDiff(cwd, baseRef) ?? '';
  const nowUntracked = new Set(listUntracked(cwd));

  const newFiles = [...nowUntracked].filter((p) => !baselineUntracked.has(p)).sort();
  for (const rel of newFiles) {
    diff += synthesizeNewFileDiff(cwd, rel);
  }

  if (baseline) {
    const snapRoot = untrackedSnapshotRoot(sessionId);
    const stillUntracked = [...nowUntracked]
      .filter((p) => baselineUntracked.has(p))
      .sort();
    for (const rel of stillUntracked) {
      diff += synthesizeUntrackedModifiedDiff(cwd, snapRoot, rel);
    }
  }

  return diff;
}

function findMise(): string | null {
  const explicit = process.env['SECURITY_REVIEW_MISE_PATH'] ?? DEFAULT_MISE_PATH;
  if (existsSync(explicit)) return explicit;
  const which = spawnSync('which', ['mise'], { encoding: 'utf8', timeout: 3000 });
  const found = which.stdout?.split('\n')[0]?.trim();
  if (which.status === 0 && found) return found;
  log('stop_review', 'mise binary not found');
  return null;
}

/**
 * Invoke `codex exec` via `mise exec --` for the mise-pinned version.
 * Passing the long prompt via stdin avoids hitting argv length limits.
 */
function callCodex(
  diff: string,
  guidance: string,
  timeoutSec: number,
  model: string,
): string | null {
  const mise = findMise();
  if (!mise) return null;

  const prompt =
    'You are a security reviewer. Read the GUIDANCE first, then review the DIFF.\n' +
    'Report ONLY security issues that violate the guidance\'s hard rules or are\n' +
    'clearly exploitable. Ignore style, performance, and general code quality.\n' +
    'Use the output format specified in the guidance.\n' +
    'If there are no security issues, reply with exactly:\n' +
    'No issues found.\n\n' +
    '=== GUIDANCE ===\n' +
    `${guidance}\n\n` +
    '=== DIFF ===\n' +
    `${diff}\n`;

  const env = { ...process.env, SECURITY_GUIDANCE_DISABLE: '1' };
  delete env['CLAUDE_PROJECT_DIR'];

  try {
    const r = spawnSync(
      mise,
      [
        'exec',
        '--',
        'codex',
        'exec',
        '--model',
        model,
        '--skip-git-repo-check',
        '--sandbox',
        'read-only',
        prompt,
      ],
      {
        encoding: 'utf8',
        timeout: timeoutSec * 1000,
        env,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    if (r.error && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
      log('stop_review', `codex timed out after ${timeoutSec}s`);
      return null;
    }
    if (r.status !== 0) {
      log('stop_review', `codex exit ${r.status}: ${(r.stderr ?? '').slice(0, 500)}`);
      return null;
    }
    return (r.stdout ?? '').trim();
  } catch (e) {
    log('stop_review', `codex call failed: ${stringifyError(e)}`);
    return null;
  }
}

function isCleanReview(review: string): boolean {
  return review.trim().replace(/[.!]+$/, '').toLowerCase() === 'no issues found';
}

async function main(): Promise<number> {
  if (globallyDisabled()) return 0;
  if (process.env['ENABLE_CODE_SECURITY_REVIEW'] === '0') return 0;
  if (process.env['ENABLE_STOP_REVIEW'] === '0') return 0;

  const payload = await readPayload();
  if (Object.keys(payload).length === 0) return 0;

  if (payload.stop_hook_active) return 0;

  const sessionId = String(payload.session_id ?? 'default');
  const cwd = resolve(payload.cwd ?? process.cwd());
  const runtime = detectRuntime(payload);

  const maxRuns = safeIntEnv('SECURITY_REVIEW_MAX_RUNS', DEFAULT_MAX_RUNS);
  if (getRunCount(sessionId) >= maxRuns) {
    log('stop_review', `max runs (${maxRuns}) reached`);
    return 0;
  }

  const baseline = loadBaseline(sessionId);
  const diff = computeTurnDiff(cwd, baseline, sessionId);
  if (!diff.trim()) return 0;

  const maxBytes = safeIntEnv('SECURITY_REVIEW_MAX_DIFF_BYTES', DEFAULT_MAX_DIFF_BYTES);
  if (Buffer.byteLength(diff, 'utf8') > maxBytes) {
    log('stop_review', `diff too large (${diff.length}B), skipping`);
    return 0;
  }

  const guidance =
    (await loadGuidance()) ||
    '(no guidance file found at ~/.claude/claude-security-guidance.md)';
  const timeout = safeIntEnv('SECURITY_REVIEW_TIMEOUT', DEFAULT_TIMEOUT);
  const model = process.env['SECURITY_REVIEW_MODEL'] ?? DEFAULT_MODEL;

  bumpRunCount(sessionId);
  const review = callCodex(diff, guidance, timeout, model);
  if (!review) return 0;

  if (isCleanReview(review)) return 0;

  const reason =
    'Codex security review found issue(s) in this turn\'s changes. ' +
    'Address each before declaring the turn complete:\n\n' +
    `${review}\n\n` +
    'Reference: ~/.claude/claude-security-guidance.md';
  emitReprompt(reason, runtime);
  return 0;
}

try {
  process.exit(await main());
} catch (e) {
  log('stop_review', `unhandled: ${stringifyError(e)}`);
  process.exit(0);
}
