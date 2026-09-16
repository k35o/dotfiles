import { describe, expect, test } from 'bun:test';
import process from 'node:process';

import {
  detectRuntime,
  extractEditedPaths,
  fnmatch,
  isRiskyRegex,
  matchesAnyGlob,
  parseCodexPatch,
  safeSessionKey,
} from '../lib/common.ts';

describe('fnmatch', () => {
  test('exact name', () => {
    expect(fnmatch('foo.ts', 'foo.ts')).toBe(true);
    expect(fnmatch('foo.ts', 'bar.ts')).toBe(false);
  });

  test('star wildcard crosses path separators (Python fnmatch semantics)', () => {
    expect(fnmatch('src/foo.ts', '*.ts')).toBe(true);
    expect(fnmatch('/a/b/c.env', '*.env')).toBe(true);
  });

  test('question mark matches single char', () => {
    expect(fnmatch('a.ts', '?.ts')).toBe(true);
    expect(fnmatch('ab.ts', '?.ts')).toBe(false);
  });

  test('character class', () => {
    expect(fnmatch('a.ts', '[abc].ts')).toBe(true);
    expect(fnmatch('d.ts', '[abc].ts')).toBe(false);
    expect(fnmatch('d.ts', '[!abc].ts')).toBe(true);
  });

  test('escapes regex metacharacters in literal parts', () => {
    expect(fnmatch('a.b', 'a.b')).toBe(true);
    expect(fnmatch('aXb', 'a.b')).toBe(false);
  });
});

describe('matchesAnyGlob', () => {
  test('returns true when any pattern matches', () => {
    expect(matchesAnyGlob(['*.md', '*.ts'], '/a/b/foo.ts')).toBe(true);
  });
  test('returns false when none match', () => {
    expect(matchesAnyGlob(['*.md', '*.json'], '/a/b/foo.ts')).toBe(false);
  });
});

describe('isRiskyRegex', () => {
  test('flags nested unlimited quantifiers', () => {
    expect(isRiskyRegex('(a+)+')).toBe(true);
    expect(isRiskyRegex('(ab*)*')).toBe(true);
  });

  test('flags 3+ greedy wildcards', () => {
    expect(isRiskyRegex('.*foo.*bar.*baz')).toBe(true);
    expect(isRiskyRegex('.+a.+b.+c')).toBe(true);
  });

  test('allows tame patterns', () => {
    expect(isRiskyRegex('AKIA[0-9A-Z]{16}')).toBe(false);
    expect(isRiskyRegex('foo.*bar')).toBe(false);
  });
});

describe('safeSessionKey', () => {
  test('deterministic 16-hex-char digest', () => {
    const k = safeSessionKey('abc');
    expect(k).toHaveLength(16);
    expect(k).toMatch(/^[\da-f]{16}$/u);
    expect(safeSessionKey('abc')).toBe(k);
  });

  test('different inputs produce different keys', () => {
    expect(safeSessionKey('a')).not.toBe(safeSessionKey('b'));
  });

  test('empty falls back to "default"', () => {
    expect(safeSessionKey('')).toBe(safeSessionKey('default'));
  });
});

describe('extractEditedPaths', () => {
  test('Edit / Write returns absolute file_path', () => {
    const paths = extractEditedPaths({
      tool_name: 'Edit',
      tool_input: { file_path: '/abs/x.ts' },
      cwd: '/tmp',
    });
    expect(paths).toEqual(['/abs/x.ts']);
  });

  test('relative file_path is joined to cwd', () => {
    const paths = extractEditedPaths({
      tool_name: 'Write',
      tool_input: { file_path: 'src/x.ts' },
      cwd: '/work',
    });
    expect(paths).toEqual(['/work/src/x.ts']);
  });

  test('NotebookEdit prefers notebook_path', () => {
    const paths = extractEditedPaths({
      tool_name: 'NotebookEdit',
      tool_input: { notebook_path: '/abs/nb.ipynb' },
      cwd: '/tmp',
    });
    expect(paths).toEqual(['/abs/nb.ipynb']);
  });

  test('apply_patch delegates to parseCodexPatch', () => {
    const patch =
      '*** Add File: a.ts\n+hello\n*** Update File: b.ts\n@@\n-old\n+new\n';
    const paths = extractEditedPaths({
      tool_name: 'apply_patch',
      tool_input: { input: patch },
      cwd: '/work',
    });
    expect(paths).toEqual(['/work/a.ts', '/work/b.ts']);
  });

  test('unknown tool returns empty', () => {
    expect(extractEditedPaths({ tool_name: 'Bash', tool_input: {} })).toEqual(
      [],
    );
  });
});

describe('parseCodexPatch', () => {
  test('handles Add / Update / Move', () => {
    const patch = [
      '*** Add File: a.ts',
      '+x',
      '*** Update File: old.ts',
      '*** Move to: new.ts',
      '@@',
      '-x',
      '+y',
    ].join('\n');
    expect(parseCodexPatch(patch, '/work')).toEqual([
      '/work/a.ts',
      '/work/new.ts',
    ]);
  });

  test('ignores delete-only patches', () => {
    expect(parseCodexPatch('*** Delete File: gone.ts\n', '/work')).toEqual([]);
  });
});

function resetRuntimeEnv() {
  for (const k of [
    'SECURITY_HOOK_RUNTIME',
    'CLAUDECODE',
    'CLAUDE_PROJECT_DIR',
    'CODEX_HOME',
    'CODEX_SANDBOX_ENV_VAR',
  ]) {
    delete process.env[k];
  }
}

describe('detectRuntime', () => {
  const orig = { ...process.env };
  const reset = resetRuntimeEnv;

  test('explicit env wins', () => {
    reset();
    process.env['SECURITY_HOOK_RUNTIME'] = 'codex';
    process.env['CLAUDECODE'] = '1';
    expect(detectRuntime({})).toBe('codex');
    Object.assign(process.env, orig);
  });

  test('claude env detected', () => {
    reset();
    process.env['CLAUDE_PROJECT_DIR'] = '/x';
    expect(detectRuntime({})).toBe('claude');
    Object.assign(process.env, orig);
  });

  test('codex env detected', () => {
    reset();
    process.env['CODEX_HOME'] = '/y';
    expect(detectRuntime({})).toBe('codex');
    Object.assign(process.env, orig);
  });

  test('transcript_path heuristic', () => {
    reset();
    expect(detectRuntime({ transcript_path: '/x/.codex/sessions/y' })).toBe(
      'codex',
    );
    Object.assign(process.env, orig);
  });

  test('defaults to claude', () => {
    reset();
    expect(detectRuntime({})).toBe('claude');
    Object.assign(process.env, orig);
  });
});
