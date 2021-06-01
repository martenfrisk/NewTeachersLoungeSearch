<script lang="ts">
	import epList from '../../assets/episodes.json';
	import Highlight from './Highlight.svelte';
	export let hit: any;
	let epClean = hit.episode.replace('.json', '');
	let epName = epList.find((x) => x.ep === epClean);
</script>

<div class="w-full px-4 pb-6 mb-6 shadow-md hover:bg-blue-100">
	<div class="flex flex-wrap items-center justify-between w-full mb-2">
		<div class="flex items-center">
			<div class="pt-1 mr-2 text-xs text-gray-700 uppercase">{epName.ep}</div>
			<div class="text-sm text-gray-800 md:text-base">{epName.title}</div>
		</div>
		<div class="flex items-center font-mono text-right text-gray-600">
			<div class="mr-2 font-sans text-black">{hit.speaker}</div>
			<div class="mr-2 font-sans text-right text-blue-600 border-b-2 border-dotted">
				<a href={`/ep/${epName.ep}#:~:text=${hit.time}`}> go to transcript </a>
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
		<Highlight attribute="line" {hit} />
	</div>
</div>
