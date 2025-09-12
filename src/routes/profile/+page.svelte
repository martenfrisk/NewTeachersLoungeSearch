<script lang="ts">
	import { authHelpers } from '$lib/stores/auth';
	import { userPreferencesStore } from '$lib/stores/userPreferences.svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import UserPreferencesForm from '$lib/components/ui/UserPreferencesForm.svelte';
	import ContributionHistory from '$lib/components/ui/ContributionHistory.svelte';
	import type { UserPreferences, EpisodeContributionType } from '$lib/types/user';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { profileService } from '$lib/services/ProfileService';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let loading = $state(false);
	let corrections = $state<EpisodeContributionType[]>([]);
	let contributionsLoading = $state(false);
	let contributionsError = $state<string | null>(null);
	let hasMoreContributions = $state(false);
	let totalContributions = $state(0);
	let currentOffset = $state(0);

	const handleSignOut = async () => {
		try {
			loading = true;
			await authHelpers.signOut();
			goto('/');
		} catch (error) {
			console.error('Sign out error:', error);
		} finally {
			loading = false;
		}
	};

	const handlePreferencesSave = (newPreferences: UserPreferences) => {
		// Calculate the difference to trigger proper updates
		const oldPrefs = userPreferencesStore.preferences;
		const updates: Partial<UserPreferences> = {};

		if (oldPrefs.theme !== newPreferences.theme) updates.theme = newPreferences.theme;
		if (oldPrefs.autoplay !== newPreferences.autoplay) updates.autoplay = newPreferences.autoplay;
		if (oldPrefs.searchHistory !== newPreferences.searchHistory)
			updates.searchHistory = newPreferences.searchHistory;
		if (oldPrefs.notifications !== newPreferences.notifications)
			updates.notifications = newPreferences.notifications;

		userPreferencesStore.updatePreferences(updates);
	};

	// Load user contributions
	const loadContributions = async (offset = 0, append = false) => {
		try {
			contributionsLoading = true;
			contributionsError = null;
			const result = await profileService.getUserContributions(20, offset);

			if (append) {
				corrections = [...corrections, ...result.contributions];
			} else {
				corrections = result.contributions;
				currentOffset = 0;
			}

			hasMoreContributions = result.hasMore || false;
			totalContributions = result.totalCount || 0;
			currentOffset = offset;
		} catch (error) {
			console.error('Failed to load contributions:', error);
			contributionsError = 'Failed to load contribution history';
		} finally {
			contributionsLoading = false;
		}
	};

	// Load more contributions
	const loadMoreContributions = async () => {
		const nextOffset = currentOffset + 20;
		await loadContributions(nextOffset, true);
	};

	// Initialize preferences and load data on mount
	onMount(() => {
		userPreferencesStore.initializeTheme();
		loadContributions();
	});
</script>

<svelte:head>
	<title>Profile - Seekers' Lounge</title>
</svelte:head>

<div class="min-h-screen dark:bg-gray-900">
	<div class="max-w-4xl mx-auto px-4 py-8">
		<!-- Profile Header -->
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
		>
			<div class="flex items-center space-x-4">
				<div
					class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0"
				>
					<span class="text-2xl font-bold text-white">
						{data.user?.email?.charAt(0).toUpperCase() || 'U'}
					</span>
				</div>
				<div class="min-w-0 flex-1">
					<h1 class="text-2xl font-bold text-gray-900 dark:text-white break-words">
						{data.user?.email || 'Unknown User'}
					</h1>
					<p class="text-gray-600 dark:text-gray-300 text-sm sm:text-base break-words">
						Member since {new Date(data.user?.created_at || '').toLocaleDateString()}
					</p>
				</div>
			</div>
		</div>

		<!-- User Preferences Section -->
		<UserPreferencesForm
			bind:preferences={userPreferencesStore.preferences}
			onSave={handlePreferencesSave}
		/>

		<!-- Contribution History Section -->
		<ContributionHistory
			{corrections}
			loading={contributionsLoading}
			error={contributionsError}
			hasMore={hasMoreContributions}
			totalCount={totalContributions}
			onLoadMore={loadMoreContributions}
		/>

		<!-- Quick Actions -->
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
		>
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<a
					href="/editor"
					class="p-4 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
				>
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
							<svg
								class="w-5 h-5 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-medium text-gray-900 dark:text-white">Edit Transcripts</h3>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								Help improve transcript accuracy
							</p>
						</div>
					</div>
				</a>

				<a
					href="/moderate"
					class="p-4 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
				>
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
							<svg
								class="w-5 h-5 text-blue-600"
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
						</div>
						<div>
							<h3 class="font-medium text-gray-900 dark:text-white">Moderate Content</h3>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								Review and approve transcript edits
							</p>
						</div>
					</div>
				</a>
			</div>
		</div>

		<!-- Sign Out Section -->
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
		>
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account</h2>

			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-300">Ready to leave?</p>
				</div>
				<Button onclick={handleSignOut} variant="secondary" disabled={loading}>
					{loading ? 'Signing Out...' : 'Sign Out'}
				</Button>
			</div>
		</div>
	</div>
</div>
