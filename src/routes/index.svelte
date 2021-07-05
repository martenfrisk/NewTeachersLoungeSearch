<script context="module" lang="ts">
	/**
	 * @type {import('@sveltejs/kit').Load}
	 */
	export async function load({ page }) {
		let query = page.query.get('s') || '';
		const filter = page.query.get('f').split(',') || [];
		console.log(filter)
		
		if (query === '') query = newRandom();
		const { hits } = await searchMeili(query, filter, true);
		return {
			query,
			filter,
			hits
		};
	}
</script>

<script lang="ts">
	import Search from '$lib/Search.svelte';
	import type { SearchHit } from '$lib/types';
	import { newRandom, searchMeili } from '$lib/utils';
	export let query: string, filter: string[], hits: SearchHit[];
</script>

<Search {query} {filter} {hits} />
