<script lang="ts">
	import eplist from '../assets/episodes.json';
	import Episode from '$lib/Episode.svelte';
	import Fuse from 'fuse.js/dist/fuse.esm';
	$: episodes = eplist;
	$: searchEp = '';
	$: searchDesc = '';
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
	let keys = ['ep', 'desc', 'title'];
	const fuzzy = new Fuse(eplist, {
		useExtentedSearch: true,
		includeScore: true,
		keys: keys
	});
	let exact = false;
	$: hits = [];
	const changeFilter = (param: string) => {
		if (keys.includes(param)) {
			keys = keys.filter((x) => x !== param);
		} else if (keys.length === 0) {
			keys = [param];
		} else {
			keys = [...keys, param];
		}
	};
	const search = (query: string) => {

		searchDesc = query;
		const isExact = exact ? '=' : '';
		const improvedQuery = isExact + query.split(' ').join('+');

		searchDesc = query;
		hits = fuzzy.search(improvedQuery);
	};

</script>

<div
	class="flex justify-center md:justify-start flex-wrap w-full gap-2 pt-6 border-t-2 border-blue-400 md:border-none md:mt-0 mb-4"
>
	<h2 class="w-full mb-4 text-center text-lg">
		Teachers' Lounge interactive episode guide - search through all episode descriptions
	</h2>
	<p>The search on this page isn't perfect.</p>
	<p>You can try using the browser's built-in "Find in Page" if you know what you're looking for (CTRL+F / CMD+F)</p>

	<div class="flex flex-wrap gap-2 items-center">

		<label for="exact" class="text-sm">Exact match?</label>
		<input type="checkbox" id="exact" bind:checked={exact} />
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
		on:input={(event) => search(event.currentTarget.value)}
	/>
	<div class="w-full flex flex-wrap">
		<span>Search only on: </span>
		<button
			class={`rounded-md border-2 px-2 py-1  ${
				keys.includes('ep')
					? 'border-white bg-blue-500 text-white'
					: 'border-blue-800 text-blue-800 bg-white'
			}`}
			on:click={() => changeFilter('ep')}>Episode code (i.e. s01e01)</button
		>
		<button
			class={`rounded-md border-2 px-2 py-1  ${
				keys.includes('title')
					? 'border-white bg-blue-500 text-white'
					: 'border-blue-800 text-blue-800 bg-white'
			}`}
			on:click={() => changeFilter('title')}>Episode title</button
		>
		<button
			class={`rounded-md border-2 px-2 py-1  ${
				keys.includes('desc')
					? 'border-white bg-blue-500 text-white'
					: 'border-blue-800 text-blue-800 bg-white'
			}`}
			on:click={() => changeFilter('desc')}>Description</button
		>
	</div>
</div>
<div class="w-full flex flex-wrap">
	{#if searchDesc === '' && searchEp === ''}
		{#each episodes as episode, index}
			<Episode ep={episode.ep} title={episode.title} desc={episode.desc} date={episode.date} />
		{/each}
	{:else if searchDesc === '' && searchEp !== ''}
		{#each episodes.filter((x) => x.ep.includes(searchEp)) as episode, index}
			<Episode ep={episode.ep} title={episode.title} desc={episode.desc} date={episode.date} />
		{/each}
	{:else}
		{#each hits as episode, index}
			{#if searchEp === ''}
				<Episode
					ep={episode.item.ep}
					title={episode.item.title}
					desc={episode.item.desc}
					date={episode.item.date}
				/>
			{:else if episode.item.ep.includes(searchEp)}
				<Episode
					ep={episode.item.ep}
					title={episode.item.title}
					desc={episode.item.desc}
					date={episode.item.date}
				/>
			{/if}
		{/each}
	{/if}
</div>
