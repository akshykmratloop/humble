import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import babelParser from '@babel/eslint-parser';
import globals from 'globals';
import { fileURLToPath } from 'node:url';

export default [
  js.configs.recommended,
  react.configs.flat.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/uploads/**',
    ],
  },
  {
    // Default: plain Node-compatible JS (packages/*, config files).
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    settings: { react: { version: 'detect' } },
  },
  {
    // apps/api uses decorator syntax (docs/11-implementation-roadmap.md "no
    // TypeScript" — Nest's plain-JS decorator pattern), which requires Babel's
    // parser; the default espree parser can't handle `@Injectable()` etc.
    files: ['apps/api/**/*.js'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: true,
        babelOptions: {
          configFile: fileURLToPath(new URL('./apps/api/.babelrc', import.meta.url)),
        },
      },
      globals: { ...globals.node },
    },
  },
  {
    files: ['apps/web/**/*.js', 'apps/web/**/*.jsx'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  prettierConfig,
];
