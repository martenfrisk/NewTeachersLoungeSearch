<script lang="ts">
	import { useSearchContext } from '$lib/contexts/SearchContext';
	import LoadingSpinner from '../ui/LoadingSpinner.svelte';
	import ErrorMessage from '../ui/ErrorMessage.svelte';
	import Button from '../ui/Button.svelte';
	import SearchHit from './SearchHit.svelte';
	import Icon from '../ui/Icon.svelte';
	import { componentTransitions } from '$lib/utils/transitions';

	const { fadeIn, searchHit } = componentTransitions;

	// Get search context instead of props
	const searchContext = useSearchContext();

	const { hits, stats, loading, error, hasMore } = searchContext;
</script>

<div class="w-full space-y-4">
	<!-- Loading State -->
	{#if loading && hits.length === 0}
		<div class="flex justify-center py-8">
			<LoadingSpinner size="lg" />
		</div>
	{/if}

	<!-- Error State -->
	{#if error}
		<ErrorMessage {error} onRetry={searchContext.retry} onDismiss={searchContext.clearError} />
	{/if}

	<!-- Results -->
	{#if hits.length > 0}
		<div class="space-y-1">
			<!-- Stats -->
			{#if stats}
				<div class="text-sm text-gray-600" in:fadeIn>
					<span class="font-mono text-xs">{stats.estimatedTotalHits.toLocaleString()}</span>
					results in
					<span class="font-mono text-xs">{stats.processingTime}ms</span>
					{#if stats.cacheHit}
						<span class="text-blue-600 text-xs ml-2">
							<Icon name="sync" size={12} />
							cached ({stats.cacheSource})
						</span>
					{/if}
				</div>
			{/if}

			<!-- Hit List with Performance Optimization -->
			<div role="list" class="space-y-3" aria-label="Search results">
				{#each hits as hit (hit.id)}
					<div role="listitem" in:searchHit>
						<SearchHit {hit} />
					</div>
				{/each}
			</div>

			<!-- Load More -->
			{#if hasMore}
				<div class="flex justify-center py-4">
					<Button onclick={searchContext.loadMore} disabled={loading} {loading} variant="outline">
						{loading ? 'Loading...' : 'Load More Results'}
					</Button>
				</div>
			{/if}

			<!-- Loading More Indicator -->
			{#if loading && hits.length > 0}
				<div class="flex justify-center py-4" in:fadeIn>
					<LoadingSpinner />
				</div>
			{/if}
		</div>
	{:else if !loading && !error}
		<!-- Empty State -->
		<div class="text-center py-12" in:fadeIn>
			<Icon name="empty-state" size={48} class="mx-auto text-gray-400 mb-4" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">No results found</h3>
			<p class="mt-1 text-sm text-gray-500">Try adjusting your search terms or filters.</p>
		</div>
	{/if}
</div>
