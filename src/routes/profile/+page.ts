import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { session, authLoading, authHelpers } from '$lib/stores/auth';

export const load: PageLoad = async ({ url }) => {
	// Only run auth check in browser
	if (!browser) {
		return { user: null };
	}

	// Wait for auth state to initialize
	let attempts = 0;
	const maxAttempts = 50; // 5 second timeout

	while (get(authLoading) && attempts < maxAttempts) {
		await new Promise((resolve) => setTimeout(resolve, 100));
		attempts++;
	}

	const currentSession = get(session);

	if (!currentSession) {
		// Set redirect path for after login
		authHelpers.setPendingRedirect(url.pathname);
		throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	return {
		user: currentSession.user
	};
};
