<script lang="ts">
	import { editorStore } from '../../stores/editor.svelte';
	import Button from '../ui/Button.svelte';

	interface Props {
		transcriptLinesLength: number;
		isLoading: boolean;
	}

	let { transcriptLinesLength, isLoading }: Props = $props();

	// Get various line counts from the store
	let editedLinesCount = $derived(editorStore.getEditedLines().length);
	let unsavedLinesCount = $derived(editorStore.getUnsavedLines().length);
	let savedLinesCount = $derived(editorStore.getSavedLines().length);
	let selectedLineIndices = $derived(editorStore.selectedLineIndices);

	// Get counts of selected lines by state
	let selectedEditedCount = $derived(
		selectedLineIndices.filter((i) => {
			const line = editorStore.transcriptLines[i];
			return line?.editState === 'edited';
		}).length
	);

	let selectedUnsavedCount = $derived(
		selectedLineIndices.filter((i) => {
			const line = editorStore.transcriptLines[i];
			return line?.editState === 'unsaved';
		}).length
	);

	let selectedSavedCount = $derived(
		selectedLineIndices.filter((i) => {
			const line = editorStore.transcriptLines[i];
			return line?.editState === 'saved';
		}).length
	);

	// Mass action handlers
	function handleMassAction(
		action:
			| 'save'
			| 'commit'
			| 'reset-edited'
			| 'delete'
			| 'set-unedited'
			| 'set-unsaved'
			| 'set-saved'
			| 'set-edited'
			| 'revert-to-original',
		targetGroup: string
	) {
		let lineIndices: number[] = [];

		switch (targetGroup) {
			case 'selected':
				lineIndices = selectedLineIndices;
				break;
			case 'all-unsaved':
				lineIndices = editorStore.getUnsavedLines();
				break;
			case 'all-saved':
				lineIndices = editorStore.getSavedLines();
				break;
			case 'all-edited':
				lineIndices = editorStore.getEditedLines();
				break;
			case 'all-changed':
				lineIndices = [
					...editorStore.getUnsavedLines(),
					...editorStore.getSavedLines(),
					...editorStore.getEditedLines()
				];
				break;
		}

		if (lineIndices.length === 0) {
			return;
		}

		// Special handling for delete and revert actions
		if (action === 'delete') {
			const confirmMessage = `Are you sure you want to delete ${lineIndices.length} line(s)? This cannot be undone.`;
			if (!confirm(confirmMessage)) {
				return;
			}
			editorStore.performMassAction(lineIndices, action, { confirmDelete: true });
		} else if (action === 'revert-to-original') {
			const confirmMessage = `Are you sure you want to revert ${lineIndices.length} line(s) to their original state? All changes will be lost.`;
			if (!confirm(confirmMessage)) {
				return;
			}
			editorStore.performMassAction(lineIndices, action);
		} else {
			editorStore.performMassAction(lineIndices, action);
		}
	}
</script>

<div class="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
	<div class="px-4 py-3 border-b border-gray-200">
		<h3 class="text-sm font-medium text-gray-900">Mass Actions</h3>
		<p class="text-xs text-gray-500 mt-1">Perform actions on multiple lines at once</p>
	</div>

	<div class="p-4 space-y-4">
		<!-- Selected lines actions -->
		{#if selectedLineIndices.length > 0}
			<div class="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3">
				<div class="flex items-center justify-between">
					<div class="text-sm font-medium text-blue-900">
						Selected Lines ({selectedLineIndices.length})
					</div>
					<button
						onclick={() => editorStore.clearLineSelection()}
						class="text-xs text-blue-600 hover:text-blue-800"
					>
						Clear
					</button>
				</div>

				{#if selectedUnsavedCount > 0}
					<div class="text-xs text-blue-800">
						{selectedUnsavedCount} unsaved • {selectedSavedCount} saved • {selectedEditedCount} edited
					</div>
				{/if}

				<div class="flex flex-wrap gap-2">
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('save', 'selected')}
						disabled={isLoading}
						class="text-xs"
					>
						💾 Save Selected
					</Button>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('commit', 'selected')}
						disabled={isLoading}
						class="text-xs"
					>
						✅ Mark Selected Done
					</Button>
					{#if selectedEditedCount > 0}
						<Button
							size="sm"
							variant="secondary"
							onclick={() => handleMassAction('reset-edited', 'selected')}
							disabled={isLoading}
							class="text-xs"
						>
							↩️ Reset Selected
						</Button>
					{/if}
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('delete', 'selected')}
						disabled={isLoading || transcriptLinesLength <= selectedLineIndices.length}
						class="text-xs bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
					>
						🗑️ Delete Selected
					</Button>
				</div>
			</div>
		{/if}

		<!-- State Transitions -->
		{#if selectedLineIndices.length > 0}
			<div class="space-y-3">
				<div class="text-xs font-medium text-gray-700">Change State of Selected Lines</div>

				<div class="grid grid-cols-2 gap-2">
					<div class="space-y-1">
						<div class="text-xs text-gray-600 font-medium">Set to:</div>
						<div class="flex flex-col gap-1">
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleMassAction('set-unedited', 'selected')}
								disabled={isLoading}
								class="text-xs justify-start bg-gray-50 border-gray-200 text-gray-700"
							>
								🔘 Unedited
							</Button>
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleMassAction('set-unsaved', 'selected')}
								disabled={isLoading}
								class="text-xs justify-start bg-yellow-50 border-yellow-200 text-yellow-700"
							>
								⚠️ Unsaved
							</Button>
						</div>
					</div>

					<div class="space-y-1">
						<div class="text-xs text-transparent">.</div>
						<div class="flex flex-col gap-1">
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleMassAction('set-saved', 'selected')}
								disabled={isLoading}
								class="text-xs justify-start bg-orange-50 border-orange-200 text-orange-700"
							>
								💾 Saved
							</Button>
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleMassAction('set-edited', 'selected')}
								disabled={isLoading}
								class="text-xs justify-start bg-green-50 border-green-200 text-green-700"
							>
								✅ Edited
							</Button>
						</div>
					</div>
				</div>

				<div class="pt-2 border-t border-gray-200">
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('revert-to-original', 'selected')}
						disabled={isLoading}
						class="text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
					>
						↩️ Revert to Original
					</Button>
				</div>
			</div>
		{/if}

		<!-- Summary counts -->
		<div class="grid grid-cols-2 gap-3 text-xs">
			<div class="bg-yellow-50 p-2 rounded border border-yellow-200">
				<div class="text-yellow-700 font-medium">Unsaved</div>
				<div class="text-yellow-800 text-sm">{unsavedLinesCount}</div>
			</div>
			<div class="bg-orange-50 p-2 rounded border border-orange-200">
				<div class="text-orange-700 font-medium">Saved</div>
				<div class="text-orange-800 text-sm">{savedLinesCount}</div>
			</div>
			<div class="bg-green-50 p-2 rounded border border-green-200">
				<div class="text-green-700 font-medium">Edited</div>
				<div class="text-green-800 text-sm">{editedLinesCount}</div>
			</div>
			<div class="bg-gray-50 p-2 rounded border border-gray-200">
				<div class="text-gray-700 font-medium">Total</div>
				<div class="text-gray-800 text-sm">{transcriptLinesLength}</div>
			</div>
		</div>

		<!-- Mass actions for unsaved lines -->
		{#if unsavedLinesCount > 0}
			<div class="space-y-2">
				<div class="text-xs font-medium text-yellow-700">Unsaved Lines ({unsavedLinesCount})</div>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('save', 'all-unsaved')}
						disabled={isLoading}
						class="text-xs"
					>
						💾 Save All
					</Button>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('commit', 'all-unsaved')}
						disabled={isLoading}
						class="text-xs"
					>
						✅ Mark All Done
					</Button>
				</div>
			</div>
		{/if}

		<!-- Mass actions for saved lines -->
		{#if savedLinesCount > 0}
			<div class="space-y-2">
				<div class="text-xs font-medium text-orange-700">Saved Lines ({savedLinesCount})</div>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('commit', 'all-saved')}
						disabled={isLoading}
						class="text-xs"
					>
						✅ Mark All Done
					</Button>
				</div>
			</div>
		{/if}

		<!-- Mass actions for edited lines -->
		{#if editedLinesCount > 0}
			<div class="space-y-2">
				<div class="text-xs font-medium text-green-700">Edited Lines ({editedLinesCount})</div>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('reset-edited', 'all-edited')}
						disabled={isLoading}
						class="text-xs"
					>
						↩️ Reset All
					</Button>
				</div>
			</div>
		{/if}

		<!-- Bulk State Transitions -->
		{#if unsavedLinesCount > 0 || savedLinesCount > 0 || editedLinesCount > 0}
			<div class="space-y-3">
				<div class="text-xs font-medium text-gray-700">Bulk State Transitions</div>

				{#if editedLinesCount > 0}
					<div class="flex gap-2 flex-wrap">
						<Button
							size="sm"
							variant="outline"
							onclick={() => handleMassAction('set-unedited', 'all-edited')}
							disabled={isLoading}
							class="text-xs bg-gray-50 border-gray-200 text-gray-700"
						>
							All Edited → Unedited
						</Button>
						<Button
							size="sm"
							variant="outline"
							onclick={() => handleMassAction('set-saved', 'all-edited')}
							disabled={isLoading}
							class="text-xs bg-orange-50 border-orange-200 text-orange-700"
						>
							All Edited → Saved
						</Button>
					</div>
				{/if}

				{#if savedLinesCount > 0}
					<div class="flex gap-2 flex-wrap">
						<Button
							size="sm"
							variant="outline"
							onclick={() => handleMassAction('set-unedited', 'all-saved')}
							disabled={isLoading}
							class="text-xs bg-gray-50 border-gray-200 text-gray-700"
						>
							All Saved → Unedited
						</Button>
						<Button
							size="sm"
							variant="outline"
							onclick={() => handleMassAction('set-edited', 'all-saved')}
							disabled={isLoading}
							class="text-xs bg-green-50 border-green-200 text-green-700"
						>
							All Saved → Edited
						</Button>
					</div>
				{/if}

				{#if unsavedLinesCount > 0}
					<div class="flex gap-2 flex-wrap">
						<Button
							size="sm"
							variant="outline"
							onclick={() => handleMassAction('set-unedited', 'all-unsaved')}
							disabled={isLoading}
							class="text-xs bg-gray-50 border-gray-200 text-gray-700"
						>
							All Unsaved → Unedited
						</Button>
						<Button
							size="sm"
							variant="outline"
							onclick={() => handleMassAction('set-saved', 'all-unsaved')}
							disabled={isLoading}
							class="text-xs bg-orange-50 border-orange-200 text-orange-700"
						>
							All Unsaved → Saved
						</Button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Dangerous actions -->
		{#if unsavedLinesCount > 0 || savedLinesCount > 0 || editedLinesCount > 0}
			<div class="pt-3 border-t border-gray-200 space-y-2">
				<div class="text-xs font-medium text-red-700">Danger Zone</div>
				<div class="flex flex-col gap-2">
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('revert-to-original', 'all-changed')}
						disabled={isLoading}
						class="text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
					>
						↩️ Revert All Changed to Original
					</Button>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('delete', 'all-changed')}
						disabled={isLoading ||
							transcriptLinesLength <= unsavedLinesCount + savedLinesCount + editedLinesCount}
						class="text-xs bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
					>
						🗑️ Delete All Changed
					</Button>
				</div>
			</div>
		{/if}

		<!-- No actions available -->
		{#if unsavedLinesCount === 0 && savedLinesCount === 0 && editedLinesCount === 0}
			<div class="text-xs text-gray-500 text-center py-2">
				No lines with changes. Mass actions will appear here when you have unsaved, saved, or edited
				lines.
			</div>
		{/if}
	</div>
</div>
