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

	// Numeric / unidentified speakers surface as "Unknown Speaker"
	function formatSpeaker(speaker: string): string {
		if (/^\d+$/.test(speaker) || /^spk_\d+$/.test(speaker)) {
			return 'Unknown Speaker';
		}
		return speaker;
	}
</script>

<!-- Preceding line (revealed on "Show context") -->
{#if showContext && context && context.before}
	<div
		class="mx-4 mt-2 rounded-r-md border-l-3 border-gray-300 bg-gray-50 p-2"
		in:slide={{ duration: 250, easing: quintOut }}
		out:slide={{ duration: 200, easing: quintOut }}
	>
		<div class="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
			<span>{formatSpeaker(context.before.speaker)}</span>
			<span class="font-mono">{context.before.time}</span>
		</div>
		<p class="text-sm leading-snug text-gray-700">{context.before.line}</p>
	</div>
{/if}

<!-- The matched line, plus its speaker as an attribution -->
<p class="px-4 pt-2 text-[15px] leading-normal text-ink">
	<!-- Safe: search highlighting only wraps matches in <em> -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html hit.highlightedLine || hit.line}
</p>
<p class="px-4 pb-3 pt-1 text-xs text-ink-muted">— {formatSpeaker(hit.speaker)}</p>

<!-- Following line (revealed on "Show context") -->
{#if showContext && context && context.after}
	<div
		class="mx-4 mb-2 rounded-r-md border-l-3 border-gray-300 bg-gray-50 p-2"
		in:slide={{ duration: 250, delay: 50, easing: quintOut }}
		out:slide={{ duration: 200, easing: quintOut }}
	>
		<div class="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
			<span>{formatSpeaker(context.after.speaker)}</span>
			<span class="font-mono">{context.after.time}</span>
		</div>
		<p class="text-sm leading-snug text-gray-700">{context.after.line}</p>
	</div>
{/if}
