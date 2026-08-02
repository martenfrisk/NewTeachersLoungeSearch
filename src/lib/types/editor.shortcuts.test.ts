import { describe, it, expect } from 'vitest';
import {
	KEYBOARD_SHORTCUTS,
	KEYBOARD_SHORTCUTS_BY_CATEGORY,
	shortcutsInScope,
	shortcutFor,
	formatShortcut,
	matchesShortcut,
	type KeyboardShortcutType
} from './editor';

/** How EditorKeyboardHandler decides a keydown matches a binding. */
const signature = (shortcut: KeyboardShortcutType) =>
	[shortcut.key, !!shortcut.ctrlKey, !!shortcut.shiftKey, !!shortcut.altKey].join('|');

describe('shortcut scopes', () => {
	// The reason scopes exist. EditorKeyboardHandler walks KEYBOARD_SHORTCUTS and
	// preventDefaults every match at the document level, so a bare letter in that
	// list is a letter nobody can type anywhere on the page.
	it('keeps line- and field-scoped bindings out of the document handler', () => {
		const globalActions = new Set(KEYBOARD_SHORTCUTS.map((s) => s.action));

		for (const scope of ['line', 'text-field'] as const) {
			for (const shortcut of shortcutsInScope(scope)) {
				expect(globalActions.has(shortcut.action)).toBe(false);
			}
		}
	});

	it('binds no unmodified letter globally except the review keys', () => {
		const bareLetters = KEYBOARD_SHORTCUTS.filter(
			(s) => /^[a-zA-Z]$/.test(s.key) && !s.ctrlKey && !s.altKey
		).map((s) => s.key);

		// These four are deliberate and are stopped by the row before they can
		// double-fire; anything else appearing here is an accident.
		expect(bareLetters.sort()).toEqual(['O', 'c', 'm', 'o', 'r', 'u'].sort());
	});

	it('gives every global binding a distinct key combination', () => {
		const seen = new Map<string, string>();

		for (const shortcut of KEYBOARD_SHORTCUTS) {
			const key = signature(shortcut);
			// The handler returns on its first match, so a collision means the later
			// binding silently never fires.
			expect(seen.get(key), `${key} collides with ${seen.get(key)}`).toBeUndefined();
			seen.set(key, shortcut.action);
		}
	});

	// The help panels render these in keyed {#each} blocks, and Svelte throws
	// each_key_duplicate on a collision - which unmounts the whole editor into its
	// error boundary, taking the document key handler down with it. Adding a second
	// entry described "Edit text" did exactly that.
	it('gives every binding a unique action to key on', () => {
		const actions = KEYBOARD_SHORTCUTS_BY_CATEGORY.flatMap((c) => c.shortcuts).map((s) => s.action);
		expect(new Set(actions).size).toBe(actions.length);
	});

	it('gives every category a unique name to key on', () => {
		const names = KEYBOARD_SHORTCUTS_BY_CATEGORY.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it('matches every scoped category to a known scope', () => {
		for (const category of KEYBOARD_SHORTCUTS_BY_CATEGORY) {
			expect(['global', 'line', 'text-field']).toContain(category.scope ?? 'global');
		}
	});

	it('covers every category in exactly one scope', () => {
		const total = KEYBOARD_SHORTCUTS_BY_CATEGORY.flatMap((c) => c.shortcuts).length;
		const partitioned = (['global', 'line', 'text-field'] as const)
			.map((scope) => shortcutsInScope(scope).length)
			.reduce((a, b) => a + b, 0);

		expect(partitioned).toBe(total);
	});
});

describe('shortcutFor()', () => {
	it('finds bindings outside the global scope', () => {
		// The quick-action tooltips label buttons from line-scoped actions; if this
		// only searched the flat global list they would silently lose their hints.
		expect(shortcutFor('line-edit-speaker')?.key).toBe('s');
		expect(shortcutFor('text-cancel')?.key).toBe('Escape');
	});

	it('finds global bindings', () => {
		expect(shortcutFor('toggle-play')?.key).toBe('Escape');
	});

	it('returns undefined for an unknown action rather than throwing', () => {
		expect(shortcutFor('no-such-action')).toBeUndefined();
	});

	// Every action the quick-action bar asks for a label must resolve, or the
	// button silently loses its key hint.
	it.each([
		'line-edit-text',
		'line-edit-speaker',
		'line-edit-timestamp',
		'new-line-before',
		'new-line-after',
		'delete-line',
		'set-timestamp-previous-plus-one',
		'commit-line',
		'reset-edited'
	])('resolves %s for the quick-action bar', (action) => {
		expect(shortcutFor(action)).toBeDefined();
	});
});

describe('matchesShortcut()', () => {
	const press = (key: string, mods: { shift?: boolean; alt?: boolean } = {}) => ({
		key,
		shiftKey: !!mods.shift,
		altKey: !!mods.alt
	});

	// The bug this function was extracted to fix: `?` arrives with shiftKey true
	// on every common layout, so comparing it against a binding that declares no
	// Shift meant the shortcut panel's own shortcut never opened it.
	it('fires a punctuation binding even though Shift produced the character', () => {
		const showHelp = shortcutFor('show-help')!;
		expect(matchesShortcut(press('?', { shift: true }), showHelp, false)).toBe(true);
	});

	it('still requires Shift for a binding that asks for it', () => {
		const newLineBefore = shortcutFor('new-line-before')!;
		expect(matchesShortcut(press('O', { shift: true }), newLineBefore, false)).toBe(true);
		expect(matchesShortcut(press('O'), newLineBefore, false)).toBe(false);
	});

	it('rejects a letter binding when Shift is held', () => {
		const merge = shortcutFor('merge-line')!;
		expect(matchesShortcut(press('m'), merge, false)).toBe(true);
		expect(matchesShortcut(press('m', { shift: true }), merge, false)).toBe(false);
	});

	it('distinguishes the modified and unmodified forms of one key', () => {
		const previousLine = shortcutFor('previous-line')!;
		const faster = shortcutFor('playback-faster')!;

		expect(matchesShortcut(press('ArrowUp'), previousLine, false)).toBe(true);
		expect(matchesShortcut(press('ArrowUp'), previousLine, true)).toBe(false);
		expect(matchesShortcut(press('ArrowUp'), faster, true)).toBe(true);
	});

	it('separates the 5s and 10s seek bindings by Shift', () => {
		const five = shortcutFor('skip-backward-5')!;
		const ten = shortcutFor('skip-backward-10')!;

		expect(matchesShortcut(press('ArrowLeft'), five, true)).toBe(true);
		expect(matchesShortcut(press('ArrowLeft', { shift: true }), five, true)).toBe(false);
		expect(matchesShortcut(press('ArrowLeft', { shift: true }), ten, true)).toBe(true);
	});

	it('resolves every global binding to exactly one action', () => {
		// A press must never satisfy two bindings; the handler takes the first and
		// the second would be unreachable.
		for (const shortcut of KEYBOARD_SHORTCUTS) {
			const event = press(shortcut.key, { shift: shortcut.shiftKey, alt: shortcut.altKey });
			const matched = KEYBOARD_SHORTCUTS.filter((candidate) =>
				matchesShortcut(event, candidate, !!shortcut.ctrlKey)
			);

			expect(matched.map((m) => m.action)).toEqual([shortcut.action]);
		}
	});
});

describe('formatShortcut()', () => {
	it('renders modifiers as symbols on Mac and words elsewhere', () => {
		const shortcut = shortcutFor('skip-backward-5')!;
		expect(formatShortcut(shortcut, true)).toBe('⌘←');
		expect(formatShortcut(shortcut, false)).toBe('Ctrl+←');
	});

	it('spells out named keys rather than showing the raw event value', () => {
		expect(formatShortcut({ key: 'Escape', action: 'x', description: '' })).toBe('Esc');
		expect(formatShortcut({ key: 'Delete', action: 'x', description: '' })).toBe('Del');
	});

	it('uppercases letter keys', () => {
		expect(formatShortcut({ key: 'm', action: 'x', description: '' })).toBe('M');
	});

	// Mac mode joins parts with no separator, so a spelled-out modifier runs into
	// the key: "ShiftO".
	it('renders Shift as a symbol on Mac', () => {
		const newLineBefore = shortcutFor('new-line-before')!;
		expect(formatShortcut(newLineBefore, true)).toBe('⇧O');
		expect(formatShortcut(newLineBefore, false)).toBe('Shift+O');
	});

	it('stacks both modifiers in order', () => {
		const back10 = shortcutFor('skip-backward-10')!;
		expect(formatShortcut(back10, true)).toBe('⌘⇧←');
		expect(formatShortcut(back10, false)).toBe('Ctrl+Shift+←');
	});
});
