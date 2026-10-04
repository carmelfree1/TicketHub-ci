import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'apps/backend/src/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['warn', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    files: ['apps/backend/**/*.ts', 'packages/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    // set-state-in-effect: existing screens fetch in effects; refactor in the router migration step.
    rules: { ...reactHooks.configs.recommended.rules, 'react-hooks/set-state-in-effect': 'warn' },
  },
);
