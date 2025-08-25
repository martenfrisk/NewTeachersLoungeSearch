<script lang="ts">
	import type { PageData } from './$types';
	import Search from '$lib/Search.svelte';
	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { query, filter, hits, editedOnly } = data;
</script>

<Search {query} {filter} {hits} {editedOnly} />
