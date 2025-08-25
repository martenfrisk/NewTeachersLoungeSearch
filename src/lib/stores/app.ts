import { writable, derived } from 'svelte/store';

interface AppState {
	theme: 'light' | 'dark' | 'auto';
	sidebarOpen: boolean;
	online: boolean;
	globalLoading: boolean;
	globalError: string | null;
	notifications: string[];
}

function createAppStore() {
	const initialState: AppState = {
		theme: 'auto',
		sidebarOpen: false,
		online: typeof navigator !== 'undefined' ? navigator.onLine : true,
		globalLoading: false,
		globalError: null,
		notifications: []
	};

	const { subscribe, update } = writable<AppState>(initialState);

	return {
		subscribe,

		// Theme actions
		setTheme(theme: 'light' | 'dark' | 'auto'): void {
			update((state) => ({ ...state, theme }));
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('theme', theme);
			}
		},

		initTheme(): void {
			if (typeof localStorage !== 'undefined') {
				const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null;
				if (savedTheme) {
					update((state) => ({ ...state, theme: savedTheme }));
				}
			}
		},

		// Sidebar actions
		toggleSidebar(): void {
			update((state) => ({ ...state, sidebarOpen: !state.sidebarOpen }));
		},

		closeSidebar(): void {
			update((state) => ({ ...state, sidebarOpen: false }));
		},

		// Network status
		setOnline(online: boolean): void {
			update((state) => ({ ...state, online }));
		},

		// Global loading
		setGlobalLoading(loading: boolean): void {
			update((state) => ({ ...state, globalLoading: loading }));
		},

		// Error handling
		setGlobalError(error: string | null): void {
			update((state) => ({ ...state, globalError: error }));
		},

		clearGlobalError(): void {
			update((state) => ({ ...state, globalError: null }));
		},

		// Notifications
		addNotification(message: string): void {
			update((state) => ({
				...state,
				notifications: [...state.notifications, message]
			}));

			// Auto-remove after 5 seconds
			setTimeout(() => {
				update((state) => ({
					...state,
					notifications: state.notifications.filter((n) => n !== message)
				}));
			}, 5000);
		},

		removeNotification(message: string): void {
			update((state) => ({
				...state,
				notifications: state.notifications.filter((n) => n !== message)
			}));
		},

		clearNotifications(): void {
			update((state) => ({ ...state, notifications: [] }));
		}
	};
}

// App store instance
export const appStore = createAppStore();

// Derived stores
export const theme = derived(appStore, ($app) => $app.theme);
export const sidebarOpen = derived(appStore, ($app) => $app.sidebarOpen);
export const isOnline = derived(appStore, ($app) => $app.online);
export const globalLoading = derived(appStore, ($app) => $app.globalLoading);
export const globalError = derived(appStore, ($app) => $app.globalError);
export const notifications = derived(appStore, ($app) => $app.notifications);

// Initialize app on load
if (typeof window !== 'undefined') {
	appStore.initTheme();

	// Listen for online/offline events
	window.addEventListener('online', () => appStore.setOnline(true));
	window.addEventListener('offline', () => appStore.setOnline(false));
}
