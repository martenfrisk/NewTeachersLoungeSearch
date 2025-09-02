<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { KEYBOARD_SHORTCUTS } from '$lib/types/editor';

	interface Props {
		onKeyboardAction: (action: string) => void;
	}

	let { onKeyboardAction }: Props = $props();

	function handleKeyDown(event: KeyboardEvent) {
		// Handle Cmd on Mac, Ctrl on PC
		const modifierKey = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;

		// Skip shortcuts when user is actively typing in any input field
		if (
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement
		) {
			// Only allow navigation shortcuts (arrows, Tab) and function keys in inputs
			const allowedInInputs = ['ArrowUp', 'ArrowDown', 'Tab', 'Escape', 'F1', 'F2', 'F3'];
			if (!allowedInInputs.includes(event.key)) {
				return;
			}
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
				break;
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
