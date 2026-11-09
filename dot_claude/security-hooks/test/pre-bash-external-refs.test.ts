import { describe, expect, test } from 'bun:test';

import { findExternalRefs, parseRepo } from '../pre-bash-external-refs.ts';

const HERE = 'k35o/dotfiles';

describe('findExternalRefs - deny', () => {
  test('short reference to another repository in a commit message', () => {
    expect(
      findExternalRefs(
        'git commit -m "fix: 対応 (see vercel/next.js#123)"',
        HERE,
      ),
    ).toEqual(['vercel/next.js#123']);
  });

  test('URL to another repository in a PR body', () => {
    expect(
      findExternalRefs(
        'gh pr create --title t --body "https://github.com/facebook/react/issues/42 を参考にした"',
        HERE,
      ),
    ).toEqual(['https://github.com/facebook/react/issues/42']);
  });

  test('heredoc commit message and git -C', () => {
    const cmd = `git -C /work commit -F - <<'EOF'
fix: 修正

oven-sh/bun#99 と同じ問題
EOF`;
    expect(findExternalRefs(cmd, HERE)).toEqual(['oven-sh/bun#99']);
  });

  test('issue and PR comments', () => {
    expect(findExternalRefs('gh pr comment 3 --body "a/b#1"', HERE)).toEqual([
      'a/b#1',
    ]);
    expect(
      findExternalRefs(
        'gh issue create --body "https://github.com/a/b/pull/2"',
        HERE,
      ),
    ).toEqual(['https://github.com/a/b/pull/2']);
  });
});

describe('findExternalRefs - allow', () => {
  test('references to the current repository', () => {
    expect(
      findExternalRefs('git commit -m "fix: k35o/dotfiles#12"', HERE),
    ).toEqual([]);
    expect(
      findExternalRefs(
        'gh pr create --body "https://github.com/K35O/dotfiles/pull/3"',
        HERE,
      ),
    ).toEqual([]);
    expect(findExternalRefs('git commit -m "fix: #12"', HERE)).toEqual([]);
  });

  test('references wrapped in backticks', () => {
    const cmd = `gh pr create --body-file - <<'EOF'
\`vercel/next.js#123\` と \`https://github.com/a/b/issues/1\`
EOF`;
    expect(findExternalRefs(cmd, HERE)).toEqual([]);
  });

  test('commands other than commit and PR or issue writes', () => {
    expect(findExternalRefs('gh pr view vercel/next.js#123', HERE)).toEqual([]);
    expect(findExternalRefs('echo a/b#1', HERE)).toEqual([]);
    expect(findExternalRefs('git log --grep a/b#1', HERE)).toEqual([]);
  });
});

describe('parseRepo', () => {
  test('https and ssh remotes', () => {
    expect(parseRepo('https://github.com/k35o/dotfiles.git\n')).toBe(HERE);
    expect(parseRepo('git@github.com:k35o/dotfiles.git')).toBe(HERE);
    expect(parseRepo('https://github.com/k35o/dotfiles')).toBe(HERE);
    expect(parseRepo('https://gitlab.com/x/y.git')).toBeNull();
  });
});
