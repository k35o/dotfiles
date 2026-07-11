import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { matchesAnyGlob, type PatternRule } from '../lib/common.ts';
import { matchRule } from '../pattern-check.ts';

const HERE = import.meta.dirname;
const PATTERNS: PatternRule[] = JSON.parse(
  readFileSync(
    join(HERE, '../../../dot_claude/security-patterns.json'),
    'utf8',
  ),
).patterns;

function ruleByName(name: string): PatternRule {
  const r = PATTERNS.find((p) => p.rule_name === name);
  if (!r) throw new Error(`rule not found: ${name}`);
  return r;
}

type Fixture = { rule: string; path: string; fire: string[]; skip: string[] };

const FIXTURES: Fixture[] = [
  {
    rule: 'dangerously_set_inner_html',
    path: 'src/a.tsx',
    fire: ['<div dangerouslySetInnerHTML={{ __html: html }} />'],
    skip: ['<div>{content}</div>'],
  },
  {
    rule: 'inner_html_assign',
    path: 'src/a.ts',
    fire: ['el.innerHTML = userInput;'],
    skip: ['const cur = el.innerHTML;'],
  },
  {
    rule: 'document_write',
    path: 'src/a.js',
    fire: ['document.write("<p>hi</p>");'],
    skip: ['const w = new DocumentWriter();'],
  },
  {
    rule: 'eval_call',
    path: 'src/a.js',
    fire: ['eval("1 + 1");', 'eval ("x");'],
    skip: ['const evaluation = medieval("x");'],
  },
  {
    rule: 'new_function',
    path: 'src/a.js',
    fire: ['const f = new Function("return 1");'],
    skip: ['const t = new FunctionalThing();'],
  },
  {
    rule: 'child_process_exec',
    path: 'src/run.ts',
    fire: ['child_process.exec("ls");', 'child_process.execSync("ls");'],
    skip: ['child_process.spawn("ls", []);'],
  },
  {
    rule: 'child_process_unsafe_import',
    path: 'src/run.ts',
    fire: ["import { exec } from 'child_process';"],
    skip: ["import { spawn } from 'child_process';"],
  },
  {
    rule: 'math_random_security_path',
    path: 'src/auth/token.ts',
    fire: ['const t = Math.random();'],
    skip: ['const id = crypto.randomUUID();'],
  },
  {
    rule: 'loose_token_compare',
    path: 'src/a.ts',
    fire: ['if (token === input) return true;'],
    skip: ['if (name === input) return true;'],
  },
  {
    rule: 'next_public_secret_smell',
    path: 'src/a.ts',
    fire: ['const k = process.env.NEXT_PUBLIC_API_SECRET;'],
    skip: ['const u = process.env.NEXT_PUBLIC_API_URL;'],
  },
  {
    rule: 'localstorage_auth_token',
    path: 'src/a.ts',
    fire: ['localStorage.setItem("auth_token", value);'],
    skip: ['localStorage.setItem("theme", "dark");'],
  },
  {
    rule: 'javascript_url_scheme',
    path: 'src/a.tsx',
    fire: ['<a href="javascript:void(0)">x</a>'],
    skip: ['<a href="https://example.com">x</a>'],
  },
  {
    rule: 'hardcoded_api_key_prefix',
    path: 'src/config.ts',
    fire: [`const k = "${'AKIA'}IOSFODNN7EXAMPLE";`],
    skip: ['const k = process.env.AWS_KEY;'],
  },
  {
    rule: 'github_workflow_edit',
    path: 'proj/.github/workflows/x.yml',
    fire: ['permissions:\n  contents: read'],
    skip: ['name: CI'],
  },
  {
    rule: 'github_pull_request_target',
    path: 'proj/.github/workflows/x.yml',
    fire: ['on:\n  pull_request_target:'],
    skip: ['on:\n  pull_request:'],
  },
  {
    rule: 'ts_expect_error_on_security_path',
    path: 'src/api/route.ts',
    fire: ['// @ts-expect-error legacy', '// @ts-ignore'],
    skip: ['// normal comment'],
  },
  {
    rule: 'raw_sql_concat',
    path: 'src/db.ts',
    // raw_sql_concat の検出対象を再現するため、通常文字列内の ${} を意図的に使う
    // eslint-disable-next-line no-template-curly-in-string
    fire: ['const q = "SELECT * FROM users WHERE id = ${id}";'],
    skip: ['const q = "SELECT * FROM users WHERE id = ?";'],
  },
  {
    rule: 'env_file_write',
    path: 'src/x.ts',
    fire: ['writeFileSync(".env", data);'],
    skip: ['writeFileSync("out.txt", data);'],
  },
  {
    rule: 'redirect_user_input',
    path: 'src/action.ts',
    fire: ['redirect(request.url);'],
    skip: ['redirect("/home");'],
  },
  {
    rule: 'server_env_in_client_component',
    path: 'src/comp.tsx',
    fire: ["'use client';\nconst s = process.env.SECRET_KEY;"],
    skip: ["'use client';\nconst u = process.env.NEXT_PUBLIC_URL;"],
  },
  {
    rule: 'cookies_set_without_httponly',
    path: 'src/action.ts',
    fire: ['cookies().set("session", token);'],
    skip: ['cookies().set("session", token, { httpOnly: true });'],
  },
];

describe('security-patterns fixtures', () => {
  for (const fx of FIXTURES) {
    const rule = ruleByName(fx.rule);
    test(`${fx.rule}: fires on bad input`, () => {
      for (const s of fx.fire) {
        expect(matchRule(s, fx.path, rule)).toBe(true);
      }
    });
    test(`${fx.rule}: does not over-fire`, () => {
      for (const s of fx.skip) {
        expect(matchRule(s, fx.path, rule)).toBe(false);
      }
    });
  }

  test('every rule in security-patterns.json has a fixture', () => {
    const covered = new Set(FIXTURES.map((f) => f.rule));
    const missing = PATTERNS.map((p) => String(p.rule_name)).filter(
      (n) => !covered.has(n),
    );
    expect(missing).toEqual([]);
  });

  test('fixture files are globally excluded from pattern-check', () => {
    const raw = JSON.parse(
      readFileSync(
        join(HERE, '../../../dot_claude/security-patterns.json'),
        'utf8',
      ),
    ) as { global_exclude_paths?: string[] };
    const globalExclude = raw.global_exclude_paths ?? [];
    expect(
      matchesAnyGlob(globalExclude, '/x/y/patterns.fixtures.test.ts'),
    ).toBe(true);
  });
});
