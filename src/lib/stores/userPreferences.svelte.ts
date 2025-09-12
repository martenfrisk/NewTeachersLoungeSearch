import { browser } from '$app/environment';
import type { UserPreferences } from '$lib/types/user';

const defaultPreferences: UserPreferences = {
	theme: 'auto',
	autoplay: true,
	searchHistory: true,
	notifications: false
};

class UserPreferencesState {
	preferences = $state<UserPreferences>(defaultPreferences);
	private storageKey = 'seekers-lounge-preferences';

	constructor() {
		if (browser) {
			this.loadPreferences();
		}
	}

	private loadPreferences() {
		try {
			const saved = localStorage.getItem(this.storageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				this.preferences = { ...defaultPreferences, ...parsed };
			}
		} catch (error) {
			console.warn('Failed to load user preferences:', error);
		}
	}

	savePreferences() {
		if (!browser) return;

		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
			this.applyTheme();
		} catch (error) {
			console.error('Failed to save user preferences:', error);
		}
	}

	updatePreferences(updates: Partial<UserPreferences>) {
		const oldSearchHistory = this.preferences.searchHistory;
		this.preferences = { ...this.preferences, ...updates };

		// If search history setting changed, notify search history store
		if (updates.searchHistory !== undefined && updates.searchHistory !== oldSearchHistory) {
			this.notifySearchHistoryChange();
		}

		this.savePreferences();
	}

	private notifySearchHistoryChange() {
		// Import dynamically to avoid circular dependency
		if (browser) {
			import('./searchHistory.svelte').then((module) => {
				module.searchHistoryStore.toggleHistoryEnabled();
			});
		}
	}

	resetPreferences() {
		this.preferences = { ...defaultPreferences };
		this.savePreferences();
	}

	private applyTheme() {
		if (!browser) return;

		const { theme } = this.preferences;
		const root = document.documentElement;

		if (theme === 'dark') {
			root.classList.add('dark');
		} else if (theme === 'light') {
			root.classList.remove('dark');
		} else {
			// Auto theme - use system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			if (prefersDark) {
				root.classList.add('dark');
			} else {
				root.classList.remove('dark');
			}
		}
	}

	// Initialize theme on startup
	initializeTheme() {
		if (browser) {
			this.applyTheme();

			// Listen for system theme changes if using auto
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			const handleThemeChange = () => {
				if (this.preferences.theme === 'auto') {
					this.applyTheme();
				}
			};

			mediaQuery.addEventListener('change', handleThemeChange);
		}
	}

	// Get current theme preference
	get currentTheme() {
		return this.preferences.theme;
	}

	// Check if autoplay is enabled
	get isAutoplayEnabled() {
		return this.preferences.autoplay;
	}

	// Check if search history is enabled
	get isSearchHistoryEnabled() {
		return this.preferences.searchHistory;
	}

	// Check if notifications are enabled
	get areNotificationsEnabled() {
		return this.preferences.notifications;
	}
}

export const userPreferencesStore = new UserPreferencesState();
