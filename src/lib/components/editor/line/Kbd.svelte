<script lang="ts">
	/**
	 * A key cap.
	 *
	 * Its own component because both LineQuickActions and LineTextField render key
	 * hints, and Svelte scopes CSS per component - keeping it inline meant the same
	 * fourteen declarations copied into each of them.
	 */
	interface Props {
		/** `blue` for hints inside the blue text-editing panel. */
		tone?: 'default' | 'blue';
		children: import('svelte').Snippet;
	}

	let { tone = 'default', children }: Props = $props();
</script>

<kbd class={tone === 'blue' ? 'cap cap-blue' : 'cap'}>{@render children()}</kbd>

<style>
	.cap {
		display: inline-flex;
		align-items: center;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		padding: 0.125rem 0.25rem;
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
		color: #4b5563;
		min-width: fit-content;
	}

	.cap-blue {
		background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
		border-color: #93c5fd;
		color: #1e40af;
	}
</style>
