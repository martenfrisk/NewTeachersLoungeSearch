<script lang="ts">
	import Tooltip from '../Tooltip.svelte';
	import { page } from '$app/state';
	import { fade, slide } from 'svelte/transition';
	import { audioService } from '../../services/AudioService';
	import type { EpisodeInfo } from '../../types/episode';

	interface Props {
		hit: {
			time: string;
			edited: boolean;
			speakerColor: string;
			displaySpeaker: string;
			line: string;
		};
		isActive: boolean;
		isHighlighted: boolean;
		syncEnabled?: boolean;
		onLineClick?: (time: string) => void;
		element?: HTMLElement;
		episodeInfo?: EpisodeInfo;
	}

	let {
		hit,
		isActive,
		isHighlighted,
		syncEnabled = false,
		onLineClick,
		element = $bindable(),
		episodeInfo
	}: Props = $props();

	let copied = $state(false);
	let showCopyText = $state(false);

	const copyLink = async () => {
		const url = `${page.url.origin}${page.url.pathname}#t-${hit.time.replaceAll(':', '')}`;

		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	};

	const handleClick = () => {
		if (syncEnabled && onLineClick) {
			onLineClick(hit.time);
		}
	};

	const handlePlayAudio = async () => {
		if (episodeInfo?.title) {
			await audioService.playTimestamp({
				timestamp: hit.time,
				episode: episodeInfo.title
			});
			audioService.play();
		}
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<article
	bind:this={element}
	class={`group relative rounded-lg border transition-all duration-200 ${
		hit.edited
			? 'bg-green-50/30 border-green-200 hover:bg-green-50/50 hover:border-green-300'
			: 'bg-gray-50/30 border-gray-200 hover:bg-gray-50/50 hover:border-gray-300'
	} ${isActive ? '!border-blue-500 !bg-blue-50/50 shadow-lg' : isHighlighted ? '!border-blue-500 !bg-blue-50/50 shadow-lg' : 'shadow-sm hover:shadow-md'} ${
		syncEnabled ? 'cursor-pointer hover:ring-2 hover:ring-blue-300/50' : ''
	}`}
	id={`t-${hit.time.replaceAll(':', '')}`}
	onclick={handleClick}
	role={syncEnabled ? 'button' : undefined}
	tabindex={syncEnabled ? 0 : -1}
	onkeydown={syncEnabled ? (e) => e.key === 'Enter' && handleClick() : undefined}
>
	<header class="px-2 sm:px-4 py-3 border-b border-current/10">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-xs font-medium text-gray-500 bg-white/60 px-2 py-1 rounded-full border">
					{hit.time}
				</span>
				<span
					class="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium border {hit.speakerColor}"
				>
					{hit.displaySpeaker}
				</span>
			</div>

			<div class="flex items-center gap-2">
				{#if hit.edited}
					<Tooltip>
						{#snippet tooltip()}
							This line has been manually edited for accuracy
						{/snippet}
						{#snippet content()}
							<span
								class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"
							>
								<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
								Edited
							</span>
						{/snippet}
					</Tooltip>
				{:else}
					<Tooltip side="left">
						{#snippet tooltip()}
							Auto-transcribed, may contain errors
						{/snippet}
						{#snippet content()}
							<span
								class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"
							>
								<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="hidden sm:inline">Auto</span>
							</span>
						{/snippet}
					</Tooltip>
				{/if}

				<button
					onclick={copyLink}
					onmouseenter={() => (showCopyText = true)}
					onmouseleave={() => (showCopyText = false)}
					class="inline-flex items-center gap-2 p-1.5 rounded-full text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 transition-colors"
					aria-label="Copy link to this line"
				>
					{#if showCopyText || copied}
						<span
							transition:slide={{ duration: 200, axis: 'x' }}
							class="text-xs font-medium whitespace-nowrap max-w-24 overflow-hidden"
						>
							<span transition:fade={{ duration: 100 }}>
								{copied ? 'Link copied!' : 'Copy link'}
							</span>
						</span>
					{/if}
					{#if copied}
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
							/>
						</svg>
					{/if}
				</button>

				<!-- Audio Play Button -->
				{#if episodeInfo?.hasAudio}
					<button
						onclick={handlePlayAudio}
						class="p-1.5 rounded-full text-gray-400 cursor-pointer hover:text-green-600 hover:bg-green-50 transition-colors"
						aria-label="Play audio from this timestamp"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</header>

	<div class="px-2 sm:px-4 py-4">
		<p class="text-gray-900 leading-relaxed text-base break-words">
			{hit.line}
		</p>
	</div>
</article>
