#!/usr/bin/env bun
/**
 * L1: Per-edit security pattern check.
 *
 * Runs as PostToolUse hook for:
 * - Claude Code: matcher = "Edit|Write|NotebookEdit"
 * - Codex CLI:   matcher = "^apply_patch$"
 *
 * Reads the edited file from disk (after the edit lands) and matches the new
 * content against the patterns declared in ~/.claude/security-patterns.json.
 * On hit, injects a warning into the model's context via JSON output.
 *
 * Pure regex / substring — no model call, no cost.
 *
 * Disable:
 * - SECURITY_GUIDANCE_DISABLE=1 (all layers)
 * - ENABLE_PATTERN_RULES=0 (this layer only)
 *
 * Output:
 * - JSON to stdout with `systemMessage` and (for Claude) `hookSpecificOutput`
 * - Exits 0 always (fail open — never break the tool because of a hook bug)
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  STATE_DIR,
  atomicWriteText,
  emitInject,
  extractEditedPaths,
  globallyDisabled,
  loadPatterns,
  log,
  matchesAnyGlob,
  readFileCapped,
  readPayload,
  safeSessionKey,
  stringifyError,
  type HookPayload,
  type PatternRule,
} from './lib/common.ts';

const MAX_REMINDER_BYTES = 1024;

function sessionStatePath(sessionId: string): string {
  return join(STATE_DIR, 'seen', `${safeSessionKey(sessionId)}.json`);
}

async function loadSeen(sessionId: string): Promise<Set<string>> {
  try {
    const text = await readFile(sessionStatePath(sessionId), 'utf8');
    const arr = JSON.parse(text);
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    log('pattern_check', `load_seen failed: ${stringifyError(e)}`);
    return new Set();
  }
}

function saveSeen(sessionId: string, seen: Set<string>): void {
  const sorted = [...seen].sort();
  atomicWriteText(sessionStatePath(sessionId), JSON.stringify(sorted));
}

function matchRule(content: string, path: string, rule: PatternRule): boolean {
  const pathsFilter = rule.paths ?? [];
  if (pathsFilter.length > 0 && !matchesAnyGlob(pathsFilter, path)) return false;
  const exclude = rule.exclude_paths ?? [];
  if (exclude.length > 0 && matchesAnyGlob(exclude, path)) return false;

  if (rule.regex) {
    try {
      const re = new RegExp(rule.regex, 'm');
      if (re.test(content)) return true;
    } catch (e) {
      log(
        'pattern_check',
        `bad regex in ${rule.rule_name ?? 'unnamed'}: ${stringifyError(e)}`,
      );
    }
  }

  if (rule.substrings) {
    for (const s of rule.substrings) {
      if (content.includes(s)) return true;
    }
  }

  return false;
}

async function main(): Promise<number> {
  if (globallyDisabled()) return 0;
  if (process.env['ENABLE_PATTERN_RULES'] === '0') return 0;

  const payload: HookPayload = await readPayload();
  if (Object.keys(payload).length === 0) return 0;

  const sessionId = String(payload.session_id ?? 'default');
  const paths = extractEditedPaths(payload);
  if (paths.length === 0) return 0;

  const rules = await loadPatterns();
  if (rules.length === 0) return 0;

  const seen = await loadSeen(sessionId);
  const findings: string[] = [];

  for (const path of paths) {
    const content = await readFileCapped(path);
    if (content === null) continue;

    for (const rule of rules) {
      const name = String(rule.rule_name ?? 'unnamed');
      if (!matchRule(content, path, rule)) continue;
      const key = `${name}::${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const reminder = String(rule.reminder ?? '').slice(0, MAX_REMINDER_BYTES);
      findings.push(`- [${name}] ${path}\n  ${reminder}`);
    }
  }

  if (findings.length === 0) return 0;

  saveSeen(sessionId, seen);

  const text =
    'Security pattern(s) matched in just-edited file(s). ' +
    'Review and remediate before continuing this turn:\n\n' +
    findings.join('\n') +
    '\n\nReference: ~/.claude/claude-security-guidance.md';
  emitInject(text, 'PostToolUse');
  return 0;
}

try {
  process.exit(await main());
} catch (e) {
  log('pattern_check', `unhandled: ${stringifyError(e)}`);
  process.exit(0);
}
