<script lang="ts">
	import type { ProcessedTranscriptLine } from '$lib/types/episode';
	import EpisodeSearchResult from './EpisodeSearchResult.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		transcriptLines: ProcessedTranscriptLine[];
		highlightedTime?: string | null;
		onNavigateToResult?: (time: string) => void;
	}

	let { transcriptLines, highlightedTime = $bindable(), onNavigateToResult }: Props = $props();

	let query = $state('');
	let searchResults = $state<{ item: ProcessedTranscriptLine; score?: number }[]>([]);
	let isLoading = $state(false);
	let fuseInstance: {
		search: (
			query: string,
			options?: { limit: number }
		) => { item: ProcessedTranscriptLine; score?: number }[];
	} | null = $state(null);
	let inputElement: HTMLInputElement;

	const hasQuery = $derived(query.trim().length > 0);
	const hasResults = $derived(searchResults.length > 0);
	const showResults = $derived(hasQuery && (hasResults || !isLoading));

	async function initializeFuse() {
		if (fuseInstance) return fuseInstance;

		isLoading = true;
		try {
			const Fuse = (await import('fuse.js')).default;

			fuseInstance = new Fuse(transcriptLines, {
				keys: [
					{ name: 'line', weight: 0.8 },
					{ name: 'displaySpeaker', weight: 0.2 }
				],
				threshold: 0.3,
				includeScore: true,
				includeMatches: true,
				ignoreLocation: false,
				minMatchCharLength: 2,
				findAllMatches: true
			});

			return fuseInstance;
		} finally {
			isLoading = false;
		}
	}

	async function performSearch(searchQuery: string) {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}

		const fuse = await initializeFuse();
		const results = fuse.search(searchQuery, { limit: 20 });
		searchResults = results;
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		query = target.value;
		performSearch(query);
	}

	function handleClear() {
		query = '';
		searchResults = [];
		inputElement?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClear();
		}
	}
</script>

<div class="mb-4">
	<label for="episode-search" class="mb-1.5 block text-sm font-medium text-ink-muted">
		Search this transcript
	</label>

	<div class="relative">
		<svg
			class="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-400"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width={2}
				d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
			/>
		</svg>
		<input
			id="episode-search"
			bind:this={inputElement}
			type="text"
			placeholder="Find a line or speaker…"
			value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			class="block w-full rounded-xl border border-blue-200 bg-surface py-2.5 pr-10 pl-11 text-base text-ink shadow-card placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
		/>

		{#if hasQuery}
			<button
				class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
				onclick={handleClear}
				aria-label="Clear search"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width={2}
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		{/if}
	</div>

	{#if hasQuery}
		<div class="mt-1.5 text-sm text-ink-muted">
			{#if isLoading}
				Searching…
			{:else if hasResults}
				<span class="font-mono text-xs">{searchResults.length}</span>
				line{searchResults.length === 1 ? '' : 's'} match
			{:else}
				No lines match “{query}”
			{/if}
		</div>
	{/if}
</div>

{#if showResults}
	<div class="mt-3 space-y-2" transition:slide={{ duration: 200 }}>
		<h3
			class="border-b border-gray-200 pb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase"
		>
			Matches — tap to jump
		</h3>

		<div class="max-h-96 space-y-2 overflow-y-auto">
			{#each searchResults as result (result.item.time)}
				<EpisodeSearchResult
					{result}
					bind:highlightedTime
					searchQuery={query}
					{onNavigateToResult}
				/>
			{/each}
		</div>
	</div>
{/if}
