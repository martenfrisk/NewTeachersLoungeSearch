<script lang="ts">
	import { onMount } from 'svelte';
	import type { SearchHit, SearchResult, Stats } from '$lib/types';
	import { newRandom, searchMeili, throttle, timeToUrl } from './utils';
	import { page } from '$app/stores';
	import type { MeiliResult } from './utils';
	import epList from '../assets/episodes.json';

	if (!String.prototype.replaceAll) {
		String.prototype.replaceAll = function (str, newStr) {
			if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
				return this.replace(str, newStr);
			}
			return this.replace(new RegExp(str, 'g'), newStr);
		};
	}

	export let query: string, filter: string[], hits: SearchHit[];
	let stats: Stats;

	function epName(episode: string) {
		return epList.find((x) => x.ep === episode);
	}
	$: stats;
	$: filter = filter;
	$: query = query;

	async function search() {
		await searchMeili(query, filter).then((data) => {
			hits = data.hits;
			stats = data.stats;
		});
	}

	async function addToFilter(filterName: string, filterValue: string) {
		const combinedFilter = `${filterName} = ${filterValue}`;
		filter.includes(combinedFilter)
			? (filter = filter.filter((x) => x !== combinedFilter))
			: (filter = [combinedFilter, ...filter]);

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
		setTimeout(() => {
			if (location !== undefined) {
				query = new URLSearchParams(location.search).get('s') || '';
				filter =
					new URLSearchParams(location.search).get('f')?.replaceAll('=', ' = ').split(',') || [];
			}
			if (query === '') {
				query = newRandom();

				// const urlParams = new URLSearchParams(`s=${query}`);

				// if (history.pushState) {
				// 	let newUrl =
				// 		window.location.protocol +
				// 		'//' +
				// 		window.location.host +
				// 		window.location.pathname +
				// 		'?' +
				// 		urlParams;
				// 	if (filter && filter.length > 0)
				// 		newUrl = `${newUrl}&f=${filter.map((x) => x.replace(' = ', '=')).join(',')}`;
				// 	window.history.pushState({ path: newUrl }, '', newUrl);
				// }
			}
			search();
		}, 100);
	});
</script>

<div class="w-full flex-wrap flex justify-center md:items-center my-4 px-6">
	<div class="w-full md:pl-4">
		<label for="search" class="text-sm">Search</label>
	</div>
	<input
		class="w-full md:w-4/5 h-12 px-4 shadow-md  rounded-l-md rounded-r-md md:rounded-r-none text-xl border border-gray-500 outline-none"
		type="text"
		id="search"
		bind:value={query}
		on:keyup={search}
	/>
	<button
		class="w-1/2 md:w-1/5 md:h-12 rounded-l-md bg-blue-50 text-blue-800 font-semibold rounded-r-md md:rounded-l-none border-blue-500 border-2 px-2 text-sm md:text-base py-2 hover:bg-blue-500 hover:text-white hover:border-white shadow-md"
		on:click={getNewRandom}>Random search</button
	>
</div>
<div class="w-full flex flex-col flex-wrap px-6 my-2 gap-2">
	<details>
		<summary class="cursor-pointer ">
			<span class="hover:underline"> Filter by season or episode </span>
			{#if filter?.length > 0}
				<span
					class="ml-2 border-b border-gray-500 border-dotted text-sm text-gray-700"
					on:click={clearFilter}>(clear filter)</span
				>
			{/if}
		</summary>
		{#if stats?.facets}
			<div class="flex w-5/6 flex-wrap max-w-screen my-2 gap-2">
				<span class="block w-full md:inline md:w-auto">season:</span>
				{#each stats.facets.find((x) => x.facetName === 'season').facetHits as facet}
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
			<div class="flex w-5/6 flex-wrap max-w-screen my-2 gap-2">
				<span class="block w-full md:inline md:w-auto">episode:</span>
				{#each stats.facets.find((x) => x.facetName === 'episode').facetHits as facet}
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
{#if stats?.nbHits > 0}
	<p class="md:mt-6 md:mb-8 text-center">
		{stats.nbHits} hits for <em>{query}</em>
		{#if filter?.length > 0}
			<span class="text-sm w-full block md:inline md:w-auto">
				&nbsp;in&nbsp;
				{filter.map((x) => x.replace('=', '')).join(', ')}
			</span>
		{/if}

		<span class="text-sm">(results retrieved in {stats.processingTime}ms)</span>
	</p>
{:else}
	<p class="mt-6 mb-8">
		<span class="h-8 bg-gray-100 animate-pulse w-20" />
	</p>
{/if}
{#if hits}
	{#each hits as hit}
		<div class="w-full px-4 pt-4 pb-6 mb-6 shadow-xl rounded-md border border-blue-200 md:shadow-md hover:bg-blue-50">
			<div class="flex flex-wrap items-center justify-between w-full mb-2">
				<div class="flex md:items-center flex-col md:flex-row">
					<div class="mr-2 text-sm text-gray-800 uppercase">{epName(hit.episode).ep}</div>
					<div class="text-sm text-gray-900 md:text-base">{epName(hit.episode).title}</div>
				</div>
				<div class="flex items-center justify-between w-full md:w-auto mt-2 md:mt-0 font-mono text-right text-gray-600">
					<div class="mr-2 font-sans text-black">{hit.speaker}</div>
					<div class="mr-2 font-sans text-right text-blue-600 border-b-2 border-dotted">
						<a
							href={`/ep/${epName(hit.episode).ep}?${timeToUrl(
								`t-${hit.time.replaceAll(':', '')}`
							)}`}
						>
							transcript
						</a>
					</div>
					<div class="mr-2 font-sans text-right text-blue-600 border-b-2 border-dotted">
						<a href={epName(hit.episode).url}> listen </a>
					</div>
					{hit.time}&nbsp;
					{#if hit.edited}
						<span class="text-2xl text-green-400">✔</span>
					{:else}
						<span class="text-2xl text-gray-400">&minus;</span>
					{/if}
				</div>
			</div>
			<div class="py-2 pr-2 pl-2 md:pr-0 md:pl-4 mt-4 border-l-2 border-gray-400 md:text-lg">
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
