<script lang="ts">
	import TranscriptEditor from '$lib/components/editor/TranscriptEditor.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta name="description" content={data.meta.description} />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<TranscriptEditor
	initialEpisode={data.episode}
	initialTranscript={data.transcript}
	initialEpisodeInfo={data.episodeInfo}
/>
