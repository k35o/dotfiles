import { afterAll, describe, expect, test } from 'bun:test';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { MAX_FILE_BYTES } from '../lib/common.ts';
import { capture, snapshotUntrackedFiles } from '../prompt-submit.ts';
import { cleanupTempDirs, git, makeRepo, tempDir } from './helpers.ts';

afterAll(cleanupTempDirs);

describe('capture', () => {
  test('clean worktree falls back to HEAD with no untracked files', () => {
    const repo = makeRepo();

    const baseline = capture(repo);

    expect(baseline?.sha).toBe(git(repo, 'rev-parse', 'HEAD'));
    expect(baseline?.untracked).toEqual([]);
  });

  test('dirty worktree captures the turn-start tracked content', () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'tracked.txt'), 'edited before turn\n');

    const baseline = capture(repo);

    expect(baseline?.sha).not.toBe(git(repo, 'rev-parse', 'HEAD'));
    expect(git(repo, 'show', `${baseline?.sha}:tracked.txt`)).toBe(
      'edited before turn',
    );
  });

  test('untracked files are listed in the baseline', () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'draft.txt'), 'v1\n');

    const baseline = capture(repo);

    expect(baseline?.untracked).toEqual(['draft.txt']);
  });

  test('outside a git repo returns null', () => {
    expect(capture(tempDir('not-a-repo-'))).toBeNull();
  });
});

describe('snapshotUntrackedFiles', () => {
  test('copies untracked files preserving relative paths', () => {
    const cwd = tempDir('snap-src-');
    mkdirSync(join(cwd, 'nested/deep'), { recursive: true });
    writeFileSync(join(cwd, 'nested/deep/a.txt'), 'v1\n');
    const snapRoot = join(tempDir('snap-dst-'), 'snap');

    snapshotUntrackedFiles(cwd, snapRoot, ['nested/deep/a.txt']);

    expect(readFileSync(join(snapRoot, 'nested/deep/a.txt'), 'utf8')).toBe(
      'v1\n',
    );
  });

  test('replaces a previous snapshot entirely', () => {
    const cwd = tempDir('snap-src-');
    writeFileSync(join(cwd, 'a.txt'), 'v1\n');
    const snapRoot = join(tempDir('snap-dst-'), 'snap');
    mkdirSync(snapRoot, { recursive: true });
    writeFileSync(join(snapRoot, 'stale.txt'), 'old\n');

    snapshotUntrackedFiles(cwd, snapRoot, ['a.txt']);

    expect(existsSync(join(snapRoot, 'stale.txt'))).toBe(false);
    expect(readFileSync(join(snapRoot, 'a.txt'), 'utf8')).toBe('v1\n');
  });

  test('skips oversize and missing files without throwing', () => {
    const cwd = tempDir('snap-src-');
    writeFileSync(join(cwd, 'big.bin'), Buffer.alloc(MAX_FILE_BYTES + 1));
    const snapRoot = join(tempDir('snap-dst-'), 'snap');

    snapshotUntrackedFiles(cwd, snapRoot, ['big.bin', 'ghost.txt']);

    expect(existsSync(join(snapRoot, 'big.bin'))).toBe(false);
    expect(existsSync(join(snapRoot, 'ghost.txt'))).toBe(false);
  });
});
