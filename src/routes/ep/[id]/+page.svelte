<script lang="ts">
	// if (!String.prototype.replaceAll) {
	// 	String.prototype.replaceAll = function (str: any, newStr: any) {
	// 		// If a regex pattern
	// 		if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
	// 			return this.replace(str, newStr);
	// 		}

	// 		// If a string
	// 		return this.replace(new RegExp(str, 'g'), newStr);
	// 	};
	// }
	import type { LocalEpisode } from '$lib/types';

	import { onMount } from 'svelte';
	import epList from 'assets/episodes.json';

	function epName(episode: string) {
		return epList.find((x) => x.ep === episode.replace('.json', ''));
	}
	export let data: any;
	const episode: string = data.episode;
	const query: URLSearchParams = data.query;

	let hits: {
		default: LocalEpisode[];
	};
	const hitIsActive = (ep: string) => {
		if (!query.has('t')) return false;
		if (ep.replaceAll(':', '') === query.get('t')?.replace('t-', '')) return true;
		return false;
	};
	onMount(async () => {
		hits = await import(/* @vite-ignore */ '../../../assets/transcripts/' + episode + '.json');

		if (hits && query.has('t')) {
			setTimeout(() => {
				const anchorId = query.get('t');
				if (anchorId) {
					const anchor = document.getElementById(anchorId) as HTMLElement;
					if (!anchor) return;
					anchor.scrollIntoView({
						behavior: 'auto'
					});
				}
			}, 50);
		}
	});
</script>

<svelte:head>
	<title>
		{epName(episode)?.title} ({epName(episode)?.ep}) - Seekers' Lounge ☕ The Teachers' Lounge
		Search Engine - seekerslounge.pcast.site
	</title>
</svelte:head>

<div class="mt-4">
	<p class="mb-6">Use your browser's "Find in Page" function to search here (CTRL+F or CMD+F).</p>
	<div class="text-lg text-gray-700 uppercase">{epName(episode)?.ep}</div>
	<div class="text-lg text-gray-800 md:text-xl">{epName(episode)?.title}</div>
	<p class="px-4 my-8 md:mr-10">{epName(episode)?.desc}</p>
	{#if hits}
		{#each hits.default as hit}
			<div
				class={`w-full border-2 px-4 pb-6 mb-6 shadow-md hover:bg-blue-50 ${
					hitIsActive(hit.time) ? 'border-blue-500' : 'border-blue-100'
				}`}
				id={`t-${hit.time.replaceAll(':', '')}`}
			>
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
