<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { user, authHelpers } from '$lib/stores/auth';
	import { appStore } from '$lib/stores/app';
	import type { HeaderPropsType } from '$lib/types/header';

	// Header sub-components
	import Icon from '$lib/components/ui/Icon.svelte';
	import HeaderLogo from '$lib/components/ui/header/HeaderLogo.svelte';
	import HeaderNavigation from '$lib/components/ui/header/HeaderNavigation.svelte';
	import HeaderUserMenu from '$lib/components/ui/header/HeaderUserMenu.svelte';

	/**
	 * Main header component with sticky positioning and responsive design
	 */

	let { class: className = '' }: HeaderPropsType = $props();

	let showUserDropdown = $state(false);

	// Get current path for navigation highlighting
	const currentPath = $derived($page.url.pathname);

	// Event handlers
	const handleAuthModal = () => {
		appStore.openAuthModal();
	};

	const toggleUserDropdown = () => {
		showUserDropdown = !showUserDropdown;
	};

	const handleSignOut = async () => {
		try {
			showUserDropdown = false;
			await authHelpers.signOut();
			goto(resolve('/'));
		} catch (error) {
			console.error('Sign out error:', error);
		}
	};

	// Close dropdowns when clicking outside
	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element;
			if (!target.closest('[data-dropdown]')) {
				showUserDropdown = false;
			}
		};

		if (typeof window !== 'undefined') {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<!-- Sticky Header -->
<header class="sticky top-0 z-40 w-full bg-board-600 shadow-md {className}">
	<!-- Main header bar -->
	<div class="px-4 mx-auto max-w-7xl">
		<div class="flex items-center justify-between h-16">
			<!-- Left: Logo and title -->
			<HeaderLogo />

			<!-- Center: Desktop Navigation -->
			<HeaderNavigation {currentPath} />

			<!-- Right: mobile About + Episodes links + account -->
			<div class="flex items-center gap-1">
				<!-- Mobile-only About link (desktop nav has its own) -->
				<a
					href={resolve('/about')}
					class="flex items-center justify-center rounded-md p-2 text-white/90 transition-colors hover:bg-board-500 hover:text-white md:hidden {currentPath ===
					'/about'
						? 'bg-board-700'
						: ''}"
					aria-label="About Seekers' Lounge"
					title="About"
					aria-current={currentPath === '/about' ? 'page' : undefined}
				>
					<Icon name="info" size={22} aria-hidden={true} />
				</a>

				<!-- Mobile-only Episodes link, icon-only to preserve space (desktop nav lives in HeaderNavigation) -->
				<a
					href={resolve('/episodes')}
					class="flex items-center justify-center rounded-md p-2 text-white/90 transition-colors hover:bg-board-500 hover:text-white md:hidden {currentPath ===
					'/episodes'
						? 'bg-board-700'
						: ''}"
					aria-label="Episode guide"
					title="Episode guide"
					aria-current={currentPath === '/episodes' ? 'page' : undefined}
				>
					<Icon name="episodes" size={22} aria-hidden={true} />
				</a>

				<!-- User Menu / account -->
				<HeaderUserMenu
					user={$user}
					bind:showDropdown={showUserDropdown}
					onToggleDropdown={toggleUserDropdown}
					onSignOut={handleSignOut}
					onAuthModal={handleAuthModal}
				/>
			</div>
		</div>
	</div>
</header>
