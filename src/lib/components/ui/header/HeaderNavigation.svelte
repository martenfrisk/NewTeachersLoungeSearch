<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { HeaderNavigationPropsType, NavigationLinkType } from '$lib/types/header';
	import { ariaAttributes } from '$lib/utils/accessibility';

	/**
	 * Desktop header navigation with links and info dropdown trigger
	 */

	let {
		currentPath = '',
		class: className = '',
		showInfoDropdown = $bindable(),
		onToggleInfoDropdown
	}: HeaderNavigationPropsType & {
		showInfoDropdown?: boolean;
		onToggleInfoDropdown?: () => void;
	} = $props();

	const navigationLinks: NavigationLinkType[] = [
		{
			href: '/',
			label: 'Search',
			icon: 'search'
		},
		{
			href: '/episodes',
			label: 'Episodes',
			icon: 'episodes'
		}
	];

	const buttonAttrs = ariaAttributes.button.expanded(showInfoDropdown ?? false);
</script>

<nav class="hidden md:flex items-center space-x-1 {className}" aria-label="Main navigation">
	{#each navigationLinks as link (link.href)}
		<a
			href={link.href}
			class="px-4 py-2 text-white hover:bg-blue-600 rounded-md transition-colors flex items-center space-x-2"
			class:bg-blue-700={currentPath === link.href}
			aria-current={currentPath === link.href ? 'page' : undefined}
		>
			<Icon name={link.icon} size={16} aria-hidden={true} />
			<span>{link.label}</span>
		</a>
	{/each}

	<!-- Info dropdown trigger -->
	<div class="relative">
		<button
			onclick={onToggleInfoDropdown}
			class="px-4 py-2 text-white hover:bg-blue-600 rounded-md transition-colors flex items-center space-x-2"
			data-dropdown
			{...buttonAttrs}
			aria-label="Toggle about information dropdown"
		>
			<Icon name="audio" size={16} aria-hidden={true} />
			<span>About</span>
			<Icon
				name="arrow"
				size={16}
				class="transition-transform duration-200 {showInfoDropdown ? 'rotate-180' : ''}"
				aria-hidden={true}
			/>
		</button>
	</div>
</nav>
