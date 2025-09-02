import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Extract episode parameter from URL if provided
	const episode = url.searchParams.get('episode');

	return {
		episode: episode || null,
		meta: {
			title: 'Transcript Editor',
			description:
				'Edit podcast transcripts with audio synchronization for accurate speaker identification and timing.'
		}
	};
};

export const actions: Actions = {
	submitContribution: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		const email = data.get('email')?.toString()?.trim();
		const notes = data.get('notes')?.toString()?.trim();
		const transcriptData = data.get('transcript_data')?.toString();

		// Validate required fields
		if (!transcriptData) {
			return fail(400, {
				error: 'No transcript changes provided',
				name,
				email,
				notes
			});
		}

		try {
			// Parse transcript data to validate it
			JSON.parse(transcriptData);

			// Here you would typically call your EditorService or API
			// For now, we'll simulate success

			return {
				success: true,
				message: 'Changes submitted successfully for review',
				editIds: [] // Would come from actual service
			};
		} catch (error) {
			console.error('Failed to submit contribution:', error);
			return fail(500, {
				error: 'Failed to submit changes. Please try again.',
				name,
				email,
				notes
			});
		}
	}
};
