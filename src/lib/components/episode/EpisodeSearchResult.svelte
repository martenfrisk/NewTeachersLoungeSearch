<script lang="ts">
	import Tooltip from '../Tooltip.svelte';
	import type { ProcessedTranscriptLine } from '$lib/types/episode';

	interface Props {
		result: { item: ProcessedTranscriptLine; score?: number };
		highlightedTime?: string | null;
		searchQuery: string;
		onNavigateToResult?: (time: string) => void;
	}

	let { result, highlightedTime = $bindable(), searchQuery, onNavigateToResult }: Props = $props();

	const { item } = result;

	function scrollToLine(timeString: string) {
		// Set highlight state using Svelte reactivity
		highlightedTime = timeString;

		// Use navigation callback if available
		if (onNavigateToResult) {
			onNavigateToResult(timeString);
		}

		// Clear highlight after 2 seconds
		setTimeout(() => {
			highlightedTime = null;
		}, 2000);
	}

	function getHighlightedParts(text: string, query: string) {
		if (!query.trim()) return [{ text, highlighted: false }];

		// Escape special regex characters
		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Split query into words for partial matching
		const words = escapedQuery.split(/\s+/).filter((word) => word.length > 0);

		let parts = [{ text, highlighted: false }];

		// Process each word
		words.forEach((word) => {
			const regex = new RegExp(`(${word})`, 'gi');
			const newParts: { text: string; highlighted: boolean }[] = [];

			parts.forEach((part) => {
				if (part.highlighted) {
					newParts.push(part);
				} else {
					const matches = [...part.text.matchAll(regex)];
					if (matches.length === 0) {
						newParts.push(part);
					} else {
						let lastIndex = 0;
						matches.forEach((match) => {
							if (match.index !== undefined) {
								if (match.index > lastIndex) {
									newParts.push({
										text: part.text.slice(lastIndex, match.index),
										highlighted: false
									});
								}
								newParts.push({ text: match[0], highlighted: true });
								lastIndex = match.index + match[0].length;
							}
						});
						if (lastIndex < part.text.length) {
							newParts.push({ text: part.text.slice(lastIndex), highlighted: false });
						}
					}
				}
			});

			parts = newParts;
		});

		return parts;
	}

	let highlightedLineParts = $derived(getHighlightedParts(item.line, searchQuery));
	let highlightedSpeakerParts = $derived(getHighlightedParts(item.displaySpeaker, searchQuery));
</script>

<button
	type="button"
	class="group relative w-full text-left rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 hover:bg-blue-50/50 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
	onclick={() => scrollToLine(item.time)}
	aria-label={`Jump to transcript line at ${item.time}: ${item.line.slice(0, 100)}${item.line.length > 100 ? '...' : ''}`}
>
	<header class="px-3 py-2 border-b border-blue-100 bg-blue-50/20">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span
					class="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full border border-blue-200"
				>
					🔍 {item.time}
				</span>
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border {item.speakerColor}"
				>
					{#each highlightedSpeakerParts as part, i (i)}
						{#if part.highlighted}
							<mark class="bg-yellow-200 px-1 py-0.5 rounded text-yellow-900">{part.text}</mark>
						{:else}
							{part.text}
						{/if}
					{/each}
				</span>
			</div>

			<div class="flex items-center gap-1">
				{#if item.edited}
					<Tooltip>
						{#snippet tooltip()}
							This line has been manually edited for accuracy
						{/snippet}
						{#snippet content()}
							<span
								class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"
							>
								<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="hidden sm:inline">Edited</span>
							</span>
						{/snippet}
					</Tooltip>
				{:else}
					<Tooltip>
						{#snippet tooltip()}
							Auto-transcribed, may contain errors
						{/snippet}
						{#snippet content()}
							<span
								class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"
							>
								<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="hidden sm:inline">Auto</span>
							</span>
						{/snippet}
					</Tooltip>
				{/if}
			</div>
		</div>
	</header>

	<div class="px-3 py-2 bg-gradient-to-r from-blue-50/30 to-transparent">
		<div class="flex items-start gap-2">
			<svg
				class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<p class="text-gray-900 leading-relaxed text-sm flex-1">
				{#each highlightedLineParts as part, i (i)}
					{#if part.highlighted}
						<mark class="bg-yellow-200 px-1 py-0.5 rounded text-yellow-900">{part.text}</mark>
					{:else}
						{part.text}
					{/if}
				{/each}
			</p>
		</div>
		<div class="mt-2 text-xs text-blue-600 font-medium opacity-75">
			Click to jump to this line in transcript ↓
		</div>
	</div>
</button>
