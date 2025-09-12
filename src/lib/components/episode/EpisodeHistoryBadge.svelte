<script lang="ts">
	import type { EpisodeHistoryStatsType } from '../../types/history';
	import { fade } from 'svelte/transition';

	interface Props {
		stats: EpisodeHistoryStatsType | null;
		onClick?: () => void;
	}

	let { stats, onClick }: Props = $props();

	let isHovered = $state(false);

	const handleClick = () => {
		if (onClick) {
			onClick();
		}
	};

	const formatLastEdited = (dateStr?: string): string => {
		if (!dateStr) return '';

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
</script>

{#if stats && stats.totalEdits > 0}
	<button
		onclick={handleClick}
		onmouseenter={() => (isHovered = true)}
		onmouseleave={() => (isHovered = false)}
		class="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 hover:border-green-300 rounded-full transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-green-300 focus:outline-none"
		aria-label="Episode has {stats.totalEdits} edit{stats.totalEdits === 1
			? ''
			: 's'}. Click to view history."
	>
		<!-- History Icon -->
		<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>

		<!-- Edit Count -->
		<span class="text-sm font-medium text-green-700">
			{stats.totalEdits} edit{stats.totalEdits === 1 ? '' : 's'}
		</span>

		<!-- Pending indicator -->
		{#if stats.pendingEdits > 0}
			<span
				class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
				title="{stats.pendingEdits} pending approval"
			>
				{stats.pendingEdits} pending
			</span>
		{/if}

		<!-- Hover tooltip -->
		{#if isHovered}
			<div
				transition:fade={{ duration: 150 }}
				class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 pointer-events-none"
			>
				<div class="space-y-1">
					<div>{stats.approvedEdits} approved, {stats.pendingEdits} pending</div>
					<div>
						{stats.uniqueContributors} contributor{stats.uniqueContributors === 1 ? '' : 's'}
					</div>
					{#if stats.lastEditedAt}
						<div class="text-gray-300">Last edited {formatLastEdited(stats.lastEditedAt)}</div>
					{/if}
				</div>

				<!-- Arrow -->
				<div
					class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"
				></div>
			</div>
		{/if}
	</button>
{/if}
