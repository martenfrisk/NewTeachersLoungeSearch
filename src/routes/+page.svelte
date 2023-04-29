<script lang="ts">
	import Search from '$lib/Search.svelte';
	import type { SearchHit } from '$lib/types';
	export let data: { query: string; filter: string[]; hits: SearchHit[] };

	const { query, filter, hits } = data;
</script>

<Search {query} {filter} {hits} />
