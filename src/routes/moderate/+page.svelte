<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import ErrorMessage from '../../lib/components/ui/ErrorMessage.svelte';
	import LoadingState from '../../lib/components/ui/LoadingState.svelte';
	import Toast from '../../lib/components/ui/Toast.svelte';
	import DiffViewer from '../../lib/components/moderation/DiffViewer.svelte';
	import { moderatorService } from '../../lib/services/ModeratorService';
	import { user, authLoading } from '../../lib/stores/auth';
	import { appStore } from '../../lib/stores/app';
	import type {
		PendingEpisodeSubmissionType,
		EditableTranscriptLineType
	} from '../../lib/types/editor';

	let pendingEpisodeSubmissions: PendingEpisodeSubmissionType[] = $state([]);
	let approvedEpisodeSubmissions: PendingEpisodeSubmissionType[] = $state([]);
	let rejectedEpisodeSubmissions: PendingEpisodeSubmissionType[] = $state([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let activeTab: 'pending' | 'approved' | 'rejected' = $state('pending');
	// svelte-ignore non_reactive_update
	let selectedEpisodeSubmissions = new SvelteSet<string>();
	let isSubmitting = $state(false);
	let statistics = $state({ pending: 0, approved: 0, rejected: 0, totalToday: 0 });

	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType: 'success' | 'error' | 'info' = $state('info');

	// Diff viewer state
	let showDiffModal = $state(false);
	let currentDiffSubmission: PendingEpisodeSubmissionType | null = $state(null);
	let originalTranscriptData: EditableTranscriptLineType[] = $state([]);
	let isLoadingDiff = $state(false);

	async function loadSubmissions() {
		try {
			isLoading = true;
			error = null;

			const [pendingSubmissions, approvedSubmissions, rejectedSubmissions, stats] =
				await Promise.all([
					moderatorService.fetchPendingEpisodeSubmissions(),
					moderatorService.fetchApprovedEpisodeSubmissions(),
					moderatorService.fetchRejectedEpisodeSubmissions(),
					moderatorService.getEditStatistics()
				]);

			pendingEpisodeSubmissions = pendingSubmissions;
			approvedEpisodeSubmissions = approvedSubmissions;
			rejectedEpisodeSubmissions = rejectedSubmissions;
			statistics = stats;
		} catch (err) {
			console.error('Failed to load submissions:', err);
			error = err instanceof Error ? err.message : 'Failed to load submissions';
		} finally {
			isLoading = false;
		}
	}

	// Episode submission functions
	async function approveEpisodeSubmission(submissionId: string) {
		try {
			isSubmitting = true;
			await moderatorService.approveEpisodeSubmission(submissionId);

			// Remove from pending list
			pendingEpisodeSubmissions = pendingEpisodeSubmissions.filter(
				(submission) => submission.id !== submissionId
			);
			statistics.pending--;
			statistics.approved++;

			showSuccessToast('Episode submission approved successfully');
		} catch (err) {
			console.error('Failed to approve episode submission:', err);
			showErrorToast(err instanceof Error ? err.message : 'Failed to approve submission');
		} finally {
			isSubmitting = false;
		}
	}

	async function rejectEpisodeSubmission(submissionId: string, reason?: string) {
		try {
			isSubmitting = true;
			await moderatorService.rejectEpisodeSubmission(submissionId, reason);

			// Remove from pending list
			pendingEpisodeSubmissions = pendingEpisodeSubmissions.filter(
				(submission) => submission.id !== submissionId
			);
			statistics.pending--;
			statistics.rejected++;

			showSuccessToast('Episode submission rejected successfully');
		} catch (err) {
			console.error('Failed to reject episode submission:', err);
			showErrorToast(err instanceof Error ? err.message : 'Failed to reject submission');
		} finally {
			isSubmitting = false;
		}
	}

	async function bulkApproveEpisodeSubmissions() {
		if (selectedEpisodeSubmissions.size === 0) return;

		try {
			isSubmitting = true;
			const submissionIds = Array.from(selectedEpisodeSubmissions);
			await moderatorService.bulkApproveEpisodeSubmissions(submissionIds);

			// Remove approved submissions from pending list
			pendingEpisodeSubmissions = pendingEpisodeSubmissions.filter(
				(submission) => !selectedEpisodeSubmissions.has(submission.id)
			);
			statistics.pending -= selectedEpisodeSubmissions.size;
			statistics.approved += selectedEpisodeSubmissions.size;
			selectedEpisodeSubmissions.clear();

			showSuccessToast(`Approved ${submissionIds.length} episode submissions successfully`);
		} catch (err) {
			console.error('Failed to bulk approve episode submissions:', err);
			showErrorToast(err instanceof Error ? err.message : 'Failed to approve submissions');
		} finally {
			isSubmitting = false;
		}
	}

	async function bulkRejectEpisodeSubmissions(reason?: string) {
		if (selectedEpisodeSubmissions.size === 0) return;

		try {
			isSubmitting = true;
			const submissionIds = Array.from(selectedEpisodeSubmissions);
			await moderatorService.bulkRejectEpisodeSubmissions(submissionIds, reason);

			// Remove rejected submissions from pending list
			pendingEpisodeSubmissions = pendingEpisodeSubmissions.filter(
				(submission) => !selectedEpisodeSubmissions.has(submission.id)
			);
			statistics.pending -= selectedEpisodeSubmissions.size;
			statistics.rejected += selectedEpisodeSubmissions.size;
			selectedEpisodeSubmissions.clear();

			showSuccessToast(`Rejected ${submissionIds.length} episode submissions successfully`);
		} catch (err) {
			console.error('Failed to bulk reject episode submissions:', err);
			showErrorToast(err instanceof Error ? err.message : 'Failed to reject submissions');
		} finally {
			isSubmitting = false;
		}
	}

	function toggleEpisodeSubmissionSelection(submissionId: string) {
		if (selectedEpisodeSubmissions.has(submissionId)) {
			selectedEpisodeSubmissions.delete(submissionId);
		} else {
			selectedEpisodeSubmissions.add(submissionId);
		}
		selectedEpisodeSubmissions = new SvelteSet(selectedEpisodeSubmissions);
	}

	function selectAllEpisodeSubmissions() {
		selectedEpisodeSubmissions = new SvelteSet(
			pendingEpisodeSubmissions.map((submission) => submission.id)
		);
	}

	function clearEpisodeSubmissionsSelection() {
		selectedEpisodeSubmissions.clear();
		selectedEpisodeSubmissions = new SvelteSet(selectedEpisodeSubmissions);
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

	onMount(async () => {
		// Wait for auth to finish loading
		if ($authLoading) {
			// Wait for auth to complete
			const unsubscribe = authLoading.subscribe((loading) => {
				if (!loading) {
					unsubscribe();
					checkAuthAndLoadData();
				}
			});
			return;
		}

		await checkAuthAndLoadData();
	});

	async function checkAuthAndLoadData() {
		if (!$user) {
			appStore.openAuthModal();
			return;
		}

		const isModerator = await moderatorService.isUserModerator($user.id);
		if (!isModerator) {
			error = 'Access denied: You must be a moderator to access this page';
			isLoading = false;
			return;
		}

		await loadSubmissions();
	}

	async function showChanges(submission: PendingEpisodeSubmissionType) {
		try {
			isLoadingDiff = true;
			currentDiffSubmission = submission;
			showDiffModal = true;

			// Load original transcript data for comparison
			console.log('Loading original transcript for:', submission.episodeEp);
			originalTranscriptData = await moderatorService.fetchOriginalTranscript(submission.episodeEp);
			console.log('Original transcript loaded:', originalTranscriptData.length, 'lines');
			console.log('Submitted transcript has:', submission.transcriptData.length, 'lines');
		} catch (err) {
			console.error('Failed to load original transcript:', err);
			showErrorToast('Failed to load original transcript for comparison');
			originalTranscriptData = [];
		} finally {
			isLoadingDiff = false;
		}
	}

	function closeDiffModal() {
		showDiffModal = false;
		currentDiffSubmission = null;
		originalTranscriptData = [];
		isLoadingDiff = false;
	}
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

		<!-- Tab Navigation -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
			<div class="border-b border-gray-200">
				<nav class="flex">
					<button
						onclick={() => (activeTab = 'pending')}
						class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'pending'
							? 'border-b-2 border-blue-500 text-blue-600'
							: 'text-gray-500 hover:text-gray-700'}"
					>
						Pending ({statistics.pending})
					</button>
					<button
						onclick={() => (activeTab = 'approved')}
						class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'approved'
							? 'border-b-2 border-blue-500 text-blue-600'
							: 'text-gray-500 hover:text-gray-700'}"
					>
						Approved ({approvedEpisodeSubmissions.length})
					</button>
					<button
						onclick={() => (activeTab = 'rejected')}
						class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'rejected'
							? 'border-b-2 border-blue-500 text-blue-600'
							: 'text-gray-500 hover:text-gray-700'}"
					>
						Rejected ({rejectedEpisodeSubmissions.length})
					</button>
				</nav>
			</div>
		</div>

		{#if error}
			<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-6">
				<ErrorMessage {error} />
			</div>
		{:else if isLoading}
			<LoadingState message="Loading pending submissions..." />
		{:else}
			<!-- Episode Submissions -->
			{#if activeTab === 'pending'}
				<!-- Bulk Actions for Episode Submissions -->
				{#if pendingEpisodeSubmissions.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600">
									{selectedEpisodeSubmissions.size} of {pendingEpisodeSubmissions.length} selected
								</span>
								<button
									onclick={selectAllEpisodeSubmissions}
									class="text-sm text-blue-600 hover:text-blue-800"
									disabled={isSubmitting}
								>
									Select All
								</button>
								<button
									onclick={clearEpisodeSubmissionsSelection}
									class="text-sm text-gray-600 hover:text-gray-800"
									disabled={isSubmitting}
								>
									Clear
								</button>
							</div>

							{#if selectedEpisodeSubmissions.size > 0}
								<div class="flex items-center gap-2">
									<button
										onclick={bulkApproveEpisodeSubmissions}
										disabled={isSubmitting}
										class="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50"
									>
										Approve ({selectedEpisodeSubmissions.size})
									</button>
									<button
										onclick={() => bulkRejectEpisodeSubmissions()}
										disabled={isSubmitting}
										class="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50"
									>
										Reject ({selectedEpisodeSubmissions.size})
									</button>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Bulk Actions for Episode Submissions -->
				{#if pendingEpisodeSubmissions.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600">
									{selectedEpisodeSubmissions.size} of {pendingEpisodeSubmissions.length} selected
								</span>
								<button
									onclick={selectAllEpisodeSubmissions}
									class="text-sm text-blue-600 hover:text-blue-800"
									disabled={isSubmitting}
								>
									Select All
								</button>
								<button
									onclick={clearEpisodeSubmissionsSelection}
									class="text-sm text-gray-600 hover:text-gray-800"
									disabled={isSubmitting}
								>
									Clear
								</button>
							</div>

							{#if selectedEpisodeSubmissions.size > 0}
								<div class="flex items-center gap-2">
									<button
										onclick={bulkApproveEpisodeSubmissions}
										disabled={isSubmitting}
										class="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50"
									>
										Approve ({selectedEpisodeSubmissions.size})
									</button>
									<button
										onclick={() => bulkRejectEpisodeSubmissions()}
										disabled={isSubmitting}
										class="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50"
									>
										Reject ({selectedEpisodeSubmissions.size})
									</button>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Episode Submissions List -->
				{#if pendingEpisodeSubmissions.length === 0}
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
						<h3 class="mt-4 text-lg font-medium text-gray-900">No pending episode submissions</h3>
						<p class="mt-2 text-gray-600">All episode submissions have been reviewed. Great job!</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each pendingEpisodeSubmissions as submission (submission.id)}
							<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
								<div class="flex items-start justify-between">
									<div class="flex items-start gap-3 flex-1">
										<!-- Selection Checkbox -->
										<input
											type="checkbox"
											checked={selectedEpisodeSubmissions.has(submission.id)}
											onchange={() => toggleEpisodeSubmissionSelection(submission.id)}
											class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
										/>

										<!-- Submission Details -->
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-3">
												<span
													class="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
												>
													Episode {submission.episodeEp}
												</span>
												<span
													class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
												>
													{submission.submissionType}
												</span>
												{#if submission.contributorDisplayName}
													<span class="text-sm text-gray-600"
														>by {submission.contributorDisplayName}</span
													>
												{:else}
													<span class="text-sm text-gray-600">by Anonymous</span>
												{/if}
												{#if submission.contactProvided}
													<span class="text-xs text-gray-500">(contact provided)</span>
												{/if}
												<span class="text-sm text-gray-400">•</span>
												<span class="text-sm text-gray-500">{formatDate(submission.createdAt)}</span
												>
											</div>

											<!-- Submission Summary -->
											<div class="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3">
												<div class="text-xs font-medium text-gray-500 mb-1">Submission Summary</div>
												<div class="text-sm text-gray-700">
													Complete episode transcript with {submission.transcriptData.length} lines
												</div>
											</div>

											{#if submission.notes}
												<div class="bg-blue-50 border border-blue-200 rounded-md p-3">
													<div class="text-xs font-medium text-blue-700 mb-1">Notes</div>
													<div class="text-sm text-blue-800">{submission.notes}</div>
												</div>
											{/if}
										</div>
									</div>

									<!-- Action Buttons -->
									<div class="flex items-center gap-2 ml-4">
										<button
											onclick={() => showChanges(submission)}
											class="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
										>
											View Changes
										</button>
										<button
											onclick={() => approveEpisodeSubmission(submission.id)}
											disabled={isSubmitting}
											class="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50 transition-colors"
										>
											Approve
										</button>
										<button
											onclick={() => rejectEpisodeSubmission(submission.id)}
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
			{:else if activeTab === 'approved'}
				<!-- Approved Submissions List -->
				{#if approvedEpisodeSubmissions.length === 0}
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
						<h3 class="mt-4 text-lg font-medium text-gray-900">No approved submissions</h3>
						<p class="mt-2 text-gray-600">Approved submissions will appear here.</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each approvedEpisodeSubmissions as submission (submission.id)}
							<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
								<div class="flex items-start justify-between">
									<div class="flex items-start gap-3 flex-1">
										<!-- Submission Details -->
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-3">
												<span
													class="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
												>
													Episode {submission.episodeEp}
												</span>
												<span
													class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
												>
													{submission.submissionType}
												</span>
												<span
													class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
												>
													APPROVED
												</span>
												{#if submission.contributorDisplayName}
													<span class="text-sm text-gray-600"
														>by {submission.contributorDisplayName}</span
													>
												{:else}
													<span class="text-sm text-gray-600">by Anonymous</span>
												{/if}
												{#if submission.contactProvided}
													<span class="text-xs text-gray-500">(contact provided)</span>
												{/if}
												<span class="text-sm text-gray-400">•</span>
												<span class="text-sm text-gray-500">{formatDate(submission.createdAt)}</span
												>
											</div>

											<!-- Review Information -->
											{#if submission.reviewedBy}
												<div class="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
													<div class="text-xs font-medium text-green-700 mb-1">Review Details</div>
													<div class="text-sm text-green-800">
														Approved by {submission.reviewerName || 'Moderator'}
														{#if submission.reviewedAt}
															on {formatDate(submission.reviewedAt)}
														{/if}
													</div>
												</div>
											{/if}

											<!-- Submission Summary -->
											<div class="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3">
												<div class="text-xs font-medium text-gray-500 mb-1">Submission Summary</div>
												<div class="text-sm text-gray-700">
													Complete episode transcript with {submission.transcriptData.length} lines
												</div>
											</div>

											{#if submission.notes}
												<div class="bg-blue-50 border border-blue-200 rounded-md p-3">
													<div class="text-xs font-medium text-blue-700 mb-1">Notes</div>
													<div class="text-sm text-blue-800">{submission.notes}</div>
												</div>
											{/if}
										</div>
									</div>

									<!-- Action Buttons -->
									<div class="flex items-center gap-2 ml-4">
										<button
											onclick={() => showChanges(submission)}
											class="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
										>
											View Changes
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'rejected'}
				<!-- Rejected Submissions List -->
				{#if rejectedEpisodeSubmissions.length === 0}
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
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						<h3 class="mt-4 text-lg font-medium text-gray-900">No rejected submissions</h3>
						<p class="mt-2 text-gray-600">Rejected submissions will appear here.</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each rejectedEpisodeSubmissions as submission (submission.id)}
							<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
								<div class="flex items-start justify-between">
									<div class="flex items-start gap-3 flex-1">
										<!-- Submission Details -->
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-3">
												<span
													class="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
												>
													Episode {submission.episodeEp}
												</span>
												<span
													class="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full"
												>
													{submission.submissionType}
												</span>
												<span
													class="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
												>
													REJECTED
												</span>
												{#if submission.contributorDisplayName}
													<span class="text-sm text-gray-600"
														>by {submission.contributorDisplayName}</span
													>
												{:else}
													<span class="text-sm text-gray-600">by Anonymous</span>
												{/if}
												{#if submission.contactProvided}
													<span class="text-xs text-gray-500">(contact provided)</span>
												{/if}
												<span class="text-sm text-gray-400">•</span>
												<span class="text-sm text-gray-500">{formatDate(submission.createdAt)}</span
												>
											</div>

											<!-- Review Information -->
											{#if submission.reviewedBy}
												<div class="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
													<div class="text-xs font-medium text-red-700 mb-1">Review Details</div>
													<div class="text-sm text-red-800">
														Rejected by {submission.reviewerName || 'Moderator'}
														{#if submission.reviewedAt}
															on {formatDate(submission.reviewedAt)}
														{/if}
													</div>
													{#if submission.rejectionReason}
														<div class="text-sm text-red-800 mt-2">
															<strong>Reason:</strong>
															{submission.rejectionReason}
														</div>
													{/if}
												</div>
											{/if}

											<!-- Submission Summary -->
											<div class="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3">
												<div class="text-xs font-medium text-gray-500 mb-1">Submission Summary</div>
												<div class="text-sm text-gray-700">
													Complete episode transcript with {submission.transcriptData.length} lines
												</div>
											</div>

											{#if submission.notes}
												<div class="bg-blue-50 border border-blue-200 rounded-md p-3">
													<div class="text-xs font-medium text-blue-700 mb-1">Notes</div>
													<div class="text-sm text-blue-800">{submission.notes}</div>
												</div>
											{/if}
										</div>
									</div>

									<!-- Action Buttons -->
									<div class="flex items-center gap-2 ml-4">
										<button
											onclick={() => showChanges(submission)}
											class="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
										>
											View Changes
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

			<!-- Refresh Button -->
			<div class="text-center mt-8">
				<button
					onclick={loadSubmissions}
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

<!-- Diff Viewer Modal -->
{#if showDiffModal && currentDiffSubmission}
	<div class="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-lg shadow-xl max-w-7xl max-h-[90vh] overflow-hidden w-full">
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
				<h3 class="text-xl font-semibold text-gray-900">
					Review Changes - {currentDiffSubmission.episodeEp}
				</h3>
				<button
					onclick={closeDiffModal}
					class="text-gray-400 hover:text-gray-600 transition-colors"
					aria-label="Close modal"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Modal Content -->
			<div class="overflow-auto max-h-[calc(90vh-8rem)]">
				{#if isLoadingDiff}
					<div class="flex items-center justify-center p-12">
						<div class="text-center">
							<svg
								class="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
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
							<p class="text-gray-600">Loading transcript comparison...</p>
						</div>
					</div>
				{:else}
					<DiffViewer
						original={originalTranscriptData}
						submitted={currentDiffSubmission.transcriptData}
						episodeEp={currentDiffSubmission.episodeEp}
					/>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
				<div class="text-sm text-gray-600">
					{#if currentDiffSubmission.contributorDisplayName}
						Submitted by: {currentDiffSubmission.contributorDisplayName}
					{:else}
						Submitted by: Anonymous
					{/if}
					{#if currentDiffSubmission.contactProvided}
						<span class="text-green-600 ml-2">(contact provided)</span>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					<button
						onclick={closeDiffModal}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						Close
					</button>
					<button
						onclick={() => {
							if (currentDiffSubmission) {
								approveEpisodeSubmission(currentDiffSubmission.id);
								closeDiffModal();
							}
						}}
						disabled={isSubmitting}
						class="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50 transition-colors"
					>
						Approve Changes
					</button>
					<button
						onclick={() => {
							if (currentDiffSubmission) {
								rejectEpisodeSubmission(currentDiffSubmission.id);
								closeDiffModal();
							}
						}}
						disabled={isSubmitting}
						class="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50 transition-colors"
					>
						Reject Changes
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
