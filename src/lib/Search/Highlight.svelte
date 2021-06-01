<script lang="ts">
	import { highlight } from 'instantsearch.js';
	export let attribute: any, hit: any;
	const parsedHit = highlight({
		highlightProperty: '_highlightResult',
		attribute,
		hit
	});
</script>

<span>
	{#each parsedHit as { isHighlighted, value }}
		{#if isHighlighted}
			<span class="text-blue-700">
				{value}
			</span>
		{:else}
			<span>{value}</span>
		{/if}
	{/each}
</span>
