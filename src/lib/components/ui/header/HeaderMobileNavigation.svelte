<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { HeaderMobileNavigationPropsType, NavigationLinkType } from '$lib/types/header';

	/**
	 * Mobile secondary navigation bar with search and episodes links
	 */

	let { currentPath = '', class: className = '' }: HeaderMobileNavigationPropsType = $props();

	const mobileLinks: NavigationLinkType[] = [
		{
			href: '/',
			label: 'Search',
			icon: 'audio'
		},
		{
			href: '/episodes',
			label: 'Episode Guide',
			icon: 'episodes'
		}
	];
</script>

<div class="md:hidden bg-blue-100 border-t border-blue-500 {className}">
	<div class="px-4 py-3">
		<div class="flex items-center justify-between">
			<!-- Left side: Search link -->
			<div>
				<a
					href={mobileLinks[0].href}
					class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
					class:text-gray-900={currentPath === mobileLinks[0].href}
					class:font-semibold={currentPath === mobileLinks[0].href}
					aria-current={currentPath === mobileLinks[0].href ? 'page' : undefined}
				>
					<Icon name={mobileLinks[0].icon} size={16} aria-hidden={true} />
					<span class="text-sm font-medium">
						{mobileLinks[0].label}
					</span>
				</a>
			</div>

			<!-- Right side: Episode Guide -->
			<div>
				<a
					href={mobileLinks[1].href}
					class="text-sm border-b border-blue-300 font-medium flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
					class:text-gray-900={currentPath === mobileLinks[1].href}
					class:font-semibold={currentPath === mobileLinks[1].href}
					aria-current={currentPath === mobileLinks[1].href ? 'page' : undefined}
				>
					{mobileLinks[1].label}
				</a>
			</div>
		</div>
	</div>
</div>
