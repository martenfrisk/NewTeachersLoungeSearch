import type { PageServerLoad } from './$types';

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

// There is deliberately no `submitContribution` action here.
//
// ContributorForm used to POST to one, and it returned `{ success: true }` after
// parsing the payload without writing anything - so anonymous contributors saw a
// success message while their work was dropped. It also only ever received the
// *changed* lines, while the submission is recorded as a `full_replacement`, so
// honouring it would have truncated the episode down to those lines.
//
// Submissions now go straight from the browser to `episode_submissions` via
// EditorService.submitEpisodeTranscript, which sends the whole transcript. There
// is no server-side Supabase client to route them through: hooks.server.ts is
// empty, @supabase/ssr is not a dependency, and the table's RLS already permits
// this insert from the anon key. Revisit if /editor ever gets an auth gate.
