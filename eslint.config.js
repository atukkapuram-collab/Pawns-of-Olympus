import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'art-export/**', 'release/**', 'coverage/**', 'test-results/**', 'playwright-report/**', '.claude/**', '.agents/**', 'reference/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // The rules engine must stay pure: no Phaser, no DOM.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['phaser', 'phaser/*', '../scenes/*', '../view/*', '../art/*', '../audio/*'] }],
    },
  },
);
