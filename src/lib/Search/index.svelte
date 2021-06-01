<script lang="ts">
	import { onMount } from 'svelte';
	import algoliasearch from 'algoliasearch';
	// import instantsearch from 'instantsearch.js';
	// import type { SearchHit } from '$lib/types';
	import { getRandomInt, highlight, randomQuery, secToMins, throttle } from './utils';
	import epList from '../../assets/episodes.json';
	import { AlgoliaKey } from '$lib/Env';

	function epName(episode) {
		return epList.find((x) => x.ep === episode.replace('.json', ''));
	}
	const searchClient = algoliasearch('S2MS0LQ16O', AlgoliaKey);
	const searchIndex = searchClient.initIndex('teachers');
	export let query: string;
	let stats: {
		facets;
		processingTime;
		hits;
	};
	$: stats;
	$: filter = '';
	$: results = [];
	function addToFilter(ep: string) {
		// if (filter.some((x) => x.ep === ep)) {
		// 	filter = filter.filter((x) => x.ep !== ep);
		// } else {
		// 	filter.push({ ep, nr });
		// }
		// console.log({ filter });
		filter === ep ? (filter = '') : (filter = ep);
		search();
	}
	// 	filter = '',
	// 	stats: {
	// 		nbHits: SearchResult['nbHits'];
	// 		processingTime: SearchResult['processingTimeMs'];
	// 	};
	// const client = new MeiliSearch({
	// 	host: 'https://meili-router-ial3qgyr4bd1o9oc-gtw.qovery.io',
	// 	apiKey: 'masterKey'
	// });

	// const index = client.index('teachers');
	async function search() {
		// 	const data =
		// 		filter === ''
		// 			? await index.search(query, { attributesToHighlight: ['line'] })
		// 			: await index.search(query, {
		// 					attributesToHighlight: ['line'],
		// 					filters: `episode = "${filter}"`
		// 			  });

		// 	stats = {
		// 		nbHits: data.nbHits,
		// 		processingTime: data.processingTimeMs
		// 	};
		// 	console.log({hits})
		const urlParams = new URLSearchParams(`s=${query}`);

		if (history.pushState) {
			const newUrl =
				window.location.protocol +
				'//' +
				window.location.host +
				window.location.pathname +
				'?' +
				urlParams;
			window.history.pushState({ path: newUrl }, '', newUrl);
		}

		if (filter !== '') {

			searchIndex
				.search(query, {
					filters: 'episode:' + filter,
					facets: ['episode']
				})
				.then((data) => {
					stats = {
						facets: stats?.facets || '',
						processingTime: data.processingTimeMS,
						hits: data.nbHits
					};

					results = data.hits;
				});
		} else {

			searchIndex
				.search(query, {
					facets: ['episode']
				})
				.then((data) => {

					stats = {
						facets: data.facets,
						processingTime: data.processingTimeMS,
						hits: data.nbHits
					};
					results = data.hits;
				});
		}
	}

	// Search the "category" facet for values matching "phone" in records
	// searchIndex.searchForFacetValues('episode', 's01e02').then(({ facetHits }) => {
	//   console.log(facetHits);
	// });

	// const throttledSearch = throttle(500, search);

	onMount(() => {
		if (query === '') query = randomQuery[getRandomInt(randomQuery.length)];
		search();
	});
	// const findEpNr = (title: string, returnValue: string) => {
	// 	const epNr = EpList.find((x) => x.title == title);
	// 	if (epNr) return epNr[returnValue];
	// 	return null;
	// };
	function newRandom() {
		query = randomQuery[getRandomInt(randomQuery.length)];
		search();
	}
</script>

<div class="w-full flex my-4 px-6">
	<input
		class="w-2/3 md:w-4/5 h-12 px-4 shadow-md rounded-md text-xl border border-gray-500 outline-none"
		type="text"
		bind:value={query}
		on:keyup={search}
	/>
	<button
		class="w-1/3 md:w-1/5 rounded-md border-blue-500 border-2 px-2 text-sm md:text-base py-2 hover:bg-blue-500 hover:text-white hover:border-white shadow-md"
		on:click={newRandom}>Random search</button
	>
</div>
{#if stats?.facets?.episode}
	<div class="w-full flex flex-wrap px-6 my-2 gap-2 justify-center">
		<p class="w-full text-sm text-center">Narrow down your search</p>
		{#each Object.entries(stats.facets.episode) as [key, value], index}
			{#if index < 6}
				<button
					class={`border border-blue-500 px-2 py-px rounded-lg ${
						filter === key ? 'bg-blue-500 text-white' : 'bg-white text-black'
					}`}
					on:click={() => addToFilter(key)}>{key.replace('.json', '')}&nbsp;({value})</button
				>
			{/if}
		{/each}
	</div>
{/if}
{#if query !== '' && stats?.hits > 0}
	<p>
		{stats.hits} hits for <em>{query}</em>{filter !== ''
			? ` in ${filter.replace('.json', '')}`
			: ''}; results retrieved in {stats.processingTime}ms
	</p>
{/if}
{#if results}
	{#each results as hit}
		<div class="w-full px-4 pb-6 mb-6 shadow-md hover:bg-blue-100">
			<div class="flex flex-wrap items-center justify-between w-full mb-2">
				<div class="flex items-center">
					<div class="pt-1 mr-2 text-xs text-gray-700 uppercase">{epName(hit.episode).ep}</div>
					<div class="text-sm text-gray-800 md:text-base">{epName(hit.episode).title}</div>
				</div>
				<div class="flex items-center font-mono text-right text-gray-600">
					<div class="mr-2 font-sans text-black">{hit.speaker}</div>
					<div class="mr-2 font-sans text-right text-blue-600 border-b-2 border-dotted">
						<a href={`/ep/${epName(hit.episode).ep}#:~:text=${hit.time}`}> go to transcript </a>
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
				<p>{@html hit._highlightResult.line.value}</p>
			</div>
		</div>
	{/each}
{/if}
