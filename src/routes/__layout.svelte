<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/Sidebar/index.svelte';
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
