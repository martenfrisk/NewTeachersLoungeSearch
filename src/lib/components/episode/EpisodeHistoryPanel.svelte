<script lang="ts">
	import type { EpisodeHistoryDataType } from '../../types/history';
	import HistoryTimeline from './HistoryTimeline.svelte';
	import { slide, fade } from 'svelte/transition';

	interface Props {
		historyData: EpisodeHistoryDataType;
		isOpen: boolean;
		onClose: () => void;
	}

	let { historyData, isOpen, onClose }: Props = $props();

	let activeTab = $state<'timeline' | 'stats'>('timeline');

	const handleBackdropClick = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			onClose();
		}
	};

	const getEditTypePercentage = (count: number, total: number): number => {
		return total > 0 ? Math.round((count / total) * 100) : 0;
	};
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-40 md:hidden"
		onclick={handleBackdropClick}
		transition:fade={{ duration: 200 }}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	></div>

	<!-- Panel -->
	<div
		class="fixed inset-x-0 bottom-0 md:relative md:inset-auto bg-white rounded-t-xl md:rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] md:max-h-none overflow-hidden"
		transition:slide={{ duration: 300, axis: 'y' }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
			<div class="flex items-center gap-3">
				<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h3 class="font-semibold text-gray-900">Episode History</h3>
				{#if historyData.episodeEp}
					<span class="text-sm text-gray-500">({historyData.episodeEp})</span>
				{/if}
			</div>

			<button
				onclick={onClose}
				class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				aria-label="Close history panel"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex border-b border-gray-200 bg-gray-50">
			<button
				onclick={() => (activeTab = 'timeline')}
				class="flex-1 px-4 py-3 text-sm font-medium text-center transition-colors {activeTab ===
				'timeline'
					? 'text-blue-600 border-b-2 border-blue-600 bg-white'
					: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}"
			>
				Timeline
			</button>
			<button
				onclick={() => (activeTab = 'stats')}
				class="flex-1 px-4 py-3 text-sm font-medium text-center transition-colors {activeTab ===
				'stats'
					? 'text-blue-600 border-b-2 border-blue-600 bg-white'
					: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}"
			>
				Statistics
			</button>
		</div>

		<!-- Content -->
		<div class="overflow-y-auto max-h-96 md:max-h-[60vh]">
			{#if activeTab === 'timeline'}
				<div class="p-4" transition:fade={{ duration: 200 }}>
					<HistoryTimeline timeline={historyData.timeline} maxItems={20} />
				</div>
			{:else if activeTab === 'stats'}
				<div class="p-4 space-y-6" transition:fade={{ duration: 200 }}>
					<!-- Overview Stats -->
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div class="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
							<div class="text-2xl font-bold text-blue-600">{historyData.stats.totalEdits}</div>
							<div class="text-sm text-blue-700">Total Edits</div>
						</div>
						<div class="text-center p-3 bg-green-50 rounded-lg border border-green-100">
							<div class="text-2xl font-bold text-green-600">{historyData.stats.approvedEdits}</div>
							<div class="text-sm text-green-700">Approved</div>
						</div>
						<div class="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
							<div class="text-2xl font-bold text-yellow-600">{historyData.stats.pendingEdits}</div>
							<div class="text-sm text-yellow-700">Pending</div>
						</div>
						<div class="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
							<div class="text-2xl font-bold text-purple-600">
								{historyData.stats.uniqueContributors}
							</div>
							<div class="text-sm text-purple-700">Contributors</div>
						</div>
					</div>

					<!-- Edit Types Breakdown -->
					<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
						<h4 class="font-medium text-gray-900 mb-4">Edit Types</h4>
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 bg-blue-400 rounded-full"></div>
									<span class="text-sm text-gray-700">Text Changes</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-gray-900"
										>{historyData.stats.editsByType.text}</span
									>
									<span class="text-xs text-gray-500">
										({getEditTypePercentage(
											historyData.stats.editsByType.text,
											historyData.stats.totalEdits
										)}%)
									</span>
								</div>
							</div>

							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 bg-purple-400 rounded-full"></div>
									<span class="text-sm text-gray-700">Timestamp Adjustments</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-gray-900"
										>{historyData.stats.editsByType.timestamp}</span
									>
									<span class="text-xs text-gray-500">
										({getEditTypePercentage(
											historyData.stats.editsByType.timestamp,
											historyData.stats.totalEdits
										)}%)
									</span>
								</div>
							</div>

							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 bg-orange-400 rounded-full"></div>
									<span class="text-sm text-gray-700">Speaker Changes</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-gray-900"
										>{historyData.stats.editsByType.speaker}</span
									>
									<span class="text-xs text-gray-500">
										({getEditTypePercentage(
											historyData.stats.editsByType.speaker,
											historyData.stats.totalEdits
										)}%)
									</span>
								</div>
							</div>

							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 bg-green-400 rounded-full"></div>
									<span class="text-sm text-gray-700">Combined Changes</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-gray-900"
										>{historyData.stats.editsByType.combined}</span
									>
									<span class="text-xs text-gray-500">
										({getEditTypePercentage(
											historyData.stats.editsByType.combined,
											historyData.stats.totalEdits
										)}%)
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Last Edit Info -->
					{#if historyData.stats.lastEditedAt}
						<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
							<h4 class="font-medium text-gray-900 mb-2">Last Activity</h4>
							<p class="text-sm text-gray-600">
								Last edited {new Date(historyData.stats.lastEditedAt).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Footer (mobile only) -->
		<div class="md:hidden p-4 border-t border-gray-200 bg-gray-50">
			<button
				onclick={onClose}
				class="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
			>
				Close
			</button>
		</div>
	</div>
{/if}
