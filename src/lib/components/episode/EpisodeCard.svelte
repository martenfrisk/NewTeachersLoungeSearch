<script lang="ts">
	import EpisodeBadge from '$lib/components/ui/EpisodeBadge.svelte';
	import { componentPatterns } from '$lib/design/tokens';
	import { StringUtils } from '$lib/utils/index';

	interface Episode {
		ep: string;
		title: string;
		desc: string;
		date: string;
		hasAudio?: boolean;
		duration?: number;
		transcriptWordCount?: number;
		tags?: string[];
		guestHosts?: string[];
		specialNotes?: string;
		isHighlight?: boolean;
		isFullyEdited?: boolean;
		isMostlyEdited?: boolean;
		editedPercentage?: number;
		totalLines?: number;
	}

	interface Props {
		episode: Episode;
		compact?: boolean;
		showTranscriptLink?: boolean;
		class?: string;
	}

	let {
		episode,
		compact = false,
		showTranscriptLink = true,
		class: className = ''
	}: Props = $props();

	const formatDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const getEpisodeNumber = (ep: string): string => {
		const matches = ep.match(/s(\d+)e(\d+)/);
		if (matches) {
			return `S${matches[1]}E${matches[2]}`;
		}

		const miniMatch = ep.match(/mini-(\d+)/);
		if (miniMatch) {
			return `Mini ${miniMatch[1]}`;
		}

		return ep.toUpperCase();
	};

	const isSpecialEpisode = (ep: string): boolean => {
		return ['exit42', 'holidays', 'jesus', 'lastresort', 'Peecast'].some((special) =>
			ep.includes(special)
		);
	};

	// Determine edit status badge type
	const editBadgeType: 'edited' | 'partial-edit' | 'unedited' | null = $derived(
		episode.isFullyEdited
			? 'edited'
			: episode.isMostlyEdited
				? 'partial-edit'
				: episode.totalLines && episode.totalLines > 0
					? 'unedited'
					: null
	);

	// Compute card classes using design tokens
	const cardClasses = $derived(
		`${componentPatterns.card.base} ${componentPatterns.card.hover} group ${className} ${
			episode.isHighlight ? 'ring-2 ring-blue-400' : ''
		}`
	);
</script>

<article class={cardClasses}>
	{#if episode.isHighlight}
		<div class="absolute top-2 right-2 z-10">
			<EpisodeBadge type="featured" showLabel />
		</div>
	{/if}

	<div class="p-4 {compact ? 'space-y-2' : 'space-y-3'}">
		<div class="flex items-start justify-between gap-3">
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1 flex-wrap">
					<!-- Episode Number Badge -->
					<span
						class="{componentPatterns.badge.base} {isSpecialEpisode(episode.ep)
							? componentPatterns.badge.variants.info
							: componentPatterns.badge.variants.secondary}"
					>
						{getEpisodeNumber(episode.ep)}
					</span>

					<!-- Status Badges -->
					<div class="flex items-center gap-1">
						{#if episode.hasAudio}
							<EpisodeBadge type="audio" />
						{/if}

						{#if editBadgeType}
							<EpisodeBadge type={editBadgeType} info={episode.editedPercentage} />
						{/if}
					</div>
				</div>
			</div>

			<div class="flex-shrink-0 text-right">
				<time class="text-sm text-gray-500 block" datetime={episode.date}>
					{formatDate(episode.date)}
				</time>
				{#if episode.duration}
					<div class="text-xs text-gray-400 mt-1">
						{StringUtils.formatDuration(episode.duration * 1000)}
					</div>
				{/if}
			</div>
		</div>

		<!-- Title -->
		<h3
			class="font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-150 {compact
				? 'text-base'
				: 'text-lg'}"
		>
			<a
				href="/ep/{episode.ep}"
				class="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
			>
				{episode.title}
			</a>
		</h3>

		<!-- Guest Hosts -->
		{#if episode.guestHosts && episode.guestHosts.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each episode.guestHosts as guest (guest)}
					<span class="{componentPatterns.badge.base} {componentPatterns.badge.variants.primary}">
						🎙️ {guest}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Description -->
		<p class="text-gray-600 text-sm text-balance leading-relaxed">
			{compact ? StringUtils.truncate(episode.desc, 100) : episode.desc}
		</p>

		<!-- Tags -->
		{#if episode.tags && episode.tags.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each episode.tags.slice(0, 4) as tag (tag)}
					<span class="{componentPatterns.badge.base} {componentPatterns.badge.variants.secondary}">
						#{tag}
					</span>
				{/each}
				{#if episode.tags.length > 4}
					<span class="text-xs text-gray-400">+{episode.tags.length - 4} more</span>
				{/if}
			</div>
		{/if}

		<!-- Special Notes -->
		{#if episode.specialNotes}
			<div
				class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-2"
			>
				<svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>{episode.specialNotes}</span>
			</div>
		{/if}

		<!-- Footer Actions -->
		<div class="flex items-center justify-between pt-2">
			{#if showTranscriptLink}
				<a
					href="/ep/{episode.ep}"
					class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
				>
					View Transcript
				</a>
			{/if}

			{#if episode.transcriptWordCount}
				<div class="text-xs text-gray-400">
					{episode.transcriptWordCount.toLocaleString()} words
				</div>
			{/if}
		</div>
	</div>
</article>
