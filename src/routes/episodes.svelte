<script lang="ts">
	import episodes from '../assets/episodes.json';
	import Episode from '$lib/Episode.svelte';
	// import algoliasearch from 'algoliasearch';
	// import { AlgoliaKey } from '$lib/Env';
	// import Hit from '$lib/Search/Hit.svelte';
	$: searchEp = '';
	const seasons = [
		'',
		's01',
		's02',
		's03',
		's04',
		's05',
		's06',
		's07',
		's08',
		's09',
		'mini',
		'Live'
	];

	// const searchClient = algoliasearch('S2MS0LQ16O', AlgoliaKey);
	// const searchIndex = searchClient.initIndex('teachers_eps');
	// $: query = '';
	// $: results = [];
	// async function search() {
	// 	searchIndex
	// 		.search(query, {
	// 			facets: ['ep']
	// 		})
	// 		.then((data) => {
	// 			results = data.hits;
	// 		});
	// }
</script>

<svelte:head>
	<title
		>Episode List - Seekers' Lounge ☕ The Teachers' Lounge Search Engine -
		teacherslounge.pcast.site</title
	>
</svelte:head>

<div
	class="flex justify-center md:justify-start flex-wrap w-full gap-2 pt-6 border-t-2 border-blue-400 md:border-none md:mt-0 mb-4"
>
	<h2 class="w-full mb-4 text-center text-lg">
		Teachers' Lounge episode guide
	</h2>
	<div class="flex flex-wrap gap-2 items-center">
		<label for="season" class="ml-4 text-sm">Filter by season: </label>
		<select
			bind:value={searchEp}
			class="cursor-pointer rounded-md w-24 h-12 bg-blue-50 pl-4 font-semibold shadow-md border border-blue-400"
			name="season"
			id="season"
		>
			{#each seasons as season}
				<option value={season}>{season}</option>
			{/each}
		</select>
	</div>
	<!-- <input
		placeholder="Search in descriptions, by episode name (s01e03, mini-44, Peecast) or episode title"
		type="text"
		class="p-2 w-full border-blue-400 rounded-md border py-4"
		bind:value={query}
		on:input={search}
	/> -->
</div>
<div class="w-full flex flex-wrap">
	{#each episodes as episode}
		{#if searchEp === ''}
			<Episode ep={episode.ep} title={episode.title} desc={episode.desc} date={episode.date} />
		{:else if episode.ep.includes(searchEp)}
			<Episode ep={episode.ep} title={episode.title} desc={episode.desc} date={episode.date} />
		{/if}
	{/each}
	<!-- {#if query === ''}
	{:else}
		{#each results as episode}
		{/each}
	{/if} -->
</div>
