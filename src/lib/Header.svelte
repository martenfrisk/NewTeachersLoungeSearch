<script lang="ts">
	import { slide } from 'svelte/transition';
	import Coffee from './components/Coffee.svelte';
	import { user } from './stores/auth';
	import { appStore } from './stores/app';

	let moreInfo = $state(false);
	let copyright = $state(false);
	let showMobileMenu = $state(false);
	let showInfoDropdown = $state(false);

	const handleMoreInfo = () => (moreInfo = !moreInfo);
	const handleCopyright = () => (copyright = !copyright);
	const handleAuthModal = () => {
		appStore.openAuthModal();
	};

	const toggleInfoDropdown = () => (showInfoDropdown = !showInfoDropdown);
</script>

<!-- Sticky Header -->
<header class="sticky top-0 z-40 w-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-md">
	<!-- Main header bar -->
	<div class="px-4 mx-auto max-w-7xl">
		<div class="flex items-center justify-between h-16">
			<!-- Left: Logo and title -->
			<div class="flex items-center space-x-3">
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

			<!-- Center: Navigation (hidden on mobile) -->
			<nav class="hidden md:flex items-center space-x-1">
				<a
					href="/"
					class="px-4 py-2 text-white hover:bg-blue-600 rounded-md transition-colors flex items-center space-x-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<span>Search</span>
				</a>
				<a
					href="/episodes"
					class="px-4 py-2 text-white hover:bg-blue-600 rounded-md transition-colors flex items-center space-x-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14-7H5m14 14H5"
						/>
					</svg>
					<span>Episodes</span>
				</a>

				<!-- Info dropdown -->
				<div class="relative">
					<button
						onclick={toggleInfoDropdown}
						class="px-4 py-2 text-white hover:bg-blue-600 rounded-md transition-colors flex items-center space-x-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>About</span>
						<svg
							class="w-4 h-4 transition-transform duration-200 {showInfoDropdown
								? 'rotate-180'
								: ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
				</div>
			</nav>

			<!-- Right: Auth and mobile menu -->
			<div class="flex items-center space-x-3">
				<!-- Auth button -->
				{#if $user}
					<div class="flex items-center space-x-2">
						<div
							class="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center border-2 border-blue-200"
						>
							<span class="text-xs font-medium text-white">
								{$user.email?.charAt(0).toUpperCase() || 'U'}
							</span>
						</div>
					</div>
				{:else}
					<!-- Sign In button temporarily hidden
					<button
						onclick={handleAuthModal}
						class="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
					>
						Sign In
					</button>
					-->
				{/if}

				<!-- Mobile menu button -->
				<button
					onclick={toggleInfoDropdown}
					class="md:hidden flex items-center justify-center fill-white stroke-white text-white"
					aria-label="Toggle mobile menu"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-8"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile second level navigation - always visible on mobile -->
	<div class="md:hidden bg-blue-100 border-t border-blue-500">
		<div class="px-4 py-3">
			<div class="flex items-center justify-between">
				<!-- Left side: Home and Search -->
				<div class="flex items-center space-x-4">
					<a
						href="/"
						class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							/>
						</svg>
						<span class="text-sm font-medium">Search</span>
					</a>
				</div>

				<!-- Right side: Episode Guide -->
				<div>
					<a
						href="/episodes"
						class="text-sm border-b border-blue-300 font-medium flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						Episode Guide
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Mobile dropdown menu -->
	{#if showMobileMenu}
		<div class="md:hidden bg-blue-700 border-t border-blue-600">
			<nav class="px-4 py-2 space-y-1">
				<button
					onclick={toggleInfoDropdown}
					class="block w-full text-left px-3 py-2 text-white hover:bg-blue-800 rounded-md transition-colors"
				>
					About & Info
				</button>
			</nav>
		</div>
	{/if}

	<!-- Info dropdown content -->
	{#if showInfoDropdown}
		<div
			transition:slide
			class="absolute top-full left-0 right-0 bg-blue-50 shadow-lg border-y border-blue-100 z-50"
		>
			<div class="px-4 py-6 mx-auto max-w-4xl">
				<div class="grid md:grid-cols-2 gap-6 text-sm">
					<div class="space-y-4">
						<p class="text-gray-800">
							Seekers' Lounge is an unofficial fan website where you can search through the
							transcripts of all episodes to find your favorite bit.
						</p>
						<p class="text-gray-800">
							Listen to the free episodes wherever you get your podcast or buy them from
							<a
								class="text-blue-600 underline hover:text-blue-700 transition-colors"
								href="https://biggrandewebsite.com/"
							>
								biggrandewebsite.com
							</a>
						</p>
						<p class="text-gray-800">
							Transcripts are unedited. Speakers not identified. Intro has been removed so add ~30
							seconds for accurate timestamp.
						</p>
					</div>

					<div class="space-y-4 p-4 text-xs bg-amber-50 shadow-md rounded-md">
						<p class="">
							Seekers' Lounge is free with no ads. If you find it useful you can
							<a
								class="text-blue-600 underline hover:text-blue-700 transition-colors"
								href="https://www.buymeacoffee.com/seekerslounge"
							>
								buy me a cup
							</a> of courthouse coffee
						</p>

						<div>
							<span class="">Want to help out? </span>
							<button
								onclick={handleMoreInfo}
								class="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
							>
								<span class="underline">Click here</span>
								<svg
									class="w-3 h-3 transition-transform duration-200 {moreInfo ? 'rotate-180' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
						</div>

						{#if moreInfo}
							<div class=" text-gray-600 space-y-2 pl-4 border-l-2 border-blue-200">
								<p>
									You can find the unedited transcripts
									<a
										class="text-blue-600 underline hover:text-blue-700 transition-colors"
										href="https://github.com/martenfrisk/NewTeachersLoungeSearch/tree/main/src/assets/transcripts"
									>
										here.
									</a>
								</p>
								<p>Edit the text and submit a pull request.</p>
								<p class="italic text-gray-500">"What's a pull request?"</p>
								<p>
									You can just save and edit the transcript and message me on reddit (u/martanor)
									with a link to a pastebin or google doc.
								</p>
							</div>
						{/if}

						<div>
							<button
								onclick={handleCopyright}
								class="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
							>
								<span class="underline">Copyright information</span>
								<svg
									class="w-3 h-3 transition-transform duration-200 {copyright ? 'rotate-180' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
						</div>

						{#if copyright}
							<div class="text-gray-600 space-y-2 pl-4 border-l-2 border-blue-200">
								<p>
									No copyright infringement intended. All rights belong to their respective rights
									holders (probably Big Grande and Earwolf). Want to contact me? I'll see your ass
									in court (or message me on reddit, u/martanor)
								</p>
								<p>Built with Svelte Kit, powered by Supabase, styled with Tailwind CSS.</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</header>
