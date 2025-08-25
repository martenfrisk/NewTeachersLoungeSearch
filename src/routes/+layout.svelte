<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/Sidebar.svelte';
	import { dev } from '$app/environment';
	import { inject } from '@vercel/analytics';
	import { fly } from 'svelte/transition';
	import UpArrow from 'lib/icons/UpArrow.svelte';
	import Toolbar from 'lib/Toolbar.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	inject({ mode: dev ? 'development' : 'production' });
	let element: HTMLElement | undefined = $state();
	let y = $state(0),
		innerHeight: number | undefined = $state();

	let isButtonVisible = $derived(innerHeight && y > innerHeight ? true : false);
</script>

<svelte:head>
	<title>Seekers' Lounge ☕ The Teachers' Lounge Search Engine</title>
</svelte:head>

<svelte:window bind:scrollY={y} bind:innerHeight />
<div bind:this={element}></div>
<div class="flex flex-col overflow-x-hidden w-screen md:flex-row">
	<Sidebar />
	<main class="w-full h-auto mt-0 px-2 md:px-10 md:mt-10 mb-10 md:w-3/4">
		{@render children?.()}
		<Toolbar />
		{#if isButtonVisible}
			<button
				transition:fly={{ y: 100, duration: 400 }}
				onclick={() => element?.scrollIntoView()}
				class="bottom-20 rounded-full size-8 md:size-12 bg-blue-700 right-0 md:right-4 fixed text-white select-none"
			>
				<UpArrow />
			</button>
		{/if}
	</main>
</div>
