<script lang="ts">
	import type { PageData } from './$types';
	import SearchContainer from '$lib/components/search/SearchContainer.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { query, filter, hits, editedOnly } = data;

	// Dynamic title and description based on search
	const pageTitle = query
		? `"${query}" - Search Results | Seekers' Lounge`
		: "Seekers' Lounge ☕ The Teachers' Lounge Search Engine";

	const pageDescription = query
		? `Search results for "${query}" in The Teachers' Lounge podcast transcripts. Find the funniest moments and memorable quotes.`
		: "Search through thousands of hours of The Teachers' Lounge podcast transcripts. Find your favorite moments, quotes, and episodes with our powerful search engine.";
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />

	<!-- Open Graph Tags -->
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content="https://seekerslounge.pcast.site/" />
	<meta property="og:image" content="https://seekerslounge.pcast.site/og-image.png" />

	<!-- Twitter Card Tags -->
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content="https://seekerslounge.pcast.site/og-image.png" />

	<!-- Canonical URL -->
	<link rel="canonical" href="https://seekerslounge.pcast.site/" />
</svelte:head>

<SearchContainer
	initialQuery={query}
	initialHits={hits}
	initialFilters={filter}
	initialEditedOnly={editedOnly}
/>
