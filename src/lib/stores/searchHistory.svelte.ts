import { browser } from '$app/environment';
import { userPreferencesStore } from './userPreferences.svelte';

export interface SearchHistoryItemType {
	id: string;
	query: string;
	timestamp: Date;
	resultsCount?: number;
	filters?: {
		seasons?: string[];
		episodes?: string[];
	};
}

class SearchHistoryState {
	history = $state<SearchHistoryItemType[]>([]);
	private storageKey = 'seekers-lounge-search-history';
	private maxHistory = 50;

	constructor() {
		if (browser) {
			this.loadHistory();
		}
	}

	private loadHistory() {
		if (!userPreferencesStore.isSearchHistoryEnabled) {
			this.history = [];
			return;
		}

		try {
			const saved = localStorage.getItem(this.storageKey);
			if (saved) {
				const parsed = JSON.parse(saved) as SearchHistoryItemType[];
				this.history = parsed.map((item) => ({
					...item,
					timestamp: new Date(item.timestamp)
				}));
			}
		} catch (error) {
			console.warn('Failed to load search history:', error);
			this.history = [];
		}
	}

	private saveHistory() {
		if (!browser || !userPreferencesStore.isSearchHistoryEnabled) return;

		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.history));
		} catch (error) {
			console.error('Failed to save search history:', error);
		}
	}

	addSearch(
		query: string,
		resultsCount: number = 0,
		filters?: { seasons?: string[]; episodes?: string[] }
	) {
		if (!userPreferencesStore.isSearchHistoryEnabled) return;
		if (!query.trim()) return;

		// Remove existing entry with same query
		this.history = this.history.filter((item) => item.query !== query);

		// Add new entry at the beginning
		const newEntry: SearchHistoryItemType = {
			id: Date.now().toString(),
			query: query.trim(),
			timestamp: new Date(),
			resultsCount,
			filters
		};

		this.history.unshift(newEntry);

		// Keep only the most recent entries
		if (this.history.length > this.maxHistory) {
			this.history = this.history.slice(0, this.maxHistory);
		}

		this.saveHistory();
	}

	clearHistory() {
		this.history = [];
		if (browser) {
			localStorage.removeItem(this.storageKey);
		}
	}

	removeSearch(id: string) {
		this.history = this.history.filter((item) => item.id !== id);
		this.saveHistory();
	}

	// Get recent searches (last N items)
	getRecentSearches(limit: number = 10): SearchHistoryItemType[] {
		return this.history.slice(0, limit);
	}

	// Search in history
	searchHistory(query: string): SearchHistoryItemType[] {
		const searchTerm = query.toLowerCase();
		return this.history.filter((item) => item.query.toLowerCase().includes(searchTerm));
	}

	// Enable/disable history based on preferences
	toggleHistoryEnabled() {
		if (!userPreferencesStore.isSearchHistoryEnabled) {
			this.clearHistory();
		} else {
			// If enabling, don't automatically load - wait for next search
		}
	}

	get isEnabled() {
		return userPreferencesStore.isSearchHistoryEnabled;
	}
}

export const searchHistoryStore = new SearchHistoryState();
