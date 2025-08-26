/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	test: {
		globals: true,
		environment: 'node',
		include: ['src/lib/**/*.test.ts', 'src/routes/**/*.test.ts'],
		exclude: ['src/**/*.svelte.test.ts', 'src/**/*.spec.ts'],
		pool: 'forks',
		coverage: {
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', '**/*.d.ts', '**/*.config.*', '**/coverage/**'],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80
				}
			}
		}
	}
});
