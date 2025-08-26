<script lang="ts">
	import { slide } from 'svelte/transition';

	interface Props {
		content?: import('svelte').Snippet;
		tooltip?: import('svelte').Snippet;
		side?: 'left' | 'right';
	}

	let { content, tooltip, side = 'right' }: Props = $props();

	let showTooltip = $state(false);
</script>

<div class="relative inline-flex items-center">
	<div
		role="button"
		tabindex="0"
		onmouseenter={() => (showTooltip = true)}
		onmouseleave={() => (showTooltip = false)}
	>
		{@render content?.()}
	</div>

	{#if showTooltip}
		<div
			transition:slide={{ duration: 200, axis: 'x' }}
			class="absolute z-50 pointer-events-none {side === 'left'
				? 'right-full mr-2'
				: 'left-full ml-2'} top-1/2 -translate-y-1/2"
		>
			<div
				class="bg-white border line-clamp-2 border-gray-200 text-gray-900 text-xs px-3 py-2 inset-shadow-sm w-fit whitespace-nowrap"
			>
				{@render tooltip?.()}
			</div>
		</div>
	{/if}
</div>
