<script lang="ts">
	import Tooltip from 'lib/components/Tooltip.svelte';
	import Check from 'lib/icons/Check.svelte';
	import Minus from 'lib/icons/Minus.svelte';
	import { audioTimestamp } from 'lib/stores';
	import type { SearchHit } from 'lib/types';
	import { epName, timeToUrl } from 'lib/utils';

	interface Props {
		hit: SearchHit;
	}

	let { hit }: Props = $props();
	const hitEpisode = epName(hit.episode.replace('.json', ''));

	function playLine() {
		audioTimestamp.set({
			timestamp: hit.time,
			episode: hitEpisode?.feedTitle || ''
		});
	}
</script>

<div
	class="w-full px-4 pt-4 pb-2 mb-6 border border-blue-200 rounded-md shadow-xl md:shadow-md hover:bg-blue-50"
>
	<div class="flex flex-wrap items-center justify-between w-full mb-2">
		<div class="flex flex-row md:items-center">
			<Tooltip>
				{#snippet tooltip()}
								Go to episode page
							{/snippet}
				{#snippet content()}
							
						<a
							class="mr-2 text-sm text-blue-900 uppercase hover:underline"
							href={`/ep/${hit.episode.replace('.json', '')}`}
						>
							{hit.episode.replace('.json', '')}
						</a>
					
							{/snippet}
			</Tooltip>
			<div class="text-sm text-gray-900 md:text-base">
				{hitEpisode?.title}
			</div>
		</div>

		<div class="w-full px-1 my-4 border-gray-400 md:pl-6 md:border-l-2 md:text-lg">
			<p>{@html hit._formatted.line}</p>
		</div>
		<div
			class="flex items-center justify-between w-full mt-2 font-mono text-sm text-right text-gray-600 md:text-base md:mt-0"
		>
			<div class="flex items-center gap-3 mr-2 font-sans">
				<span class="text-black border-none">
					{hit.speaker}
				</span>
				<span>
					{hit.time}
				</span>
				{#if hit.edited}
					<Tooltip>
						{#snippet tooltip()}
												Edited
											{/snippet}
						{#snippet content()}
											
								<Check />
							
											{/snippet}
					</Tooltip>
				{:else}
					<Tooltip>
						{#snippet tooltip()}
												Not edited
											{/snippet}
						{#snippet content()}
											
								<Minus />
							
											{/snippet}
					</Tooltip>
				{/if}
			</div>
			<div class="flex gap-4">
				<Tooltip>
					{#snippet tooltip()}
										Go to line in transcript
									{/snippet}
					{#snippet content()}
									
							<a
								href={`/ep/${hitEpisode?.ep}?${timeToUrl(`t-${hit.time.replaceAll(':', '')}`)}`}
								class="font-sans text-base text-blue-600 border-b-2 border-blue-200 border-dotted group hover:border-solid"
							>
								transcript
							</a>
						
									{/snippet}
				</Tooltip>
				{#if hitEpisode?.hasAudio}
					<Tooltip>
						{#snippet tooltip()}
												Listen
											{/snippet}
						{#snippet content()}
											
								<button
									class="font-sans text-base text-blue-600 border-b-2 border-blue-200 border-dotted has-tooltip hover:border-solid"
									onclick={playLine}
								>
									Listen
								</button>
							
											{/snippet}
					</Tooltip>
				{/if}
			</div>
		</div>
	</div>
</div>
