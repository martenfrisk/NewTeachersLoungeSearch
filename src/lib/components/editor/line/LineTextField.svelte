<script lang="ts">
	import { shortcutsInScope, formatShortcut } from '$lib/types/editor';
	import Kbd from './Kbd.svelte';
	import type { TextFieldThenType } from './types';

	/**
	 * The line's text: a paragraph that swaps to an auto-sizing textarea.
	 *
	 * Owns its keymap, because the keymap belongs to the field. It reports intent
	 * - commit, cancel, split - and the row decides what "next" means; this
	 * component never sees a line index.
	 */
	interface Props {
		value: string;
		editing: boolean;
		onRequestEdit: () => void;
		onCommit: (text: string, then: TextFieldThenType) => void;
		onCancel: (then: TextFieldThenType) => void;
		/** Cursor offset at which to break the line in two. */
		onSplit: (position: number) => void;
	}

	let { value, editing, onRequestEdit, onCommit, onCancel, onSplit }: Props = $props();

	// svelte-ignore state_referenced_locally
	let draft = $state(value);
	let textareaRef: HTMLTextAreaElement | null = $state(null);

	$effect(() => {
		if (!editing) draft = value;
	});

	// Grow to fit as soon as the field opens, not only once the user types.
	$effect(() => {
		if (editing && textareaRef) {
			textareaRef.focus();
			adjustHeight();
		}
	});

	function adjustHeight() {
		if (!textareaRef) return;
		textareaRef.style.height = 'auto';
		textareaRef.style.height = `${textareaRef.scrollHeight}px`;
	}

	/** Blank input cancels rather than writing an empty line into the transcript. */
	function finish(then: TextFieldThenType) {
		if (draft.trim()) {
			onCommit(draft, then);
		} else {
			onCancel(then);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		const modifier = event.ctrlKey || event.metaKey;

		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (modifier) {
				onSplit((event.target as HTMLTextAreaElement).selectionStart);
			} else {
				finish('next');
			}
		} else if (event.key === 's' && modifier) {
			event.preventDefault();
			finish('stay');
		} else if (event.key === 'Escape') {
			event.preventDefault();
			onCancel('stay');
		} else if (event.key === 'ArrowUp' && modifier) {
			event.preventDefault();
			finish('previous');
		} else if (event.key === 'ArrowDown' && modifier) {
			event.preventDefault();
			finish('next');
		}
	}

	/**
	 * Commit on blur.
	 *
	 * The textarea previously had no blur handler at all, unlike the speaker and
	 * timestamp fields, so clicking away from a text edit silently discarded it -
	 * committing required Enter, Cmd+S or Cmd+Arrow. Text is the field edited most,
	 * and clicking elsewhere is the most natural way to finish.
	 */
	function handleBlur() {
		if (!editing) return;
		finish('stay');
	}

	const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

	// Derived from the shortcut registry rather than written out, so the panel
	// cannot advertise a binding that no longer exists.
	let hints = $derived(
		shortcutsInScope('text-field').map((shortcut) => ({
			keys: formatShortcut(shortcut, isMac),
			description: shortcut.description
		}))
	);
</script>

<div class="min-h-[2rem]">
	{#if editing}
		<textarea
			bind:this={textareaRef}
			bind:value={draft}
			class="w-full resize-none rounded border-2 border-blue-300 bg-white/80 px-2 py-1 text-base leading-relaxed text-gray-900 focus:border-blue-500 focus:ring-0 focus:outline-none"
			style="min-height: 2rem;"
			oninput={adjustHeight}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			aria-label="Line text"
			placeholder="Enter text..."></textarea>
	{:else}
		<div
			class="-mx-2 -my-1 cursor-text rounded px-2 py-1 text-base leading-relaxed break-words text-gray-900 transition-colors hover:bg-gray-100/20"
			ondblclick={onRequestEdit}
			onkeydown={(event) => event.key === 'Enter' && onRequestEdit()}
			role="button"
			tabindex="0"
			title="Double-click to edit text (Enter)"
		>
			{value}
		</div>
	{/if}
</div>

{#if editing}
	<div class="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
		<div class="mb-1 text-xs font-medium text-blue-600">Text editing</div>
		<div class="flex flex-wrap gap-3 text-xs text-blue-700">
			{#each hints as hint (hint.description)}
				<div class="flex items-center gap-1">
					<Kbd tone="blue">{hint.keys}</Kbd>
					<span>{hint.description}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
