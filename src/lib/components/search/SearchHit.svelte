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
	class="w-full rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 bg-surface relative"
	aria-labelledby="hit-episode-{hit.episode.replace('.json', '')}-{hit.time}"
>
	<!-- Meta (where) → quote (what) → actions (do) -->
	<SearchHitHeader {hit} />
	<SearchHitContent {hit} {context} {showContext} />
	<SearchHitActions {hit} {showContext} {loadingContext} onToggleContext={toggleContext} />
</article>
