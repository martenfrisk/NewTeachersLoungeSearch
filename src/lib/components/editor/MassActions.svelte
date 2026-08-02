<script lang="ts">
	import { editorStore } from '../../stores/editor.svelte';
	import type { MassActionType } from '$lib/types/editor';
	import Button from '../ui/Button.svelte';

	interface Props {
		transcriptLinesLength: number;
		isLoading: boolean;
	}

	let { transcriptLinesLength, isLoading }: Props = $props();

	let selectedLineIndices = $derived(editorStore.selectedLineIndices);
	let modifiedLines = $derived(editorStore.getModifiedLines());
	let reviewedLines = $derived(editorStore.getReviewedLines());

	/**
	 * Which lines an action applies to.
	 *
	 * Was five groups over the old four-state model ('all-unsaved', 'all-saved',
	 * 'all-edited', 'all-changed', 'selected'). "Modified" and "reviewed" are now
	 * the only two real distinctions, and they are independent rather than
	 * mutually exclusive - a line can be both.
	 */
	type TargetGroupType = 'selected' | 'modified' | 'reviewed';

	function indicesFor(group: TargetGroupType): number[] {
		switch (group) {
			case 'selected':
				return selectedLineIndices;
			case 'modified':
				return modifiedLines;
			case 'reviewed':
				return reviewedLines;
		}
	}

	function handleMassAction(action: MassActionType, group: TargetGroupType) {
		const lineIndices = indicesFor(group);
		if (lineIndices.length === 0) return;

		// Both of these discard work, and neither is undoable yet.
		if (action === 'delete') {
			if (!confirm(`Delete ${lineIndices.length} line(s)? This cannot be undone.`)) return;
			editorStore.performMassAction(lineIndices, action, { confirmDelete: true });
			return;
		}
		if (action === 'revert-to-original') {
			if (!confirm(`Discard all changes to ${lineIndices.length} line(s)?`)) return;
		}

		editorStore.performMassAction(lineIndices, action);
	}
</script>

<div class="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
	<div class="px-4 py-3 border-b border-gray-200">
		<h3 class="text-sm font-medium text-gray-900">Mass Actions</h3>
		<p class="text-xs text-gray-500 mt-1">Perform actions on multiple lines at once</p>
	</div>

	<div class="p-4 space-y-4">
		{#if selectedLineIndices.length > 0}
			<div class="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3">
				<div class="flex items-center justify-between">
					<div class="text-sm font-medium text-blue-900">
						Selected ({selectedLineIndices.length})
					</div>
					<button
						onclick={() => editorStore.clearLineSelection()}
						class="text-xs text-blue-600 hover:text-blue-800"
					>
						Clear
					</button>
				</div>

				<div class="flex flex-wrap gap-2">
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('commit', 'selected')}
						disabled={isLoading}
						class="text-xs">Mark reviewed</Button
					>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('reset-edited', 'selected')}
						disabled={isLoading}
						class="text-xs">Clear review</Button
					>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('revert-to-original', 'selected')}
						disabled={isLoading}
						class="text-xs">Discard changes</Button
					>
					<Button
						size="sm"
						variant="secondary"
						onclick={() => handleMassAction('delete', 'selected')}
						disabled={isLoading || transcriptLinesLength <= selectedLineIndices.length}
						class="text-xs bg-red-600 text-white hover:bg-red-700 focus:ring-red-500">Delete</Button
					>
				</div>
			</div>
		{/if}

		{#if modifiedLines.length > 0 || reviewedLines.length > 0}
			<div class="space-y-2">
				{#if modifiedLines.length > 0}
					<div class="flex items-center justify-between gap-2">
						<span class="text-xs text-gray-600">{modifiedLines.length} modified</span>
						<div class="flex gap-2">
							<Button
								size="sm"
								variant="outline"
								onclick={() => editorStore.selectModifiedLines()}
								disabled={isLoading}
								class="text-xs">Select</Button
							>
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleMassAction('commit', 'modified')}
								disabled={isLoading}
								class="text-xs">Mark all reviewed</Button
							>
						</div>
					</div>
				{/if}

				{#if reviewedLines.length > 0}
					<div class="flex items-center justify-between gap-2">
						<span class="text-xs text-gray-600">{reviewedLines.length} reviewed</span>
						<div class="flex gap-2">
							<Button
								size="sm"
								variant="outline"
								onclick={() => editorStore.selectReviewedLines()}
								disabled={isLoading}
								class="text-xs">Select</Button
							>
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleMassAction('reset-edited', 'reviewed')}
								disabled={isLoading}
								class="text-xs">Clear all reviews</Button
							>
						</div>
					</div>
				{/if}
			</div>
		{:else if selectedLineIndices.length === 0}
			<p class="text-xs text-gray-500">
				Select lines, or edit some, and bulk actions will appear here.
			</p>
		{/if}
	</div>
</div>
