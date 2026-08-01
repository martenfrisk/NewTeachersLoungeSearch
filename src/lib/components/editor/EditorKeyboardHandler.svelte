<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { KEYBOARD_SHORTCUTS } from '$lib/types/editor';

	interface Props {
		onKeyboardAction: (action: string) => void;
	}

	let { onKeyboardAction }: Props = $props();

	/**
	 * True while the user is typing into a field.
	 *
	 * Nearly every shortcut has to be suppressed here, and the number keys make
	 * that critical: without it, typing "Speaker 1" into the rename box would fire
	 * assign-speaker-1 on the focused line.
	 */
	function isTypingTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			target.isContentEditable
		);
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Cmd on Mac, Ctrl elsewhere.
		const modifierKey = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;

		if (isTypingTarget(event.target)) {
			// Only playback controls that need no text cursor stay live while typing, so a
			// transcriber can start and stop audio without leaving the field. Escape
			// is deliberately not among them: inside a field it cancels the edit.
			const allowedWhileTyping = modifierKey && ['ArrowLeft', 'ArrowRight'].includes(event.key);
			if (!allowedWhileTyping) return;
		}

		for (const shortcut of KEYBOARD_SHORTCUTS) {
			if (
				event.key === shortcut.key &&
				!!modifierKey === !!shortcut.ctrlKey &&
				!!event.shiftKey === !!shortcut.shiftKey &&
				!!event.altKey === !!shortcut.altKey
			) {
				event.preventDefault();
				onKeyboardAction(shortcut.action);
				return;
			}
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeyDown);
	});
</script>

<!-- This component only handles keyboard events, no UI -->
