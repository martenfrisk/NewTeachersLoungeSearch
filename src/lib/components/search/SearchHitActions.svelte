<script lang="ts">
	import type { SearchHitType } from '../../types/search';
	import { audioService } from '../../services/AudioService';
	import { epName } from '../../utils';
	import Icon from '../ui/Icon.svelte';
	import { resolve } from '$app/paths';

	interface Props {
		hit: SearchHitType;
		showContext: boolean;
		loadingContext: boolean;
		onToggleContext: () => void;
	}

	let { hit, showContext, loadingContext, onToggleContext }: Props = $props();

	const epId = $derived(hit.episode.replace('.json', ''));
	const hitEpisode = $derived(epName(epId));
	const lineHref = $derived(resolve(`/ep/[id]#t-${hit.time.replaceAll(':', '')}`, { id: epId }));

	async function handlePlayAudio() {
		if (hitEpisode?.feedTitle) {
			await audioService.playTimestamp({ timestamp: hit.time, episode: hitEpisode.feedTitle });
			audioService.play();
		}
	}
</script>

<div class="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-1.5">
	<!-- Primary: jump to this line in the full transcript -->
	<a
		href={lineHref}
		class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
	>
		<Icon name="document" size={14} aria-hidden={true} />
		<span>Transcript</span>
	</a>

	<div class="flex items-center gap-1">
		{#if hitEpisode?.hasAudio}
			<button
				class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-50"
				onclick={handlePlayAudio}
			>
				<Icon name="play" size={14} aria-hidden={true} />
				<span>Listen</span>
			</button>
		{/if}

		<button
			onclick={onToggleContext}
			disabled={loadingContext}
			class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
			aria-expanded={showContext}
		>
			{#if loadingContext}
				<div
					class="h-3 w-3 animate-spin rounded-full border border-blue-400 border-t-transparent"
				></div>
				<span>Loading…</span>
			{:else}
				<svg
					class="h-3 w-3 transition-transform {showContext ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
				<span>{showContext ? 'Hide' : 'Show'} context</span>
			{/if}
		</button>
	</div>
</div>
