import { writable, derived } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import { browser } from '$app/environment';

// Auth state stores
export const session = writable<Session | null>(null);
export const user = derived(session, ($session) => $session?.user ?? null);

// Auth loading state
export const authLoading = writable(true);

// Initialize auth state
if (browser) {
	// Get initial session
	supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
		session.set(initialSession);
		authLoading.set(false);
	});

	// Listen for auth changes
	const {
		data: { subscription }
	} = supabase.auth.onAuthStateChange((event, newSession) => {
		console.log('Auth state changed:', event);
		session.set(newSession);
		authLoading.set(false);
	});

	// Cleanup subscription on module reload (development)
	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			subscription.unsubscribe();
		});
	}
}

// Auth helper functions
export const authHelpers = {
	// Sign in with OAuth provider
	async signInWithProvider(provider: 'github') {
		const { error } = await supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});

		if (error) {
			console.error('Sign in error:', error.message);
			throw error;
		}
	},

	// Sign in with email
	async signInWithEmail(email: string, password: string) {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			console.error('Sign in error:', error.message);
			throw error;
		}
	},

	// Sign up with email
	async signUpWithEmail(email: string, password: string) {
		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`
			}
		});

		if (error) {
			console.error('Sign up error:', error.message);
			throw error;
		}
	},

	// Sign out
	async signOut() {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error('Sign out error:', error.message);
			throw error;
		}
	},

	// Check if user has specific role
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	hasRole(_userSession: Session | null, _role: string): boolean {
		// This would be implemented when user roles are added to the JWT
		// For now, return false as auth is feature-flagged
		return false;
	},

	// Check if user is authenticated
	isAuthenticated(userSession: Session | null): boolean {
		return userSession !== null;
	}
};
