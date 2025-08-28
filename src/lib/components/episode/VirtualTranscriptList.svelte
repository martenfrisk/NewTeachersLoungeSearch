<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ProcessedTranscriptLine } from '$lib/types/episode';
	import TranscriptLine from './TranscriptLine.svelte';

	interface Props {
		transcript: ProcessedTranscriptLine[];
		activeTimeHash?: string;
		highlightedTime?: string;
		itemHeight?: number;
		visibleCount?: number;
	}

	let {
		transcript,
		activeTimeHash,
		highlightedTime,
		itemHeight = 80,
		visibleCount = 50
	}: Props = $props();

	let containerEl = $state<HTMLDivElement>();
	let scrollY = $state(0);

	const totalHeight = $derived(transcript.length * itemHeight);
	const startIndex = $derived(Math.floor(scrollY / itemHeight));

	let transcriptElements = $state<Record<string, HTMLElement>>({});
	let resizeObserver: ResizeObserver | undefined;
	let scrollTimeout: number | undefined;

	const BUFFER_SIZE = 5;
	const adjustedVisibleCount = $derived(visibleCount + BUFFER_SIZE * 2);
	const bufferedStartIndex = $derived(Math.max(0, startIndex - BUFFER_SIZE));
	const bufferedEndIndex = $derived(
		Math.min(bufferedStartIndex + adjustedVisibleCount, transcript.length)
	);
	const bufferedVisibleItems = $derived(transcript.slice(bufferedStartIndex, bufferedEndIndex));
	const bufferedOffsetY = $derived(bufferedStartIndex * itemHeight);

	onMount(() => {
		if (containerEl) {
			resizeObserver = new ResizeObserver(() => {});
			resizeObserver.observe(containerEl);
			if (activeTimeHash) {
				scrollToTimestamp(activeTimeHash);
			}
		}
	});

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}
	});

	function handleScroll() {
		if (!containerEl) return;

		// Immediate update for better responsiveness
		scrollY = containerEl.scrollTop;

		// Clear existing timeout
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		// Reset scroll timeout
		scrollTimeout = setTimeout(() => {
			// Scroll ended
		}, 150) as unknown as number;
	}

	function scrollToTimestamp(timeString: string) {
		const targetId = `t-${timeString.replaceAll(':', '')}`;
		const index = transcript.findIndex((item) => {
			const expectedId = `t-${item.time.replaceAll(':', '')}`;
			return expectedId === targetId;
		});

		if (index !== -1 && containerEl) {
			// Smooth scroll to the target with some padding
			const targetScrollTop = Math.max(0, (index - 2) * itemHeight); // Show 2 items before target
			containerEl.scrollTo({
				top: targetScrollTop,
				behavior: 'smooth'
			});
			// Update scrollY immediately for better UX
			scrollY = targetScrollTop;
		}
	}

	function getItemId(timeString: string): string {
		return `t-${timeString.replaceAll(':', '')}`;
	}

	function isActive(timeString: string): boolean {
		if (!activeTimeHash) return false;
		const expectedId = getItemId(timeString);
		return expectedId === activeTimeHash;
	}

	function isHighlighted(timeString: string): boolean {
		return highlightedTime === timeString;
	}

	// Expose scroll method for external navigation
	export function scrollToTime(timeString: string) {
		scrollToTimestamp(timeString);
	}

	// Watch for activeTimeHash changes
	$effect(() => {
		if (activeTimeHash) {
			scrollToTimestamp(activeTimeHash);
		}
	});
</script>

<div
	bind:this={containerEl}
	class="virtual-transcript-container"
	style="height: 70vh; overflow-y: auto;"
	onscroll={handleScroll}
>
	<div style="height: {totalHeight}px; position: relative;">
		<div
			style="transform: translateY({bufferedOffsetY}px); will-change: transform;"
			class="virtual-transcript-content"
		>
			{#each bufferedVisibleItems as hit (hit.id || hit.time)}
				<div
					style="height: {itemHeight}px; display: flex; align-items: flex-start;"
					class="virtual-transcript-item"
				>
					<TranscriptLine
						{hit}
						isActive={isActive(hit.time)}
						isHighlighted={isHighlighted(hit.time)}
						bind:element={transcriptElements[hit.time]}
					/>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.virtual-transcript-container {
		scrollbar-width: thin;
		scrollbar-color: rgb(156 163 175) rgb(243 244 246);
	}

	.virtual-transcript-container::-webkit-scrollbar {
		width: 8px;
	}

	.virtual-transcript-container::-webkit-scrollbar-track {
		background: rgb(243 244 246);
	}

	.virtual-transcript-container::-webkit-scrollbar-thumb {
		background-color: rgb(156 163 175);
		border-radius: 4px;
	}

	.virtual-transcript-container::-webkit-scrollbar-thumb:hover {
		background-color: rgb(107 114 128);
	}

	.virtual-transcript-content {
		contain: layout style paint;
	}

	.virtual-transcript-item {
		contain: layout;
	}
</style>
