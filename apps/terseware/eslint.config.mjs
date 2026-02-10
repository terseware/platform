// @ts-check
import eslintConfigPrettier from 'eslint-config-prettier';
import { angularConfig } from '../../eslint.angular.config.mjs';

export default [
  ...angularConfig,
  {
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'tw',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'tw',
          style: 'kebab-case',
        },
      ],
    },
  },
  eslintConfigPrettier,
];
