import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  addedComments,
  bounce,
  extractComments,
  proposedContent,
  syntaxOf,
} from '../pre-edit-comments.ts';

const SLASH = { line: '//', block: true };
const HASH = { line: '#', block: false };

describe('syntaxOf', () => {
  test('TypeScript uses slash comments', () => {
    expect(syntaxOf('/repo/src/a.tsx', '')).toEqual(SLASH);
  });

  test('CSS has block comments only', () => {
    expect(syntaxOf('/repo/a.css', '')).toEqual({ line: null, block: true });
  });

  test('chezmoi template is judged by the inner extension', () => {
    expect(syntaxOf('/repo/run_after.sh.tmpl', '')).toEqual(HASH);
  });

  test('extensionless script is judged by its shebang', () => {
    expect(syntaxOf('/repo/bin/tool', '#!/bin/bash\necho hi\n')).toEqual(HASH);
  });

  test('shell rc file managed by chezmoi', () => {
    expect(syntaxOf('/repo/dot_zshrc', 'export A=1\n')).toEqual(HASH);
  });

  test('Markdown is not inspected', () => {
    expect(syntaxOf('/repo/README.md', '# Title\n')).toBeNull();
  });
});

describe('extractComments - detected', () => {
  test('whole-line comment', () => {
    expect(extractComments('// 合計を計算する\nconst a = 1;', SLASH)).toEqual([
      '合計を計算する',
    ]);
  });

  test('trailing comment after code', () => {
    expect(extractComments('const a = 1; // 初期値', SLASH)).toEqual([
      '初期値',
    ]);
  });

  test('each line of a JSDoc block', () => {
    const text = `/**
 * ユーザーを返す
 * @param id ユーザーID
 */
function f() {}`;
    expect(extractComments(text, SLASH)).toEqual([
      'ユーザーを返す',
      '@param id ユーザーID',
    ]);
  });

  test('JSX comment', () => {
    expect(extractComments('  {/* ヘッダー */}', SLASH)).toEqual(['ヘッダー']);
  });

  test('hash comment in YAML, whole-line and trailing', () => {
    expect(
      extractComments('# 依存を入れる\nrun: pnpm i # 高速化', HASH),
    ).toEqual(['依存を入れる', '高速化']);
  });
});

describe('extractComments - ignored', () => {
  test('comment marker inside a string', () => {
    expect(
      extractComments('const a = "x // y"; const b = \'# z\';', SLASH),
    ).toEqual([]);
  });

  test('URL in code', () => {
    expect(extractComments('url: https://example.com/a', HASH)).toEqual([]);
    expect(extractComments('fetch(`https://example.com`);', SLASH)).toEqual([]);
  });

  test('shell parameter expansion', () => {
    expect(extractComments(`echo "\${#arr[@]}" $# \${v#prefix}`, HASH)).toEqual(
      [],
    );
  });

  test('shebang', () => {
    expect(extractComments('#!/usr/bin/env bash\nset -u', HASH)).toEqual([]);
  });

  test('lint and type-check directives', () => {
    const text = `// @ts-expect-error 型定義が古い
// oxlint-disable-next-line no-console
/// <reference types="node" />
const a = /* @__PURE__ */ f();`;
    expect(extractComments(text, SLASH)).toEqual([]);
    expect(extractComments('# shellcheck disable=SC2086', HASH)).toEqual([]);
  });

  test('comment with no text', () => {
    expect(extractComments('//\n/**\n *\n */', SLASH)).toEqual([]);
  });
});

describe('addedComments', () => {
  test('comment already in the file is not reported', () => {
    const before = '// 既存の理由\nconst a = 1;';
    const after = '// 既存の理由\nconst a = 2;';
    expect(addedComments(before, after, SLASH)).toEqual([]);
  });

  test('only the new comment is reported', () => {
    const before = '// 既存の理由\nconst a = 1;';
    const after = '// 既存の理由\n// 値を2にする\nconst a = 2;';
    expect(addedComments(before, after, SLASH)).toEqual(['値を2にする']);
  });

  test('moved or re-indented comment is not reported', () => {
    const before = 'const a = 1;\n// 理由\nconst b = 2;';
    const after = '    // 理由\nconst a = 1;\nconst b = 2;';
    expect(addedComments(before, after, SLASH)).toEqual([]);
  });

  test('second copy of an existing comment is reported', () => {
    const before = '// 理由\nconst a = 1;';
    const after = '// 理由\nconst a = 1;\n// 理由\nconst b = 2;';
    expect(addedComments(before, after, SLASH)).toEqual(['理由']);
  });

  test('line added inside an existing block comment is reported', () => {
    const before = '/**\n * 説明\n */\nfunction f() {}';
    const after = '/**\n * 説明\n * 追記\n */\nfunction f() {}';
    expect(addedComments(before, after, SLASH)).toEqual(['追記']);
  });
});

describe('proposedContent', () => {
  test('Write replaces the whole file', () => {
    expect(proposedContent('Write', { content: 'new' }, 'old')).toBe('new');
  });

  test('Edit replaces the first occurrence', () => {
    expect(
      proposedContent('Edit', { old_string: 'a', new_string: 'b' }, 'a a'),
    ).toBe('b a');
  });

  test('Edit with replace_all replaces every occurrence', () => {
    expect(
      proposedContent(
        'Edit',
        { old_string: 'a', new_string: 'b', replace_all: true },
        'a a',
      ),
    ).toBe('b b');
  });

  test('replacement patterns in new_string are inserted literally', () => {
    expect(
      proposedContent('Edit', { old_string: 'a', new_string: '$&$&' }, 'a'),
    ).toBe('$&$&');
  });

  test('Edit whose old_string is not in the file is left to the tool', () => {
    expect(
      proposedContent('Edit', { old_string: 'x', new_string: 'y' }, 'a'),
    ).toBeNull();
  });

  test('other tools are not inspected', () => {
    expect(proposedContent('Bash', { command: 'ls' }, '')).toBeNull();
  });
});

describe('bounce', () => {
  const FILE = '/repo/a.ts';
  const NOW = 1_700_000_000_000;
  const MINUTE = 60 * 1000;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pre-edit-comments-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('edit without added comments passes', () => {
    expect(bounce(dir, FILE, [], NOW)).toEqual([]);
  });

  test('first attempt is bounced', () => {
    expect(bounce(dir, FILE, ['理由'], NOW)).toEqual(['理由']);
  });

  test('resending the same comment passes', () => {
    bounce(dir, FILE, ['理由'], NOW);
    expect(bounce(dir, FILE, ['理由'], NOW + MINUTE)).toEqual([]);
  });

  test('keeping a subset of the bounced comments passes', () => {
    bounce(dir, FILE, ['理由', '合計を計算する'], NOW);
    expect(bounce(dir, FILE, ['理由'], NOW + MINUTE)).toEqual([]);
  });

  test('only the comment added after the bounce is bounced', () => {
    bounce(dir, FILE, ['理由'], NOW);
    expect(bounce(dir, FILE, ['理由', '新しい説明'], NOW + MINUTE)).toEqual([
      '新しい説明',
    ]);
  });

  test('same comment in another file is bounced', () => {
    bounce(dir, FILE, ['理由'], NOW);
    expect(bounce(dir, '/repo/b.ts', ['理由'], NOW + MINUTE)).toEqual(['理由']);
  });

  test('bounce is forgotten after the retry window', () => {
    bounce(dir, FILE, ['理由'], NOW);
    expect(bounce(dir, FILE, ['理由'], NOW + 11 * MINUTE)).toEqual(['理由']);
  });
});
