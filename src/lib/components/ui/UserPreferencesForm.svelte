<script lang="ts">
	import Button from './Button.svelte';
	import type { UserPreferences } from '$lib/types/user';

	interface Props {
		preferences: UserPreferences;
		onSave?: (preferences: UserPreferences) => void;
	}

	let { preferences = $bindable(), onSave }: Props = $props();
	let originalPreferences = $state(JSON.parse(JSON.stringify(preferences)));

	// Track if preferences have changed
	let isDirty = $derived(JSON.stringify(preferences) !== JSON.stringify(originalPreferences));

	const handleSave = () => {
		onSave?.(preferences);
		originalPreferences = JSON.parse(JSON.stringify(preferences));
	};

	const handleReset = () => {
		preferences = JSON.parse(JSON.stringify(originalPreferences));
	};
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
	<h2 class="text-xl font-semibold text-gray-900 mb-4">Preferences</h2>

	<div class="space-y-4">
		<!-- Theme Preference -->
		<div class="flex items-center justify-between">
			<div>
				<label for="theme-select" class="text-sm font-medium text-gray-700">Theme</label>
				<p class="text-xs text-gray-500">Choose your preferred color scheme</p>
			</div>
			<select
				id="theme-select"
				bind:value={preferences.theme}
				class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
				<option value="auto">Auto</option>
			</select>
		</div>

		<!-- Autoplay Preference -->
		<div class="flex items-center justify-between">
			<div>
				<label for="autoplay-checkbox" class="text-sm font-medium text-gray-700"
					>Autoplay Audio</label
				>
				<p class="text-xs text-gray-500">Automatically play audio when clicking search results</p>
			</div>
			<input
				id="autoplay-checkbox"
				type="checkbox"
				bind:checked={preferences.autoplay}
				class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
			/>
		</div>

		<!-- Search History Preference -->
		<div class="flex items-center justify-between">
			<div>
				<label for="search-history-checkbox" class="text-sm font-medium text-gray-700"
					>Save Search History</label
				>
				<p class="text-xs text-gray-500">Remember your recent searches</p>
			</div>
			<input
				id="search-history-checkbox"
				type="checkbox"
				bind:checked={preferences.searchHistory}
				class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
			/>
		</div>

		<!-- Notifications Preference -->
		<div class="flex items-center justify-between">
			<div>
				<label for="notifications-checkbox" class="text-sm font-medium text-gray-700"
					>Notifications</label
				>
				<p class="text-xs text-gray-500">Get notified about updates and new features</p>
			</div>
			<input
				id="notifications-checkbox"
				type="checkbox"
				bind:checked={preferences.notifications}
				class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
			/>
		</div>
	</div>

	{#if isDirty}
		<div class="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
			<p class="text-sm text-gray-600">You have unsaved changes</p>
			<div class="space-x-2">
				<Button onclick={handleReset} variant="secondary" size="sm">Reset</Button>
				<Button onclick={handleSave} variant="primary" size="sm">Save Changes</Button>
			</div>
		</div>
	{/if}
</div>
