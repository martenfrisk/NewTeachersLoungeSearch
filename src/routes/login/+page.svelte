<script lang="ts">
	import AuthModal from '$lib/components/auth/AuthModal.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth';
	import { page } from '$app/stores';

	let showModal = $state(true);
	let redirectTo = $state<string | null>(null);

	const handleClose = () => {
		goto('/');
	};

	onMount(() => {
		// Extract redirectTo parameter from URL
		redirectTo = $page.url.searchParams.get('redirectTo');

		// If user is already signed in, redirect to intended destination or home
		if ($user) {
			const destination = redirectTo || '/';
			goto(destination);
		}
	});
</script>

<svelte:head>
	<title>Sign In | Seekers' Lounge</title>
	<meta name="robots" content="noindex, nofollow" />
	<meta
		name="description"
		content="Sign in to access transcript editing and moderation features for Seekers' Lounge."
	/>

	<!-- Canonical URL -->
	<link rel="canonical" href="https://seekerslounge.pcast.site/login" />
</svelte:head>

<div
	class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4"
>
	<div class="text-center">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
		<p class="text-gray-600 mb-8">Sign in to access transcript editing features</p>

		<AuthModal isOpen={showModal} onClose={handleClose} {redirectTo} />
	</div>
</div>
