<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { HeaderMobileMenuPropsType } from '$lib/types/header';
	import { ariaAttributes } from '$lib/utils/accessibility';

	/**
	 * Mobile menu button and info trigger for header
	 */

	let {
		showMenu = $bindable(),
		onToggleMenu,
		class: className = ''
	}: HeaderMobileMenuPropsType & { showMenu?: boolean } = $props();

	const buttonAttrs = ariaAttributes.button.expanded(showMenu ?? false);
</script>

<div class="md:hidden flex items-center {className}">
	<button
		onclick={onToggleMenu}
		class="items-center justify-center fill-white stroke-white text-white"
		style="color: white;"
		aria-label="Toggle mobile menu"
		{...buttonAttrs}
	>
		<Icon name="audio" size={32} aria-hidden={true} />
	</button>
</div>
