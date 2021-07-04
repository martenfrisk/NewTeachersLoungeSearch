<script lang="ts">
	import { onMount } from 'svelte';
	import type { SearchHit, SearchResult } from '$lib/types';
	import { newRandom, searchMeili, throttle, timeToUrl } from './utils';
	import type { MeiliResult } from './utils';
	import epList from '../../assets/episodes.json';
	if (!String.prototype.replaceAll) {
		String.prototype.replaceAll = function(str, newStr){
	
			// If a regex pattern
			if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
				return this.replace(str, newStr);
			}
	
			// If a string
			return this.replace(new RegExp(str, 'g'), newStr);
	
		};
	}
	// let query = '';
	let stats: {
		nbHits: SearchResult['nbHits'];
		processingTime: SearchResult['processingTimeMs'];
		facets: MeiliResult['stats']['facets'];
	};
	function epName(episode: string) {
		return epList.find((x) => x.ep === episode);
	}
	export let query: string, hits: SearchHit[], filter: string[];

	async function search() {
		await searchMeili(query, filter).then((data) => {
			hits = data.hits;
			stats = data.stats;
		});
	}
	$: stats;
	async function addToFilter(filterName: string, filterValue: string) {
		const combinedFilter = `${filterName} = ${filterValue}`;
		filter.includes(combinedFilter) ? filter = filter.filter(x => x !== combinedFilter) : filter.push(combinedFilter)
		await search();
	}
	async function clearFilter() {
		filter = [];
		await search();
	}
	const getNewRandom = async () => {
		query = newRandom();
		filter = [];
		await search();
	};
	onMount(async () => {
		if (query === '') {
			query = newRandom();

			const urlParams = new URLSearchParams(`s=${query}`);

			if (history.pushState) {
				let newUrl =
					window.location.protocol +
					'//' +
					window.location.host +
					window.location.pathname +
					'?' +
					urlParams;
		if (filter.length > 0) newUrl = `${newUrl}&f=${filter.map(x => x.replace(' = ', '=')).join(',')}`;
				window.history.pushState({ path: newUrl }, '', newUrl);
			}
		}
		await search();
	});
</script>

<div class="w-full flex-wrap flex items-center my-4 px-6">
	<div class="w-full pl-4">
		<label for="search" class="text-sm">Search</label>
	</div>
	<input
		class="w-full md:w-4/5 h-12 px-4 shadow-md  rounded-l-md rounded-r-md md:rounded-r-none text-xl border border-gray-500 outline-none"
		type="text"
		id="search"
		bind:value={query}
		on:keyup={() => throttle(500, search)}
	/>
	<button
		class="w-1/2 md:w-1/5 h-12 rounded-l-md bg-blue-50 text-blue-800 font-semibold rounded-r-md md:rounded-l-none border-blue-500 border-2 px-2 text-sm md:text-base py-2 hover:bg-blue-500 hover:text-white hover:border-white shadow-md"
		on:click={getNewRandom}>Random search</button
	>
</div>
{#if stats}
	<div class="w-full flex flex-col flex-wrap px-6 my-2 gap-2">
		<details>
			<summary class="cursor-pointer ">
				<span class="hover:underline"> Filter by season or episode </span>
				{#if filter.length > 0}
					<span class="ml-2 border-b border-gray-500 border-dotted text-sm text-gray-700" on:click={clearFilter}>(clear filters)</span>
				{/if}
			</summary>

			<div class="flex w-full my-2 gap-2">
				<span>season:</span>
				{#each stats.facets.find((x) => x.facetName === 'season').facetHits as facet}
					<button
						class={`border border-blue-500 px-2 py-px focus:outline-none focus:border-black rounded-lg ${
							filter.includes(`season = ${facet.ep}`) ? 'bg-blue-500 text-white' : 'bg-white text-black'
						}`}
						on:click={() => addToFilter('season', facet.ep)}>{facet.ep}&nbsp;({facet.hits})</button
					>
				{/each}
			</div>
			<div class="flex w-full gap-2">
				<span>episode:</span>
				{#each stats.facets.find((x) => x.facetName === 'episode').facetHits as facet}
					<button
						class={`border border-blue-500 px-2 py-px rounded-lg ${
							filter.includes(`episode = ${facet.ep}`) ? 'bg-blue-500 text-white' : 'bg-white text-black'
						}`}
						on:click={() => addToFilter('episode', facet.ep)}>{facet.ep}&nbsp;({facet.hits})</button
					>
				{/each}
			</div>
		</details>
	</div>
{/if}
{#if query !== '' && stats?.nbHits > 0}
	<p class="mt-6 mb-8">
		{stats.nbHits} hits for <em>{query}</em>
		{filter.length > 0 ? ` in ${filter.map(x => x.replace('=', '')).join(', ')}` : ''}

		<span class="text-sm">(results retrieved in {stats.processingTime}ms)</span>
	</p>
{:else}
	<p class="mt-6 mb-8">
		<span class="h-8 bg-gray-100 animate-pulse w-20" />
	</p>
{/if}
{#if hits}
	{#each hits as hit}
		<div class="w-full px-4 pt-4 pb-6 mb-6 shadow-md hover:bg-blue-50">
			<div class="flex flex-wrap items-center justify-between w-full mb-2">
				<div class="flex items-center">
					<div class="mr-2 text-sm text-gray-800 uppercase">{epName(hit.episode).ep}</div>
					<div class="text-sm text-gray-900 md:text-base">{epName(hit.episode).title}</div>
				</div>
				<div class="flex items-center font-mono text-right text-gray-600">
					<div class="mr-2 font-sans text-black">{hit.speaker}</div>
					<div class="mr-2 font-sans text-right text-blue-600 border-b-2 border-dotted">
						<a
							href={`/ep/${epName(hit.episode).ep}?${timeToUrl(
								`t-${hit.time.replaceAll(':', '')}`
							)}`}
						>
							go to transcript
						</a>
					</div>
					{hit.time}&nbsp;
					{#if hit.edited}
						<span class="text-2xl text-green-400">✔</span>
					{:else}
						<span class="text-2xl text-gray-400">&minus;</span>
					{/if}
				</div>
			</div>
			<div class="py-2 pl-4 mt-4 border-l-2 border-gray-400 md:text-lg">
				<p>{@html hit._formatted.line}</p>
			</div>
		</div>
	{/each}
{:else}
	<div class="w-full px-4 pt-4 pb-6 mb-6 shadow-md">
		<div class="flex flex-col flex-wrap items-start gap-2 justify-between w-full mb-2">
			<div class="rounded-md animate-pulse w-1/2 bg-gray-200 h-8">&nbsp;</div>
		</div>
		<div class="bg-gray-200 animate-pulse rounded-md h-10 py-2 pl-4 mt-4 md:text-lg" />
	</div>
{/if}
