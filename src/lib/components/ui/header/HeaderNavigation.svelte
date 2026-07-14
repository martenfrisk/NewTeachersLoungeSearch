<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { HeaderNavigationPropsType, NavigationLinkType } from '$lib/types/header';
	import { resolve } from '$app/paths';

	/**
	 * Desktop header navigation
	 */

	let { currentPath = '', class: className = '' }: HeaderNavigationPropsType = $props();

	const navigationLinks: (NavigationLinkType & { routeId: '/' | '/episodes' | '/about' })[] = [
		{
			href: resolve('/'),
			routeId: '/',
			label: 'Search',
			icon: 'search'
		},
		{
			href: resolve('/episodes'),
			routeId: '/episodes',
			label: 'Episodes',
			icon: 'episodes'
		},
		{
			href: resolve('/about'),
			routeId: '/about',
			label: 'About',
			icon: 'info'
		}
	];
</script>

<nav class="hidden md:flex items-center space-x-1 {className}" aria-label="Main navigation">
	{#each navigationLinks as link (link.href)}
		<a
			href={resolve(link.routeId)}
			class="px-4 py-2 text-white hover:bg-board-500 rounded-md transition-colors flex items-center space-x-2"
			class:bg-board-700={currentPath === link.href}
			aria-current={currentPath === link.href ? 'page' : undefined}
		>
			<Icon name={link.icon} size={16} aria-hidden={true} />
			<span>{link.label}</span>
		</a>
	{/each}
</nav>
