<script lang="ts">
	import { filtersState } from '../../states/FiltersState.svelte';
	import type { SearchFacet } from '../../types/search';
	import Button from '../ui/Button.svelte';

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
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-sm font-medium text-gray-700">Filters</h3>
		<div class="flex items-center gap-2">
			{#if hasActiveFilters}
				<Button variant="ghost" size="sm" onclick={clearAllFilters}>Clear all</Button>
			{/if}
			<Button variant="ghost" size="sm" onclick={() => (showFilters = !showFilters)}>
				{showFilters ? 'Hide' : 'Show'} Filters
			</Button>
		</div>
	</div>

	{#if showFilters}
		<div class="space-y-4">
			<!-- Edited Only Filter -->
			<div class="flex items-center">
				<input
					id="edited-only"
					type="checkbox"
					bind:checked={filtersState.editedOnly}
					onchange={toggleEditedOnly}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="edited-only" class="ml-2 text-sm text-gray-700"> Edited lines only </label>
			</div>

			<!-- Dynamic Facet Filters -->
			{#each facets as facet}
				<div class="space-y-2">
					<h4 class="text-sm font-medium text-gray-700 capitalize">
						{facet.facetName}
					</h4>
					<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
						{#each facet.facetHits as hit}
							{@const isActive = filtersState.activeFiltersArray.includes(
								`${facet.facetName} = "${hit.ep}"`
							)}
							<button
								class="text-left p-2 rounded border text-sm transition-colors"
								class:bg-blue-50={isActive}
								class:border-blue-300={isActive}
								class:text-blue-800={isActive}
								class:bg-gray-50={!isActive}
								class:border-gray-200={!isActive}
								class:text-gray-700={!isActive}
								class:hover:bg-gray-100={!isActive}
								onclick={() => toggleFilter(facet.facetName, hit.ep)}
							>
								<div class="font-medium">{hit.ep}</div>
								<div class="text-xs opacity-75">{hit.hits} results</div>
							</button>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Active Filters Summary -->
			{#if hasActiveFilters}
				<div class="pt-4 border-t">
					<h4 class="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
					<div class="flex flex-wrap gap-2">
						{#if filtersState.editedOnly}
							<span
								class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
							>
								Edited Only
								<button class="ml-1 hover:text-green-600" onclick={toggleEditedOnly}> × </button>
							</span>
						{/if}
						{#each filtersState.activeFiltersArray as filter}
							<span
								class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
							>
								{filter.split(' = ')[1].replace(/"/g, '')}
								<button
									class="ml-1 hover:text-blue-600"
									onclick={() => {
										const [name, value] = filter.split(' = ');
										toggleFilter(name, value.replace(/"/g, ''));
									}}
								>
									×
								</button>
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
