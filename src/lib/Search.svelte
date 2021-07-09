<script lang="ts">
	import { onMount } from 'svelte';
	import type { SearchHit, Stats } from '$lib/types';
	import { newRandom, searchMeili, throttle, timeToUrl } from './utils';
	import epList from '../assets/episodes.json';
	import Tooltip from './Tooltip.svelte';

	if (!String.prototype.replaceAll) {
		String.prototype.replaceAll = function (str, newStr) {
			if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
				return this.replace(str, newStr);
			}
			return this.replace(new RegExp(str, 'g'), newStr);
		};
	}

	export let query: string, filter: string[], hits: SearchHit[];
	let stats: Stats,
		filterEdited = false;

	function epName(episode: string) {
		return epList.find((x) => x.ep === episode);
	}
	$: stats;
	$: filter = filter;
	$: query = query;

	async function search() {
		await searchMeili(query, filter, false, filterEdited).then((data) => {
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

				filterEdited = new URLSearchParams(location.search).has('edited') || false;
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
	<label for="editedOnly" class="flex items-baseline gap-2 text-sm cursor-pointer">
		Edited lines only
		<input type="checkbox" id="editedOnly" bind:checked={filterEdited} on:change={() => search()} />
	</label>
	<details>
		<summary class="cursor-pointer ">
			<span class="hover:underline"> Filter by season or episode </span>
			{#if filter?.length > 0}
				<span
					class="ml-2 text-sm text-gray-700 border-b border-gray-500 border-dotted"
					on:click={clearFilter}>(clear filter)</span
				>
			{/if}
		</summary>
		{#if stats?.facets}
			<div class="flex flex-wrap w-5/6 gap-2 my-2 max-w-screen">
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
			<div class="flex flex-wrap w-5/6 gap-2 my-2 max-w-screen">
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
	<p class="flex flex-wrap gap-1 my-4 text-sm md:mt-6 md:mb-8">
		<span>
			{stats.nbHits} hits for <em>"{query}"</em>
			{#if filter?.length > 0}
				<span class="text-sm">
					&nbsp;in&nbsp;
					{filter.map((x) => x.replace('=', '')).join(', ')}
				</span>
			{/if}
		</span>
		<span>(results retrieved in {stats.processingTime}ms)</span>
	</p>
{:else if stats?.nbHits == 0}
	<p class="flex flex-wrap gap-1 my-4 text-sm md:mt-6 md:mb-8">
		No results for <em>"{query}"</em>
		{filterEdited ? '(edited lines only)' : ''} ☹
	</p>
{:else}
	<p class="mt-6 mb-8">
		<span class="w-20 h-8 bg-gray-100 animate-pulse" />
	</p>
{/if}
{#if hits}
	{#each hits as hit}
		<div
			class="w-full px-4 pt-4 pb-2 mb-6 border border-blue-200 rounded-md shadow-xl md:shadow-md hover:bg-blue-50"
		>
			<div class="flex flex-wrap items-center justify-between w-full mb-2">
				<div class="flex flex-row md:items-center">
					<Tooltip>
						<svelte:fragment slot="tooltip">Go to episode page</svelte:fragment>
						<svelte:fragment slot="content">
							<a
								class="mr-2 text-sm text-blue-900 uppercase hover:underline"
								href={`/ep/${epName(hit.episode).ep}`}
							>
								{epName(hit.episode).ep}
							</a>
						</svelte:fragment>
					</Tooltip>
					<div class="text-sm text-gray-900 md:text-base">{epName(hit.episode).title}</div>
				</div>

				<div class="w-full px-1 my-4 border-gray-400 md:pl-6 md:border-l-2 md:text-lg">
					<p>{@html hit._formatted.line}</p>
				</div>
				<div
					class="flex items-center justify-between w-full mt-2 font-mono text-sm text-right text-gray-600 md:text-base md:mt-0"
				>
					<div class="flex items-center gap-3 mr-2 font-sans ">
						<span class="text-black border-none">
							{hit.speaker}
						</span>
						<span>
							{hit.time}
						</span>
						{#if hit.edited}
							<Tooltip>
								<svelte:fragment slot="tooltip">Edited</svelte:fragment>
								<svelte:fragment slot="content">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-6 h-6 text-green-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
										/>
									</svg>
								</svelte:fragment>
							</Tooltip>
						{:else}
							<Tooltip>
								<svelte:fragment slot="tooltip">Not edited</svelte:fragment>
								<svelte:fragment slot="content">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-gray-500"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</svelte:fragment>
							</Tooltip>
						{/if}
					</div>
					<div class="flex gap-4 ">
						<Tooltip>
							<svelte:fragment slot="tooltip">Go to line in transcript</svelte:fragment>
							<svelte:fragment slot="content">
								<a
									href={`/ep/${epName(hit.episode).ep}?${timeToUrl(
										`t-${hit.time.replaceAll(':', '')}`
									)}`}
									class="font-sans text-base text-blue-600 border-b-2 border-blue-200 border-dotted group hover:border-solid"
								>
									transcript
								</a>
							</svelte:fragment>
						</Tooltip>
						<Tooltip>
							<svelte:fragment slot="tooltip">Listen on Stitcher</svelte:fragment>
							<svelte:fragment slot="content">
								<a
									class="font-sans text-base text-blue-600 border-b-2 border-blue-200 border-dotted has-tooltip hover:border-solid"
									href={epName(hit.episode).url}
								>
									listen
								</a>
							</svelte:fragment>
						</Tooltip>
					</div>
				</div>
			</div>
		</div>
	{/each}
{:else}
	<div class="w-full px-4 pt-4 pb-6 mb-6 shadow-md">
		<div class="flex flex-col flex-wrap items-start justify-between w-full gap-2 mb-2">
			<div class="w-1/2 h-8 bg-gray-200 rounded-md animate-pulse">&nbsp;</div>
		</div>
		<div class="h-10 py-2 pl-4 mt-4 bg-gray-200 rounded-md animate-pulse md:text-lg" />
	</div>
{/if}
