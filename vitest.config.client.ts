/// <reference types="vitest" />
/// <reference types="@vitest/browser/matchers" />
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		name: 'client',
		browser: {
			enabled: true,
			// Vitest 4 replaced `provider: 'playwright'` with a factory, and
			// `name: 'chromium'` with `instances`. The old shape threw at startup, so
			// this config had not run since the vitest 4 upgrade.
			provider: playwright(),
			instances: [{ browser: 'chromium' }],
			screenshotOnFailure: false
		},
		// Browser tests are identified by the `.svelte.test.ts` suffix, which
		// vite.config.ts (the node config) excludes. Plain `.test.ts` files run in
		// node, including logic-only tests that happen to live under components/.
		include: ['src/**/*.svelte.test.ts'],
		globals: true,
		setupFiles: ['./vitest-setup-client.ts']
	}
});
