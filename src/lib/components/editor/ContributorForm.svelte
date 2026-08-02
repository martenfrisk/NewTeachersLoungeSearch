<script lang="ts">
	interface Props {
		contributorName?: string;
		contributorEmail?: string;
		notes?: string;
		isVisible?: boolean;
		onSubmit?: (data: { name?: string; email?: string; notes?: string }) => void;
		onCancel?: () => void;
		submitLabel?: string;
		title?: string;
		description?: string;
	}

	let {
		contributorName = $bindable(''),
		contributorEmail = $bindable(''),
		notes = $bindable(''),
		isVisible = false,
		onSubmit,
		onCancel,
		submitLabel = 'Submit Changes',
		title = 'Submit Your Edits',
		description = 'Help improve the transcripts! Your edits will be reviewed before going live.'
	}: Props = $props();

	let isSubmitting = $state(false);

	// The only submission path. This form previously POSTed to a `?/submitContribution`
	// server action, which parsed the payload and returned `{ success: true }` without
	// writing anything - so anonymous contributors were told their work was saved when
	// it had been discarded. That action is gone; both anonymous and authenticated
	// submissions now run through EditorService.submitEpisodeTranscript via `onSubmit`.
	function handleSubmit(event?: Event) {
		event?.preventDefault();
		if (isSubmitting) return;

		isSubmitting = true;

		onSubmit?.({
			name: contributorName.trim() || undefined,
			email: contributorEmail.trim() || undefined,
			notes: notes.trim() || undefined
		});

		// The parent closes this modal as soon as submission starts and owns the
		// progress indicator from there, so there is no completion event to await.
		isSubmitting = false;
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
			handleSubmit();
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
							aria-hidden={true}
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

				<form onsubmit={handleSubmit} onkeydown={handleKeyDown}>
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
								This display name will be shown publicly if your edit is approved
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
								Used only for duplicate prevention - stored securely as a hash, not readable by
								moderators
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
									aria-hidden={true}
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
										<strong>Privacy-first submissions!</strong> All fields are optional. Email is hashed
										for privacy, display name is public only if you provide one. Your edits will be reviewed
										before publishing.
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
										aria-hidden={true}
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
