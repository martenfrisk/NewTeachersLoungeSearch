<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authHelpers } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	let password = $state('');
	let confirmPassword = $state('');
	let pageLoading = $state(true);
	let authenticated = $state(false);

	// Validate that user is authenticated (came from reset email)
	onMount(() => {
		let subscription: { unsubscribe: () => void } | null = null;

		// Initialize auth check
		const initAuth = async () => {
			// Check if user has a valid session (from password reset email)
			const { data: sessionData } = await supabase.auth.getSession();

			if (sessionData?.session) {
				authenticated = true;
				pageLoading = false;
			} else {
				// No valid session, redirect to reset password page
				authenticated = false;
				pageLoading = false;
				setTimeout(() => {
					goto('/auth/reset-password');
				}, 3000);
			}

			// Subscribe to auth changes
			const {
				data: { subscription: authSubscription }
			} = supabase.auth.onAuthStateChange((event, newSession) => {
				if (event === 'SIGNED_OUT' || !newSession) {
					authenticated = false;
					setTimeout(() => {
						goto('/auth/reset-password');
					}, 1000);
				}
			});

			subscription = authSubscription;
		};

		initAuth();

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	});

	function validatePasswords() {
		if (password.length < 6) {
			return 'Password must be at least 6 characters long';
		}
		if (password !== confirmPassword) {
			return 'Passwords do not match';
		}
		return null;
	}

	async function handleSubmit() {
		const validationError = validatePasswords();
		if (validationError) {
			error = validationError;
			return;
		}

		loading = true;
		error = null;

		try {
			await authHelpers.updatePassword(password);
			success = true;

			// Redirect to home page after success
			setTimeout(() => {
				goto('/');
			}, 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update password';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Update Password | Seekers' Lounge</title>
	<meta name="description" content="Set a new password for your Seekers' Lounge account." />
</svelte:head>

<div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		{#if pageLoading}
			<div class="text-center">
				<LoadingSpinner />
				<p class="mt-4 text-gray-600">Verifying access...</p>
			</div>
		{:else if !authenticated}
			<div class="text-center">
				<div class="text-red-600 mb-4">
					<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h1 class="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
				<p class="text-gray-600 mb-4">
					This page can only be accessed through a password reset email link.
				</p>
				<p class="text-sm text-gray-500">Redirecting to password reset page...</p>
			</div>
		{:else if success}
			<div class="text-center">
				<div class="text-green-600 mb-4">
					<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<h1 class="text-2xl font-bold text-gray-900 mb-2">Password Updated</h1>
				<p class="text-gray-600 mb-4">
					Your password has been successfully updated. You can now sign in with your new password.
				</p>
				<p class="text-sm text-gray-500">Redirecting to home page...</p>
			</div>
		{:else}
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
				<p class="text-gray-600">
					Enter your new password below. Make sure it's secure and memorable.
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-6"
			>
				{#if error}
					<div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
						{error}
					</div>
				{/if}

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
						New Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={password}
						disabled={loading}
						placeholder="Enter your new password"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
					<p class="mt-1 text-xs text-gray-500">Must be at least 6 characters long</p>
				</div>

				<div>
					<label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-2">
						Confirm New Password
					</label>
					<input
						id="confirm-password"
						name="confirm-password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={confirmPassword}
						disabled={loading}
						placeholder="Confirm your new password"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>

				<button
					type="submit"
					disabled={loading || !password || !confirmPassword}
					class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if loading}
						<LoadingSpinner />
						<span class="ml-2">Updating Password...</span>
					{:else}
						Update Password
					{/if}
				</button>
			</form>

			<div class="text-center">
				<p class="text-sm text-gray-600">
					<a href="/" class="font-medium text-blue-600 hover:text-blue-500"> Back to Home </a>
				</p>
			</div>
		{/if}
	</div>
</div>
