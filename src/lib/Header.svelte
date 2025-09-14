<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user, authHelpers } from '$lib/stores/auth';
	import { appStore } from '$lib/stores/app';
	import type { HeaderPropsType } from '$lib/types/header';

	// Header sub-components
	import HeaderLogo from '$lib/components/ui/header/HeaderLogo.svelte';
	import HeaderNavigation from '$lib/components/ui/header/HeaderNavigation.svelte';
	import HeaderUserMenu from '$lib/components/ui/header/HeaderUserMenu.svelte';
	import HeaderMobileMenu from '$lib/components/ui/header/HeaderMobileMenu.svelte';
	import HeaderInfoDropdown from '$lib/components/ui/header/HeaderInfoDropdown.svelte';
	import HeaderMobileNavigation from '$lib/components/ui/header/HeaderMobileNavigation.svelte';

	/**
	 * Main header component with sticky positioning and responsive design
	 */

	let { class: className = '' }: HeaderPropsType = $props();

	// State management for dropdowns and mobile menu
	let showMobileMenu = $state(false);
	let showInfoDropdown = $state(false);
	let showUserDropdown = $state(false);

	// Get current path for navigation highlighting
	const currentPath = $derived($page.url.pathname);

	// Event handlers
	const handleAuthModal = () => {
		appStore.openAuthModal();
	};

	const toggleInfoDropdown = () => {
		showInfoDropdown = !showInfoDropdown;
		// Close other dropdowns
		showUserDropdown = false;
	};

	const toggleUserDropdown = () => {
		showUserDropdown = !showUserDropdown;
		// Close other dropdowns
		showInfoDropdown = false;
	};

	const toggleMobileMenu = () => {
		showMobileMenu = !showMobileMenu;
	};

	const handleSignOut = async () => {
		try {
			showUserDropdown = false;
			await authHelpers.signOut();
			goto('/');
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
				showInfoDropdown = false;
			}
		};

		if (typeof window !== 'undefined') {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<!-- Sticky Header -->
<header
	class="sticky top-0 z-40 w-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-md {className}"
>
	<!-- Main header bar -->
	<div class="px-4 mx-auto max-w-7xl">
		<div class="flex items-center justify-between h-16">
			<!-- Left: Logo and title -->
			<HeaderLogo />

			<!-- Center: Desktop Navigation -->
			<HeaderNavigation
				{currentPath}
				bind:showInfoDropdown
				onToggleInfoDropdown={toggleInfoDropdown}
			/>

			<!-- Right: User menu and mobile menu -->
			<div class="flex items-center space-x-2">
				<!-- User Menu -->
				<HeaderUserMenu
					user={$user}
					bind:showDropdown={showUserDropdown}
					onToggleDropdown={toggleUserDropdown}
					onSignOut={handleSignOut}
					onAuthModal={handleAuthModal}
				/>

				<!-- Mobile Menu Button -->
				<HeaderMobileMenu bind:showMenu={showMobileMenu} onToggleMenu={toggleMobileMenu} />
			</div>
		</div>
	</div>

	<!-- Mobile Secondary Navigation -->
	<HeaderMobileNavigation {currentPath} />

	<!-- Info Dropdown -->
	<HeaderInfoDropdown bind:showDropdown={showInfoDropdown} onToggleDropdown={toggleInfoDropdown} />
</header>
