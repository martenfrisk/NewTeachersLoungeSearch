<script context="module" lang="ts">
	/**
	 * @type {import('@sveltejs/kit').Load}
	 */
	export async function load({ url }) {
		let query = (await url?.searchParams?.get('s')) || '';
		// let editedOnly = (await url?.searchParams?.has('edited')) || false;
		let filter = (await url?.searchParams?.get('f')?.split(',')) || [];
		if (query === '') query = newRandom();
		const { hits } = await searchMeili(query, filter !== [] && filter, true);
		return {
			query: query,
			filter: filter,
			hits: hits
		};
	}
</script>

<script lang="ts">
	import Search from '$lib/Search.svelte';
	import type { SearchHit } from '$lib/types';
	import { searchMeili, newRandom } from '$lib/utils';
	export let query: string, filter: string[], hits: SearchHit[];
</script>

<Search {query} {filter} {hits} />
