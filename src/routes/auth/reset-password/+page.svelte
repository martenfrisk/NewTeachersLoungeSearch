<script lang="ts">
	import { authHelpers } from '$lib/stores/auth';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	let email = $state('');

	async function handleSubmit() {
		if (!email.trim()) {
			error = 'Email address is required';
			return;
		}

		loading = true;
		error = null;

		try {
			await authHelpers.resetPasswordForEmail(email.trim());
			success = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send reset email';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		email = '';
		error = null;
		success = false;
	}
</script>

<svelte:head>
	<title>Reset Password | Seekers' Lounge</title>
	<meta
		name="description"
		content="Reset your password to regain access to your Seekers' Lounge account."
	/>
</svelte:head>

<div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
			<p class="text-gray-600">
				Enter your email address and we'll send you a link to reset your password.
			</p>
		</div>

		{#if success}
			<div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
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
				<h2 class="text-lg font-semibold text-green-900 mb-2">Check Your Email</h2>
				<p class="text-green-700 mb-4">
					We've sent a password reset link to <strong>{email}</strong>
				</p>
				<p class="text-sm text-green-600 mb-4">
					If you don't see the email, check your spam folder or wait a few minutes and try again.
				</p>
				<button onclick={resetForm} class="text-sm text-green-600 hover:text-green-500 underline">
					Send to a different email
				</button>
			</div>
		{:else}
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
					<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
						Email address
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						disabled={loading}
						placeholder="Enter your email address"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>

				<button
					type="submit"
					disabled={loading || !email.trim()}
					class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if loading}
						<LoadingSpinner />
						<span class="ml-2">Sending Reset Link...</span>
					{:else}
						Send Reset Link
					{/if}
				</button>
			</form>

			<div class="text-center">
				<p class="text-sm text-gray-600">
					Remember your password?
					<a href="/" class="font-medium text-blue-600 hover:text-blue-500"> Back to Sign In </a>
				</p>
			</div>
		{/if}
	</div>
</div>
