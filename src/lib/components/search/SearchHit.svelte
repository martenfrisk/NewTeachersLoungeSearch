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

	function handlePlayAudio() {
		if (hitEpisode?.feedTitle) {
			audioService.playTimestamp({
				timestamp: hit.time,
				episode: hitEpisode.feedTitle
			});
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
	class="w-full border border-blue-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 mb-6 bg-white hover:bg-blue-50/30"
>
	<!-- Header -->
	<div class="p-4">
		<div class="flex flex-col gap-3">
			<!-- Episode Info -->
			<div class="flex flex-row justify-between sm:items-center gap-2">
				<div class="flex gap-2 items-center">
					<Tooltip>
						{#snippet tooltip()}
							Go to episode page
						{/snippet}
						{#snippet content()}
							<a
								class="inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors uppercase tracking-wide flex-shrink-0"
								href="/ep/{hit.episode.replace('.json', '')}"
							>
								{hit.episode.replace('.json', '')}
							</a>
						{/snippet}
					</Tooltip>
					<div class="text-sm text-gray-800 font-medium leading-tight">
						{hitEpisode?.title || 'Unknown Episode'}
					</div>
				</div>
				<div class="sm:flex hidden justify-end">
					<button
						onclick={toggleContext}
						disabled={loadingContext}
						class="inline-flex items-center gap-1.5 border-b text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="px-4">
		<!-- Context Before -->
		{#if showContext && context && context.before}
			<div
				class="mb-3 p-3 bg-gray-50 border-l-4 border-gray-300 rounded-r-lg"
				in:slide={{ duration: 250, easing: quintOut }}
				out:slide={{ duration: 200, easing: quintOut }}
			>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
					<span class="text-xs text-gray-600 order-1">{formatSpeaker(context.before.speaker)}</span>
					<span class="text-xs text-gray-500 order-2 sm:order-1">{context.before.time}</span>
				</div>
				<p class="text-sm text-gray-700 leading-relaxed">
					{context.before.line}
				</p>
			</div>
		{/if}

		<!-- Main Hit -->
		<div
			class="p-4 {showContext
				? 'bg-blue-50 border-l-4 border-blue-400 rounded-r-lg'
				: 'border-l-4 border-blue-200'}"
		>
			<div
				class="sm:flex grid grid-temp-areas sm:flex-row sm:items-center justify-between gap-2 mb-3"
			>
				<span class=" text-gray-800 text-sm area-a order-1">{formatSpeaker(hit.speaker)}</span>
				<div class="flex items-center area-b gap-2 order-2 sm:order-1">
					<span class="text-sm text-gray-600">{hit.time}</span>
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

				<!-- Context Toggle Button -->
				<div class="flex area-c sm:hidden justify-end">
					<button
						onclick={toggleContext}
						disabled={loadingContext}
						class="inline-flex items-center gap-1.5 border-b text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
			</div>
			<div class="prose prose-sm max-w-none">
				<!-- Safe: MeiliSearch only adds <em> tags for search highlighting -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<p class="text-sm leading-relaxed text-gray-900 m-0">{@html hit._formatted.line}</p>
			</div>
		</div>

		<!-- Context After -->
		{#if showContext && context && context.after}
			<div
				class="mt-3 p-3 bg-gray-50 border-l-4 border-gray-300 rounded-r-lg"
				in:slide={{ duration: 250, delay: 50, easing: quintOut }}
				out:slide={{ duration: 200, easing: quintOut }}
			>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
					<span class="text-xs text-gray-600 order-1">{formatSpeaker(context.after.speaker)}</span>
					<span class="text-xs text-gray-500 order-2 sm:order-1">{context.after.time}</span>
				</div>
				<p class="text-sm text-gray-700 leading-relaxed">
					{context.after.line}
				</p>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="px-4 pb-4 border-t border-gray-100">
		<div class="pt-3">
			<!-- Actions -->
			<div class="flex flex-wrap items-center gap-2">
				<!-- Transcript Link -->
				<Tooltip>
					{#snippet tooltip()}
						Go to line in transcript
					{/snippet}
					{#snippet content()}
						<a
							href="/ep/{hitEpisode?.ep}#t-{hit.time.replaceAll(':', '')}"
							class="inline-flex items-center gap-2 px-2 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<Tooltip>
						{#snippet tooltip()}
							Listen to this line
						{/snippet}
						{#snippet content()}
							<button
								class="inline-flex items-center gap-2 px-2 py-1 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
								onclick={handlePlayAudio}
							>
								<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M8 5v14l11-7z" />
								</svg>
								<span class="hidden sm:inline">Listen</span>
								<span class="sm:hidden">Play</span>
							</button>
						{/snippet}
					</Tooltip>
				{/if}
			</div>
		</div>
	</div>
</article>

<style>
	.grid-temp-areas {
		grid-template-areas: 'a c' 'b d';
	}
	.area-a {
		grid-area: a;
	}
	.area-b {
		grid-area: b;
	}
	.area-c {
		grid-area: c;
	}
</style>
