<script context="module" lang="ts">
	export const prerender = true;
	/**
	 * @type {import('@sveltejs/kit').Load}
	 */
	export async function load({ page }) {
		console.log(page.query.toString())
		
		const qs = page.query.get('s');
		const filter = page.query.get('f');
		console.log(qs)
		
		return {
			props: {
				page,
				query: qs || '',
				filter: filter || []
			}
		};
	}
</script>

<script lang="ts">
	import Search from '$lib/Search.svelte';
	export let query: string, filter: any[], page: any;
</script>

<Search {query} {filter} {page} />
