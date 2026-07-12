import { afterAll, describe, expect, test } from 'bun:test';
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { capture, snapshotUntrackedFiles } from '../prompt-submit.ts';
import {
  computeTurnDiff,
  isCleanReview,
  synthesizeNewFileDiff,
  synthesizeUntrackedModifiedDiff,
} from '../stop-review.ts';
import { cleanupTempDirs, makeRepo, tempDir } from './helpers.ts';

afterAll(cleanupTempDirs);

describe('isCleanReview', () => {
  test('accepts the canonical clean phrase', () => {
    expect(isCleanReview('No issues found.')).toBe(true);
  });

  test('tolerates case, whitespace and trailing punctuation', () => {
    expect(isCleanReview('no issues found')).toBe(true);
    expect(isCleanReview('No issues found!!')).toBe(true);
    expect(isCleanReview('  No issues found.\n')).toBe(true);
  });

  test('treats findings as not clean', () => {
    expect(isCleanReview('- [HIGH] hardcoded credential in config.ts')).toBe(
      false,
    );
  });

  test('treats the phrase inside a longer report as not clean', () => {
    expect(isCleanReview('No issues found in A, but B leaks a token.')).toBe(
      false,
    );
  });
});

describe('synthesizeNewFileDiff', () => {
  test('renders the whole file as an addition hunk', () => {
    const cwd = tempDir('newfile-');
    writeFileSync(join(cwd, 'f.txt'), 'a\nb\n');

    expect(synthesizeNewFileDiff(cwd, 'f.txt')).toBe(
      '\ndiff --git a/f.txt b/f.txt\n' +
        'new file mode 100644\n--- /dev/null\n+++ b/f.txt\n' +
        '@@ -0,0 +1,2 @@\n' +
        '+a\n+b\n',
    );
  });

  test('counts a final line without trailing newline', () => {
    const cwd = tempDir('newfile-');
    writeFileSync(join(cwd, 'f.txt'), 'a\nb');

    expect(synthesizeNewFileDiff(cwd, 'f.txt')).toContain('@@ -0,0 +1,2 @@');
  });

  test('replaces oversize content with a placeholder hunk', () => {
    const cwd = tempDir('newfile-');
    writeFileSync(join(cwd, 'big.bin'), Buffer.alloc(64 * 1024 + 1));

    expect(synthesizeNewFileDiff(cwd, 'big.bin')).toContain(
      'NEW FILE TOO LARGE TO INCLUDE (65537 bytes)',
    );
  });

  test('missing file yields an empty string', () => {
    expect(synthesizeNewFileDiff(tempDir('newfile-'), 'ghost.txt')).toBe('');
  });
});

describe('synthesizeUntrackedModifiedDiff', () => {
  test('diffs current content against the snapshot', () => {
    const cwd = tempDir('untracked-');
    const snap = tempDir('untracked-snap-');
    writeFileSync(join(snap, 'f.txt'), 'old\n');
    writeFileSync(join(cwd, 'f.txt'), 'new\n');

    const diff = synthesizeUntrackedModifiedDiff(cwd, snap, 'f.txt');

    expect(diff).toContain('diff --git a/f.txt b/f.txt');
    expect(diff).toContain('-old');
    expect(diff).toContain('+new');
  });

  test('identical content yields an empty string', () => {
    const cwd = tempDir('untracked-');
    const snap = tempDir('untracked-snap-');
    writeFileSync(join(snap, 'f.txt'), 'same\n');
    writeFileSync(join(cwd, 'f.txt'), 'same\n');

    expect(synthesizeUntrackedModifiedDiff(cwd, snap, 'f.txt')).toBe('');
  });

  test('missing snapshot yields an empty string', () => {
    const cwd = tempDir('untracked-');
    writeFileSync(join(cwd, 'f.txt'), 'new\n');

    expect(
      synthesizeUntrackedModifiedDiff(cwd, tempDir('untracked-snap-'), 'f.txt'),
    ).toBe('');
  });

  test('oversize current file becomes a placeholder hunk', () => {
    const cwd = tempDir('untracked-');
    const snap = tempDir('untracked-snap-');
    writeFileSync(join(snap, 'big.bin'), 'small\n');
    writeFileSync(join(cwd, 'big.bin'), Buffer.alloc(64 * 1024 + 1));

    expect(synthesizeUntrackedModifiedDiff(cwd, snap, 'big.bin')).toContain(
      'UNTRACKED FILE TOO LARGE TO INCLUDE (65537 bytes)',
    );
  });
});

describe('computeTurnDiff', () => {
  test('no changes yields an empty diff', () => {
    const repo = makeRepo();

    expect(computeTurnDiff(repo, null, join(repo, 'no-snap'))).toBe('');
  });

  test('without a baseline, tracked edits diff against HEAD', () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'tracked.txt'), 'modified\n');

    const diff = computeTurnDiff(repo, null, join(repo, 'no-snap'));

    expect(diff).toContain('-original');
    expect(diff).toContain('+modified');
  });

  test('files created during the turn are synthesized as new-file diffs', () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'new.txt'), 'hello\n');

    const diff = computeTurnDiff(repo, null, join(repo, 'no-snap'));

    expect(diff).toContain('diff --git a/new.txt b/new.txt');
    expect(diff).toContain('+hello');
  });

  test("captures only this turn's changes against a prompt-submit baseline", () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'tracked.txt'), 'pre-turn\n');
    writeFileSync(join(repo, 'draft.txt'), 'v1\n');
    const baseline = capture(repo);
    if (!baseline) throw new Error('capture failed');
    const snap = tempDir('turn-snap-');
    snapshotUntrackedFiles(repo, snap, baseline.untracked);

    writeFileSync(join(repo, 'tracked.txt'), 'in-turn\n');
    writeFileSync(join(repo, 'draft.txt'), 'v2\n');
    writeFileSync(join(repo, 'added.txt'), 'brand new\n');
    const diff = computeTurnDiff(repo, baseline, snap);

    expect(diff).toContain('-pre-turn');
    expect(diff).toContain('+in-turn');
    expect(diff).not.toContain('original');
    expect(diff).toContain('-v1');
    expect(diff).toContain('+v2');
    expect(diff).toContain('diff --git a/added.txt b/added.txt');
    expect(diff).toContain('+brand new');
  });

  test('an untracked file unchanged since the baseline is not reported', () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'draft.txt'), 'v1\n');
    const baseline = capture(repo);
    if (!baseline) throw new Error('capture failed');
    const snap = tempDir('turn-snap-');
    snapshotUntrackedFiles(repo, snap, baseline.untracked);

    expect(computeTurnDiff(repo, baseline, snap)).toBe('');
  });
});
