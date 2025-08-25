<script lang="ts">
	import type { PageData } from './$types';
	import SearchContainer from '$lib/components/search/SearchContainer.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { query, filter, hits, editedOnly } = data;
</script>

<SearchContainer
	initialQuery={query}
	initialHits={hits}
	initialFilters={filter}
	initialEditedOnly={editedOnly}
/>
