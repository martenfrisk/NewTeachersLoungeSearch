<script lang="ts">
	import type { SearchHitType, SearchStats } from '../../types/search';
	import LoadingSpinner from '../ui/LoadingSpinner.svelte';
	import ErrorMessage from '../ui/ErrorMessage.svelte';
	import Button from '../ui/Button.svelte';
	import SearchHit from './SearchHit.svelte';

	interface Props {
		hits: SearchHitType[];
		stats: SearchStats | null;
		loading: boolean;
		error: string | null;
		hasMore: boolean;
		onLoadMore?: () => void;
		onRetry?: () => void;
		onClearError?: () => void;
	}

	let { hits, stats, loading, error, hasMore, onLoadMore, onRetry, onClearError }: Props = $props();
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
		<ErrorMessage {error} {onRetry} onDismiss={onClearError} />
	{/if}

	<!-- Results -->
	{#if hits.length > 0}
		<div class="space-y-4">
			<!-- Stats -->
			{#if stats}
				<div class="text-sm text-gray-600 pb-2">
					Found <span class="font-mono text-xs">{stats.estimatedTotalHits.toLocaleString()}</span>
					results in
					<span class="font-mono text-xs">{stats.processingTime}ms</span>
				</div>
			{/if}

			<!-- Hit List with Performance Optimization -->
			<div class="space-y-4" role="list" aria-label="Search results">
				{#each hits as hit (hit.id)}
					<div role="listitem">
						<SearchHit {hit} />
					</div>
				{/each}
			</div>

			<!-- Load More -->
			{#if hasMore}
				<div class="flex justify-center py-4">
					<Button onclick={onLoadMore} disabled={loading} {loading}>
						{loading ? 'Loading...' : 'Load More Results'}
					</Button>
				</div>
			{/if}

			<!-- Loading More Indicator -->
			{#if loading && hits.length > 0}
				<div class="flex justify-center py-4">
					<LoadingSpinner />
				</div>
			{/if}
		</div>
	{:else if !loading && !error}
		<!-- Empty State -->
		<div class="text-center py-12">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width={2}
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">No results found</h3>
			<p class="mt-1 text-sm text-gray-500">Try adjusting your search terms or filters.</p>
		</div>
	{/if}
</div>
