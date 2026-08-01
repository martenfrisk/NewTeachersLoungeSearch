import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ContributorForm from './ContributorForm.svelte';

/**
 * Regression test for silent data loss on anonymous submission.
 *
 * This form used to POST to a `?/submitContribution` server action that parsed
 * the payload and returned `{ success: true }` without writing anything, so an
 * anonymous contributor saw a success message while their edits were dropped.
 * The `onSubmit` callback below - the only path that reaches
 * EditorService.submitEpisodeTranscript - was never invoked.
 *
 * If someone reintroduces a form action, `onSubmit` stops firing and these fail.
 */

describe('ContributorForm', () => {
	it('calls onSubmit with the entered details instead of posting to a server action', async () => {
		const onSubmit = vi.fn();
		render(ContributorForm, { isVisible: true, onSubmit });

		await page.getByLabelText('Name (optional)').fill('Mårten');
		await page.getByLabelText('Notes (optional)').fill('fixed a speaker label');
		await page.getByRole('button', { name: 'Submit Changes' }).click();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenCalledWith({
			name: 'Mårten',
			email: undefined,
			notes: 'fixed a speaker label'
		});
	});

	it('submits with every field blank, since all of them are optional', async () => {
		const onSubmit = vi.fn();
		render(ContributorForm, { isVisible: true, onSubmit });

		await page.getByRole('button', { name: 'Submit Changes' }).click();

		expect(onSubmit).toHaveBeenCalledWith({
			name: undefined,
			email: undefined,
			notes: undefined
		});
	});

	it('trims whitespace-only input down to undefined rather than submitting blanks', async () => {
		const onSubmit = vi.fn();
		render(ContributorForm, { isVisible: true, onSubmit });

		await page.getByLabelText('Name (optional)').fill('   ');
		await page.getByRole('button', { name: 'Submit Changes' }).click();

		expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: undefined }));
	});

	it('has no form action, so submission cannot fall back to the server', async () => {
		render(ContributorForm, { isVisible: true, onSubmit: vi.fn() });

		const form = document.querySelector('form');
		expect(form).not.toBeNull();
		expect(form?.getAttribute('action')).toBeNull();
		// Absent `method` means the browser default (GET) - but since the submit
		// handler preventDefaults, nothing is ever sent over the wire either way.
		expect(form?.getAttribute('method')).toBeNull();
	});

	it('does not submit when cancelled', async () => {
		const onSubmit = vi.fn();
		const onCancel = vi.fn();
		render(ContributorForm, { isVisible: true, onSubmit, onCancel });

		await page.getByRole('button', { name: 'Cancel' }).click();

		expect(onSubmit).not.toHaveBeenCalled();
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('renders nothing while hidden', async () => {
		render(ContributorForm, { isVisible: false, onSubmit: vi.fn() });
		expect(document.querySelector('form')).toBeNull();
	});
});
