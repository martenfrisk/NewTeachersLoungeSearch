<script lang="ts">
	import { KEYBOARD_SHORTCUTS } from '$lib/types/editor';
	import type { EpisodeInfo } from '$lib/types/episode';
	import Button from '../ui/Button.svelte';

	interface Props {
		episodeInfo: EpisodeInfo | null;
		selectedEpisode: string | null;
		hasChanges: boolean;
		editedLinesCount: number;
		showKeyboardHelp: boolean;
		onToggleHelp: () => void;
	}

	let {
		episodeInfo,
		selectedEpisode,
		hasChanges,
		editedLinesCount,
		showKeyboardHelp,
		onToggleHelp
	}: Props = $props();
</script>

<div class="mb-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Transcript Editor</h1>
			{#if episodeInfo}
				<div class="mt-2">
					<p class="text-lg font-medium text-gray-800">{episodeInfo.title}</p>
					<p class="text-sm text-gray-600">
						Season {episodeInfo.season} • Episode {selectedEpisode}
					</p>
				</div>
			{:else}
				<p class="text-gray-600 mt-1">Edit transcripts with audio synchronization</p>
			{/if}
		</div>

		<div class="flex items-center gap-3">
			{#if hasChanges}
				<div
					class="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 flex items-center gap-2"
				>
					<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>{editedLinesCount} unsaved changes</span>
				</div>
			{/if}

			<Button variant="outline" size="sm" onclick={onToggleHelp}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span class="ml-1 hidden sm:inline">Help</span>
			</Button>
		</div>
	</div>
</div>

<!-- Keyboard shortcuts help -->
{#if showKeyboardHelp}
	<div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
		<h3 class="font-medium text-blue-900 mb-3">Keyboard Shortcuts</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-blue-800">
			{#each KEYBOARD_SHORTCUTS as shortcut (shortcut.description)}
				<div class="flex items-center gap-2">
					<kbd class="px-2 py-1 bg-blue-100 rounded text-xs font-mono">
						{shortcut.ctrlKey
							? navigator.platform.includes('Mac')
								? 'Cmd+'
								: 'Ctrl+'
							: ''}{shortcut.shiftKey ? 'Shift+' : ''}{shortcut.key === ' '
							? 'Space'
							: shortcut.key}
					</kbd>
					<span>{shortcut.description}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	kbd {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
	}
</style>
