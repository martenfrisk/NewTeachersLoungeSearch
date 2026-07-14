<script lang="ts">
	import Coffee from '$lib/components/Coffee.svelte';
	import type { HeaderLogoPropsType } from '$lib/types/header';
	import { resolve } from '$app/paths';

	/**
	 * Header logo component with coffee icon and site branding
	 */

	let { class: className = '' }: HeaderLogoPropsType = $props();
</script>

<div class="flex items-center gap-x-0.5 md:gap-x-3 {className}">
	<Coffee />
	<div class="flex flex-col">
		<a
			href={resolve('/')}
			class="font-wordmark text-white font-bold text-xl tracking-tight whitespace-nowrap hover:text-blue-100 active:underline transition-colors"
		>
			Seekers&apos; Lounge
		</a>
		<!-- Pure white: the tagline is tiny, so it needs the full 4.9:1 the
		     bright blue header allows — tinted blues fall below AA here. -->
		<div class="hidden sm:block text-xs text-white/95">
			Unofficial Teachers Lounge search engine
		</div>
	</div>
</div>
