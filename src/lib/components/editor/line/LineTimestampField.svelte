<script lang="ts">
	import { focusOnMount } from '../focus-management';

	/**
	 * Timestamp pill that swaps to a text input.
	 *
	 * Controlled: the parent owns `editing`, this owns only the draft being typed.
	 * It knows nothing about line indices - it reports a value and the row decides
	 * where it goes.
	 */
	interface Props {
		value: string;
		editing: boolean;
		onRequestEdit: () => void;
		onCommit: (value: string) => void;
		onCancel: () => void;
	}

	let { value, editing, onRequestEdit, onCommit, onCancel }: Props = $props();

	// Re-synced from the prop whenever the field is closed; while open the draft is
	// authoritative, so an external change to `value` cannot overwrite typing.
	// svelte-ignore state_referenced_locally
	let draft = $state(value);
	$effect(() => {
		if (!editing) draft = value;
	});

	function handleKeydown(event: KeyboardEvent) {
		// Must not reach the document handler: it would read these as transcript
		// navigation while the caret is in the field.
		event.stopPropagation();
		if (event.key === 'Enter') {
			event.preventDefault();
			onCommit(draft);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			onCancel();
		}
	}
</script>

{#if editing}
	<input
		bind:value={draft}
		type="text"
		class="w-[60px] rounded border border-blue-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		onblur={() => onCommit(draft)}
		onkeydown={handleKeydown}
		aria-label="Timestamp"
		use:focusOnMount={{ select: true }}
	/>
{:else}
	<button
		class="rounded-full border bg-white/60 px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
		ondblclick={onRequestEdit}
		title="Double-click to edit timestamp (T)"
	>
		{value}
	</button>
{/if}
