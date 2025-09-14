<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { HeaderInfoDropdownPropsType } from '$lib/types/header';
	import { slide } from 'svelte/transition';
	import { ariaAttributes } from '$lib/utils/accessibility';

	/**
	 * Expandable info dropdown with about content, contribution info, and copyright details
	 */

	let {
		showDropdown = $bindable(),
		class: className = ''
	}: HeaderInfoDropdownPropsType & { showDropdown?: boolean } = $props();

	let moreInfo = $state(false);
	let copyright = $state(false);

	const handleMoreInfo = () => (moreInfo = !moreInfo);
	const handleCopyright = () => (copyright = !copyright);

	const moreInfoAttrs = $derived(ariaAttributes.button.expanded(moreInfo));
	const copyrightAttrs = $derived(ariaAttributes.button.expanded(copyright));
</script>

{#if showDropdown}
	<section
		class="absolute top-full left-0 right-0 bg-blue-50 shadow-lg border-t border-b border-blue-100 z-50 {className}"
		transition:slide
		aria-label="About information"
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
					<p>
						Seekers' Lounge is free with no ads. If you find it useful you can
						<a
							class="text-blue-600 underline hover:text-blue-700 transition-colors"
							href="https://www.buymeacoffee.com/seekerslounge"
						>
							buy me a cup
						</a> of courthouse coffee
					</p>

					<div>
						<span>Want to help out? </span>
						<button
							onclick={handleMoreInfo}
							class="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
							{...moreInfoAttrs}
							aria-label="Toggle help information"
						>
							<span class="underline">Click here</span>
							<Icon
								name="arrow"
								size={12}
								class="transition-transform duration-200 {moreInfo ? 'rotate-180' : ''}"
								aria-hidden={true}
							/>
						</button>
					</div>

					{#if moreInfo}
						<div class="text-gray-600 space-y-2 pl-4 border-l-2 border-blue-200" transition:slide>
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
								You can just save and edit the transcript and message me on reddit (u/martanor) with
								a link to a pastebin or google doc.
							</p>
						</div>
					{/if}

					<div>
						<button
							onclick={handleCopyright}
							class="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
							{...copyrightAttrs}
							aria-label="Toggle copyright information"
						>
							<span class="underline">Copyright information</span>
							<Icon
								name="arrow"
								size={12}
								class="transition-transform duration-200 {copyright ? 'rotate-180' : ''}"
								aria-hidden={true}
							/>
						</button>
					</div>

					{#if copyright}
						<div class="text-gray-600 space-y-2 pl-4 border-l-2 border-blue-200" transition:slide>
							<p>
								No copyright infringement intended. All rights belong to their respective rights
								holders (probably Big Grande and Earwolf). Want to contact me? I'll see your ass in
								court (or message me on reddit, u/martanor)
							</p>
							<p>Built with Svelte Kit, powered by Supabase, styled with Tailwind CSS.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>
{/if}
