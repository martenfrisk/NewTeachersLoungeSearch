<script lang="ts">
	import { newRandom } from '../../utils';
	import { searchHistoryStore } from '$lib/stores/searchHistory.svelte';

	interface Props {
		query?: string;
		placeholder?: string;
		disabled?: boolean;
		onSearch?: (query: string) => void;
	}

	let {
		query = $bindable(''),
		placeholder = 'Search transcripts...',
		disabled = false,
		onSearch
	}: Props = $props();

	let inputElement: HTMLInputElement;
	let showHistory = $state(false);
	let recentSearches = $derived(searchHistoryStore.getRecentSearches(8));

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		query = target.value;
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		onSearch?.(query);
	}

	function handleRandomSearch() {
		const randomQuery = newRandom();
		query = randomQuery;
		onSearch?.(randomQuery);
		inputElement?.focus();
	}

	function handleClear() {
		query = '';
		onSearch?.('');
		inputElement?.focus();
	}

	function handleHistorySelect(historyQuery: string) {
		query = historyQuery;
		showHistory = false;
		onSearch?.(historyQuery);
	}

	function handleFocus() {
		if (searchHistoryStore.isEnabled && recentSearches.length > 0) {
			showHistory = true;
		}
	}

	function handleBlur() {
		// Small delay to allow history item clicks to register
		setTimeout(() => {
			showHistory = false;
		}, 150);
	}
</script>

<div class="w-full">
	<form onsubmit={handleSubmit}>
		<label for="search" class="sr-only">Search transcripts</label>

		<div class="flex items-start gap-2">
			<div class="relative flex-1">
				<!-- Leading search icon (carries the field's purpose so no visible label is needed) -->
				<svg
					class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden={true}
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width={2}
						d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
					/>
				</svg>
				<input
					id="search"
					bind:this={inputElement}
					type="search"
					name="q"
					{placeholder}
					{disabled}
					value={query}
					oninput={handleInput}
					onfocus={handleFocus}
					onblur={handleBlur}
					class="block w-full rounded-xl border border-blue-200 bg-surface py-3 pl-11 pr-11 text-base text-ink shadow-card placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
				/>

				{#if query}
					<button
						type="button"
						class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						onclick={handleClear}
						aria-label="Clear search"
					>
						<svg
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden={true}
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				{/if}

				<!-- Search History Dropdown -->
				{#if showHistory && searchHistoryStore.isEnabled && recentSearches.length > 0}
					<div
						class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50"
					>
						<div class="p-2">
							<div class="text-xs text-gray-500 mb-2">Recent searches</div>
							{#each recentSearches as search (search.id)}
								<div
									class="group relative flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded-md"
								>
									<button
										type="button"
										class="flex-1 text-left truncate"
										onclick={() => handleHistorySelect(search.query)}
									>
										{search.query}
									</button>
									<div class="text-xs text-gray-400 ml-2">
										{#if search.resultsCount !== undefined}
											{search.resultsCount} results
										{/if}
									</div>
									<button
										type="button"
										class="ml-2 p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
										onclick={(e) => {
											e.stopPropagation();
											searchHistoryStore.removeSearch(search.id);
										}}
										aria-label="Remove from history"
									>
										<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								</div>
							{/each}
							{#if recentSearches.length > 0}
								<div class="mt-2 pt-2 border-t border-gray-200">
									<button
										type="button"
										class="w-full text-left px-3 py-1 text-xs text-gray-500 hover:text-red-600"
										onclick={() => {
											searchHistoryStore.clearHistory();
											showHistory = false;
										}}
									>
										Clear all history
									</button>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Random search: compact icon on the search row, with a small floating label.
			     The one explicitly playful control, so it answers hover playfully:
			     a marker wash and the die tipping over as if about to be rolled. -->
			<div class="flex shrink-0 relative flex-col items-center">
				<button
					type="button"
					onclick={handleRandomSearch}
					{disabled}
					class="group flex h-12 w-12 items-center justify-center rounded-xl border border-blue-200 bg-surface text-xl shadow-card transition-colors hover:border-marker hover:bg-marker/25 disabled:opacity-50"
					aria-label="Random search"
					title="Surprise me with a random search"
				>
					<span class="-mt-2 transition-transform duration-200 group-hover:rotate-[18deg]">🎲</span>
				</button>
				<span
					class="mt-0.5 text-[10px] pointer-events-none absolute bottom-0 font-medium text-gray-400"
					>random</span
				>
			</div>
		</div>
	</form>
</div>
