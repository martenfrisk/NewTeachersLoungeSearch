<script lang="ts">
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import { audioService } from '../../services/AudioService';
	import Icon from '../ui/Icon.svelte';
	import type { EpisodeInfo } from '../../types/episode';

	interface Props {
		hit: {
			time: string;
			speakerColor: string;
			displaySpeaker: string;
			line: string;
		};
		isActive: boolean;
		isHighlighted: boolean;
		/** Only render the speaker heading when the speaker changes, so a run of
		 *  dialogue by one person reads as continuous prose. */
		showSpeaker?: boolean;
		syncEnabled?: boolean;
		onLineClick?: (time: string) => void;
		element?: HTMLElement;
		episodeInfo?: EpisodeInfo;
	}

	let {
		hit,
		isActive,
		isHighlighted,
		showSpeaker = true,
		syncEnabled = false,
		onLineClick,
		element = $bindable(),
		episodeInfo
	}: Props = $props();

	let copied = $state(false);

	const highlighted = $derived(isActive || isHighlighted);

	// Pull just the text colour out of the speaker's palette bundle
	// ("bg-x-100 text-x-800 border-x-200") so the name reads as coloured type
	// rather than a pill.
	const speakerTextColor = $derived(
		hit.speakerColor.split(' ').find((c) => c.startsWith('text-')) ?? 'text-ink'
	);

	const copyLink = async () => {
		const url = `${page.url.origin}${page.url.pathname}#t-${hit.time.replaceAll(':', '')}`;
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	};

	const handleClick = () => {
		if (syncEnabled && onLineClick) onLineClick(hit.time);
	};

	const handlePlayAudio = async (e: MouseEvent) => {
		e.stopPropagation();
		if (episodeInfo?.title) {
			await audioService.playTimestamp({ timestamp: hit.time, episode: episodeInfo.title });
			audioService.play();
		}
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<article
	bind:this={element}
	id={`t-${hit.time.replaceAll(':', '')}`}
	class="group relative scroll-mt-24 rounded-md px-3 py-0.5 transition-colors {showSpeaker
		? 'mt-5'
		: ''} {highlighted
		? 'bg-marker/20 ring-1 ring-marker/60 ring-inset'
		: 'hover:bg-blue-50'} {syncEnabled ? 'cursor-pointer' : ''}"
	onclick={handleClick}
	role={syncEnabled ? 'button' : undefined}
	tabindex={syncEnabled ? 0 : -1}
	onkeydown={syncEnabled ? (e) => e.key === 'Enter' && handleClick() : undefined}
>
	{#if showSpeaker}
		<div class="mb-0.5 flex items-baseline gap-2">
			<span class="font-semibold {speakerTextColor}">{hit.displaySpeaker}</span>
			<time class="font-mono text-[11px] text-ink-muted" datetime={hit.time}>{hit.time}</time>
		</div>
	{/if}

	<p class="pr-8 text-base leading-relaxed text-ink">
		{hit.line}
	</p>

	<!-- Actions live in the right margin, out of the reading column -->
	<div
		class="absolute top-1 right-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-50"
	>
		<button
			onclick={(e) => {
				e.stopPropagation();
				copyLink();
			}}
			class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
			aria-label="Copy link to this line"
		>
			{#if copied}
				<span in:fade={{ duration: 100 }}>
					<Icon name="check" size={15} class="text-green-600" />
				</span>
			{:else}
				<Icon name="link" size={15} />
			{/if}
		</button>

		{#if episodeInfo?.hasAudio}
			<!-- Same blue as the "Play episode" button, so every way to listen
			     on this page reads as one consistent invitation. -->
			<button
				onclick={handlePlayAudio}
				class="rounded p-1 text-gray-400 transition-colors hover:bg-blue-100 hover:text-blue-700"
				aria-label="Play audio from this timestamp"
			>
				<Icon name="play" size={15} />
			</button>
		{/if}
	</div>
</article>
