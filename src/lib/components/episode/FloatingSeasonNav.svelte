<script lang="ts">
	interface Season {
		id: string;
		name: string;
		episodeCount: number;
		isSpecial?: boolean;
	}

	interface Props {
		seasons: Season[];
		currentSeason?: string;
		visible?: boolean;
	}

	let { seasons, currentSeason = '', visible = true }: Props = $props();

	let showDropdown = $state(false);
	let isScrolling = $state(false);
	let scrollTimeout: ReturnType<typeof setTimeout> | undefined = $state();

	const getSeasonDisplayName = (id: string): string => {
		const seasonMap: Record<string, string> = {
			s01: 'S1',
			s02: 'S2',
			s03: 'S3',
			s04: 'S4',
			s05: 'S5',
			s06: 'S6',
			s07: 'S7',
			s08: 'S8',
			s09: 'S9',
			s10: 'S10',
			s11: 'S11',
			mini: 'Mini',
			exit42: 'Exit42',
			Peecast: 'Peecast',
			holidays: 'Holiday',
			jesus: 'Jesus',
			lastresort: 'Resort'
		};
		return seasonMap[id] || id;
	};

	const getCurrentSeasonName = (): string => {
		if (!currentSeason) return 'All Seasons';
		return getSeasonDisplayName(currentSeason);
	};

	const getCurrentSeasonIndex = (): number => {
		if (!currentSeason) return -1;
		return seasons.findIndex((season) => season.id === currentSeason);
	};

	const getPreviousSeason = (): Season | null => {
		const currentIndex = getCurrentSeasonIndex();
		if (currentIndex <= 0) return null;
		return seasons[currentIndex - 1];
	};

	const getNextSeason = (): Season | null => {
		const currentIndex = getCurrentSeasonIndex();
		if (currentIndex === -1 || currentIndex >= seasons.length - 1) return null;
		return seasons[currentIndex + 1];
	};

	const handleSeasonJump = (seasonId: string) => {
		showDropdown = false;

		// Scroll to season
		if (seasonId !== '') {
			const element = document.getElementById(`season-${seasonId}`);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		} else {
			// Jump to top for "All Seasons"
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const handlePreviousSeason = () => {
		const previousSeason = getPreviousSeason();
		if (previousSeason) {
			handleSeasonJump(previousSeason.id);
		}
	};

	const handleNextSeason = () => {
		const nextSeason = getNextSeason();
		if (nextSeason) {
			handleSeasonJump(nextSeason.id);
		}
	};

	const handleScroll = () => {
		isScrolling = true;
		if (scrollTimeout) clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			isScrolling = false;
		}, 150);
	};

	// Handle click outside to close dropdown
	const handleClickOutside = (event: Event) => {
		if (!showDropdown) return;
		const target = event.target as HTMLElement;
		if (!target.closest('.floating-nav-dropdown')) {
			showDropdown = false;
		}
	};

	$effect(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleScroll);
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('scroll', handleScroll);
				document.removeEventListener('click', handleClickOutside);
			}
		};
	});
</script>

{#if visible}
	<div
		class="fixed bottom-6 right-6 z-50 floating-nav-dropdown {isScrolling
			? 'opacity-75'
			: 'opacity-100'} transition-opacity duration-200"
	>
		<!-- Dropdown Menu -->
		{#if showDropdown}
			<div
				class="absolute bottom-full right-0 mb-2 w-48 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
				style="transform-origin: bottom right;"
			>
				<div class="p-2">
					<button
						class="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors {currentSeason ===
						''
							? 'bg-blue-100 text-blue-800'
							: ''}"
						onclick={() => handleSeasonJump('')}
					>
						<div class="flex items-center justify-between">
							<span>All Seasons</span>
							<span class="text-xs text-gray-500"
								>{seasons.reduce((sum, s) => sum + s.episodeCount, 0)}</span
							>
						</div>
					</button>
				</div>

				<div class="border-t border-gray-100"></div>

				<div class="p-2 space-y-1">
					{#each seasons as season (season.id)}
						<button
							class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors {currentSeason ===
							season.id
								? 'bg-blue-100 text-blue-800'
								: ''}"
							onclick={() => handleSeasonJump(season.id)}
						>
							<div class="flex items-center justify-between">
								<span class={season.isSpecial ? 'text-purple-700' : ''}
									>{getSeasonDisplayName(season.id)}</span
								>
								<span class="text-xs text-gray-500">{season.episodeCount}</span>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Navigation Controls -->
		<div class="flex items-center space-x-2">
			<!-- Previous Season Button -->
			{#if getPreviousSeason()}
				<button
					class="p-2 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl text-gray-700 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onclick={handlePreviousSeason}
					aria-label="Previous season: {getSeasonDisplayName(getPreviousSeason()?.id || '')}"
					title="Previous season: {getSeasonDisplayName(getPreviousSeason()?.id || '')}"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
			{/if}

			<!-- Main Button -->
			<button
				class="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl text-sm font-medium text-gray-700 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				onclick={() => (showDropdown = !showDropdown)}
				aria-label="Jump to season"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span class="hidden sm:inline mr-2">Jump to:</span>
				<span class="font-semibold">{getCurrentSeasonName()}</span>
				<svg
					class="w-3 h-3 ml-2 transition-transform duration-200 {showDropdown
						? 'rotate-180'
						: 'rotate-0'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			<!-- Next Season Button -->
			{#if getNextSeason()}
				<button
					class="p-2 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl text-gray-700 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onclick={handleNextSeason}
					aria-label="Next season: {getSeasonDisplayName(getNextSeason()?.id || '')}"
					title="Next season: {getSeasonDisplayName(getNextSeason()?.id || '')}"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	@media (max-width: 640px) {
		.floating-nav-dropdown {
			bottom: 1rem;
			right: 1rem;
		}
	}
</style>
