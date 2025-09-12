<script lang="ts">
	import type { Correction, CorrectionStatus } from '$lib/types/user';

	interface Props {
		corrections?: Correction[];
		loading?: boolean;
	}

	let { corrections = [], loading = false }: Props = $props();

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

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
	<h2 class="text-xl font-semibold text-gray-900 mb-4">Contribution History</h2>

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
			<h3 class="mt-2 text-sm font-medium text-gray-900">No contributions yet</h3>
			<p class="mt-1 text-sm text-gray-500">
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
				<div class="border border-gray-200 rounded-lg p-4">
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
								<span class="text-xs text-gray-500">
									{new Date(correction.createdAt).toLocaleDateString()}
								</span>
							</div>

							<div class="text-sm">
								<p class="text-gray-600 mb-1">Original:</p>
								<p class="bg-red-50 border border-red-200 rounded p-2 mb-2">
									"{correction.originalLine}"
								</p>

								<p class="text-gray-600 mb-1">Corrected:</p>
								<p class="bg-green-50 border border-green-200 rounded p-2 mb-2">
									"{correction.correctedLine}"
								</p>

								{#if correction.reason}
									<p class="text-gray-600 mb-1">Reason:</p>
									<p class="text-sm text-gray-800 italic">"{correction.reason}"</p>
								{/if}
							</div>
						</div>
					</div>

					{#if correction.reviewedAt && correction.reviewedBy}
						<div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
							Reviewed by {correction.reviewedBy} on {new Date(
								correction.reviewedAt
							).toLocaleDateString()}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if corrections.length > 5}
			<div class="mt-4 text-center">
				<button class="text-sm text-blue-600 hover:text-blue-800 font-medium">
					Load more contributions
				</button>
			</div>
		{/if}
	{/if}
</div>
