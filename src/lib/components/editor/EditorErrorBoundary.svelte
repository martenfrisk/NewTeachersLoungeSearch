<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Button from '../ui/Button.svelte';
	import Toast from '../ui/Toast.svelte';
	import type { Snippet } from 'svelte';

	interface ErrorInfoType {
		type: 'promise_rejection' | 'javascript_error';
		filename?: string;
		lineno?: number;
		colno?: number;
		componentStack?: string;
	}

	interface Props {
		children: Snippet;
		onError?: (error: Error, errorInfo: ErrorInfoType) => void;
		fallback?: Snippet;
	}

	let { children, onError, fallback }: Props = $props();

	let hasError = $state(false);
	let error = $state<Error | null>(null);
	let errorInfo = $state<ErrorInfoType | null>(null);
	let showToast = $state(false);
	let toastMessage = $state('');

	// Error recovery
	function handleRetry() {
		hasError = false;
		error = null;
		errorInfo = null;
		showToast = true;
		toastMessage = 'Attempting to recover...';
	}

	function handleReload() {
		window.location.reload();
	}

	function handleReportError() {
		// In a real app, this would send error details to a logging service
		const errorDetails = {
			message: error?.message,
			stack: error?.stack,
			componentStack: errorInfo?.componentStack,
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			url: window.location.href
		};

		console.error('Error boundary caught:', errorDetails);

		// Copy to clipboard for user to report
		navigator.clipboard
			?.writeText(JSON.stringify(errorDetails, null, 2))
			.then(() => {
				showToast = true;
				toastMessage = 'Error details copied to clipboard';
			})
			.catch(() => {
				showToast = true;
				toastMessage = 'Could not copy error details';
			});
	}

	// Handle unhandled promises
	function handleUnhandledRejection(event: PromiseRejectionEvent) {
		console.error('Unhandled promise rejection:', event.reason);

		// Only show error UI for critical errors, not network/validation errors
		if (
			event.reason instanceof Error &&
			(event.reason.message.includes('chunk') ||
				event.reason.message.includes('Loading') ||
				event.reason.message.includes('failed to fetch'))
		) {
			hasError = true;
			error = event.reason;
			errorInfo = { type: 'promise_rejection' };
			onError?.(event.reason, errorInfo);
		}
	}

	// Handle JavaScript errors
	function handleError(event: ErrorEvent) {
		console.error('JavaScript error:', event.error);

		if (event.error instanceof Error) {
			hasError = true;
			error = event.error;
			errorInfo = {
				type: 'javascript_error',
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno
			};
			onError?.(event.error, errorInfo);
		}
	}

	onMount(() => {
		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		window.addEventListener('error', handleError);
	});

	onDestroy(() => {
		window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		window.removeEventListener('error', handleError);
	});
</script>

{#if hasError}
	{#if fallback}
		{@render fallback()}
	{:else}
		<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div class="max-w-md w-full bg-white rounded-lg border border-gray-200 shadow-lg p-6">
				<div class="flex items-center mb-4">
					<svg
						class="w-6 h-6 text-red-500 mr-3"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
					<h2 class="text-lg font-semibold text-gray-900">Something went wrong</h2>
				</div>

				<p class="text-gray-600 mb-6">
					The transcript editor encountered an unexpected error. You can try to recover or reload
					the page.
				</p>

				{#if error}
					<div class="mb-6 p-3 bg-red-50 border border-red-200 rounded">
						<p class="text-sm text-red-800 font-medium mb-1">Error Details:</p>
						<p class="text-sm text-red-700 font-mono">{error.message}</p>
					</div>
				{/if}

				<div class="flex flex-col sm:flex-row gap-3">
					<Button onclick={handleRetry} class="flex-1">Try Again</Button>
					<Button variant="outline" onclick={handleReload} class="flex-1">Reload Page</Button>
					<Button variant="ghost" onclick={handleReportError} size="sm">Report Error</Button>
				</div>

				<div class="mt-4 text-xs text-gray-500">
					<p>If this problem persists, please contact support with the error details.</p>
				</div>
			</div>
		</div>
	{/if}
{:else}
	{@render children()}
{/if}

<!-- Toast notification -->
<Toast
	message={toastMessage}
	type="info"
	show={showToast}
	onClose={() => (showToast = false)}
	duration={3000}
/>
