<script lang="ts">
	import Search from '$lib/Search.svelte';
	import type { SearchHit } from '$lib/types';
	export let data: { query: string; filter: string[]; hits: SearchHit[]; editedOnly: boolean };

	const { query, filter, hits, editedOnly } = data;
</script>

<Search {query} {filter} {hits} {editedOnly} />
