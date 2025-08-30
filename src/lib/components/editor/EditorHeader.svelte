<script lang="ts">
	import { KEYBOARD_SHORTCUTS } from '$lib/types/editor';
	import type { EpisodeInfo } from '$lib/types/episode';
	import type { EditableTranscriptLineType } from '$lib/types/editor';
	import Button from '../ui/Button.svelte';
	import SubmitControls from './SubmitControls.svelte';

	interface Props {
		episodeInfo: EpisodeInfo | null;
		selectedEpisode: string | null;
		showKeyboardHelp: boolean;
		transcriptLines: EditableTranscriptLineType[];
		onToggleHelp: () => void;
		onSubmitSuccess?: (editIds: string[]) => void;
		onSubmitError?: (error: Error) => void;
	}

	let {
		episodeInfo,
		selectedEpisode,
		showKeyboardHelp,
		transcriptLines,
		onToggleHelp,
		onSubmitSuccess,
		onSubmitError
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

	<!-- Prominent Submit Controls - Always visible when there are changes -->
	{#if selectedEpisode && transcriptLines.length > 0}
		<div class="mt-4">
			<SubmitControls {transcriptLines} {onSubmitSuccess} {onSubmitError} />
		</div>
	{/if}
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
