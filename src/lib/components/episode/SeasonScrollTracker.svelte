<script lang="ts">
	import type { SeasonData } from '$lib/types/episode';

	interface Props {
		seasons: SeasonData[];
		onSeasonChange?: (seasonId: string) => void;
	}

	let { seasons, onSeasonChange }: Props = $props();

	let currentVisibleSeason = $state('');

	const updateCurrentVisibleSeason = () => {
		if (typeof window === 'undefined') return;

		const scrollTop = window.scrollY;
		const windowHeight = window.innerHeight;
		const centerOfViewport = scrollTop + windowHeight / 2;

		for (const season of seasons) {
			const element = document.getElementById(`season-${season.id}`);
			if (element) {
				const rect = element.getBoundingClientRect();
				const elementTop = scrollTop + rect.top;
				const elementBottom = elementTop + rect.height;

				if (centerOfViewport >= elementTop && centerOfViewport <= elementBottom) {
					if (currentVisibleSeason !== season.id) {
						currentVisibleSeason = season.id;
						onSeasonChange?.(season.id);
					}
					return;
				}
			}
		}
	};

	let scrollTimeout: ReturnType<typeof setTimeout> | undefined;
	const handleScroll = () => {
		if (scrollTimeout) clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(updateCurrentVisibleSeason, 100);
	};

	$effect(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleScroll);
			updateCurrentVisibleSeason();
		}

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('scroll', handleScroll);
			}
			if (scrollTimeout) clearTimeout(scrollTimeout);
		};
	});
</script>
