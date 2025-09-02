<!-- eslint-disable svelte/no-at-html-tags -->
<script lang="ts">
	import type { SearchHitType } from '../../types/search';
	import { audioService } from '../../services/AudioService';
	import { getContext, type HitContext } from '../../services/ContextService';
	import { epName } from '../../utils';
	import Tooltip from '../Tooltip.svelte';
	import Check from '../../icons/Check.svelte';
	import Minus from '../../icons/Minus.svelte';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface Props {
		hit: SearchHitType;
	}

	let { hit }: Props = $props();

	const hitEpisode = $derived(epName(hit.episode.replace('.json', '')));

	let showContext = $state(false);
	let context = $state<HitContext | null>(null);
	let loadingContext = $state(false);

	async function handlePlayAudio() {
		if (hitEpisode?.feedTitle) {
			await audioService.playTimestamp({
				timestamp: hit.time,
				episode: hitEpisode.feedTitle
			});
			audioService.play();
		}
	}

	// Format speaker name to handle numeric/unidentified speakers
	function formatSpeaker(speaker: string): string {
		// Check if speaker is just a number or starts with 'spk_'
		if (/^\d+$/.test(speaker) || /^spk_\d+$/.test(speaker)) {
			return 'Unknown Speaker';
		}
		return speaker;
	}

	async function toggleContext() {
		if (showContext) {
			showContext = false;
			return;
		}

		if (!context && !loadingContext) {
			loadingContext = true;
			try {
				context = await getContext(hit);
			} catch (error) {
				console.error('Failed to load context:', error);
			} finally {
				loadingContext = false;
			}
		}

		showContext = true;
	}
</script>

<article
	class="w-full border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-white hover:bg-blue-50/20 relative"
>
	<!-- Episode Number - Top Right Corner (above content) -->
	<a
		class="absolute top-0 right-0 inline px-1 py-0.5 text-xs text-blue-700 bg-blue-50 uppercase tracking-wide z-10"
		href="/ep/{hit.episode.replace('.json', '')}"
	>
		{hit.episode.replace('.json', '')}
	</a>

	<!-- Main Content -->
	<div class="p-3">
		<!-- Context Before -->
		{#if showContext && context && context.before}
			<div
				class="mb-2 p-2 bg-gray-50 border-l-3 border-gray-300 rounded-r-md"
				in:slide={{ duration: 250, easing: quintOut }}
				out:slide={{ duration: 200, easing: quintOut }}
			>
				<div class="flex justify-between items-center gap-2 mb-1">
					<span class="text-xs text-gray-600">{formatSpeaker(context.before.speaker)}</span>
					<span class="text-xs text-gray-500">{context.before.time}</span>
				</div>
				<p class="text-sm text-gray-700 leading-snug">
					{context.before.line}
				</p>
			</div>
		{/if}

		<!-- Main Hit Line - Always at top, spans full width -->
		<p class="mb-3 pt-2 text-base leading-relaxed text-gray-900 prose prose-sm max-w-none">
			<!-- Safe: Only <em> tags are added for search highlighting -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html hit.highlightedLine || hit.line}
		</p>

		<!-- Context After -->
		{#if showContext && context && context.after}
			<div
				class="mb-2 p-2 bg-gray-50 border-l-3 border-gray-300 rounded-r-md"
				in:slide={{ duration: 250, delay: 50, easing: quintOut }}
				out:slide={{ duration: 200, easing: quintOut }}
			>
				<div class="flex justify-between items-center gap-2 mb-1">
					<span class="text-xs text-gray-600">{formatSpeaker(context.after.speaker)}</span>
					<span class="text-xs text-gray-500">{context.after.time}</span>
				</div>
				<p class="text-sm text-gray-700 leading-snug">
					{context.after.line}
				</p>
			</div>
		{/if}

		<!-- Episode Title Banner -->
		<div class="mb-2 -mx-3 px-3 py-2 bg-gray-50/80 text-xs text-gray-700 font-medium">
			{hitEpisode?.title || 'Unknown Episode'}
		</div>

		<!-- Speaker and Time -->
		<div class="flex text-xs justify-between items-center">
			<span class="text-gray-600">{formatSpeaker(hit.speaker)}</span>
			<div class="flex items-center gap-2">
				<span class="text-gray-500">{hit.time}</span>
				<!-- Edited Status -->
				{#if hit.edited}
					<Tooltip side="left">
						{#snippet tooltip()}
							Edited
						{/snippet}
						{#snippet content()}
							<div class="text-green-600">
								<Check />
							</div>
						{/snippet}
					</Tooltip>
				{:else}
					<Tooltip side="left">
						{#snippet tooltip()}
							Not edited
						{/snippet}
						{#snippet content()}
							<div class="text-gray-400">
								<Minus />
							</div>
						{/snippet}
					</Tooltip>
				{/if}
			</div>
		</div>
	</div>

	<!-- Compact Footer -->
	<div class="px-3 pb-3 pt-2 border-t border-gray-100 flex justify-between items-center">
		<!-- Actions -->
		<div class="flex items-center gap-2">
			<!-- Transcript Link -->
			<Tooltip>
				{#snippet tooltip()}
					Go to transcript
				{/snippet}
				{#snippet content()}
					<a
						href="/ep/{hitEpisode?.ep}#t-{hit.time.replaceAll(':', '')}"
						class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<span>Episode</span>
					</a>
				{/snippet}
			</Tooltip>

			<!-- Audio Play Button -->
			{#if hitEpisode?.hasAudio}
				<button
					class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
					onclick={handlePlayAudio}
				>
					<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
					<span class="hidden sm:inline">Listen</span>
					<span class="sm:hidden">Play</span>
				</button>
			{/if}
		</div>
		<!-- Context Toggle Button -->
		<button
			onclick={toggleContext}
			disabled={loadingContext}
			class="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			aria-label="{showContext ? 'Hide' : 'Show'} context"
		>
			{#if loadingContext}
				<div
					class="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"
				></div>
				Loading...
			{:else}
				<svg
					class="w-3 h-3 transition-transform {showContext ? 'rotate-180' : ''}"
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
				{showContext ? 'Hide' : 'Show'} context
			{/if}
		</button>
	</div>
</article>
