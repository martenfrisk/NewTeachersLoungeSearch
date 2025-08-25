<script lang="ts">
	interface Props {
		content?: import('svelte').Snippet;
		tooltip?: import('svelte').Snippet;
	}

	let { content, tooltip }: Props = $props();
</script>

<div class="relative flex flex-col items-center group">
	{@render content?.()}
	<div class="absolute bottom-0 flex-col items-center hidden mb-6 group-hover:flex">
		<span
			class="relative z-10 p-2 font-sans text-xs leading-none text-center text-white bg-blue-800 shadow-lg"
		>
			{@render tooltip?.()}
		</span>
		<div class="w-3 h-3 -mt-2 rotate-45 bg-blue-800"></div>
	</div>
</div>
