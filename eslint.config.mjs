// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default defineConfig([
  {
    // The spartan helm components come from the CLI with their own selector prefixes and
    // style, so the app's rules do not apply to them. `shared/ui/copy-button` sits beside
    // them but is ours, and is linted.
    ignores: ['dist/**', '.angular/**', 'coverage/**', 'out-tsc/**', 'src/app/shared/ui/*/src/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommended, angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
  {
    // The app has to pass axe and WCAG AA, so the accessibility rules run on every template.
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // `hlmField` ties each label to its control by filling in `for`, so a field's label
      // carries none of its own. This rule reads the markup and cannot see that. axe
      // checks the finished page for an unlabelled control.
      '@angular-eslint/template/label-has-associated-control': 'off',
    },
  },
]);
