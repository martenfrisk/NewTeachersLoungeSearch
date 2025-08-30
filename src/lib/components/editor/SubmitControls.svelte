<script lang="ts">
	import { editorService } from '$lib/services/EditorService';
	import { user } from '$lib/stores/auth';
	import type { EditableTranscriptLineType } from '$lib/types/editor';
	import ContributorForm from './ContributorForm.svelte';

	interface Props {
		transcriptLines: EditableTranscriptLineType[];
		onSubmitSuccess?: (editIds: string[]) => void;
		onSubmitError?: (error: Error) => void;
	}

	let { transcriptLines, onSubmitSuccess, onSubmitError }: Props = $props();

	let isSubmitting = $state(false);
	let showContributorForm = $state(false);
	let changedLinesCount = $derived(editorService.getChangedLines(transcriptLines).length);
	let isAuthenticated = $derived($user !== null);

	async function handleSubmitChanges(contributorInfo?: {
		name?: string;
		email?: string;
		notes?: string;
	}) {
		if (isSubmitting || changedLinesCount === 0) return;

		try {
			isSubmitting = true;
			showContributorForm = false;

			const editIds = await editorService.submitAllChanges(transcriptLines, contributorInfo);

			onSubmitSuccess?.(editIds);
		} catch (error) {
			console.error('Failed to submit changes:', error);
			onSubmitError?.(error as Error);
		} finally {
			isSubmitting = false;
		}
	}

	function handleSubmitClick() {
		if (isAuthenticated) {
			// Authenticated users can submit directly
			handleSubmitChanges();
		} else {
			// Show contributor form for anonymous users
			showContributorForm = true;
		}
	}

	function handleContributorSubmit(data: { name?: string; email?: string; notes?: string }) {
		handleSubmitChanges(data);
	}

	function handleCancel() {
		showContributorForm = false;
	}
</script>

{#if changedLinesCount > 0}
	<div class="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-orange-500 rounded-full"></div>
					<span class="text-sm font-medium text-gray-900">
						{changedLinesCount} unsaved change{changedLinesCount === 1 ? '' : 's'}
					</span>
				</div>

				{#if !isAuthenticated}
					<div class="text-xs text-gray-500">• Anonymous submission</div>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<button
					onclick={handleSubmitClick}
					disabled={isSubmitting}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isSubmitting}
						<div class="flex items-center">
							<svg
								class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
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
						Submit Changes
					{/if}
				</button>
			</div>
		</div>

		<!-- Help text for anonymous users -->
		{#if !isAuthenticated}
			<div class="mt-2 text-xs text-gray-600">
				Your changes will be reviewed before going live.
				<button
					class="text-blue-600 hover:text-blue-800 underline"
					onclick={() => (window.location.href = '/auth')}
				>
					Sign in
				</button>
				for instant submissions.
			</div>
		{/if}
	</div>
{/if}

<!-- Contributor Form Modal -->
<ContributorForm
	isVisible={showContributorForm}
	onSubmit={handleContributorSubmit}
	onCancel={handleCancel}
	title="Submit Your Transcript Edits"
	description={`You're about to submit ${changedLinesCount} change${changedLinesCount === 1 ? '' : 's'} for review. All fields below are optional.`}
	transcriptData={JSON.stringify(editorService.getChangedLines(transcriptLines))}
	useFormActions={true}
/>
