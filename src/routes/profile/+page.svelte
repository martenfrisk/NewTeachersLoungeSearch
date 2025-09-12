<script lang="ts">
	import { authHelpers } from '$lib/stores/auth';
	import { userPreferencesStore } from '$lib/stores/userPreferences.svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import UserPreferencesForm from '$lib/components/ui/UserPreferencesForm.svelte';
	import ContributionHistory from '$lib/components/ui/ContributionHistory.svelte';
	import type { UserPreferences } from '$lib/types/user';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let loading = $state(false);
	let mockCorrections = $state([]);

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
		userPreferencesStore.preferences = newPreferences;
		userPreferencesStore.savePreferences();
	};

	// Initialize preferences on mount
	onMount(() => {
		userPreferencesStore.initializeTheme();
	});
</script>

<svelte:head>
	<title>Profile - Seekers' Lounge</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto px-4 py-8">
		<!-- Profile Header -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
			<div class="flex items-center space-x-4">
				<div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
					<span class="text-2xl font-bold text-white">
						{data.user?.email?.charAt(0).toUpperCase() || 'U'}
					</span>
				</div>
				<div>
					<h1 class="text-2xl font-bold text-gray-900">{data.user?.email || 'Unknown User'}</h1>
					<p class="text-gray-600">
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
		<ContributionHistory corrections={mockCorrections} />

		<!-- Quick Actions -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<a
					href="/editor"
					class="p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
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
							<h3 class="font-medium text-gray-900">Edit Transcripts</h3>
							<p class="text-sm text-gray-600">Help improve transcript accuracy</p>
						</div>
					</div>
				</a>

				<a
					href="/moderate"
					class="p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
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
							<h3 class="font-medium text-gray-900">Moderate Content</h3>
							<p class="text-sm text-gray-600">Review and approve transcript edits</p>
						</div>
					</div>
				</a>
			</div>
		</div>

		<!-- Sign Out Section -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Account</h2>

			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-600">Ready to leave?</p>
				</div>
				<Button onclick={handleSignOut} variant="secondary" disabled={loading}>
					{loading ? 'Signing Out...' : 'Sign Out'}
				</Button>
			</div>
		</div>
	</div>
</div>
