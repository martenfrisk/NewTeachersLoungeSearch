<script lang="ts">
	import { authHelpers } from '$lib/stores/auth';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let mode = $state<'signin' | 'signup'>('signin');

	// Form fields
	let email = $state('');
	let password = $state('');

	async function signInWithProvider(provider: 'github') {
		loading = true;
		error = null;
		success = null;

		try {
			await authHelpers.signInWithProvider(provider);
			// The OAuth flow will redirect to the provider, then back to /auth/callback
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign in failed';
		} finally {
			loading = false;
		}
	}

	async function signInWithEmail() {
		loading = true;
		error = null;
		success = null;

		try {
			await authHelpers.signInWithEmail(email, password);
			onClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign in failed';
		} finally {
			loading = false;
		}
	}

	async function signUpWithEmail() {
		loading = true;
		error = null;
		success = null;

		try {
			await authHelpers.signUpWithEmail(email, password);
			success = 'Check your email for a confirmation link to complete your registration.';
			// Clear form
			email = '';
			password = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign up failed';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		email = '';
		password = '';
		error = null;
		success = null;
	}

	function switchMode(newMode: 'signin' | 'signup') {
		mode = newMode;
		resetForm();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleModalClick(event: MouseEvent) {
		event.stopPropagation();
	}

	function handleModalKeydown(event: KeyboardEvent) {
		event.stopPropagation();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Modal backdrop -->
	<div
		class="fixed inset-0 bg-black/20 bg-opacity-50 z-50 flex items-center justify-center p-4"
		role="presentation"
		onclick={handleBackdropClick}
	>
		<!-- Modal content -->
		<div
			class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
			onclick={handleModalClick}
			onkeydown={handleModalKeydown}
		>
			<div class="text-center">
				<h2 id="modal-title" class="text-2xl font-bold mb-2 text-gray-900">
					{mode === 'signin' ? 'Sign In' : 'Sign Up'}
				</h2>
				<p class="text-gray-600 mb-6">
					{mode === 'signin'
						? 'Sign in to edit transcripts and contribute to the community'
						: 'Create an account to edit transcripts and contribute to the community'}
				</p>

				{#if error}
					<div class="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
						{error}
					</div>
				{/if}

				{#if success}
					<div class="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
						{success}
					</div>
				{/if}

				<!-- Email Form -->
				<form
					class="space-y-4 mb-6"
					onsubmit={(e) => {
						e.preventDefault();
						if (mode === 'signin') {
							signInWithEmail();
						} else {
							signUpWithEmail();
						}
					}}
				>
					<div>
						<label for="email" class="sr-only">Email address</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							bind:value={email}
							disabled={loading}
							placeholder="Email address"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
					<div>
						<label for="password" class="sr-only">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
							required
							bind:value={password}
							disabled={loading}
							placeholder="Password"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
					<button
						type="submit"
						disabled={loading || !email || !password}
						class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
					</button>
				</form>

				<!-- Mode Switch -->
				<div class="mb-4 text-sm text-gray-600">
					{mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
					<button
						type="button"
						onclick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
						disabled={loading}
						class="ml-1 font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{mode === 'signin' ? 'Sign up' : 'Sign in'}
					</button>
				</div>

				<!-- Divider -->
				<div class="relative mb-4">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-gray-300"></div>
					</div>
					<div class="relative flex justify-center text-sm">
						<span class="px-2 bg-white text-gray-500">Or continue with</span>
					</div>
				</div>

				<!-- GitHub OAuth -->
				<button
					onclick={() => signInWithProvider('github')}
					disabled={loading}
					class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
						/>
					</svg>
					{loading ? 'Signing in...' : 'Continue with GitHub'}
				</button>

				<div class="mt-6 text-xs text-gray-500">
					By signing {mode === 'signin' ? 'in' : 'up'}, you agree to help improve the transcript
					quality while respecting the community guidelines.
				</div>
			</div>

			<button
				onclick={onClose}
				class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
				aria-label="Close modal"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	</div>
{/if}
