<script lang="ts">
	import { filtersState } from '../../states/FiltersState.svelte';
	import type { SearchFacet } from '../../types/search';

	interface Props {
		facets?: SearchFacet[];
	}

	let { facets = [] }: Props = $props();

	let showFilters = $state(false);

	function toggleFilter(filterName: string, filterValue: string) {
		if (filterName === 'season') {
			filtersState.addSeasonFilter(filterValue);
		} else if (filterName === 'episode') {
			filtersState.addEpisodeFilter(filterValue);
		}
	}

	function toggleEditedOnly() {
		filtersState.toggleEditedOnly();
	}

	function clearAllFilters() {
		filtersState.clear();
	}

	const hasActiveFilters = $derived(filtersState.hasActiveFilters);
</script>

<div class="w-full">
	<!-- Compact Filter Controls -->
	<div class="flex items-center justify-between">
		<button
			class="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
			onclick={() => (showFilters = !showFilters)}
		>
			<svg
				class="w-3 h-3 transition-transform duration-200"
				class:rotate-180={showFilters}
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
			<span class="font-medium">
				Filters
				{#if hasActiveFilters}
					<span class="ml-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
						{filtersState.activeFiltersCount}
					</span>
				{/if}
			</span>
		</button>

		{#if hasActiveFilters}
			<div class="flex items-center gap-2">
				<div class="flex gap-1">
					{#if filtersState.editedOnly}
						<span class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded"> Edited </span>
					{/if}
					{#each filtersState.activeFiltersArray.slice(0, 3) as filter (filter)}
						<span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
							{filter.split(' = ')[1].replace(/"/g, '')}
						</span>
					{/each}
					{#if filtersState.activeFiltersArray.length > 3}
						<span class="text-xs text-gray-400">+{filtersState.activeFiltersArray.length - 3}</span>
					{/if}
				</div>
				<button class="text-xs text-gray-500 hover:text-gray-700 ml-2" onclick={clearAllFilters}>
					Clear
				</button>
			</div>
		{/if}
	</div>

	{#if showFilters}
		<div class="border border-gray-200 rounded p-3 space-y-3">
			<!-- Edited Only Option -->
			<label class="flex items-center cursor-pointer text-sm">
				<input
					id="edited-only"
					type="checkbox"
					name="edited-only"
					bind:checked={filtersState.editedOnly}
					onchange={toggleEditedOnly}
					class="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 mr-2"
				/>
				Edited lines only
			</label>

			<!-- Horizontal Filter Sections -->
			{#each facets as facet (facet.facetName)}
				<div>
					<h4 class="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
						{facet.facetName}
					</h4>
					<div class="flex flex-wrap gap-1.5">
						{#each facet.facetHits as hit (hit.ep)}
							{@const isActive = filtersState.activeFiltersArray.includes(
								`${facet.facetName} = "${hit.ep}"`
							)}
							<button
								class="px-2.5 py-1.5 text-xs rounded border transition-colors"
								class:bg-blue-100={isActive}
								class:border-blue-300={isActive}
								class:text-blue-800={isActive}
								class:bg-gray-50={!isActive}
								class:border-gray-200={!isActive}
								class:text-gray-700={!isActive}
								class:hover:bg-gray-100={!isActive}
								onclick={() => toggleFilter(facet.facetName, hit.ep)}
							>
								{hit.ep}
								<span class="ml-1 opacity-60">({hit.hits})</span>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
