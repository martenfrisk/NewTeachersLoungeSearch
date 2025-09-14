// Header component type definitions
import type { IconName } from '$lib/components/ui/Icon.svelte';

/** User authentication data */
export interface UserType {
	email?: string;
	// Add other user properties as needed
}

/** Authentication helper functions */
export interface AuthHelpersType {
	signOut: () => Promise<void>;
}

/** Header logo component props */
export interface HeaderLogoPropsType {
	class?: string;
}

/** Header navigation component props */
export interface HeaderNavigationPropsType {
	currentPath?: string;
	class?: string;
}

/** Header user menu component props */
export interface HeaderUserMenuPropsType {
	user: UserType | null;
	showDropdown: boolean;
	onToggleDropdown: () => void;
	onSignOut: () => Promise<void>;
	onAuthModal: () => void;
	class?: string;
}

/** Header mobile menu component props */
export interface HeaderMobileMenuPropsType {
	showMenu: boolean;
	onToggleMenu: () => void;
	class?: string;
}

/** Header info dropdown component props */
export interface HeaderInfoDropdownPropsType {
	showDropdown: boolean;
	onToggleDropdown: () => void;
	class?: string;
}

/** Header mobile navigation component props */
export interface HeaderMobileNavigationPropsType {
	currentPath?: string;
	class?: string;
}

/** Main header component props */
export interface HeaderPropsType {
	class?: string;
}

/** Navigation link data */
export interface NavigationLinkType {
	href: string;
	label: string;
	icon: IconName;
}
