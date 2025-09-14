<script lang="ts">
	import type { EpisodeContributionType, CorrectionStatus } from '$lib/types/user';

	interface Props {
		corrections?: EpisodeContributionType[];
		loading?: boolean;
		error?: string | null;
		hasMore?: boolean;
		totalCount?: number;
		onLoadMore?: () => void;
	}

	let {
		corrections = [],
		loading = false,
		error = null,
		hasMore = false,
		totalCount = 0,
		onLoadMore
	}: Props = $props();

	const getStatusColor = (status: CorrectionStatus) => {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'approved':
				return 'bg-green-100 text-green-800';
			case 'rejected':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getStatusIcon = (status: CorrectionStatus) => {
		switch (status) {
			case 'pending':
				return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'approved':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'rejected':
				return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
		}
	};
</script>

<div
	class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
>
	<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contribution History</h2>

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="text-center py-8">
			<div class="text-red-500 mb-4">
				<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h3 class="mt-2 text-sm font-medium text-red-900 dark:text-red-100">
				Error Loading Contributions
			</h3>
			<p class="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
		</div>
	{:else if corrections.length === 0}
		<div class="text-center py-8">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No contributions yet</h3>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Start editing transcripts to see your contribution history here.
			</p>
			<div class="mt-6">
				<a
					href="/editor"
					class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
				>
					<svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
					Start Contributing
				</a>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			{#each corrections as correction (correction.id)}
				<div
					class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800"
				>
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center space-x-2 mb-2">
								<span
									class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(correction.status)}`}
								>
									<svg
										class="-ml-0.5 mr-1.5 h-2 w-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d={getStatusIcon(correction.status)}
										/>
									</svg>
									{correction.status.charAt(0).toUpperCase() + correction.status.slice(1)}
								</span>
								<span class="text-xs text-gray-500 dark:text-gray-400">
									{new Date(correction.createdAt).toLocaleDateString()}
								</span>
							</div>

							<div class="text-sm">
								<div class="mb-3">
									<h4 class="font-medium text-gray-900 dark:text-white mb-1">
										{correction.episodeTitle}
									</h4>
									<p class="text-xs text-gray-500 dark:text-gray-400">
										Episode: {correction.episodeEp}
									</p>
								</div>

								<div class="grid grid-cols-2 gap-4 mb-2">
									<div>
										<p class="text-xs text-gray-600 dark:text-gray-400">Submission Type:</p>
										<p class="text-sm font-medium text-gray-800 dark:text-gray-200">
											{correction.submissionType === 'full_replacement'
												? 'Full Episode'
												: 'Partial Edit'}
										</p>
									</div>
									<div>
										<p class="text-xs text-gray-600 dark:text-gray-400">Lines Changed:</p>
										<p class="text-sm font-medium text-gray-800 dark:text-gray-200">
											{correction.linesChanged} lines
										</p>
									</div>
								</div>

								{#if correction.notes}
									<div class="mt-2">
										<p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Notes:</p>
										<p
											class="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded p-2"
										>
											{correction.notes}
										</p>
									</div>
								{/if}
							</div>
						</div>
					</div>

					{#if correction.reviewedAt && correction.reviewedBy}
						<div
							class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400"
						>
							Reviewed by {correction.reviewedBy} on {new Date(
								correction.reviewedAt
							).toLocaleDateString()}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if hasMore}
			<div class="mt-4 text-center">
				<button
					onclick={onLoadMore}
					disabled={loading}
					class="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Loading...' : 'Load more contributions'}
				</button>
				{#if totalCount > 0}
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Showing {corrections.length} of {totalCount} contributions
					</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>
