<script lang="ts">
	import episodes from 'assets/episodes.json';
	import Episode from '$lib/components/Episode.svelte';
	import Fuse, { type FuseResult } from 'fuse.js';
	const fuse = new Fuse(episodes, {
		keys: [{ name: 'desc', weight: 1 }, 'ep', { name: 'title', weight: 3 }],
		includeScore: true
	});

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
		's10',
		's11',
		'mini',
		'exit42',
		'Peecast',
		'holidays',
		'jesus',
		'lastresort'
	];

	$: query = '';

	let results: FuseResult<{
		ep: string;
		title: string;
		desc: string;
		date: string;
		url: string;
	}>[] = [];
	async function search() {
		results = fuse.search(query);
	}
	const episodesList = [
		'Peecast',
		'mini-01',
		'mini-02',
		'mini-03',
		'mini-04',
		'mini-05',
		'mini-06',
		'mini-07',
		'mini-08',
		'mini-09',
		'mini-10',
		'mini-11',
		'mini-12',
		'mini-13',
		'mini-14',
		'mini-15',
		'mini-16',
		'mini-17',
		'mini-18',
		'mini-19',
		'mini-20',
		'mini-21',
		'mini-22',
		'mini-23',
		'mini-24',
		'mini-25',
		'mini-26',
		'mini-27',
		'mini-28',
		'mini-29',
		'mini-30',
		'mini-31',
		'mini-32',
		'mini-33',
		'mini-34',
		'mini-35',
		'mini-36',
		'mini-37',
		'mini-38',
		'mini-39',
		'mini-40',
		'mini-41',
		'mini-42',
		'mini-43',
		'mini-44',
		'mini-45',
		'mini-46',
		'mini-47',
		'mini-48',
		'mini-49',
		'mini-50',
		'mini-51',
		'mini-52',
		'mini-53',
		'mini-54',
		'mini-55',
		'mini-56',
		's01e01',
		's01e02',
		's01e03',
		's01e04',
		's01e05',
		's01e06',
		's02e01',
		's02e02',
		's02e03',
		's02e04',
		's02e05',
		's02e06',
		's03e01',
		's03e02',
		's03e03',
		's03e04',
		's03e05',
		's03e06',
		's03e07',
		's03e08',
		's04e01',
		's04e02',
		's04e03',
		's04e04',
		's04e05',
		's04e06',
		's04e07',
		's04e08',
		's04e09',
		's05e01',
		's05e02',
		's05e03',
		's05e04',
		's05e05',
		's05e06',
		's05e07',
		's05e08',
		's06e01',
		's06e02',
		's06e03',
		's06e04',
		's06e05',
		's06e06',
		's06e07',
		's07e01',
		's07e02',
		's07e03',
		's07e04',
		's07e05',
		's07e06',
		's07e07',
		's08e01',
		's08e02',
		's08e03',
		's08e04',
		's08e05',
		's08e06',
		's08e07',
		's09e01',
		's09e02',
		's09e03',
		's09e04',
		's09e05',
		's09e06',
		's09e07',
		's09e08',
		's09e09',
		's09e10',
		's09e11',
		's09e12',
		's09e13',
		's09e14',
		's09e15',
		's09e16',
		's09e17',
		's09e18',
		's09e19',
		's09e20',
		's09e21',
		's09e22',
		's09e23',
		's09e24',
		's09e25',
		's09e26',
		's09e27',
		's09e28',
		's09e29',
		's09e30',
		's09e31',
		's09e32',
		's09e33',
		's09e34',
		's09e35',
		's09e36',
		's09e37',
		's09e38',
		's09e39',
		's09e40'
	];
</script>

<svelte:head>
	<title>
		Episode List - Seekers' Lounge ☕ The Teachers' Lounge Search Engine - seekerslounge.pcast.site
	</title>
</svelte:head>

<div
	class="flex justify-center md:justify-start flex-wrap w-full gap-2 pt-6 border-t-2 border-blue-400 md:border-none md:mt-0 mb-4"
>
	<h2 class="w-full mb-4 text-center text-lg">Teachers' Lounge episode guide</h2>
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
	<input
		placeholder="Search in descriptions, by episode name (s01e03, mini-44, Peecast) or episode title"
		type="text"
		class="p-2 w-full border-blue-400 rounded-md border py-4"
		bind:value={query}
		on:input={search}
	/>
</div>
<div class="w-full flex flex-wrap">
	{#if query === ''}
		{#each episodes as episode}
			{#if searchEp === ''}
				<Episode
					url={episode.url || ''}
					ep={episode.ep}
					title={episode.title}
					desc={episode.desc}
					date={episode.date}
				/>
			{:else if episode.ep.includes(searchEp)}
				<Episode
					url={episode.url || ''}
					ep={episode.ep}
					title={episode.title}
					desc={episode.desc}
					date={episode.date}
				/>
			{/if}
		{/each}
	{:else}
		{#each results as episode}
			<Episode
				url={episode.item.url || ''}
				ep={episode.item.ep}
				title={episode.item.title}
				desc={episode.item.desc}
				date={episode.item.date}
			/>
		{/each}
	{/if}
</div>
<!-- 
<div class="flex flex-wrap flex-row">
	{#each episodesList as ep}
		<a href={`/ep/${ep}`} class="mr-4 text-sm text-blue-800" rel="prefetch">{ep}</a>
	{/each}
</div> -->
