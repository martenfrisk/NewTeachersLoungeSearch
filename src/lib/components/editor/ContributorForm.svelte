<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import type { SubmitFunction } from '@sveltejs/kit';

	interface Props {
		contributorName?: string;
		contributorEmail?: string;
		notes?: string;
		transcriptData?: string;
		isVisible?: boolean;
		onSubmit?: (data: { name?: string; email?: string; notes?: string }) => void;
		onCancel?: () => void;
		submitLabel?: string;
		title?: string;
		description?: string;
		useFormActions?: boolean;
	}

	let {
		contributorName = $bindable(''),
		contributorEmail = $bindable(''),
		notes = $bindable(''),
		transcriptData = '',
		isVisible = false,
		onSubmit,
		onCancel,
		submitLabel = 'Submit Changes',
		title = 'Submit Your Edits',
		description = 'Help improve the transcripts! Your edits will be reviewed before going live.',
		useFormActions = true
	}: Props = $props();

	let isSubmitting = $state(false);
	let formElement = $state<HTMLFormElement>();

	// Progressive enhancement: handle form submission client-side if JS is available
	const handleFormSubmit: SubmitFunction = ({ formData, cancel }) => {
		// If we have a client-side handler, use it instead
		if (!useFormActions && onSubmit) {
			cancel();
			handleClientSideSubmit();
			return;
		}

		// Add transcript data to form if provided
		if (transcriptData) {
			formData.set('transcript_data', transcriptData);
		}

		isSubmitting = true;

		return async ({ result }) => {
			isSubmitting = false;
			if (result.type === 'success') {
				// Clear form and close modal on success
				contributorName = '';
				contributorEmail = '';
				notes = '';
				onCancel?.();
			} else if (result.type === 'failure') {
				// Keep form values on failure
				if (result.data) {
					contributorName = result.data.name || contributorName;
					contributorEmail = result.data.email || contributorEmail;
					notes = result.data.notes || notes;
				}
			}
		};
	};

	// Legacy client-side handler for non-form-action usage
	function handleClientSideSubmit() {
		if (isSubmitting) return;

		isSubmitting = true;

		const data = {
			name: contributorName.trim() || undefined,
			email: contributorEmail.trim() || undefined,
			notes: notes.trim() || undefined
		};

		onSubmit?.(data);

		setTimeout(() => {
			isSubmitting = false;
		}, 1000);
	}

	function handleCancel() {
		contributorName = '';
		contributorEmail = '';
		notes = '';
		onCancel?.();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		} else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			if (useFormActions && browser && formElement) {
				formElement.requestSubmit();
			} else {
				handleClientSideSubmit();
			}
		}
	}
</script>

{#if isVisible}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-labelledby="contributor-form-title"
		aria-modal="true"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<div class="p-6">
				<div class="flex justify-between items-start mb-4">
					<div>
						<h2 id="contributor-form-title" class="text-lg font-semibold text-gray-900">{title}</h2>
						{#if description}
							<p class="text-sm text-gray-600 mt-1">{description}</p>
						{/if}
					</div>
					<button
						onclick={handleCancel}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Close form"
					>
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<form
					bind:this={formElement}
					method="POST"
					action={useFormActions ? '?/submitContribution' : undefined}
					use:enhance={handleFormSubmit}
					{...useFormActions ? {} : { onsubmit: handleClientSideSubmit }}
					onkeydown={handleKeyDown}
				>
					<div class="space-y-4">
						<!-- Contributor Name (Optional) -->
						<div>
							<label for="contributor-name" class="block text-sm font-medium text-gray-700 mb-1">
								Name (optional)
							</label>
							<input
								id="contributor-name"
								name="name"
								type="text"
								bind:value={contributorName}
								placeholder="Your name for attribution"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							/>
							<p class="text-xs text-gray-500 mt-1">
								This will be shown publicly if your edit is approved
							</p>
						</div>

						<!-- Contributor Email (Optional) -->
						<div>
							<label for="contributor-email" class="block text-sm font-medium text-gray-700 mb-1">
								Email (optional)
							</label>
							<input
								id="contributor-email"
								name="email"
								type="email"
								bind:value={contributorEmail}
								placeholder="your.email@example.com"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							/>
							<p class="text-xs text-gray-500 mt-1">
								Private - only visible to moderators for follow-up if needed
							</p>
						</div>

						<!-- Notes -->
						<div>
							<label for="contributor-notes" class="block text-sm font-medium text-gray-700 mb-1">
								Notes (optional)
							</label>
							<textarea
								id="contributor-notes"
								name="notes"
								bind:value={notes}
								placeholder="Any additional context about your changes..."
								rows="3"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
							></textarea>
							<p class="text-xs text-gray-500 mt-1">Help moderators understand your changes</p>
						</div>

						<!-- Privacy Notice -->
						<div class="bg-blue-50 border border-blue-200 rounded-md p-3">
							<div class="flex">
								<svg
									class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<div class="ml-2">
									<p class="text-xs text-blue-800">
										<strong>Anonymous submissions welcome!</strong> All fields are optional. Your edits
										will be reviewed by our team before being published.
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="flex justify-end gap-3 mt-6">
						<button
							type="button"
							onclick={handleCancel}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
							disabled={isSubmitting}
						>
							Cancel
						</button>
						<button
							type="submit"
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={isSubmitting}
						>
							{#if isSubmitting}
								<div class="flex items-center">
									<svg
										class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Submitting...
								</div>
							{:else}
								{submitLabel}
							{/if}
						</button>
					</div>

					<!-- Keyboard Shortcuts -->
					<div class="mt-4 text-xs text-gray-500">
						<p>
							<kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Esc</kbd>
							to cancel •
							<kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs"
								>Ctrl+Enter</kbd
							> to submit
						</p>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
