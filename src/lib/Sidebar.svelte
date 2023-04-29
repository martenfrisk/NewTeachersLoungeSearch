<script lang="ts">
	import Coffee from './components/Coffee.svelte';
	import { onMount } from 'svelte';

	$: infoView = true;
	$: moreInfo = false;
	$: copyright = false;
	const handleInfoView = () => (infoView = !infoView);
	const handleMoreInfo = () => (moreInfo = !moreInfo);
	const handleCopyright = () => (copyright = !copyright);

	let width: number;

	onMount(() => {
		if (width > 768) {
			infoView = true;
		} else {
			infoView = false;
		}
	});
</script>

<svelte:window bind:innerWidth={width} />

<div class="sticky w-full py-0 mt-0 md:mb-0 md:w-1/4 md:max-w-sm">
	<div class="flex items-end justify-end h-16 pr-3 mt-0 text-2xl text-gray-800 bg-blue-300 md:h-40">
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
			on:click={handleInfoView}
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
					<p class="py-2 md:py-4 text-left">
						Welcome to the new and improved Seekers' Lounge. Now at a more memorable address:
						<a href="https://seekerslounge.pcast.site" class="text-blue-800 underline">
							https://seekerslounge.pcast.site
						</a>
					</p>
					<p class="py-2 md:py-4">
						This is an unofficial fan website where you can search through the transcripts of all
						episodes to find your favorite bit.
					</p>
					<p class="py-2 md:py-4">
						Listen to the free episodes wherever you get your podcast or subscribe to Stitcher
						Premium to unlock all seasons.
					</p>
					<p class="py-2 md:py-4">
						At <a class="text-blue-800 underline" href="https://www.stitcherpremium.com/teacher"
							>stitcherpremium.com/teacher</a
						> you can sign up for a free trial!
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
						</a>of courthouse coffee
					</p>
				</div>

				<div>
					Want to help out? Click{' '}
					<button
						on:click={handleMoreInfo}
						class="inline-block border-b border-dotted cursor-pointer"
					>
						here&nbsp;&#9662;
					</button>
				</div>
				{#if moreInfo}
					<div class="text-sm">
						You can find the unedited transcripts here:{' '}
						<a
							class="text-xs text-blue-600"
							href="https://github.com/martenfrisk/seekerslounge/tree/master/src/transcripts"
						>
							github.com/martenfrisk/seekerslounge/tree/master/src/transcripts
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
					on:click={handleCopyright}
					class="inline-block border-b border-dotted cursor-pointer"
				>
					Copyright information&nbsp;&#9662;
				</button>
				<br />
				{#if copyright}
					<div>
						<p>
							No copyright infringement intended. All rights belong to their respective rights
							holders (probably Big Grande and Earwolf). Want to contact me? I'll see your ass in
							court (or message me on reddit, u/martanor)
						</p>
						<p>Build with Svelte Kit, powered by MeiliSearch, styled with Tailwind CSS.</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
