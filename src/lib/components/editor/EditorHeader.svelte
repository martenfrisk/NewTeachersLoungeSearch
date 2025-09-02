<script lang="ts">
	import { KEYBOARD_SHORTCUTS_BY_CATEGORY } from '$lib/types/editor';
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
		onSubmitSuccess?: (submissionId: string) => void;
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
			<SubmitControls
				episodeEp={selectedEpisode}
				{transcriptLines}
				{onSubmitSuccess}
				{onSubmitError}
			/>
		</div>
	{/if}
</div>

<!-- Keyboard shortcuts help -->
{#if showKeyboardHelp}
	<div
		class="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm"
	>
		<div class="flex items-center gap-2 mb-4">
			<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
				/>
			</svg>
			<h3 class="text-lg font-semibold text-blue-900">Keyboard Shortcuts</h3>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
			{#each KEYBOARD_SHORTCUTS_BY_CATEGORY as category (category.name)}
				<div class="bg-white rounded-lg border border-blue-100 p-4 shadow-sm">
					<div class="flex items-center gap-2 mb-3">
						{#if category.icon}
							<span class="text-lg">{category.icon}</span>
						{/if}
						<h4 class="font-medium text-gray-900 text-sm">{category.name}</h4>
					</div>

					<div class="space-y-2">
						{#each category.shortcuts as shortcut (shortcut.description)}
							<div class="flex items-center justify-between gap-3">
								<span class="text-sm text-gray-700 truncate">{shortcut.description}</span>
								<kbd class="shortcut-key">
									{#if shortcut.ctrlKey}
										<span class="key-modifier"
											>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</span
										>
									{/if}
									{#if shortcut.shiftKey}
										<span class="key-modifier">⇧</span>
									{/if}
									{#if shortcut.altKey}
										<span class="key-modifier"
											>{navigator.platform.includes('Mac') ? '⌥' : 'Alt'}</span
										>
									{/if}
									<span class="key-main">
										{shortcut.key === ' '
											? 'Space'
											: shortcut.key === 'ArrowUp'
												? '↑'
												: shortcut.key === 'ArrowDown'
													? '↓'
													: shortcut.key}
									</span>
								</kbd>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-4 p-3 bg-blue-100 rounded-lg">
			<p class="text-xs text-blue-800">
				<span class="font-medium">💡 Tip:</span> Most shortcuts work when a transcript line is selected.
				Audio controls work globally.
			</p>
		</div>
	</div>
{/if}

<style>
	.shortcut-key {
		display: inline-flex;
		align-items: center;
		gap: 1px;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
		font-size: 0.7rem;
		font-weight: 500;
		background: linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%);
		border: 1px solid #cbd5e1;
		border-radius: 0.375rem;
		padding: 0.15rem 0.4rem;
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.05),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		color: #374151;
		white-space: nowrap;
	}

	.key-modifier {
		font-size: 0.65rem;
		opacity: 0.8;
	}

	.key-modifier:not(:last-child)::after {
		content: '+';
		margin: 0 1px;
		opacity: 0.6;
	}

	.key-main {
		font-weight: 600;
		margin-left: 1px;
	}

	.shortcut-key:hover {
		background: linear-gradient(145deg, #f1f5f9 0%, #d1d5db 100%);
		border-color: #9ca3af;
	}
</style>
