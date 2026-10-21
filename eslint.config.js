// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['server-dist/**', 'android/**', 'ios/**', 'dist', 'coverage', 'kit', 'data', 'public', 'android', 'ios', 'node_modules', 'playwright-report', 'test-results', 'dev-dist'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: { ...reactHooks.configs.recommended.rules, ...jsxA11y.configs.recommended.rules },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } } },
  // mock-eval scenarios read untyped tool JSON
  { files: ['scripts/eval/**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
);
