#!/usr/bin/env bun
/**
 * L0: Pre-execution Bash guard (Claude Code).
 *
 * Runs as a PreToolUse hook (matcher = "Bash") and inspects the command BEFORE
 * it executes. Denies (or gates with "ask") a small set of destructive /
 * exfiltration-shaped commands that the static settings.json deny-list cannot
 * express as argument patterns — `curl … | bash`, `chmod 777`, `rm -rf /`,
 * writes into shell rc / ~/.ssh. These leave no file diff, so the L1
 * pattern-check and L2 Codex stop-review are structurally blind to them.
 *
 * Claude only: the decision JSON below is Claude's PreToolUse contract. Codex's
 * PreToolUse output shape is not wired here yet, so Codex runs return early
 * rather than emit an output Codex would misread.
 *
 * Pure regex — no model call, no cost.
 *
 * Disable:
 * - SECURITY_GUIDANCE_DISABLE=1 (all layers)
 * - ENABLE_PRE_BASH_GUARD=0 (this layer only)
 *
 * Output: PreToolUse permissionDecision JSON. Exits 0 always (fail open — a bug
 * here must never block a legitimate command).
 */

import process from 'node:process';

import {
  detectRuntime,
  emitPreToolDecision,
  globallyDisabled,
  log,
  readPayload,
  stringifyError,
  type HookPayload,
} from './lib/common.ts';

type Verdict = { decision: 'deny' | 'ask'; rule: string; reason: string };

type Rule = { name: string; re: RegExp; exclude?: RegExp; reason: string };

const DENY_RULES: Rule[] = [
  {
    name: 'pipe-to-shell',
    re: /\b(?:curl|wget|fetch)\b[^\n]*?\|[^\n]*?\b(?:sh|bash|zsh|dash|ksh)\b/iu,
    reason:
      'リモートスクリプトをパイプで直接シェル実行しています（curl|bash 型）。一旦ファイルに保存し、内容を確認してから実行してください。',
  },
  {
    name: 'eval-remote',
    re: /\beval\b[^\n]*\$\(\s*(?:curl|wget|fetch)\b/iu,
    reason:
      'eval でリモート取得したコードを実行しようとしています。任意コード実行につながります。',
  },
  {
    name: 'chmod-777',
    re: /\bchmod\b\s+(?:-[a-zA-Z]+\s+)*0?777\b/iu,
    reason:
      'chmod 777 は誰でも読み書き実行可能にします。必要最小の権限（例: 644 / 755）を指定してください。',
  },
  {
    name: 'rm-rf-root',
    re: /\brm\b\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*(?:rf|fr)[a-zA-Z]*\s+(?:--?[a-zA-Z-]+\s+)*(?:\/|~|\$HOME|\/\*)(?:\s|$)/u,
    reason:
      'rm -rf で / や ~ などルート/ホーム全体を再帰削除しようとしています。対象を具体的なパスに限定してください。',
  },
  {
    name: 'write-shell-config',
    re: />>?\s*(?:~|\$HOME|\/root|\/home\/[^/\s]+|\/Users\/[^/\s]+)?\/?\.(?:ssh\/|zshrc|zprofile|bashrc|bash_profile|profile\b|gitconfig)/iu,
    reason:
      'シェル起動ファイルや ~/.ssh へリダイレクト書き込みしています。自動実行や認証情報の改ざん経路になり得ます。',
  },
];

const ASK_RULES: Rule[] = [
  {
    name: 'force-push',
    re: /\bgit\s+push\b[^\n]*?(?:--force\b|-f\b)/u,
    exclude: /--force-with-lease/u,
    reason:
      'force push はリモート履歴を上書きします。対象ブランチと影響範囲を確認してください。',
  },
];

export function evaluateCommand(command: string): Verdict | null {
  for (const r of DENY_RULES) {
    if (r.exclude && r.exclude.test(command)) continue;
    if (r.re.test(command))
      return { decision: 'deny', rule: r.name, reason: r.reason };
  }
  for (const r of ASK_RULES) {
    if (r.exclude && r.exclude.test(command)) continue;
    if (r.re.test(command))
      return { decision: 'ask', rule: r.name, reason: r.reason };
  }
  return null;
}

async function main(): Promise<number> {
  if (globallyDisabled()) return 0;
  if (process.env['ENABLE_PRE_BASH_GUARD'] === '0') return 0;

  const payload: HookPayload = await readPayload();
  if (Object.keys(payload).length === 0) return 0;
  if (detectRuntime(payload) !== 'claude') return 0;
  if ((payload.tool_name ?? '') !== 'Bash') return 0;

  const command = String((payload.tool_input ?? {})['command'] ?? '');
  if (!command.trim()) return 0;

  const verdict = evaluateCommand(command);
  if (!verdict) return 0;

  log('pre-bash-guard', `${verdict.decision} [${verdict.rule}]`);
  emitPreToolDecision(verdict.decision, verdict.reason);
  return 0;
}

if (import.meta.main) {
  try {
    process.exit(await main());
  } catch (e) {
    log('pre-bash-guard', `unhandled: ${stringifyError(e)}`);
    process.exit(0);
  }
}
