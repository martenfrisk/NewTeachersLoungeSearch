<script lang="ts">
	import type { HitStats } from 'lib/types';

	export let stats: HitStats, query: string, filter: string[];
</script>

<p class="flex flex-wrap gap-1 my-4 text-sm md:mt-6 md:mb-8">
	{#if stats?.estimatedTotalHits && stats?.estimatedTotalHits > 0}
		<span>
			{stats.estimatedTotalHits} hits for <em>"{query}"</em>
			{#if filter?.length > 0}
				<span class="text-sm">
					&nbsp;in&nbsp;
					{filter.map((x) => x.replace('=', '')).join(', ')}
				</span>
			{/if}
		</span>
		<span>(results retrieved in {stats.processingTime}ms)</span>
	{:else if stats?.estimatedTotalHits == 0}
		No results for <em>"{query}"</em>
		<!-- {filterEdited ? '(edited lines only)' : ''} ☹ -->
	{:else}
		<span class="w-40 block bg-gray-100 animate-pulse">&nbsp;</span>
	{/if}
</p>
