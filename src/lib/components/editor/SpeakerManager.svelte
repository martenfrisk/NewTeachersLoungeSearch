<script lang="ts">
	import type { SpeakerType } from '$lib/types/editor';
	import Button from '../ui/Button.svelte';

	// Focus management action to replace autofocus
	function focusOnMount(element: HTMLElement) {
		setTimeout(() => element.focus(), 0);
		return {
			destroy() {}
		};
	}

	interface Props {
		speakers: SpeakerType[];
		onSpeakersChange: (speakers: SpeakerType[]) => void;
		onAddSpeaker: (name: string) => void;
	}

	let { speakers, onSpeakersChange, onAddSpeaker }: Props = $props();

	let showAddForm = $state(false);
	let newSpeakerName = $state('');
	let isCollapsed = $state(false);

	// Get speaker usage count from transcript (would be passed as prop in real implementation)
	let speakerUsage = $state<{ [key: string]: number }>({});

	function handleAddSpeaker() {
		if (newSpeakerName.trim()) {
			onAddSpeaker(newSpeakerName.trim());
			newSpeakerName = '';
			showAddForm = false;
		}
	}

	function handleRemoveSpeaker(speakerId: string) {
		// Don't allow removing default speakers that are being used
		const updatedSpeakers = speakers.filter((s) => s.id !== speakerId);
		onSpeakersChange(updatedSpeakers);
	}

	function toggleCollapsed() {
		isCollapsed = !isCollapsed;
	}

	function cancelAdd() {
		showAddForm = false;
		newSpeakerName = '';
	}

	// Check if speaker can be removed (all speakers can be removed now)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function canRemoveSpeaker(_speaker: SpeakerType): boolean {
		return true; // Allow removal of all speakers
	}
</script>

<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
	<div class="p-4 border-b border-gray-200">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-900">Speakers</h3>
			<button
				onclick={toggleCollapsed}
				class="text-gray-400 hover:text-gray-600 transition-colors"
				aria-label={isCollapsed ? 'Expand' : 'Collapse'}
			>
				<svg
					class={`w-5 h-5 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
				</svg>
			</button>
		</div>
		{#if !isCollapsed}
			<p class="text-sm text-gray-600 mt-1">
				Manage speakers for this episode. Use Tab/Shift+Tab to cycle through speakers while editing.
			</p>
		{/if}
	</div>

	{#if !isCollapsed}
		<div class="p-4">
			<!-- Speaker list -->
			<div class="space-y-2 mb-4">
				{#each speakers as speaker (speaker.id)}
					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center gap-3">
							<span
								class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${speaker.color}`}
							>
								{speaker.displayName}
							</span>
							{#if speakerUsage[speaker.name]}
								<span class="text-xs text-gray-500">
									{speakerUsage[speaker.name]} lines
								</span>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							<!-- Keyboard shortcut indicator -->
							<span class="text-xs text-gray-400 font-mono bg-white px-2 py-1 rounded border">
								{speaker.name.charAt(0).toUpperCase()}
							</span>

							{#if canRemoveSpeaker(speaker)}
								<button
									onclick={() => handleRemoveSpeaker(speaker.id)}
									class="text-red-400 hover:text-red-600 transition-colors p-1"
									aria-label={`Remove ${speaker.displayName}`}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Add new speaker -->
			{#if showAddForm}
				<div class="border-t border-gray-200 pt-4">
					<div class="flex gap-2">
						<input
							bind:value={newSpeakerName}
							type="text"
							placeholder="Enter speaker name"
							class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									handleAddSpeaker();
								} else if (e.key === 'Escape') {
									cancelAdd();
								}
							}}
							use:focusOnMount
						/>
						<Button size="sm" onclick={handleAddSpeaker} disabled={!newSpeakerName.trim()}>
							Add
						</Button>
						<Button variant="ghost" size="sm" onclick={cancelAdd}>Cancel</Button>
					</div>
				</div>
			{:else}
				<div class="border-t border-gray-200 pt-4">
					<Button variant="outline" size="sm" onclick={() => (showAddForm = true)}>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
						Add Speaker
					</Button>
				</div>
			{/if}

			<!-- Keyboard shortcuts help -->
			<div class="mt-4 p-3 bg-blue-50 rounded-lg">
				<h4 class="text-sm font-medium text-blue-900 mb-2">Keyboard Shortcuts</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-800">
					<div><kbd class="px-1 bg-blue-100 rounded">Tab</kbd> Next speaker</div>
					<div><kbd class="px-1 bg-blue-100 rounded">Shift+Tab</kbd> Previous speaker</div>
					<div><kbd class="px-1 bg-blue-100 rounded">S</kbd> Edit speaker</div>
					<div><kbd class="px-1 bg-blue-100 rounded">1-9</kbd> Quick select speaker</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	kbd {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
	}
</style>
