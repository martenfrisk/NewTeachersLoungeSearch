<script lang="ts">
	import type { SearchHitType } from '../../types/search';
	import { epName } from '../../utils';
	import Tooltip from '../Tooltip.svelte';
	import Icon from '../ui/Icon.svelte';
	import { resolve } from '$app/paths';

	interface Props {
		hit: SearchHitType;
	}

	let { hit }: Props = $props();

	const epId = $derived(hit.episode.replace('.json', ''));
	const hitEpisode = $derived(epName(epId));
	const lineHref = $derived(resolve(`/ep/[id]#t-${hit.time.replaceAll(':', '')}`, { id: epId }));
	const title = $derived(hitEpisode?.title || 'Unknown Episode');
</script>

<!-- Meta: episode code + timestamp on one line; the title gets full width
     (inline on desktop, its own line on mobile) so it never wraps to a
     skinny multi-line column. -->
<div class="px-4 pt-3">
	<div class="flex items-center justify-between gap-2">
		<a
			href={lineHref}
			class="group/ep flex min-w-0 items-center gap-2"
			aria-label="Go to {epId} at {hit.time}"
		>
			<span
				class="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-blue-700"
			>
				{epId}
			</span>
			<!-- Desktop: title sits inline beside the code -->
			<span
				class="hidden truncate text-sm font-medium text-ink group-hover/ep:text-blue-700 group-hover/ep:underline md:block"
			>
				{title}
			</span>
		</a>

		<div class="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
			{#if hit.edited}
				<Tooltip side="left">
					{#snippet tooltip()}
						Edited for accuracy
					{/snippet}
					{#snippet content()}
						<Icon name="check-badge" class="h-4 w-4 text-green-600" />
					{/snippet}
				</Tooltip>
			{/if}
			<span class="font-mono">{hit.time}</span>
		</div>
	</div>

	<!-- Mobile: full-width title on its own line -->
	<a
		href={lineHref}
		class="mt-1 block text-sm font-medium leading-snug text-ink hover:text-blue-700 hover:underline md:hidden"
	>
		{title}
	</a>
</div>
