<script lang="ts">
	import Coffee from '$lib/components/Coffee.svelte';
	import type { HeaderLogoPropsType } from '$lib/types/header';

	/**
	 * Header logo component with coffee icon and site branding
	 */

	let { class: className = '' }: HeaderLogoPropsType = $props();
</script>

<div class="flex items-center gap-x-0.5 md:gap-x-3 {className}">
	<Coffee />
	<div class="flex flex-col">
		<a
			href="/"
			class="text-white font-bold text-lg hover:text-blue-100 active:underline transition-colors"
		>
			Seekers&apos; Lounge
		</a>
		<div class="hidden sm:block text-xs text-blue-100">
			Unofficial Teachers Lounge search engine
		</div>
	</div>
</div>
