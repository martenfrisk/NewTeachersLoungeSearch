<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/Sidebar.svelte';
	import { webVitals } from 'lib/vitals';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	let analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
	$: if (browser && analyticsId) {
		webVitals({
			path: $page.url.pathname,
			params: $page.params,
			analyticsId
		});
	}
</script>

<svelte:head>
	<title>Seekers' Lounge ☕ The Teachers' Lounge Search Engine</title>
</svelte:head>

<div class="flex flex-col w-screen md:flex-row">
	<Sidebar />
	<main class="w-full h-auto mt-0 px-2 md:px-10 md:mt-10 mb-10 md:w-3/4">
		<slot />
	</main>
</div>

<style>
	div {
		overflow-x: hidden;
	}
</style>
