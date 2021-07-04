<script context="module" lang="ts">
	export const prerender = true;
	/**
	 * @type {import('@sveltejs/kit').Load}
	 */
	export async function load({ page }) {
		const qs = page.query.get('s');
		return {
			props: {
				query: qs,
			}
		};
	}
</script>

<script lang="ts">
	import Search from '$lib/Search.svelte';
	export let query: string;
</script>

<Search {query} />
