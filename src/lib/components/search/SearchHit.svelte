<script lang="ts">
	import type { SearchHitType } from '../../types/search';
	import { getContext, type HitContext } from '../../services/ContextService';
	import SearchHitHeader from './SearchHitHeader.svelte';
	import SearchHitContent from './SearchHitContent.svelte';
	import SearchHitActions from './SearchHitActions.svelte';

	interface Props {
		hit: SearchHitType;
	}

	let { hit }: Props = $props();

	let showContext = $state(false);
	let context = $state<HitContext | null>(null);
	let loadingContext = $state(false);

	async function toggleContext() {
		if (showContext) {
			showContext = false;
			return;
		}

		if (!context && !loadingContext) {
			loadingContext = true;
			try {
				context = await getContext(hit);
			} catch (error) {
				console.error('Failed to load context:', error);
			} finally {
				loadingContext = false;
			}
		}

		showContext = true;
	}
</script>

<article
	class="w-full border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-white hover:bg-blue-50/20 relative"
	aria-labelledby="hit-episode-{hit.episode.replace('.json', '')}-{hit.time}"
>
	<!-- Main Content -->
	<SearchHitContent {hit} {context} {showContext} />
	<SearchHitHeader {hit} />
	<SearchHitActions {hit} {showContext} {loadingContext} onToggleContext={toggleContext} />
</article>
