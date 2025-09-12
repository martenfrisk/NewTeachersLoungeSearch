<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { authHelpers } from '$lib/stores/auth';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			// Handle the OAuth callback
			const { data, error: authError } = await supabase.auth.getSession();
			console.log('Auth callback session:', { data, authError });

			if (authError) {
				throw authError;
			}

			if (data.session) {
				// User successfully authenticated
				// Check for pending redirect
				const pendingRedirect = authHelpers.consumePendingRedirect();
				const destination = pendingRedirect || '/';

				console.log('Redirecting to:', destination);
				await goto(destination, { replaceState: true });
			} else {
				// No session found, redirect to home
				await goto('/', { replaceState: true });
			}
		} catch (err) {
			console.error('Auth callback error:', err);
			error = err instanceof Error ? err.message : 'Authentication failed';

			// Redirect to home after a delay
			setTimeout(() => {
				goto('/', { replaceState: true });
			}, 3000);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Authenticating... | Seekers' Lounge</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center">
	<div class="text-center">
		{#if loading}
			<LoadingSpinner />
			<p class="mt-4 text-gray-600">Completing authentication...</p>
		{:else if error}
			<div class="text-red-600">
				<h2 class="text-xl font-semibold mb-2">Authentication Error</h2>
				<p class="mb-4">{error}</p>
				<p class="text-sm text-gray-500">Redirecting to home page...</p>
			</div>
		{:else}
			<div class="text-green-600">
				<h2 class="text-xl font-semibold mb-2">Authentication Successful</h2>
				<p class="text-sm text-gray-500">Redirecting...</p>
			</div>
		{/if}
	</div>
</div>
