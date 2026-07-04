#!/usr/bin/env bun
/**
 * SessionStart hook: ガードの依存ツールの健全性チェックと git recon を
 * additionalContext としてセッション冒頭に注入する（Claude 用）。
 *
 * - codex / bun / mise / fnox が PATH に無ければ警告する。これらが欠けると
 *   L1/L2 ガードや fnox のシークレット解決が黙って無効化されるため、
 *   「設定済みに見えて無防備」という状態を可視化する。
 * - 直近のコミットと未コミットの変更を短く要約し、長いセッションが状態を
 *   把握した状態で始められるようにする。
 *
 * Claude 専用（additionalContext の出力形は Claude の SessionStart 契約）。
 * fail open で常に exit 0。
 *
 * Disable:
 * - SECURITY_GUIDANCE_DISABLE=1
 * - ENABLE_SESSION_START=0
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

import {
  detectRuntime,
  globallyDisabled,
  log,
  readPayload,
  stringifyError,
} from './lib/common.ts';

const REQUIRED_TOOLS = ['codex', 'bun', 'mise', 'fnox'];

function has(cmd: string): boolean {
  try {
    const r = spawnSync('which', [cmd], { encoding: 'utf8', timeout: 3000 });
    return r.status === 0;
  } catch {
    return false;
  }
}

function git(cwd: string, args: string[]): string | null {
  try {
    const r = spawnSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return r.status === 0 ? (r.stdout ?? '') : null;
  } catch {
    return null;
  }
}

async function main(): Promise<number> {
  if (globallyDisabled()) return 0;
  if (process.env['ENABLE_SESSION_START'] === '0') return 0;

  const payload = await readPayload();
  if (detectRuntime(payload) !== 'claude') return 0;

  const notes: string[] = [];

  const missing = REQUIRED_TOOLS.filter((c) => !has(c));
  if (missing.length > 0) {
    notes.push(
      `⚠️ セキュリティフックの依存ツールが見つかりません: ${missing.join(', ')}。` +
        `L1/L2 ガードや fnox によるシークレット解決が無効化されている可能性があります。`,
    );
  }

  const cwd = resolve(payload.cwd ?? process.cwd());
  const recent = git(cwd, ['log', '--oneline', '-5']);
  const status = git(cwd, ['status', '--short']);
  if (status !== null) {
    const recon = [
      recent?.trim() ? `直近のコミット:\n${recent.trim()}` : '',
      status.trim()
        ? `未コミットの変更:\n${status.trim()}`
        : '作業ツリーはクリーンです。',
    ]
      .filter(Boolean)
      .join('\n\n');
    if (recon) notes.push(recon);
  }

  if (notes.length === 0) return 0;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: notes.join('\n\n'),
      },
    }),
  );
  return 0;
}

if (import.meta.main) {
  try {
    process.exit(await main());
  } catch (e) {
    log('session-start', `unhandled: ${stringifyError(e)}`);
    process.exit(0);
  }
}
