import { base, fmt } from '@k8o/oxc-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    ...fmt,
    ignorePatterns: [
      ...(fmt.ignorePatterns ?? []),
      'dot_claude/skills/**',
      'pnpm-lock.yaml',
      // fnox が自動生成・追記するため整形対象から除外（vp と書式がブレる）
      'dot_config/fnox/config.toml',
    ],
  },
  lint: {
    extends: [base],
    ignorePatterns: ['dot_claude/skills/**'],
    options: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  staged: {
    '*.{js,ts,cjs,mjs,jsx,tsx,json,jsonc,yaml,yml,css,html,md}':
      'vp check --fix',
  },
});
