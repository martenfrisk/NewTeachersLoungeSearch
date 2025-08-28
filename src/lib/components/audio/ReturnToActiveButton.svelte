<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import Button from '../ui/Button.svelte';

	interface Props {
		visible: boolean;
		onReturnToActive: () => void;
	}

	let { visible, onReturnToActive }: Props = $props();
</script>

{#if visible}
	<div class="fixed bottom-48 right-4 z-50" transition:fade={{ duration: 200 }}>
		<div
			class="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200"
			transition:scale={{ duration: 200, start: 0.8 }}
		>
			<Button
				variant="primary"
				size="sm"
				onclick={onReturnToActive}
				class="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
				aria-label="Return to currently playing line"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>Return to active line</span>
			</Button>
		</div>
	</div>
{/if}
