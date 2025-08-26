<script lang="ts">
	interface Props {
		episodeInfo?: {
			ep: string;
			title: string;
			desc?: string;
		};
	}

	let { episodeInfo }: Props = $props();
</script>

<div class="text-center mb-6">
	<div class="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
		{episodeInfo?.ep}
	</div>
	<h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{episodeInfo?.title}</h1>
	{#if episodeInfo?.desc}
		<p class="text-gray-600 leading-relaxed max-w-2xl mx-auto">{episodeInfo?.desc}</p>
	{/if}
</div>
