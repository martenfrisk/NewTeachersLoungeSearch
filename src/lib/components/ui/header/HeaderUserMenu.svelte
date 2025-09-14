<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { HeaderUserMenuPropsType } from '$lib/types/header';
	import { componentPatterns } from '$lib/design/tokens';
	import { fly } from 'svelte/transition';
	import { ariaAttributes } from '$lib/utils/accessibility';

	/**
	 * User menu component with authentication button or user dropdown
	 */

	let {
		user,
		showDropdown = $bindable(),
		onToggleDropdown,
		onSignOut,
		onAuthModal,
		class: className = ''
	}: HeaderUserMenuPropsType & { showDropdown?: boolean } = $props();

	let dropdownElement = $state<HTMLDivElement>();

	const buttonAttrs = ariaAttributes.button.expanded(showDropdown ?? false);

	function handleDropdownKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showDropdown = false;
			event.preventDefault();
		}
	}

	async function handleSignOut() {
		try {
			showDropdown = false;
			await onSignOut();
		} catch (error) {
			console.error('Sign out error:', error);
		}
	}

	function handleDropdownClick(event: MouseEvent) {
		event.stopPropagation();
	}
</script>

<div class={className}>
	{#if user}
		<div class="relative" data-dropdown>
			<button
				onclick={onToggleDropdown}
				class="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center border-2 border-blue-200 hover:bg-blue-300 transition-colors cursor-pointer"
				aria-label="User menu"
				{...buttonAttrs}
			>
				<span class="text-xs font-medium text-white">
					{user.email?.charAt(0).toUpperCase() || 'U'}
				</span>
			</button>

			{#if showDropdown}
				<div
					bind:this={dropdownElement}
					class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
					role="menu"
					tabindex="-1"
					onclick={handleDropdownClick}
					onkeydown={handleDropdownKeydown}
					transition:fly={{ y: -10, duration: 150 }}
				>
					<a
						href="/profile"
						class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
						role="menuitem"
						onclick={() => (showDropdown = false)}
					>
						<div class="flex items-center space-x-2">
							<Icon name="audio" size={16} aria-hidden={true} />
							<span>Profile</span>
						</div>
					</a>
					<a
						href="/editor"
						class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
						role="menuitem"
						onclick={() => (showDropdown = false)}
					>
						<div class="flex items-center space-x-2">
							<Icon name="document" size={16} aria-hidden={true} />
							<span>Edit Transcripts</span>
						</div>
					</a>
					<hr class="my-1" />
					<button
						onclick={handleSignOut}
						class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
						role="menuitem"
					>
						<div class="flex items-center space-x-2">
							<Icon name="close" size={16} aria-hidden={true} />
							<span>Sign Out</span>
						</div>
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<button
			onclick={onAuthModal}
			class="{componentPatterns.button.base} {componentPatterns.button.sizes.sm} {componentPatterns
				.button.variants.outline}"
			aria-label="Sign in to your account"
		>
			Sign In
		</button>
	{/if}
</div>
