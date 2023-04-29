<script lang="ts">
	import type { HitStats } from 'lib/types';

	export let stats: HitStats, query: string, filter: string[];
</script>

{#if stats?.estimatedTotalHits && stats?.estimatedTotalHits > 0}
	<p class="flex flex-wrap gap-1 my-4 text-sm md:mt-6 md:mb-8">
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
	</p>
{:else if stats?.estimatedTotalHits == 0}
	<p class="flex flex-wrap gap-1 my-4 text-sm md:mt-6 md:mb-8">
		No results for <em>"{query}"</em>
		<!-- {filterEdited ? '(edited lines only)' : ''} ☹ -->
	</p>
{:else}
	<p class="mt-6 mb-8">
		<span class="w-20 h-8 bg-gray-100 animate-pulse" />
	</p>
{/if}
