<script lang="ts">
	import type { HistoryTimelineEntryType } from '../../types/history';
	import { fade } from 'svelte/transition';

	interface Props {
		timeline: HistoryTimelineEntryType[];
		maxItems?: number;
	}

	let { timeline, maxItems = 10 }: Props = $props();

	const displayedTimeline = $derived(maxItems ? timeline.slice(0, maxItems) : timeline);

	const getStatusColor = (status: string): string => {
		switch (status) {
			case 'approved':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'rejected':
				return 'bg-red-100 text-red-800 border-red-200';
			case 'deleted':
				return 'bg-gray-100 text-gray-600 border-gray-200';
			default:
				return 'bg-gray-100 text-gray-600 border-gray-200';
		}
	};

	const getChangeTypeColor = (changeTypes: string[]): string => {
		if (changeTypes.includes('text')) return 'bg-blue-100 text-blue-700';
		if (changeTypes.includes('timestamp')) return 'bg-purple-100 text-purple-700';
		if (changeTypes.includes('speaker')) return 'bg-orange-100 text-orange-700';
		return 'bg-gray-100 text-gray-600';
	};

	const formatTimestamp = (dateStr: string): string => {
		const date = new Date(dateStr);
		const now = new Date();
		const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

		if (diffInHours < 1) return 'just now';
		if (diffInHours < 24) return `${diffInHours}h ago`;
		if (diffInHours < 48) return 'yesterday';

		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays}d ago`;

		return date.toLocaleDateString();
	};

	const generateInitials = (name: string): string => {
		return name
			.split(' ')
			.map((word) => word.charAt(0))
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};
</script>

{#if displayedTimeline.length > 0}
	<div class="space-y-4">
		{#each displayedTimeline as entry, index (entry.id)}
			<div class="relative flex gap-4 group" transition:fade={{ duration: 200, delay: index * 50 }}>
				<!-- Timeline line -->
				{#if index < displayedTimeline.length - 1}
					<div
						class="absolute left-6 top-12 w-0.5 h-full bg-gray-200 group-hover:bg-gray-300 transition-colors"
					></div>
				{/if}

				<!-- Avatar -->
				<div class="relative flex-shrink-0">
					<div
						class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-md"
					>
						{generateInitials(entry.contributorName)}
					</div>

					<!-- Status indicator dot -->
					<div
						class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm {entry.status ===
						'approved'
							? 'bg-green-400'
							: entry.status === 'pending'
								? 'bg-yellow-400'
								: entry.status === 'rejected'
									? 'bg-red-400'
									: 'bg-gray-400'}"
					></div>
				</div>

				<!-- Content -->
				<div class="flex-1 min-w-0 pb-4">
					<div class="flex items-start justify-between gap-2">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<span class="font-medium text-gray-900">{entry.contributorName}</span>
								<span class="text-gray-500 text-sm">{entry.changeDescription}</span>
							</div>

							<div class="flex items-center gap-2 mb-2">
								<!-- Change type badges -->
								{#each entry.editType as changeType, idx (`${entry.id}-${idx}`)}
									<span
										class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getChangeTypeColor(
											[changeType]
										)}"
									>
										{changeType}
									</span>
								{/each}

								<!-- Status badge -->
								<span
									class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border {getStatusColor(
										entry.status
									)}"
								>
									{entry.status}
								</span>
							</div>

							<!-- Line context -->
							<div class="text-sm text-gray-600 bg-gray-50 rounded-md p-2 border">
								<span class="font-mono text-xs text-gray-500">{entry.lineTimestamp}</span>
								<span class="text-gray-400 mx-2">•</span>
								<span class="font-medium">{entry.lineSpeaker}:</span>
								<span class="ml-1">Line at {entry.lineTimestamp}</span>
							</div>
						</div>

						<div class="text-xs text-gray-500 whitespace-nowrap">
							{formatTimestamp(entry.timestamp)}
						</div>
					</div>
				</div>
			</div>
		{/each}

		{#if timeline.length > maxItems}
			<div class="text-center py-4">
				<span class="text-sm text-gray-500">
					Showing {maxItems} of {timeline.length} changes
				</span>
			</div>
		{/if}
	</div>
{:else}
	<div class="text-center py-8 text-gray-500">
		<svg
			class="w-12 h-12 mx-auto mb-4 text-gray-300"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
		<p>No edit history available for this episode</p>
	</div>
{/if}
