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
		if (qs === '') {
			qs = newRandom();
		}

		const { hits } = await searchMeili(qs, filter, true);
		return {
			props: {
				query: qs || '',
				hits: hits || [],
				filter
			}
		};
	}
</script>

<script lang="ts">
	import Search from '$lib/Search/index.svelte';
	import { newRandom, searchMeili } from '$lib/Search/utils';
	import type { SearchResult } from '$lib/types';
	export let query: string, hits: SearchResult['hits'], filter: string[];
</script>

<Search {query} {hits} {filter} />
