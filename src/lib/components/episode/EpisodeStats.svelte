<script lang="ts">
	import EmptyStateIcon from 'lib/assets/icons/EmptyStateIcon.svelte';
	import ArrowIcon from 'lib/assets/icons/ArrowIcon.svelte';
	import EpisodesIcon from 'lib/assets/icons/EpisodesIcon.svelte';
	import AudioIcon from 'lib/assets/icons/AudioIcon.svelte';
	import ClockIcon from 'lib/assets/icons/ClockIcon.svelte';
	import DocumentIcon from 'lib/assets/icons/DocumentIcon.svelte';
	import StarIcon from 'lib/assets/icons/StarIcon.svelte';

	import { type Component } from 'svelte';

	interface Episode {
		ep: string;
		title: string;
		desc: string;
		date: string;
		url?: string;
		feedTitle?: string | null;
		hasAudio?: boolean;
		startingTime?: number;
		duration?: number;
		transcriptWordCount?: number;
		rating?: number;
	}

	interface StatCardData {
		title: string;
		value: string | number;
		subtitle?: string;
		icon: Component;
		color: string;
		trend?: {
			value: number;
			direction: 'up' | 'down';
			period: string;
		};
	}

	interface Props {
		episodes: Episode[];
		selectedSeason?: string;
		class?: string;
	}

	let { episodes, selectedSeason = '', class: className = '' }: Props = $props();

	const filteredEpisodes = $derived(() => {
		if (!selectedSeason) return episodes;
		return episodes.filter((ep) => {
			if (selectedSeason.startsWith('s')) {
				return ep.ep.startsWith(selectedSeason);
			}
			return ep.ep.includes(selectedSeason);
		});
	});

	const stats = $derived.by((): StatCardData[] => {
		const eps = filteredEpisodes();
		const totalEpisodes = eps.length;
		const withAudio = eps.filter((ep) => ep.hasAudio).length;
		const totalDuration = eps.reduce((sum, ep) => sum + (ep.duration || 0), 0);
		const totalWords = eps.reduce((sum, ep) => sum + (ep.transcriptWordCount || 0), 0);
		const avgRating = eps
			.filter((ep) => ep.rating)
			.reduce((sum, ep, _, arr) => sum + ep.rating! / arr.length, 0);

		const dateRange = (() => {
			if (eps.length === 0) return '';
			const dates = eps.map((ep) => new Date(ep.date)).sort((a, b) => a.getTime() - b.getTime());
			const start = dates[0];
			const end = dates[dates.length - 1];

			if (start.getFullYear() === end.getFullYear()) {
				return start.getFullYear().toString();
			}
			return `${start.getFullYear()} - ${end.getFullYear()}`;
		})();

		const formatDuration = (seconds: number): string => {
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			if (hours > 0) {
				return `${hours}h ${minutes}m`;
			}
			return `${minutes}m`;
		};

		const cards: StatCardData[] = [
			{
				title: 'Total Episodes',
				value: totalEpisodes.toLocaleString(),
				subtitle: dateRange,
				icon: EpisodesIcon,
				color: 'blue'
			},
			{
				title: 'With Audio',
				value: withAudio.toLocaleString(),
				subtitle: `${Math.round((withAudio / totalEpisodes) * 100)}% of episodes`,
				icon: AudioIcon,
				color: 'green'
			}
		];

		if (totalDuration > 0) {
			cards.push({
				title: 'Total Runtime',
				value: formatDuration(totalDuration),
				subtitle: `Avg: ${formatDuration(totalDuration / totalEpisodes)}`,
				icon: ClockIcon,
				color: 'purple'
			});
		}

		if (totalWords > 0) {
			cards.push({
				title: 'Transcript Words',
				value: totalWords.toLocaleString(),
				subtitle: `Avg: ${Math.round(totalWords / totalEpisodes).toLocaleString()} per episode`,
				icon: DocumentIcon,
				color: 'amber'
			});
		}

		if (avgRating > 0) {
			cards.push({
				title: 'Average Rating',
				value: avgRating.toFixed(1),
				subtitle: 'Community rating',
				icon: StarIcon,
				color: 'yellow'
			});
		}

		return cards;
	});

	const getColorClasses = (color: string) => {
		const colors: Record<string, { bg: string; text: string; border: string }> = {
			blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
			green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
			purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
			amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
			yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' }
		};
		return colors[color] || colors.blue;
	};

	const seasonDisplayName = $derived.by(() => {
		if (!selectedSeason) return 'All Episodes';
		const seasonMap: Record<string, string> = {
			s01: 'Season 1',
			s02: 'Season 2',
			s03: 'Season 3',
			s04: 'Season 4',
			s05: 'Season 5',
			s06: 'Season 6',
			s07: 'Season 7',
			s08: 'Season 8',
			s09: 'Season 9',
			s10: 'Season 10',
			s11: 'Season 11',
			mini: 'Mini Episodes',
			exit42: 'Exit 42',
			Peecast: 'Peecast',
			holidays: 'Holiday Specials',
			jesus: 'Jesus Chronicles',
			lastresort: 'Last Resort'
		};
		return seasonMap[selectedSeason] || selectedSeason;
	});
</script>

<div class="bg-white border border-gray-200 rounded-lg p-6 {className}">
	<div class="mb-4">
		<h3 class="text-lg font-semibold text-gray-900">
			{seasonDisplayName} Statistics
		</h3>
		<p class="text-sm text-gray-600 mt-1">Overview of episode data and metrics</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
		{#each stats as card (card.title)}
			<div
				class="relative overflow-hidden rounded-lg border {getColorClasses(card.color)
					.border} {getColorClasses(card.color).bg} p-4"
			>
				<div class="flex items-center justify-between">
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-gray-600 truncate">
							{card.title}
						</p>
						<p class="text-2xl font-bold {getColorClasses(card.color).text} mt-1">
							{card.value}
						</p>
						{#if card.subtitle}
							<p class="text-xs text-gray-500 mt-1 truncate">
								{card.subtitle}
							</p>
						{/if}
					</div>

					<div class="flex-shrink-0 ml-3">
						<card.icon class="w-8 h-8 {getColorClasses(card.color).text} opacity-60" />
					</div>
				</div>

				{#if card.trend}
					<div class="mt-3 flex items-center text-xs">
						<span
							class="flex items-center {card.trend.direction === 'up'
								? 'text-green-600'
								: 'text-red-600'}"
						>
							<ArrowIcon class="w-3 h-3 mr-1" direction={card.trend.direction} />
							{card.trend.value}%
						</span>
						<span class="text-gray-500 ml-1">vs {card.trend.period}</span>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if filteredEpisodes().length === 0}
		<div class="text-center py-8 text-gray-500">
			<EmptyStateIcon class="w-12 h-12 mx-auto mb-4 opacity-50" />
			<p class="text-lg font-medium mb-2">No episodes found</p>
			<p class="text-sm">Try selecting a different season or clearing your filters.</p>
		</div>
	{/if}
</div>
