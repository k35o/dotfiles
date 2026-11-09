#!/usr/bin/env bun
/**
 * 外部リポジトリへの被リンクを防ぐ PreToolUse フック（matcher = "Bash"）。
 *
 * `git commit` と `gh pr create|edit`、`gh issue create|edit|comment`、`gh pr comment` の
 * コマンド文字列に、作業中のリポジトリ以外の `owner/repo#123` や
 * `https://github.com/owner/repo/(issues|pull)/123` が含まれていたら拒否する。
 * GitHub は外部の Issue・PR に被リンクを残すため。バッククォートで囲んだ参照は
 * オートリンクされないので通す。
 *
 * `--body-file` や `-F <file>` で渡したファイルの中身は見ない。
 *
 * Disable: ENABLE_EXTERNAL_REFS_GUARD=0
 * 常に exit 0（fail open）。
 */

import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

type HookPayload = {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  cwd?: string;
};

const TARGET_COMMAND =
  /\bgit\b(?:\s+-C\s+\S+)?\s+commit\b|\bgh\s+(?:pr\s+(?:create|edit|comment)|issue\s+(?:create|edit|comment))\b/u;

const SHORT_REF = /(?<![\w.`/-])([\w.-]+\/[\w.-]+)#\d+(?![\w`])/gu;
const URL_REF =
  /(?<!`)https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/(?:issues|pull)\/\d+(?![\w`])/gu;

export function parseRepo(remoteUrl: string): string | null {
  const m = /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/u.exec(
    remoteUrl.trim(),
  );
  return m?.[1]?.toLowerCase() ?? null;
}

export function findExternalRefs(
  command: string,
  currentRepo: string | null,
): string[] {
  if (!TARGET_COMMAND.test(command)) return [];
  const refs: string[] = [];
  for (const re of [SHORT_REF, URL_REF]) {
    for (const m of command.matchAll(re)) {
      const repo = m[1]?.toLowerCase();
      if (repo && repo !== currentRepo) refs.push(m[0]);
    }
  }
  return refs;
}

function currentRepoOf(cwd: string | undefined): string | null {
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: cwd || process.cwd(),
    encoding: 'utf8',
    timeout: 3000,
  });
  return r.status === 0 ? parseRepo(r.stdout) : null;
}

async function readPayload(): Promise<HookPayload> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw.trim() ? (JSON.parse(raw) as HookPayload) : {};
}

async function main(): Promise<number> {
  if (process.env['ENABLE_EXTERNAL_REFS_GUARD'] === '0') return 0;

  const payload = await readPayload();
  if ((payload.tool_name ?? '') !== 'Bash') return 0;

  const command = String((payload.tool_input ?? {})['command'] ?? '');
  if (!TARGET_COMMAND.test(command)) return 0;

  const refs = findExternalRefs(command, currentRepoOf(payload.cwd));
  if (refs.length === 0) return 0;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `外部リポジトリの Issue・PR への参照（${refs.join('、')}）が含まれています。GitHub が相手のリポジトリに被リンクを残すので、削るか、バッククォートで囲んでオートリンクを止めてください。`,
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
