<script lang="ts">
	import Search from '$lib/Search.svelte';
	import type { SearchHit } from '$lib/types';
	import { searchMeili, newRandom } from '$lib/utils';
	export let data: any;

	const { query, filter, hits }: { query: string; filter: string[]; hits: SearchHit[] } = data;
</script>

<Search {query} {filter} {hits} />
