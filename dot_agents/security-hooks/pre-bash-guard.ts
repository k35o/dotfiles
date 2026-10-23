#!/usr/bin/env bun
/**
 * Pre-execution Bash guard (Claude Code).
 *
 * Runs as a PreToolUse hook (matcher = "Bash") and inspects the command BEFORE
 * it executes. Denies a small set of destructive / exfiltration-shaped
 * commands that the static settings.json deny-list cannot express as argument
 * patterns — `curl … | bash`, `chmod 777`, `rm -rf /`, writes into shell rc /
 * ~/.ssh / Claude Code's own settings and hooks, printing secrets from the
 * keychain or fnox.
 *
 * Pure regex — no model call, no cost.
 *
 * Disable: ENABLE_PRE_BASH_GUARD=0
 *
 * Output: PreToolUse permissionDecision JSON. Exits 0 always (fail open — a bug
 * here must never block a legitimate command).
 */

import { Buffer } from 'node:buffer';
import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';

const LOG_FILE = join(homedir(), '.cache', 'security-hooks', 'log.txt');

type HookPayload = {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
};

type Rule = { name: string; re: RegExp; reason: string };

const DENY_RULES: Rule[] = [
  {
    name: 'pipe-to-shell',
    // An interpreter given its program inline (python -m, node -e) only reads
    // data from the pipe, so those are let through.
    re: /\b(?:curl|wget|fetch)\b[^\n;&]*?\|\s*(?:sudo\s+(?:-\S+\s+)*)?(?:\S*\/)?(?:(?:sh|bash|zsh|dash|ksh)\b|(?:python3?|node|perl|ruby)\b(?!\s+-\w*[cemp]))/iu,
    reason:
      'リモートのスクリプトをパイプで直接シェルやインタプリタに渡しています（curl | bash 型）。一旦ファイルに保存し、内容を確認してから実行してください。',
  },
  {
    name: 'run-remote',
    re: /\b(?:eval|source|sh|bash|zsh|dash|ksh)\b[^\n;&|]*?(?:\$\(|<\()\s*(?:curl|wget|fetch)\b/iu,
    reason:
      'eval・sh -c "$(curl …)"・<(curl …) でリモート取得したコードを実行しようとしています。一旦ファイルに保存し、内容を確認してから実行してください。',
  },
  {
    name: 'chmod-world-writable',
    re: /\bchmod\b\s+(?:-[a-zA-Z]+\s+)*(?:0?777\b|[ugoa]*[oa][ugoa]*[+=][rwxXst]*w)/u,
    reason:
      'chmod で誰でも書き込める権限（777・o+w など）にしようとしています。必要最小の権限（例: 644 / 755）を指定してください。',
  },
  {
    name: 'rm-rf-root',
    re: /\brm\b(?=[^\n;&|]*\s-(?:[a-zA-Z]*[rR]|-recursive\b))[^\n;&|]*?\s["']?(?:\/|~|\$HOME|\$\{HOME\})\/?\*?["']?(?=$|[\s;&|])/u,
    reason:
      'rm -r で / や ~ などルート/ホーム全体を再帰削除しようとしています。対象を具体的なパスに限定してください。',
  },
  {
    name: 'write-shell-config',
    re: /(?:>>?|\btee\b(?:\s+-[a-zA-Z]+)*)\s*["']?(?:~|\$HOME|\$\{HOME\}|\/root|\/home\/[^/\s]+|\/Users\/[^/\s]+)?\/?\.(?:ssh\/|zshrc|zshenv|zprofile|zlogin|bashrc|bash_profile|bash_login|profile\b|gitconfig|config\/zsh\/)/iu,
    reason:
      'シェル起動ファイル（~/.zshrc・~/.zshenv・~/.config/zsh/ など）や ~/.ssh に書き込もうとしています。自動実行や認証情報の改ざん経路になり得ます。',
  },
  {
    name: 'write-agent-config',
    re: /(?:>>?|\btee\b(?:\s+-[a-zA-Z]+)*)\s*["']?[^\s"'|;&<>]*(?:\.claude\/(?:settings[\w.-]*\.json|hooks\/|security-hooks\/)|\.agents\/security-hooks\/)/u,
    reason:
      'Claude Code の設定やフック（.claude/settings*.json・hooks・security-hooks）にシェルから書き込もうとしています。権限やフックを外す経路になり得ます。変更が必要ならユーザーに確認してください。',
  },
  {
    name: 'read-secret-store',
    re: /\bsecurity\s+(?:find-(?:generic|internet)-password\b[^\n|;&]*\s-[a-zA-Z]*[wg]\b|dump-keychain\b[^\n|;&]*\s-[a-zA-Z]*d\b|export\b)|\bfnox(?:\s+(?:-[a-zA-Z]\s+\S+|--[\w-]+(?:[=\s]\S+)?|-\w+))*\s+(?:get|export|ex|env)\b/u,
    reason:
      'キーチェーンや fnox から秘密の値を出力に読み出そうとしています。値は fnox exec -P <profile> -- <command> で必要なコマンドにだけ渡してください。',
  },
];

export function evaluateCommand(command: string): Rule | null {
  return DENY_RULES.find((r) => r.re.test(command)) ?? null;
}

function log(msg: string): void {
  // Synchronous: main() returns straight into process.exit(), which drops a
  // pending async append.
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[pre-bash-guard] ${msg}\n`);
  } catch {
    /* ignore */
  }
}

async function readPayload(): Promise<HookPayload> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw.trim() ? (JSON.parse(raw) as HookPayload) : {};
}

async function main(): Promise<number> {
  if (process.env['ENABLE_PRE_BASH_GUARD'] === '0') return 0;

  const payload = await readPayload();
  if ((payload.tool_name ?? '') !== 'Bash') return 0;

  const command = String((payload.tool_input ?? {})['command'] ?? '');
  if (!command.trim()) return 0;

  const rule = evaluateCommand(command);
  if (!rule) return 0;

  log(`deny [${rule.name}]`);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: rule.reason,
      },
    }),
  );
  return 0;
}

if (import.meta.main) {
  try {
    process.exit(await main());
  } catch (e) {
    log(
      `unhandled: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
    );
    process.exit(0);
  }
}
