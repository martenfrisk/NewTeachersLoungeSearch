<!-- eslint-disable svelte/no-at-html-tags -->
<script lang="ts">
	import type { SearchHitType } from '../../types/search';
	import type { HitContext } from '../../services/ContextService';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface Props {
		hit: SearchHitType;
		context: HitContext | null;
		showContext: boolean;
	}

	let { hit, context, showContext }: Props = $props();

	// Format speaker name to handle numeric/unidentified speakers
	function formatSpeaker(speaker: string): string {
		// Check if speaker is just a number or starts with 'spk_'
		if (/^\d+$/.test(speaker) || /^spk_\d+$/.test(speaker)) {
			return 'Unknown Speaker';
		}
		return speaker;
	}
</script>

<!-- Context Before -->
{#if showContext && context && context.before}
	<div
		class="mb-1 p-2 bg-gray-50 border-l-3 border-gray-300 rounded-r-md"
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

<!-- Main Hit Line -->
<p
	class={`px-3 md:pr-16 pb-3 text-base leading-relaxed text-gray-900 prose prose-sm max-w-none ${showContext ? 'pt-3' : 'pt-4'}`}
>
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
