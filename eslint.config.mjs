// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettier,
	{
		files: ['**/*.ts'],
		rules: {
			// Configuration values are arbitrary user data.
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			'no-console': 'error',
		},
	},
	{
		files: ['tests/compat/**/*.{cjs,mjs}'],
		languageOptions: {
			globals: {
				console: 'readonly',
				process: 'readonly',
				require: 'readonly',
			},
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
	{
		files: ['tests/compat/**/*.cjs'],
		languageOptions: { sourceType: 'commonjs' },
	},
	{
		files: ['tests/**/*.ts'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
);
