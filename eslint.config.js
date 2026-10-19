// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', '.angular/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'im', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'im', style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/app/core/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@angular/*', 'rxjs', 'rxjs/*'], message: 'core/domain must stay framework-free.' }] },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
);
