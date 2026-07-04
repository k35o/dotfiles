#!/usr/bin/env bun
/**
 * SessionEnd hook: このセッションが使った STATE_DIR の一時ファイルを掃除する。
 *
 * prompt-submit / pattern-check / stop-review が session_id ごとに残す baseline・
 * untracked スナップショット・seen セット・run カウンタを、セッション終了時に
 * 決定的に削除する。cleanupPeriodDays の掃除任せにせず、その場で片付ける。
 *
 * ランタイム非依存（出力しない副作用のみ）。fail open で常に exit 0。
 *
 * Disable: SECURITY_GUIDANCE_DISABLE=1
 */

import { rmSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import {
  STATE_DIR,
  globallyDisabled,
  log,
  readPayload,
  safeSessionKey,
  stringifyError,
} from './lib/common.ts';

async function main(): Promise<number> {
  if (globallyDisabled()) return 0;

  const payload = await readPayload();
  const sessionId = String(payload.session_id ?? '');
  if (!sessionId) return 0;

  const key = safeSessionKey(sessionId);
  const targets = [
    join(STATE_DIR, 'baseline', `${key}.json`),
    join(STATE_DIR, 'baseline', `${key}.untracked`),
    join(STATE_DIR, 'seen', `${key}.json`),
    join(STATE_DIR, 'stop_runs', `${key}.txt`),
  ];

  for (const t of targets) {
    try {
      rmSync(t, { recursive: true, force: true });
    } catch (e) {
      log('session-end', `rm ${t} failed: ${stringifyError(e)}`);
    }
  }
  return 0;
}

if (import.meta.main) {
  try {
    process.exit(await main());
  } catch (e) {
    log('session-end', `unhandled: ${stringifyError(e)}`);
    process.exit(0);
  }
}
