import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import svelteeslint from 'eslint-plugin-svelte';
import svelteparser from 'svelte-eslint-parser';
import globals from 'globals';

export default [
	{
		ignores: [
			'.DS_Store',
			'node_modules/**',
			'build/**',
			'.svelte-kit/**',
			'package/**',
			'meilitools.js',
			'.env',
			'.env.*',
			'!.env.example',
			'pnpm-lock.yaml',
			'package-lock.json',
			'yarn.lock',
			'**/*.cjs'
		]
	},
	eslint.configs.recommended,
	{
		files: ['**/*.js', '**/*.ts'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				sourceType: 'module',
				ecmaVersion: 2020
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2017,
				$state: 'readonly',
				$derived: 'readonly'
			}
		},
		plugins: {
			'@typescript-eslint': tseslint
		},
		rules: {
			...tseslint.configs.recommended.rules,
			'@typescript-eslint/no-explicit-any': 'error'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteparser,
			parserOptions: {
				parser: tsparser,
				sourceType: 'module',
				ecmaVersion: 2020,
				extraFileExtensions: ['.svelte']
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2017,
				$state: 'readonly',
				$derived: 'readonly'
			}
		},
		plugins: {
			'@typescript-eslint': tseslint,
			svelte: svelteeslint
		},
		rules: {
			...svelteeslint.configs.recommended.rules,
			...tseslint.configs.recommended.rules,
			'@typescript-eslint/no-explicit-any': 'error',
			'svelte/no-at-html-tags': 'off'
		}
	}
];
