<script context="module" lang="ts">
	export const prerender = true;
	/**
	 * @type {import('@sveltejs/kit').Load}
	 */
	export async function load({ page }) {
		let qs = page.query.get('s');
		let filter = [];

		if (page.query.has('f'))
			filter = page.query
				.get('f')
				.split(',')
				.map((x: string) => x.replace('=', ' = '));
		if (!page.query.has('s')) {
			qs = newRandom();
		}

		const { hits, stats } = await searchMeili(qs, filter, true);
		return {
			props: {
				query: qs || '',
				hits: hits || [],
				stats: stats || {},
				filter
			}
		};
	}
</script>

<script lang="ts">
	import Search from '$lib/Search.svelte';
	import { newRandom, searchMeili } from '$lib/utils';
	import type { SearchResult, Stats } from '$lib/types';
	export let query: string, hits: SearchResult['hits'], filter: string[], stats: Stats;
</script>

<Search {query} {hits} {filter} {stats} />
