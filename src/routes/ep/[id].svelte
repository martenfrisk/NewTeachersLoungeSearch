<script context="module">
	export async function load({ page, fetch }) {
		const { id } = page.params;
		return {
			props: {
				episode: id,
			}
		};
	}

</script>

<script lang="ts">
	import type { LocalEpisode } from '$lib/types';

	import { onMount } from 'svelte';
	import epList from '../../assets/episodes.json';

	function epName(episode) {
		return epList.find((x) => x.ep === episode.replace('.json', ''));
	}
	export let episode
  
	let hits: {
		default: LocalEpisode[];
	};
	onMount(async () => {
		hits = await import('../../assets/transcripts/' + episode + '.json');
	});

</script>

<div class="mt-4">
  <p class="mb-6">Use your browsers "Find in Page" function to search here (CTRL+F or CMD+F).</p>
	<div class="text-lg text-gray-700 uppercase">{epName(episode).ep}</div>
	<div class="text-lg text-gray-800 md:text-xl">{epName(episode).title}</div>
  <p class="my-8 px-4 md:mr-10">{epName(episode).desc}</p>
  {#if hits}
	{#each hits.default as hit}
  <div class="w-full px-4 pb-6 mb-6 shadow-md hover:bg-blue-50">
    <div class="flex flex-wrap items-center justify-between w-full mb-2">
      <div class="flex items-center">{hit.time}</div>
      <div class="flex items-center font-mono text-right text-gray-600">
					<div class="mr-2 font-sans text-black">{hit.speaker}</div>
					&nbsp;
					{#if hit.edited}
          <span class="text-2xl text-green-400">✔</span>
					{:else}
          <span class="text-2xl text-gray-400">&minus;</span>
					{/if}
				</div>
			</div>
			<div class="py-2 pl-4 mt-4 md:text-lg">
        <p>{hit.line}</p>
			</div>
		</div>
	{/each}
  {/if}
  
</div>