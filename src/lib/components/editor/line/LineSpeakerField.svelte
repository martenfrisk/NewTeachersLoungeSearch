<script lang="ts">
	import { focusOnMount } from '../focus-management';

	/**
	 * Speaker pill that swaps to a free-text input backed by the shared datalist.
	 *
	 * Takes no roster and no line index - the datalist is referenced by id and
	 * rendered once by TranscriptView, so this component needs neither. That is
	 * what keeps it cheap at 732 instances.
	 *
	 * A <select> here could only offer roster names, so any line whose speaker was
	 * not in the roster rendered blank and could not be restored. The corpus has
	 * one-off names - `Klaus`, `Fake Manager`, `Harriet Splooge` - so free text is
	 * a requirement, not a nicety.
	 */
	interface Props {
		/** The stored `transcript_lines.speaker` value. */
		value: string;
		/** What to show when closed: a host's full name, or "Unknown Speaker #n". */
		displayName: string;
		/** Tailwind classes from getSpeakerColor. */
		colorClass: string;
		editing: boolean;
		datalistId: string;
		onRequestEdit: () => void;
		onCommit: (value: string) => void;
		onCancel: () => void;
	}

	let {
		value,
		displayName,
		colorClass,
		editing,
		datalistId,
		onRequestEdit,
		onCommit,
		onCancel
	}: Props = $props();

	// The draft is seeded once and re-synced by the effect below; capturing the
	// initial value here is the intent, not an oversight.
	// svelte-ignore state_referenced_locally
	let draft = $state(value);
	$effect(() => {
		if (!editing) draft = value;
	});

	function handleKeydown(event: KeyboardEvent) {
		// Arrow keys walk the datalist suggestions, so they must not reach the
		// document handler that moves between transcript lines.
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
		type="text"
		list={datalistId}
		bind:value={draft}
		class="rounded-full border px-3 py-1 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
		onblur={() => onCommit(draft)}
		onkeydown={handleKeydown}
		placeholder="Speaker name"
		aria-label="Speaker"
		use:focusOnMount={{ select: true }}
	/>
{:else}
	<button
		class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-80 sm:text-sm ${colorClass}`}
		ondblclick={onRequestEdit}
		title="Double-click to edit speaker (S)"
	>
		{displayName}
	</button>
{/if}
