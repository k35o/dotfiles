#!/usr/bin/env bun
/**
 * UserPromptSubmit hook: capture the working-tree baseline for L2 diff review.
 *
 * Runs at the start of each user turn for both Claude Code and Codex CLI.
 * Saves a baseline SHA representing the working tree state at this moment so
 * that `stop_review.ts` can compute "this turn's changes".
 *
 * Strategy:
 * - `git stash create -u` produces a commit object capturing both tracked
 *   modifications AND untracked files, without touching the working tree.
 * - If the working tree is clean, fall back to HEAD.
 * - If not in a git repo, write nothing — stop_review.ts falls back to HEAD.
 *
 * Disable: SECURITY_GUIDANCE_DISABLE=1.
 *
 * Output: nothing (silent capture). Always exits 0.
 */

import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

import {
  MAX_FILE_BYTES,
  STATE_DIR,
  atomicWriteText,
  globallyDisabled,
  log,
  readPayload,
  safeSessionKey,
  stringifyError,
} from './lib/common.ts';

type Baseline = {
  sha: string;
  untracked: string[];
  cwd: string;
};

function baselinePath(sessionId: string): string {
  return join(STATE_DIR, 'baseline', `${safeSessionKey(sessionId)}.json`);
}

function untrackedSnapshotDir(sessionId: string): string {
  return join(STATE_DIR, 'baseline', `${safeSessionKey(sessionId)}.untracked`);
}

function runGit(
  cwd: string,
  args: string[],
  timeoutMs: number,
): {
  ok: boolean;
  stdout: string;
  stderr: string;
} {
  try {
    const r = spawnSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      timeout: timeoutMs,
    });
    return {
      ok: r.status === 0,
      stdout: r.stdout ?? '',
      stderr: r.stderr ?? '',
    };
  } catch (e) {
    return { ok: false, stdout: '', stderr: stringifyError(e) };
  }
}

function snapshotUntrackedFiles(
  cwd: string,
  sessionId: string,
  untracked: string[],
): void {
  const snapRoot = untrackedSnapshotDir(sessionId);
  try {
    rmSync(snapRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  for (const rel of untracked) {
    const src = join(cwd, rel);
    try {
      const st = statSync(src);
      if (!st.isFile()) continue;
      if (st.size > MAX_FILE_BYTES) continue;
    } catch {
      continue;
    }
    const dst = join(snapRoot, rel);
    try {
      mkdirSync(dirname(dst), { recursive: true });
      writeFileSync(dst, readFileSync(src));
    } catch (e) {
      log('prompt-submit', `snapshot ${rel} failed: ${stringifyError(e)}`);
    }
  }
}

function capture(cwd: string): Baseline | null {
  const check = runGit(cwd, ['rev-parse', '--is-inside-work-tree'], 5000);
  if (!check.ok || check.stdout.trim() !== 'true') {
    if (!check.ok && check.stderr)
      log('prompt-submit', `git check failed: ${check.stderr.slice(0, 200)}`);
    return null;
  }

  let sha = '';
  const stash = runGit(cwd, ['stash', 'create', '-u'], 15_000);
  if (stash.ok) {
    sha = stash.stdout.trim();
  } else if (stash.stderr) {
    log('prompt-submit', `stash create failed: ${stash.stderr.slice(0, 200)}`);
  }

  if (!sha) {
    const head = runGit(cwd, ['rev-parse', 'HEAD'], 5000);
    if (head.ok) sha = head.stdout.trim();
    else if (head.stderr)
      log(
        'prompt-submit',
        `rev-parse HEAD failed: ${head.stderr.slice(0, 200)}`,
      );
  }

  if (!sha) return null;

  const ls = runGit(
    cwd,
    ['ls-files', '--others', '--exclude-standard'],
    10_000,
  );
  const untracked = ls.ok
    ? ls.stdout.split('\n').filter((ln) => ln.length > 0)
    : [];
  if (!ls.ok && ls.stderr)
    log('prompt-submit', `ls-files failed: ${ls.stderr.slice(0, 200)}`);

  return { sha, untracked, cwd };
}

async function main(): Promise<number> {
  if (globallyDisabled()) return 0;

  const payload = await readPayload();
  if (Object.keys(payload).length === 0) return 0;

  const sessionId = String(payload.session_id ?? 'default');
  const cwd = resolve(payload.cwd ?? '.');

  const baseline = capture(cwd);
  if (baseline === null) return 0;

  atomicWriteText(baselinePath(sessionId), JSON.stringify(baseline));
  snapshotUntrackedFiles(cwd, sessionId, baseline.untracked);
  return 0;
}

try {
  process.exit(await main());
} catch (e) {
  log('prompt-submit', `unhandled: ${stringifyError(e)}`);
  process.exit(0);
}
