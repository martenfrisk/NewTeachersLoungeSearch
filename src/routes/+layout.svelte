<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/Sidebar.svelte';
	import { dev } from '$app/environment';
	import { inject } from '@vercel/analytics';
	import { fly } from 'svelte/transition';
	import UpArrow from 'lib/icons/UpArrow.svelte';
	import { audioStore } from '$lib/stores/audio';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	inject({ mode: dev ? 'development' : 'production' });
	let element: HTMLElement | undefined = $state();
	let y = $state(0),
		innerHeight: number | undefined = $state();

	let isButtonVisible = $derived(innerHeight && y > innerHeight ? true : false);

	// Lazy load audio player only when needed
	const showAudioPlayer = $derived($audioStore.currentTimestamp !== null);

	// Dynamic import for audio player to reduce initial bundle size
	let AudioPlayer: import('svelte').Component | null = $state(null);

	$effect(() => {
		if (showAudioPlayer && !AudioPlayer) {
			import('$lib/components/audio/AudioPlayer.svelte').then((module) => {
				AudioPlayer = module.default;
			});
		}
	});
</script>

<svelte:head>
	<title>Seekers' Lounge ☕ The Teachers' Lounge Search Engine</title>
	<link rel="preconnect" href="https://ts.pcast.site" />
	<link rel="preconnect" href="https://rss.art19.com" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#2563eb" />
</svelte:head>

<svelte:window bind:scrollY={y} bind:innerHeight />
<div bind:this={element}></div>
<div class="flex flex-col overflow-x-hidden min-h-screen max-w-full md:flex-row">
	<Sidebar />
	<main class="flex-1 min-w-0 h-auto mt-0 md:px-10 md:mt-10 mb-24">
		{@render children?.()}
		{#if isButtonVisible}
			<button
				transition:fly={{ y: 100, duration: 400 }}
				onclick={() => element?.scrollIntoView()}
				class="bottom-52 rounded-full size-8 md:size-12 bg-blue-700 right-2 md:right-4 fixed text-white select-none"
			>
				<UpArrow />
			</button>
		{/if}
	</main>

	<!-- Audio Player - lazy loaded when needed -->
	{#if showAudioPlayer && AudioPlayer}
		<AudioPlayer currEpTitle={$audioStore.currentTimestamp?.episode} />
	{/if}
</div>
