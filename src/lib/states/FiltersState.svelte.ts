import type { SearchFilters } from '../types/search';

export class FiltersState {
	seasons = $state<string[]>([]);
	episodes = $state<string[]>([]);
	editedOnly = $state(false);

	get isEmpty() {
		return this.seasons.length === 0 && this.episodes.length === 0 && !this.editedOnly;
	}

	get hasActiveFilters() {
		return !this.isEmpty;
	}

	get activeFiltersCount(): number {
		return this.seasons.length + this.episodes.length + (this.editedOnly ? 1 : 0);
	}

	get activeFiltersArray(): string[] {
		const filters: string[] = [];
		this.seasons.forEach((season) => filters.push(`season = "${season}"`));
		this.episodes.forEach((episode) => filters.push(`episode = "${episode}"`));
		return filters;
	}

	get asSearchFilters(): SearchFilters {
		return {
			seasons: [...this.seasons],
			episodes: [...this.episodes],
			editedOnly: this.editedOnly
		};
	}

	addSeasonFilter(season: string): void {
		if (this.seasons.includes(season)) {
			this.seasons = this.seasons.filter((s) => s !== season);
		} else {
			this.seasons = [...this.seasons, season];
		}
	}

	addEpisodeFilter(episode: string): void {
		if (this.episodes.includes(episode)) {
			this.episodes = this.episodes.filter((e) => e !== episode);
		} else {
			this.episodes = [...this.episodes, episode];
		}
	}

	toggleEditedOnly(): void {
		this.editedOnly = !this.editedOnly;
	}

	removeFilter(filterString: string): void {
		const [filterName, filterValue] = filterString.split(' = ');
		const cleanValue = filterValue.replace(/"/g, '');
		if (filterName === 'season') {
			this.seasons = this.seasons.filter((s) => s !== cleanValue);
		} else if (filterName === 'episode') {
			this.episodes = this.episodes.filter((e) => e !== cleanValue);
		}
	}

	setFromArray(activeFilters: string[]): void {
		this.seasons = [];
		this.episodes = [];

		activeFilters.forEach((filter) => {
			const [filterName, filterValue] = filter.split(' = ');
			const cleanValue = filterValue.replace(/"/g, '');
			if (filterName === 'season') {
				this.seasons.push(cleanValue);
			} else if (filterName === 'episode') {
				this.episodes.push(cleanValue);
			}
		});
	}

	clear(): void {
		this.seasons = [];
		this.episodes = [];
		this.editedOnly = false;
	}

	setFilters(filters: SearchFilters): void {
		this.seasons = [...(filters.seasons || [])];
		this.episodes = [...(filters.episodes || [])];
		this.editedOnly = filters.editedOnly || false;
	}
}

// Global instance
export const filtersState = new FiltersState();
