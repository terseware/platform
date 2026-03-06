// @ts-check
import eslintConfigPrettier from 'eslint-config-prettier';
import { angularConfig } from '../../eslint.angular.config.mjs';

export default [
  ...angularConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
          ignoredDependencies: [
            '@analogjs/vite-plugin-angular',
            '@analogjs/vitest-angular',
            '@angular/compiler',
            '@nx/vite',
            '@testing-library/angular',
            '@testing-library/jest-dom',
            'vite',
            'vitest',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', '**/test-setup.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'utils',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'utils',
          style: 'kebab-case',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(?!(@angular|rxjs|ngxtension|@terseware|clsx|tailwind-merge)(/.*)?$)(?!\\.{1,2}/).*',
              message:
                'Only allowed imports: @angular|rxjs|ngxtension|@terseware|clsx|tailwind-merge',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
];
