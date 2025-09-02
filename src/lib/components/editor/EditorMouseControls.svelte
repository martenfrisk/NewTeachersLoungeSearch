<script lang="ts">
	import { KEYBOARD_SHORTCUTS_BY_CATEGORY } from '$lib/types/editor';

	interface Props {
		onKeyboardAction: (action: string) => void;
		currentLineIndex?: number;
		transcriptLinesLength?: number;
		isLoading?: boolean;
		collapsed?: boolean;
		onToggleCollapsed?: () => void;
	}

	let {
		onKeyboardAction,
		currentLineIndex = -1,
		transcriptLinesLength = 0,
		isLoading = false,
		collapsed = false,
		onToggleCollapsed
	}: Props = $props();

	function handleAction(action: string) {
		onKeyboardAction(action);
	}

	function getShortcutDisplay(shortcut: {
		ctrlKey?: boolean;
		shiftKey?: boolean;
		altKey?: boolean;
		key: string;
	}): string {
		let keys = [];
		if (shortcut.ctrlKey) keys.push('Ctrl');
		if (shortcut.shiftKey) keys.push('Shift');
		if (shortcut.altKey) keys.push('Alt');
		keys.push(shortcut.key);
		return keys.join('+');
	}

	// Helper to determine if an action should be disabled
	function isActionDisabled(action: string): boolean {
		if (isLoading) return true;

		switch (action) {
			case 'previous-line':
				return currentLineIndex <= 0;
			case 'next-line':
				return currentLineIndex >= transcriptLinesLength - 1;
			case 'delete-line':
				return transcriptLinesLength <= 1 || currentLineIndex < 0;
			case 'next-speaker':
			case 'previous-speaker':
			case 'new-line-after':
			case 'new-line-before':
			case 'save-line':
			case 'commit-line':
			case 'set-timestamp-previous-plus-one':
			case 'cancel-edit':
				return currentLineIndex < 0;
			default:
				return false;
		}
	}

	// Get button style based on category
	function getCategoryButtonStyle(categoryName: string): string {
		const baseStyle =
			'text-[10px] px-1.5 py-0.5 border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium';

		switch (categoryName) {
			case 'Audio Controls':
				return `${baseStyle} bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100`;
			case 'Navigation':
				return `${baseStyle} bg-green-50 border-green-200 text-green-700 hover:bg-green-100`;
			case 'Line Editing':
				return `${baseStyle} bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100`;
			case 'Save & Submit':
				return `${baseStyle} bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100`;
			case 'General':
				return `${baseStyle} bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100`;
			default:
				return `${baseStyle} bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100`;
		}
	}
</script>

<div class="bg-white border border-gray-200 rounded-lg shadow-sm">
	<!-- Header -->
	<div class="flex items-center justify-between p-3 border-b border-gray-100">
		<h3 class="text-sm font-medium text-gray-900">Mouse Controls</h3>
		{#if onToggleCollapsed}
			<button
				onclick={onToggleCollapsed}
				class="text-gray-400 hover:text-gray-600 text-sm"
				title={collapsed ? 'Expand controls' : 'Collapse controls'}
			>
				{collapsed ? '▼' : '▲'}
			</button>
		{/if}
	</div>

	<!-- Controls -->
	{#if !collapsed}
		<div class="p-3 space-y-4">
			{#each KEYBOARD_SHORTCUTS_BY_CATEGORY as category (category.name)}
				<div class="space-y-2">
					<h4 class="text-xs font-medium text-gray-700 flex items-center gap-1">
						<span>{category.icon}</span>
						{category.name}
					</h4>
					<div class="flex flex-wrap gap-1">
						{#each category.shortcuts as shortcut (shortcut.action)}
							<button
								onclick={() => handleAction(shortcut.action)}
								disabled={isActionDisabled(shortcut.action)}
								class={getCategoryButtonStyle(category.name)}
								title={`${shortcut.description} (${getShortcutDisplay(shortcut)})`}
							>
								{shortcut.description}
							</button>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Most used actions -->
			<div class="pt-2 border-t border-gray-100 space-y-1">
				<h4 class="text-xs font-medium text-gray-700">🚀 Most Used</h4>
				<div class="flex flex-wrap gap-1">
					<button
						onclick={() => handleAction('toggle-play')}
						disabled={isLoading}
						class="text-[10px] px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed text-blue-700 font-medium"
						title="Play/pause audio"
					>
						⏯️ Play
					</button>
					<button
						onclick={() => handleAction('previous-line')}
						disabled={isActionDisabled('previous-line')}
						class="text-[10px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
						title="Go to previous line"
					>
						↑ Prev
					</button>
					<button
						onclick={() => handleAction('next-line')}
						disabled={isActionDisabled('next-line')}
						class="text-[10px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
						title="Go to next line"
					>
						↓ Next
					</button>
					<button
						onclick={() => handleAction('save-line')}
						disabled={isActionDisabled('save-line')}
						class="text-[10px] px-1.5 py-0.5 bg-green-100 border border-green-200 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed text-green-700 font-medium"
						title="Save current line"
					>
						💾 Save
					</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="p-3">
			<div class="text-xs text-gray-500">Controls collapsed</div>
		</div>
	{/if}
</div>
