<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import { resolve } from '$app/paths';

	// Only the fields the guide actually has data for. Tags, guest hosts,
	// duration, word counts, special notes and "featured" were never populated
	// across all 271 episodes, so those sections have been removed.
	interface Episode {
		ep: string;
		title: string;
		desc: string;
		date: string;
		hasAudio?: boolean;
		isFullyEdited?: boolean;
		isMostlyEdited?: boolean;
		editedPercentage?: number;
	}

	interface Props {
		episode: Episode;
		compact?: boolean;
		class?: string;
	}

	let { episode, compact = false, class: className = '' }: Props = $props();

	const formatDate = (dateStr: string): string =>
		new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});

	const getEpisodeNumber = (ep: string): string => {
		const m = ep.match(/s(\d+)e(\d+)/);
		if (m) return `S${m[1]}E${m[2]}`;
		const mini = ep.match(/mini-(\d+)/);
		if (mini) return `Mini ${mini[1]}`;
		return ep.toUpperCase();
	};
</script>

<article
	class="rounded-xl border border-blue-100 bg-surface transition-all duration-200 hover:border-blue-300 hover:shadow-card {className}"
>
	<a
		href={resolve('/ep/[id]', { id: episode.ep })}
		class="group block rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
	>
		<!-- Meta: episode code + status indicators, with the date on the right -->
		<div class="mb-1.5 flex items-center justify-between gap-2">
			<div class="flex min-w-0 items-center gap-2">
				<span
					class="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-blue-700"
				>
					{getEpisodeNumber(episode.ep)}
				</span>

				{#if episode.hasAudio}
					<Tooltip>
						{#snippet tooltip()}
							Audio available
						{/snippet}
						{#snippet content()}
							<Icon name="audio" size={15} class="text-green-600" />
						{/snippet}
					</Tooltip>
				{/if}

				{#if episode.isFullyEdited}
					<Tooltip>
						{#snippet tooltip()}
							Fully edited transcript
						{/snippet}
						{#snippet content()}
							<Icon name="check-badge" size={15} class="text-blue-600" />
						{/snippet}
					</Tooltip>
				{:else if episode.isMostlyEdited}
					<Tooltip>
						{#snippet tooltip()}
							{episode.editedPercentage
								? `${episode.editedPercentage}% edited`
								: 'Partially edited transcript'}
						{/snippet}
						{#snippet content()}
							<Icon name="document" size={15} class="text-orange-500" />
						{/snippet}
					</Tooltip>
				{/if}
			</div>

			<time class="shrink-0 font-mono text-xs text-ink-muted" datetime={episode.date}>
				{formatDate(episode.date)}
			</time>
		</div>

		<h3
			class="font-sans font-bold leading-snug text-ink transition-colors group-hover:text-blue-700 {compact
				? 'text-base'
				: 'text-lg'}"
		>
			{episode.title}
		</h3>

		<!-- Full description: at this depth the user has drilled into a season to
		     find this episode, so show everything - don't make them click again. -->
		<p class="mt-1 text-sm leading-relaxed text-ink-muted">
			{episode.desc}
		</p>
	</a>
</article>
