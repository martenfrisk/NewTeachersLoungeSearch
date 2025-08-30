import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
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

// This is an editor page, so we don't want it to be prerendered or cached
export const prerender = false;
export const ssr = false;
