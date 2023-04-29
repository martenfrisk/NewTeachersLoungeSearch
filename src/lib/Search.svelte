<script lang="ts">
	import { onMount } from 'svelte';
	import type { SearchHit, HitStats } from '$lib/types';
	import { newRandom, searchMeili, throttle } from './utils';

	import Hit from './components/Hit.svelte';
	import Stats from './components/Stats.svelte';

	export let query: string, filter: string[], hits: SearchHit[];

	let stats: HitStats;
	$: console.log({ stats });

	let offset = 0;

	async function search() {
		await searchMeili(query, filter, false, offset).then((data) => {
			hits = data.hits;
			stats = data.stats;
		});
	}

	async function addToFilter(filterName: string, filterValue: string) {
		const combinedFilter = `${filterName} = ${filterValue}`;
		filter = filter.includes(combinedFilter)
			? filter.filter((x) => x !== combinedFilter)
			: [combinedFilter, ...filter];

		await search();
	}

	async function clearFilter() {
		filter = [];
		await search();
	}

	async function getNewRandom() {
		query = newRandom();
		filter = [];
		await search();
	}

	onMount(async () => {
		setTimeout(async () => {
			if (location !== undefined) {
				query = new URLSearchParams(location.search)?.get('s') || '';
				filter =
					new URLSearchParams(location.search)?.get('f')?.replaceAll('=', ' = ').split(',') || [];

				// filterEdited = new URLSearchParams(location.search)?.has('edited') || false;
			}
			if (query === '') {
				query = newRandom();
			}
			await search();
		}, 100);
	});
</script>

<div class="flex flex-wrap justify-center w-full px-2 my-4 md:items-center md:px-6">
	<div class="w-full md:pl-4">
		<label for="search" class="text-sm">Search</label>
	</div>
	<input
		class="w-3/4 h-12 px-4 text-xl border border-gray-500 shadow-md outline-none rounded-l-md rounded-r-md md:rounded-r-none"
		type="text"
		id="search"
		bind:value={query}
		on:keyup={throttle(300, search)}
	/>
	<button
		class="w-1/4 h-12 px-px text-sm font-semibold text-blue-800 border-2 border-blue-500 shadow-md rounded-l-md bg-blue-50 rounded-r-md md:rounded-l-none md:px-2 md:text-base md:py-2 hover:bg-blue-500 hover:text-white hover:border-white"
		on:click={getNewRandom}>Random search</button
	>
</div>
<div class="flex flex-col flex-wrap w-full gap-2 px-6 my-2">
	<!-- <label for="editedOnly" class="flex items-baseline gap-2 text-sm cursor-pointer">
		Edited lines only
		<input type="checkbox" id="editedOnly" bind:checked={filterEdited} on:change={() => search()} />
	</label> -->
	<details>
		<summary class="cursor-pointer">
			<span class="hover:underline"> Filter by season or episode </span>
			{#if filter?.length > 0}
				<button
					class="ml-2 text-sm text-gray-700 border-b border-gray-500 border-dotted"
					on:click={clearFilter}
				>
					(clear filter)
				</button>
			{/if}
		</summary>
		{#if stats?.facets}
			<div class="flex flex-wrap w-5/6 gap-2 my-2 max-w-screen">
				<span class="block w-full md:inline md:w-auto">season:</span>
				{#each stats.facets.find((x) => x.facetName === 'season')?.facetHits || [] as facet}
					<button
						class={`border border-blue-500 px-2 py-px focus:outline-none text-sm md:text-base  focus:border-black rounded-lg ${
							filter?.includes(`season = ${facet.ep}`)
								? 'bg-blue-500 text-white'
								: 'bg-white text-black'
						}`}
						on:click={() => addToFilter('season', facet.ep)}>{facet.ep}&nbsp;({facet.hits})</button
					>
				{/each}
			</div>
			<div class="flex flex-wrap w-5/6 gap-2 my-2 max-w-screen">
				<span class="block w-full md:inline md:w-auto">episode:</span>
				{#each stats.facets.find((x) => x.facetName === 'episode')?.facetHits || [] as facet}
					<button
						class={`border border-blue-500 px-2 py-px text-sm md:text-base rounded-lg ${
							filter?.includes(`episode = ${facet.ep}`)
								? 'bg-blue-500 text-white'
								: 'bg-white text-black'
						}`}
						on:click={() => addToFilter('episode', facet.ep)}>{facet.ep}&nbsp;({facet.hits})</button
					>
				{/each}
			</div>
		{/if}
	</details>
</div>
<Stats {stats} {filter} {query} />
{#if hits}
	{#each hits as hit}
		<Hit {hit} />
	{/each}
	{#if stats?.estimatedTotalHits && stats?.estimatedTotalHits > 20}
		<div class="w-full flex justify-center">
			<button
				class="px-4 py-2 rounded-md border border-blue-600 text-blue-600 cursor-pointer"
				on:click={() => {
					offset = offset + 20;
					search();
				}}
			>
				Load more
			</button>
		</div>
	{/if}
{:else}
	<div class="w-full px-4 pt-4 pb-6 mb-6 shadow-md">
		<div class="flex flex-col flex-wrap items-start justify-between w-full gap-2 mb-2">
			<div class="w-1/2 h-8 bg-gray-200 rounded-md animate-pulse">&nbsp;</div>
		</div>
		<div class="h-10 py-2 pl-4 mt-4 bg-gray-200 rounded-md animate-pulse md:text-lg" />
	</div>
{/if}
