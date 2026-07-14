<script lang="ts">
	import { resolve } from '$app/paths';

	interface Props {
		seasonId?: string;
		seasonName?: string;
	}

	let { seasonId, seasonName }: Props = $props();
</script>

<nav class="mb-3 flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
	<a
		href={resolve('/episodes')}
		class="inline-flex items-center gap-1 text-blue-700 transition-colors hover:text-blue-800 hover:underline"
	>
		<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
		Episode guide
	</a>

	{#if seasonId && seasonName}
		<span class="text-gray-300" aria-hidden="true">/</span>
		<a
			href={resolve(`/episodes#season-${seasonId}`)}
			class="text-ink-muted transition-colors hover:text-blue-700 hover:underline"
		>
			{seasonName}
		</a>
	{/if}
</nav>
