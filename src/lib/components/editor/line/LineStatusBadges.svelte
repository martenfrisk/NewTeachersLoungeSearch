<script lang="ts">
	/**
	 * Pure display. Takes booleans, renders badges, owns nothing.
	 *
	 * "Modified" and "reviewed" are independent, so these are two conditionals
	 * rather than one {:else if} chain - the chain hid "Modified" the moment a
	 * line was reviewed, which is precisely when both matter.
	 */
	interface Props {
		isModified: boolean;
		isReviewed: boolean;
		isPlaying: boolean;
	}

	let { isModified, isReviewed, isPlaying }: Props = $props();
</script>

<div class="ml-auto flex flex-shrink-0 items-center gap-2">
	{#if isModified}
		<span
			class="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
			title="Differs from the stored transcript and will be included in the submission"
		>
			Modified
		</span>
	{/if}
	{#if isReviewed}
		<span
			class="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
			title="Marked as reviewed"
		>
			Reviewed
		</span>
	{/if}

	{#if isPlaying}
		<div class="flex animate-pulse items-center text-green-600" title="Playing">
			<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
				<path
					d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.5 13.5H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.5l3.883-3.314A1 1 0 019.383 3.076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 10a7.971 7.971 0 00-2.343-5.657 1 1 0 010-1.414z"
				/>
			</svg>
		</div>
	{/if}
</div>
