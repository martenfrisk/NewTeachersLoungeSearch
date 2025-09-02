<script lang="ts">
	import AuthModal from '$lib/components/auth/AuthModal.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth';

	let showModal = $state(true);

	const handleClose = () => {
		goto('/');
	};

	onMount(() => {
		// If user is already signed in, redirect to home
		if ($user) {
			goto('/');
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

		<AuthModal isOpen={showModal} onClose={handleClose} />
	</div>
</div>
