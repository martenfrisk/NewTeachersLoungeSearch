/**
 * Shared types for the transcript-line components.
 *
 * A plain module rather than an export from a `.svelte` file: types declared in
 * an instance `<script>` are not exported, and adding a `<script module>` block
 * just to carry one alias is more machinery than the alias is worth.
 */

/** Where focus should go once a field's draft is committed or abandoned. */
export type TextFieldThenType = 'stay' | 'next' | 'previous';
