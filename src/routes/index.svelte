<script context="module" lang="ts">
	/**
	 * @type {import('@sveltejs/kit').Load}
	 */
	export async function load({ page }) {
		let query = (await page.query.get('s')) || '';
		let editedOnly = (await page.query.has('edited')) || false;
		let filter = (await page.query.get('f')?.split(',')) || [];
		if (query === '') query = newRandom();
		// const { hits } = await searchMeili(query, filter !== [] && filter, true, editedOnly);
		return {
			query: query,
			filter: filter
			// hits: hits
		};
	}
</script>

<script lang="ts">
	import Search from '$lib/Search.svelte';
	// import type { MongoHighlightHit } from '$lib/types';
	import { newRandom, searchMeili } from '$lib/utils';
	export let query: string, filter: string[];
	// , hits: MongoHighlightHit[];
</script>

<Search {query} {filter} />
