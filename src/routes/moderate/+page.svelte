<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import ErrorMessage from '../../lib/components/ui/ErrorMessage.svelte';
	import LoadingState from '../../lib/components/ui/LoadingState.svelte';
	import Toast from '../../lib/components/ui/Toast.svelte';
	import { moderatorService } from '../../lib/services/ModeratorService';
	import { user } from '../../lib/stores/auth';
	import { PendingEditType } from '../../lib/types/editor';

	let pendingEdits: PendingEditType[] = $state([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let selectedEdits = $state(new SvelteSet<string>());
	let isSubmitting = $state(false);
	let statistics = $state({ pending: 0, approved: 0, rejected: 0, totalToday: 0 });

	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType: 'success' | 'error' | 'info' = $state('info');

	async function loadPendingEdits() {
		try {
			isLoading = true;
			error = null;

			const [edits, stats] = await Promise.all([
				moderatorService.fetchPendingEdits(),
				moderatorService.getEditStatistics()
			]);

			pendingEdits = edits;
			statistics = stats;
		} catch (err) {
			console.error('Failed to load pending edits:', err);
			error = err instanceof Error ? err.message : 'Failed to load pending edits';
		} finally {
			isLoading = false;
		}
	}

	async function approveEdit(editId: string) {
		try {
			isSubmitting = true;
			await moderatorService.approveEdit(editId);

			// Remove from pending list
			pendingEdits = pendingEdits.filter((edit) => edit.id !== editId);
			statistics.pending--;
			statistics.approved++;

			showSuccessToast('Edit approved successfully');
		} catch (err) {
			console.error('Failed to approve edit:', err);
			showErrorToast(err instanceof Error ? err.message : 'Failed to approve edit');
		} finally {
			isSubmitting = false;
		}
	}

	async function rejectEdit(editId: string, reason?: string) {
		try {
			isSubmitting = true;
			await moderatorService.rejectEdit(editId, reason);

			// Remove from pending list
			pendingEdits = pendingEdits.filter((edit) => edit.id !== editId);
			statistics.pending--;
			statistics.rejected++;

			showSuccessToast('Edit rejected successfully');
		} catch (err) {
			console.error('Failed to reject edit:', err);
			showErrorToast(err instanceof Error ? err.message : 'Failed to reject edit');
		} finally {
			isSubmitting = false;
		}
	}

	async function bulkApprove() {
		if (selectedEdits.size === 0) return;

		try {
			isSubmitting = true;
			const editIds = Array.from(selectedEdits);
			await moderatorService.bulkApprove(editIds);

			// Remove approved edits from pending list
			pendingEdits = pendingEdits.filter((edit) => !selectedEdits.has(edit.id));
			statistics.pending -= selectedEdits.size;
			statistics.approved += selectedEdits.size;
			selectedEdits.clear();

			showSuccessToast(`Approved ${editIds.length} edits successfully`);
		} catch (err) {
			console.error('Failed to bulk approve:', err);
			showErrorToast(err instanceof Error ? err.message : 'Failed to approve edits');
		} finally {
			isSubmitting = false;
		}
	}

	async function bulkReject(reason?: string) {
		if (selectedEdits.size === 0) return;

		try {
			isSubmitting = true;
			const editIds = Array.from(selectedEdits);
			await moderatorService.bulkReject(editIds, reason);

			// Remove rejected edits from pending list
			pendingEdits = pendingEdits.filter((edit) => !selectedEdits.has(edit.id));
			statistics.pending -= selectedEdits.size;
			statistics.rejected += selectedEdits.size;
			selectedEdits.clear();

			showSuccessToast(`Rejected ${editIds.length} edits successfully`);
		} catch (err) {
			console.error('Failed to bulk reject:', err);
			showErrorToast(err instanceof Error ? err.message : 'Failed to reject edits');
		} finally {
			isSubmitting = false;
		}
	}

	function toggleEditSelection(editId: string) {
		if (selectedEdits.has(editId)) {
			selectedEdits.delete(editId);
		} else {
			selectedEdits.add(editId);
		}
		selectedEdits = new SvelteSet(selectedEdits);
	}

	function selectAllEdits() {
		selectedEdits = new SvelteSet(pendingEdits.map((edit) => edit.id));
	}

	function clearSelection() {
		selectedEdits.clear();
		selectedEdits = new SvelteSet(selectedEdits);
	}

	function showSuccessToast(message: string) {
		toastMessage = message;
		toastType = 'success';
		showToast = true;
	}

	function showErrorToast(message: string) {
		toastMessage = message;
		toastType = 'error';
		showToast = true;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleString();
	}

	function formatChangeTypes(changeTypes: string[]): string {
		return changeTypes.join(', ');
	}

	onMount(async () => {
		if (!$user) {
			window.location.href = '/auth';
			return;
		}

		const isModerator = await moderatorService.isUserModerator($user.id);
		if (!isModerator) {
			error = 'Access denied: You must be a moderator to access this page';
			isLoading = false;
			return;
		}

		await loadPendingEdits();
	});
</script>

<svelte:head>
	<title>Moderation Dashboard - Seekers' Lounge</title>
	<meta name="description" content="Review and moderate transcript edits" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 py-6">
		<!-- Header -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
			<div class="flex justify-between items-start">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Moderation Dashboard</h1>
					<p class="text-gray-600 mt-1">Review and approve transcript edits</p>
				</div>

				<!-- Statistics -->
				<div class="grid grid-cols-4 gap-4 text-center">
					<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
						<div class="text-2xl font-bold text-yellow-800">{statistics.pending}</div>
						<div class="text-xs text-yellow-600">Pending</div>
					</div>
					<div class="bg-green-50 border border-green-200 rounded-lg p-3">
						<div class="text-2xl font-bold text-green-800">{statistics.approved}</div>
						<div class="text-xs text-green-600">Approved Today</div>
					</div>
					<div class="bg-red-50 border border-red-200 rounded-lg p-3">
						<div class="text-2xl font-bold text-red-800">{statistics.rejected}</div>
						<div class="text-xs text-red-600">Rejected Today</div>
					</div>
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
						<div class="text-2xl font-bold text-blue-800">{statistics.totalToday}</div>
						<div class="text-xs text-blue-600">Total Today</div>
					</div>
				</div>
			</div>
		</div>

		{#if error}
			<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-6">
				<ErrorMessage {error} />
			</div>
		{:else if isLoading}
			<LoadingState message="Loading pending edits..." />
		{:else}
			<!-- Bulk Actions -->
			{#if pendingEdits.length > 0}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<span class="text-sm text-gray-600">
								{selectedEdits.size} of {pendingEdits.length} selected
							</span>
							<button
								onclick={selectAllEdits}
								class="text-sm text-blue-600 hover:text-blue-800"
								disabled={isSubmitting}
							>
								Select All
							</button>
							<button
								onclick={clearSelection}
								class="text-sm text-gray-600 hover:text-gray-800"
								disabled={isSubmitting}
							>
								Clear
							</button>
						</div>

						{#if selectedEdits.size > 0}
							<div class="flex items-center gap-2">
								<button
									onclick={bulkApprove}
									disabled={isSubmitting}
									class="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50"
								>
									Approve ({selectedEdits.size})
								</button>
								<button
									onclick={() => bulkReject()}
									disabled={isSubmitting}
									class="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50"
								>
									Reject ({selectedEdits.size})
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Pending Edits List -->
			{#if pendingEdits.length === 0}
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
					<svg
						class="mx-auto h-12 w-12 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h3 class="mt-4 text-lg font-medium text-gray-900">No pending edits</h3>
					<p class="mt-2 text-gray-600">All edits have been reviewed. Great job!</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each pendingEdits as edit (edit.id)}
						<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
							<div class="flex items-start justify-between">
								<div class="flex items-start gap-3 flex-1">
									<!-- Selection Checkbox -->
									<input
										type="checkbox"
										checked={selectedEdits.has(edit.id)}
										onchange={() => toggleEditSelection(edit.id)}
										class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
									/>

									<!-- Edit Details -->
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-2">
											<span
												class="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full"
											>
												{formatChangeTypes(edit.changeType)}
											</span>
											{#if edit.contributorName}
												<span class="text-sm text-gray-600">by {edit.contributorName}</span>
											{:else}
												<span class="text-sm text-gray-600">by Anonymous</span>
											{/if}
											<span class="text-sm text-gray-400">•</span>
											<span class="text-sm text-gray-500">{formatDate(edit.createdAt)}</span>
										</div>

										<!-- Changes Display -->
										<div class="space-y-2">
											{#if edit.changeType.includes('text')}
												<div class="bg-gray-50 border border-gray-200 rounded-md p-3">
													<div class="text-xs font-medium text-gray-500 mb-1">Text Change</div>
													<div class="text-sm">
														<div class="text-red-600 line-through mb-1">
															Original: "{edit.lineText || 'N/A'}"
														</div>
														<div class="text-green-600">New: "{edit.lineText || 'N/A'}"</div>
													</div>
												</div>
											{/if}

											{#if edit.changeType.includes('speaker')}
												<div class="bg-gray-50 border border-gray-200 rounded-md p-3">
													<div class="text-xs font-medium text-gray-500 mb-1">Speaker Change</div>
													<div class="text-sm">
														<span class="text-red-600">From: {edit.speaker || 'N/A'}</span>
														<span class="text-gray-400 mx-2">→</span>
														<span class="text-green-600">To: {edit.speaker || 'N/A'}</span>
													</div>
												</div>
											{/if}

											{#if edit.changeType.includes('timestamp')}
												<div class="bg-gray-50 border border-gray-200 rounded-md p-3">
													<div class="text-xs font-medium text-gray-500 mb-1">Timestamp Change</div>
													<div class="text-sm">
														<span class="text-red-600">From: {edit.timestampStr || 'N/A'}</span>
														<span class="text-gray-400 mx-2">→</span>
														<span class="text-green-600">To: {edit.timestampStr || 'N/A'}</span>
													</div>
												</div>
											{/if}
										</div>

										{#if edit.notes}
											<div class="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
												<div class="text-xs font-medium text-blue-700 mb-1">Notes</div>
												<div class="text-sm text-blue-800">{edit.notes}</div>
											</div>
										{/if}
									</div>
								</div>

								<!-- Action Buttons -->
								<div class="flex items-center gap-2 ml-4">
									<button
										onclick={() => approveEdit(edit.id)}
										disabled={isSubmitting}
										class="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50 transition-colors"
									>
										Approve
									</button>
									<button
										onclick={() => rejectEdit(edit.id)}
										disabled={isSubmitting}
										class="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50 transition-colors"
									>
										Reject
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Refresh Button -->
			<div class="text-center mt-8">
				<button
					onclick={loadPendingEdits}
					disabled={isLoading}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
				>
					{#if isLoading}
						<svg
							class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500 inline"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Loading...
					{:else}
						Refresh
					{/if}
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Toast -->
<Toast
	message={toastMessage}
	type={toastType}
	show={showToast}
	onClose={() => (showToast = false)}
/>
