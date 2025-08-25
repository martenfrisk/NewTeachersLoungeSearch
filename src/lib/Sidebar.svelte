<script lang="ts">
	import Coffee from './components/Coffee.svelte';

	let moreInfo = $state(false);

	let copyright = $state(false);

	const handleInfoView = () => (infoView = !infoView);
	const handleMoreInfo = () => (moreInfo = !moreInfo);
	const handleCopyright = () => (copyright = !copyright);

	let width = $state(0);

	let infoView = $derived(width > 768 ? true : false);
</script>

<svelte:window bind:innerWidth={width} />

<div class="sticky w-full py-0 mt-0 md:mb-0 md:w-1/4 md:max-w-sm">
	<div
		class="flex items-end justify-end h-16 pr-3 mt-0 text-2xl text-gray-800 bg-blue-300 md:h-40 min-h-[4rem] md:min-h-[10rem]"
	>
		<Coffee />
		<div class="flex flex-col justify-end">
			<a href="/" class="text-gray-700"> Seekers&apos; Lounge </a>
			<div class="text-xs text-blue-900">the unofficial Teachers' Lounge search engine</div>
		</div>
	</div>
	<div class="flex">
		<div class="w-1/3 px-3 py-2 text-center text-white bg-blue-600 border-r border-white">
			<a href="/episodes">
				<button class="text-white border-b border-blue-600 border-dashed hover:border-white"
					>Episodes</button
				>
			</a>
		</div>
		<div class="w-1/3 px-3 py-2 text-center text-white bg-blue-600 border-l border-white">
			<a href="/">
				<button class="text-white border-b border-blue-600 border-dashed hover:border-white"
					>Search</button
				>
			</a>
		</div>
		<button
			class="w-1/3 px-3 py-2 text-center bg-gray-100 border-l border-gray-700"
			onclick={handleInfoView}
		>
			{#if infoView}
				<div class="flex justify-center">
					<p class="border-b border-white border-dashed cursor-pointer hover:border-black">
						Info&nbsp;&#9662;
					</p>
				</div>
			{:else}
				<div class="flex justify-center">
					<p class="border-b border-white border-dashed cursor-pointer hover:border-black">
						Info&nbsp;&#9652;
					</p>
				</div>
			{/if}
		</button>
	</div>
	{#if infoView}
		<div
			class="w-full h-auto px-4 text-sm md:text-base py-2 md:py-4 font-sans leading-relaxed text-justify md:px-6"
		>
			<div>
				<div class="divide-y flex flex-col divide-blue-200">
					<!-- <p class="py-2 md:py-4">NEW FEATURE: Audio playback (beta)</p>
					<p></p>
					<ol class="gap-2 flex flex-col py-2 list-decimal">
						<li>
							Go to <a href="https://biggrandewebsite.com/">biggrandewebsite.com</a>
						</li>
						<li>Click on Account</li>
						<li>Podcasts -> Teachers Lounge Archive</li>
						<li>Copy the link at the bottom</li>
						<li>Paste it in the box at the bottom of your screen.</li>
					</ol>
					<p class="py-2 md:py-4">
						The link is <span class="underline">only</span> stored in your browser and is never sent
						to any servers.
					</p> -->
					<p class="py-2 md:py-4">
						Seekers' Lounge is an unofficial fan website where you can search through the
						transcripts of all episodes to find your favorite bit.
					</p>
					<p class="py-2 md:py-4">
						Listen to the free episodes wherever you get your podcast or buy them from <a
							class="text-blue-800 underline"
							href="https://biggrandewebsite.com/">biggrandewebsite.com</a
						>
					</p>
					<p class="py-2 md:py-4">
						Transcripts are unedited. Speakers not identified. Intro has been removed so add ~30
						seconds for accurate timestamp.
					</p>
					<p class="py-8 text-sm">
						Seekers' Lounge is free with no ads. If you find it useful you can <a
							class="border-b border-blue-600 text-blue-600 border-dotted hover:border-solid"
							href="https://www.buymeacoffee.com/seekerslounge"
						>
							buy me a cup
						</a> of courthouse coffee
					</p>
				</div>

				<div>
					Want to help out? Click{' '}
					<button
						onclick={handleMoreInfo}
						class="inline-block border-b border-dotted cursor-pointer"
					>
						here&nbsp;&#9662;
					</button>
				</div>
				{#if moreInfo}
					<div class="text-sm">
						You can find the unedited transcripts
						<a
							class=" text-blue-600"
							href="https://github.com/martenfrisk/NewTeachersLoungeSearch/tree/main/src/assets/transcripts"
						>
							here.
						</a>
						<br />Edit the text and submit a pull request.<br />
						<br />
						<p class="italic">"What's a pull request?"</p>
						You can just save and edit the transcript and message me on reddit (u/martanor) with a link
						to a pastebin or google doc.<br />
						<br />
					</div>
				{/if}

				<button
					onclick={handleCopyright}
					class="inline-block border-b border-dotted cursor-pointer"
				>
					Copyright information&nbsp;&#9662;
				</button>
				<br />
				{#if copyright}
					<div class="text-sm">
						<p>
							No copyright infringement intended. All rights belong to their respective rights
							holders (probably Big Grande and Earwolf). Want to contact me? I'll see your ass in
							court (or message me on reddit, u/martanor)
						</p>
						<p class="mt-1">
							Built with Svelte Kit, powered by MeiliSearch, styled with Tailwind CSS.
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
