<script lang="ts">
	import { shortcutsInScope, shortcutFor, formatShortcut } from '$lib/types/editor';
	import Kbd from './Kbd.svelte';

	/**
	 * The action bar shown on the focused line, plus its shortcut reference.
	 *
	 * Every label and tooltip is looked up from the shortcut registry. Written out
	 * by hand, this panel had drifted to advertising `W` for "Save" - a key deleted
	 * with the four-state model - while `E`, `S`, `T`, `J` and `K` were live and
	 * documented nowhere.
	 */
	interface Props {
		isReviewed: boolean;
		/** False on the last remaining line: an episode cannot be emptied. */
		canDelete: boolean;
		/** False on line 0, which has no previous timestamp to derive from. */
		canAutoTimestamp: boolean;
		onAction: (action: string, event: MouseEvent) => void;
	}

	let { isReviewed, canDelete, canAutoTimestamp, onAction }: Props = $props();

	const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

	/** "Delete line (⌘Del)", or just "Delete line" if nothing is bound. */
	function label(text: string, action: string): string {
		const shortcut = shortcutFor(action);
		return shortcut ? `${text} (${formatShortcut(shortcut, isMac)})` : text;
	}

	type QuickActionType =
		| { divider: true }
		| {
				divider?: false;
				icon: string;
				tone: string;
				action: string;
				title: string;
				disabled?: boolean;
		  };

	let buttons = $derived<QuickActionType[]>([
		{ icon: '✏️', tone: 'blue', action: 'edit-text', title: label('Edit text', 'line-edit-text') },
		{
			icon: '👤',
			tone: 'purple',
			action: 'edit-speaker',
			title: label('Edit speaker', 'line-edit-speaker')
		},
		{
			icon: '⏰',
			tone: 'green',
			action: 'edit-timestamp',
			title: label('Edit timestamp', 'line-edit-timestamp')
		},
		{ divider: true },
		{
			icon: '⬆️+',
			tone: 'gray',
			action: 'new-line-before',
			title: label('New line before', 'new-line-before')
		},
		{
			icon: '⬇️+',
			tone: 'gray',
			action: 'new-line-after',
			title: label('New line after', 'new-line-after')
		},
		{
			icon: '🗑️',
			tone: 'red',
			action: 'delete-line',
			title: label('Delete line', 'delete-line'),
			disabled: !canDelete
		},
		{ divider: true },
		{
			icon: '🔄',
			tone: 'orange',
			action: 'auto-timestamp',
			title: label('Timestamp from previous + 1s', 'set-timestamp-previous-plus-one'),
			disabled: !canAutoTimestamp
		},
		{
			icon: '✅',
			tone: 'yellow',
			action: 'commit-line',
			title: label('Mark reviewed', 'commit-line')
		},
		...(isReviewed
			? [
					{
						icon: '↩️',
						tone: 'gray',
						action: 'reset-edited',
						title: label('Clear review', 'reset-edited')
					}
				]
			: [])
	]);

	/** Line-scoped keys, plus the global ones this bar exposes as buttons. */
	let reference = $derived([
		...shortcutsInScope('line'),
		...shortcutsInScope('global').filter((shortcut) =>
			['new-line-after', 'new-line-before', 'delete-line', 'merge-line', 'commit-line'].includes(
				shortcut.action
			)
		),
		...(isReviewed ? (shortcutFor('reset-edited') ? [shortcutFor('reset-edited')!] : []) : [])
	]);
</script>

<div class="mt-2 mr-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
	<div class="mb-3 flex items-center gap-4 text-xs text-gray-600">
		<span class="font-medium">Quick Actions</span>
		<div class="flex flex-wrap gap-1">
			{#each buttons as button, index (button.divider ? `divider-${index}` : button.action)}
				{#if button.divider}
					<span class="mx-1 text-gray-300">|</span>
				{:else}
					<button
						onclick={(event) => onAction(button.action, event)}
						class={`mini mini-${button.tone}`}
						disabled={button.disabled}
						title={button.title}
					>
						{button.icon}
					</button>
				{/if}
			{/each}
		</div>
	</div>

	<details>
		<summary class="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
			Keyboard shortcuts
		</summary>
		<div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 md:grid-cols-3">
			{#each reference as shortcut (shortcut.action)}
				<div class="flex items-center gap-1">
					<Kbd>{formatShortcut(shortcut, isMac)}</Kbd>
					<span>{shortcut.description}</span>
				</div>
			{/each}
		</div>
	</details>
</div>

<style>
	/* Only the mini variant survives. A full-size .action-button set - eight tone
	   variants, ~107 lines - sat here unreferenced by any markup. */
	.mini {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		line-height: 1;
		padding: 0.25rem;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 0.25rem;
		border: 1px solid;
		cursor: pointer;
		transition: all 0.1s ease;
		background: white;
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
		opacity: 0.7;
	}

	.mini:hover:not(:disabled) {
		opacity: 1;
		transform: translateY(-1px);
		box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
	}

	.mini:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
	}

	.mini:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		transform: none !important;
	}

	.mini-blue {
		color: #1e40af;
		border-color: #bfdbfe;
		background: linear-gradient(145deg, #ffffff 0%, #f0f8ff 100%);
	}
	.mini-blue:hover:not(:disabled) {
		border-color: #3b82f6;
		background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
	}

	.mini-purple {
		color: #7c3aed;
		border-color: #ddd6fe;
		background: linear-gradient(145deg, #ffffff 0%, #faf7ff 100%);
	}
	.mini-purple:hover:not(:disabled) {
		border-color: #8b5cf6;
		background: linear-gradient(145deg, #ede9fe 0%, #ddd6fe 100%);
	}

	.mini-green {
		color: #059669;
		border-color: #a7f3d0;
		background: linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%);
	}
	.mini-green:hover:not(:disabled) {
		border-color: #10b981;
		background: linear-gradient(145deg, #d1fae5 0%, #a7f3d0 100%);
	}

	.mini-gray {
		color: #4b5563;
		border-color: #e5e7eb;
		background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%);
	}
	.mini-gray:hover:not(:disabled) {
		border-color: #6b7280;
		background: linear-gradient(145deg, #f3f4f6 0%, #e5e7eb 100%);
	}

	.mini-red {
		color: #dc2626;
		border-color: #fca5a5;
		background: linear-gradient(145deg, #ffffff 0%, #fffafa 100%);
	}
	.mini-red:hover:not(:disabled) {
		border-color: #ef4444;
		background: linear-gradient(145deg, #fecaca 0%, #fca5a5 100%);
	}

	.mini-orange {
		color: #ea580c;
		border-color: #fdba74;
		background: linear-gradient(145deg, #ffffff 0%, #fffbf5 100%);
	}
	.mini-orange:hover:not(:disabled) {
		border-color: #f97316;
		background: linear-gradient(145deg, #fed7aa 0%, #fdba74 100%);
	}

	.mini-yellow {
		color: #d97706;
		border-color: #fde68a;
		background: linear-gradient(145deg, #ffffff 0%, #fffef0 100%);
	}
	.mini-yellow:hover:not(:disabled) {
		border-color: #f59e0b;
		background: linear-gradient(145deg, #fef3c7 0%, #fde68a 100%);
	}
</style>
