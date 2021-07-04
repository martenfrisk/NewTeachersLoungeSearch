<script lang="ts">
	import Coffee from '$lib/Coffee/index.svelte';
	import { onMount } from 'svelte';

	$: infoView = true;
	$: moreInfo = false;
	$: copyright = false;
	const handleInfoView = () => (infoView = !infoView);
	const handleMoreInfo = () => (moreInfo = !moreInfo);
	const handleCopyright = () => (copyright = !copyright);

	let width;

	onMount(() => {
		if (width > 768) {
			infoView = true;
		} else {
			infoView = false;
		}
	});
</script>

<svelte:window bind:innerWidth={width} />

<div class="sticky w-full py-0 mt-0 md:mb-0 md:w-1/4 md:max-w-sm ">
	<div class="flex items-end justify-end h-16 pr-3 mt-0 text-2xl text-gray-800 bg-blue-300 md:h-40">
		<Coffee />
		<div class="flex flex-col justify-end">
			<a href="/" class="text-gray-700"> Seekers&apos; Lounge </a>
			<div class="text-xs text-blue-900">a Teachers' Lounge search engine</div>
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
		<div
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
		</div>
	</div>
	<div class="w-full h-auto px-4 py-4 font-sans leading-relaxed text-justify md:px-6">
		{#if infoView}
			<div>
				<div>
					<p class="my-4">
						Welcome to the new and improved Seekers' Lounge. Now at a more memorable address:
						<a href="https://teacherslounge.pcast.site" class="text-blue-800 underline">
							https://teacherslounge.pcast.site
						</a>
					</p>
					<p class="my-4">
						This is an unofficial fan website where you can search through the transcripts of all
						episodes to find your favorite bit.
					</p>
					<p class="my-4">
						Listen to the free episodes wherever you get your podcast or subscribe to Stitcher
						Premium to unlock all seasons. 
					</p>
					<p>
						At <a
							class="text-blue-800 underline"
							href="https://www.stitcherpremium.com/teacher">stitcherpremium.com/teacher</a
						> you can sign up for a free trial!
					</p>
					<p class="my-4">
						Transcripts are unedited. Speakers not identified. Intro has been removed so add ~30
						seconds for accurate timestamp.
					</p>
				</div>

				<div>
					Want to help out? Click{' '}
					<div on:click={handleMoreInfo} class="inline-block border-b border-dotted cursor-pointer">
						here&nbsp;&#9662;
					</div>
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

				<div on:click={handleCopyright} class="inline-block border-b border-dotted cursor-pointer">
					Copyright information&nbsp;&#9662;
				</div>
				<br />
				{#if copyright}
					<div>
						<p>
							No copyright infringement intended. All rights belong to their respective rights
							holders (probably Big Grande and Earwolf). Want to contact me? I'll see your ass in
							court (or message me on reddit, u/martanor)
						</p>
						<p>
							Build with Svelte Kit, powered by Algolia or Elasticsearch, styled using Tailwind CSS.
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
