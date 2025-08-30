<script lang="ts">
	import Tooltip from '$lib/components/Tooltip.svelte';

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

	const formatDuration = (seconds?: number): string => {
		if (!seconds) return '';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
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

	const truncateDescription = (desc: string, maxLength: number = 150): string => {
		if (desc.length <= maxLength) return desc;
		return desc.substring(0, maxLength).trim() + '...';
	};

	const isSpecialEpisode = (ep: string): boolean => {
		return ['exit42', 'holidays', 'jesus', 'lastresort', 'Peecast'].some((special) =>
			ep.includes(special)
		);
	};
</script>

<article
	class="group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 episode-card overflow-hidden {className}"
	class:ring-2={episode.isHighlight}
	class:ring-blue-400={episode.isHighlight}
>
	{#if episode.isHighlight}
		<div class="absolute top-2 right-2 z-10">
			<span
				class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
			>
				<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
					<path
						d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
					/>
				</svg>
				Featured
			</span>
		</div>
	{/if}

	<div class="p-4 {compact ? 'space-y-2' : 'space-y-3'}">
		<div class="flex items-start justify-between gap-3">
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<span
						class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 {isSpecialEpisode(
							episode.ep
						)
							? 'bg-purple-100 text-purple-800'
							: ''}"
					>
						{getEpisodeNumber(episode.ep)}
					</span>

					{#if episode.hasAudio}
						<span class="inline-flex items-center text-green-600" title="Audio available">
							<svg
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-4"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
								/>
							</svg>
						</span>
					{/if}

					{#if episode.isFullyEdited}
						<Tooltip>
							{#snippet content()}
								<span class="inline-flex items-center text-blue-600">
									<svg
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="size-4"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m4.5 12.75 6 6 9-13.5"
										/>
									</svg>
								</span>
							{/snippet}
							{#snippet tooltip()}
								Fully edited transcript
							{/snippet}
						</Tooltip>
					{:else if episode.isMostlyEdited}
						<Tooltip>
							{#snippet content()}
								<span class="inline-flex items-center text-orange-600">
									<svg
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="size-4"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
										/>
									</svg>
								</span>
							{/snippet}
							{#snippet tooltip()}
								Partially edited transcript ({episode.editedPercentage}% edited)
							{/snippet}
						</Tooltip>
					{:else if episode.totalLines && episode.totalLines > 0}
						<Tooltip>
							{#snippet content()}
								<span class="inline-flex items-center text-gray-400">
									<svg
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="size-4"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
										/>
									</svg>
								</span>
							{/snippet}
							{#snippet tooltip()}
								Unedited transcript
							{/snippet}
						</Tooltip>
					{/if}

					{#if episode.rating}
						<div class="flex items-center text-yellow-500">
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path
									d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
								/>
							</svg>
							<span class="text-xs font-medium ml-1">{episode.rating.toFixed(1)}</span>
						</div>
					{/if}
				</div>
			</div>

			<div class="flex-shrink-0 text-right">
				<time class="text-sm text-gray-500 block" datetime={episode.date}>
					{formatDate(episode.date)}
				</time>
				{#if episode.duration}
					<div class="text-xs text-gray-400 mt-1">
						{formatDuration(episode.duration)}
					</div>
				{/if}
			</div>
		</div>
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

		{#if episode.guestHosts && episode.guestHosts.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each episode.guestHosts as guest (guest)}
					<span
						class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
					>
						🎙️ {guest}
					</span>
				{/each}
			</div>
		{/if}

		<p class="text-gray-600 text-sm text-balance leading-relaxed">
			{compact ? truncateDescription(episode.desc, 100) : episode.desc}
		</p>

		{#if episode.tags && episode.tags.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each episode.tags.slice(0, 4) as tag (tag)}
					<span
						class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
					>
						#{tag}
					</span>
				{/each}
				{#if episode.tags.length > 4}
					<span class="text-xs text-gray-400">+{episode.tags.length - 4} more</span>
				{/if}
			</div>
		{/if}

		{#if episode.specialNotes}
			<div class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
				<svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				{episode.specialNotes}
			</div>
		{/if}

		<!-- <div class="flex items-center justify-between pt-2 border-t border-gray-100"> -->
		{#if showTranscriptLink}
			<a
				href="/ep/{episode.ep}"
				class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
			>
				View Transcript
			</a>
		{/if}

		<!-- {#if episode.url}
					<a
						href={episode.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm font-medium text-green-600 hover:text-green-800 hover:underline focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
					>
						Listen
						<svg class="w-3 h-3 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>
				{/if} -->

		{#if episode.transcriptWordCount}
			<div class="text-xs text-gray-400">
				{episode.transcriptWordCount.toLocaleString()} words
			</div>
		{/if}
		<!-- </div> -->
	</div>
</article>
