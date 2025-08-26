/// <reference types="vitest" />
/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		name: 'client',
		browser: {
			enabled: true,
			name: 'chromium',
			provider: 'playwright',
			// Run component tests in browser environment
			screenshotOnFailure: false
		},
		include: ['src/**/*.svelte.test.ts', 'src/lib/components/**/*.test.ts'],
		exclude: ['src/lib/**/*.test.ts', 'src/routes/**/*.test.ts'],
		globals: true,
		setupFiles: ['./vitest-setup-client.ts']
	}
});
