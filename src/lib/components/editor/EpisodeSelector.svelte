<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '../ui/Button.svelte';
	import LoadingState from '../ui/LoadingState.svelte';
	import Toast from '../ui/Toast.svelte';
	import { editorService } from '$lib/services/EditorService';

	interface Props {
		selectedEpisode: string | null;
		onEpisodeSelect: (episodeId: string) => void;
	}

	let { selectedEpisode, onEpisodeSelect }: Props = $props();

	let episodes: Array<{
		ep: string;
		title: string;
		season: string;
		hasAudio: boolean;
		hasEdits?: boolean;
	}> = $state([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'info' | 'success' | 'warning' | 'error'>('info');
	let retryCount = $state(0);
	let maxRetries = 3;

	// Filtered episodes based on search term
	let filteredEpisodes = $derived(
		episodes.filter(
			(episode) =>
				episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				episode.ep.toLowerCase().includes(searchTerm.toLowerCase()) ||
				episode.season.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	// Group episodes by season
	let episodesBySeason = $derived.by(() => {
		const grouped: Record<string, typeof episodes> = {};

		filteredEpisodes.forEach((episode) => {
			if (!grouped[episode.season]) {
				grouped[episode.season] = [];
			}
			grouped[episode.season].push(episode);
		});

		// Sort episodes within each season
		Object.values(grouped).forEach((seasonEpisodes) => {
			seasonEpisodes.sort((a, b) => {
				// Extract season and episode numbers from episode ID (e.g., "s01e01")
				const aMatch = a.ep.match(/s(\d+)e(\d+)/i);
				const bMatch = b.ep.match(/s(\d+)e(\d+)/i);

				if (aMatch && bMatch) {
					const aSeasonNum = parseInt(aMatch[1]);
					const bSeasonNum = parseInt(bMatch[1]);
					const aEpisodeNum = parseInt(aMatch[2]);
					const bEpisodeNum = parseInt(bMatch[2]);

					// First sort by season, then by episode
					if (aSeasonNum !== bSeasonNum) {
						return aSeasonNum - bSeasonNum;
					}
					return aEpisodeNum - bEpisodeNum;
				}

				// Fallback to string comparison
				return a.ep.localeCompare(b.ep);
			});
		});

		// Convert to array and sort seasons
		return Object.entries(grouped).sort(([a], [b]) => {
			// Sort seasons (assuming they follow a pattern like "Season 1", "Season 2", etc.)
			const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
			const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
			return aNum - bNum;
		});
	});

	onMount(async () => {
		await loadEpisodes();
	});

	async function loadEpisodes(showRetryMessage = false) {
		isLoading = true;
		error = null;

		if (showRetryMessage) {
			showToast = true;
			toastMessage = 'Retrying...';
			toastType = 'info';
		}

		try {
			episodes = await editorService.loadEpisodesWithEditStatus();
			// Filter to only episodes with audio by default
			episodes = episodes.filter((ep) => ep.hasAudio);

			if (episodes.length === 0) {
				showToast = true;
				toastMessage = 'No episodes with audio files found';
				toastType = 'warning';
			} else if (showRetryMessage) {
				showToast = true;
				toastMessage = `Successfully loaded ${episodes.length} episodes`;
				toastType = 'success';
			}

			// Reset retry count on success
			retryCount = 0;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load episodes';
			error = errorMessage;

			// Show different messages based on error type
			if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
				showToast = true;
				toastMessage = 'Network error - check your connection';
				toastType = 'error';
			} else if (errorMessage.includes('timeout')) {
				showToast = true;
				toastMessage = 'Request timed out - server may be slow';
				toastType = 'error';
			} else {
				showToast = true;
				toastMessage = 'Failed to load episodes';
				toastType = 'error';
			}

			console.error('Failed to load episodes:', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleRetry() {
		if (retryCount < maxRetries) {
			retryCount++;
			await loadEpisodes(true);
		} else {
			showToast = true;
			toastMessage = 'Maximum retry attempts reached';
			toastType = 'error';
		}
	}

	function handleEpisodeSelect(episodeId: string) {
		try {
			onEpisodeSelect(episodeId);
			showToast = true;
			toastMessage = `Selected episode: ${episodeId}`;
			toastType = 'success';
		} catch (err) {
			showToast = true;
			toastMessage = 'Failed to select episode';
			toastType = 'error';
			console.error('Failed to select episode:', err);
		}
	}

	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchTerm = target.value;

		// Show helpful message when searching
		if (searchTerm.length > 0 && filteredEpisodes.length === 0) {
			showToast = true;
			toastMessage = `No episodes found for "${searchTerm}"`;
			toastType = 'info';
		}
	}

	function clearSelection() {
		onEpisodeSelect('');
	}
</script>

<div class="w-full max-w-2xl mx-auto">
	<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
		<div class="p-4 border-b border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900 mb-3">Select Episode to Edit</h2>

			<!-- Search input -->
			<div class="relative">
				<svg
					class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					bind:value={searchTerm}
					type="text"
					placeholder="Search episodes..."
					class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					oninput={handleSearchInput}
					aria-label="Search episodes by title, season, or episode number"
				/>
			</div>

			{#if selectedEpisode}
				<div class="mt-3 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
					<span class="text-sm text-blue-800">
						Selected: <strong>{selectedEpisode}</strong>
					</span>
					<Button variant="ghost" size="sm" onclick={clearSelection}>Clear</Button>
				</div>
			{/if}
		</div>

		<div class="p-4">
			{#if isLoading}
				<LoadingState message="Loading episodes..." size="md" />
			{:else if error}
				<div class="text-center py-8">
					<div class="mb-4">
						<svg
							class="w-12 h-12 text-red-500 mx-auto mb-3"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
						<h3 class="text-lg font-medium text-gray-900 mb-2">Failed to load episodes</h3>
						<p class="text-red-600 mb-4">{error}</p>
						{#if retryCount > 0}
							<p class="text-sm text-gray-600 mb-4">Retry attempt: {retryCount}/{maxRetries}</p>
						{/if}
					</div>
					<div class="flex justify-center gap-3">
						<Button onclick={handleRetry} disabled={retryCount >= maxRetries}>Retry</Button>
						<Button variant="outline" onclick={() => window.location.reload()}>Reload Page</Button>
					</div>
				</div>
			{:else if episodes.length === 0}
				<div class="text-center py-8">
					<svg
						class="w-12 h-12 text-gray-400 mx-auto mb-3"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
						/>
					</svg>
					<h3 class="text-lg font-medium text-gray-900 mb-2">No episodes found</h3>
					<p class="text-gray-600 mb-4">
						No episodes with audio files were found. Audio files may still be processing.
					</p>
					<Button variant="outline" onclick={handleRetry}>Refresh</Button>
				</div>
			{:else if filteredEpisodes.length === 0 && searchTerm.length > 0}
				<div class="text-center py-8">
					<svg
						class="w-12 h-12 text-gray-400 mx-auto mb-3"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<h3 class="text-lg font-medium text-gray-900 mb-2">No results found</h3>
					<p class="text-gray-600 mb-4">No episodes found for "{searchTerm}"</p>
					<Button variant="outline" onclick={() => (searchTerm = '')}>Clear Search</Button>
				</div>
			{:else}
				<div class="max-h-96 overflow-y-auto space-y-4">
					{#each episodesBySeason as [season, seasonEpisodes] (season)}
						<div>
							<h3 class="text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-white py-1">
								{season} ({seasonEpisodes.length} episodes)
							</h3>
							<div class="grid gap-2">
								{#each seasonEpisodes as episode (episode.ep)}
									<button
										onclick={() => handleEpisodeSelect(episode.ep)}
										class={`text-left p-3 rounded-lg border transition-colors ${
											selectedEpisode === episode.ep
												? 'border-blue-500 bg-blue-50 text-blue-900'
												: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
										}`}
									>
										<div class="flex items-center justify-between">
											<div class="flex-1 min-w-0">
												<div class="font-medium text-sm truncate">
													{episode.title}
												</div>
												<div class="text-xs text-gray-500 mt-1">
													{episode.ep} • {episode.season}
												</div>
											</div>
											<div class="flex-shrink-0 ml-2 flex items-center gap-1">
												{#if episode.hasEdits}
													<div
														class="flex items-center justify-center w-4 h-4 bg-orange-100 border border-orange-300 rounded-full"
														title="Episode has been edited"
													>
														<svg
															class="w-2.5 h-2.5 text-orange-600"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
															/>
														</svg>
													</div>
												{/if}
												{#if episode.hasAudio}
													<svg
														class="w-4 h-4 text-green-500"
														fill="currentColor"
														viewBox="0 0 20 20"
														aria-label="Audio available"
													>
														<path
															d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.5 13.5H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.5l3.883-3.314A1 1 0 019.383 3.076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 10a7.971 7.971 0 00-2.343-5.657 1 1 0 010-1.414zM12.828 6.343a1 1 0 011.414 0A5.983 5.983 0 0116 10a5.983 5.983 0 01-1.758 4.243 1 1 0 01-1.414-1.414A3.983 3.983 0 0014 10a3.983 3.983 0 00-1.172-2.829 1 1 0 010-1.414z"
														/>
													</svg>
												{/if}
											</div>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Toast notifications -->
<Toast
	message={toastMessage}
	type={toastType}
	show={showToast}
	onClose={() => (showToast = false)}
	duration={3000}
/>
