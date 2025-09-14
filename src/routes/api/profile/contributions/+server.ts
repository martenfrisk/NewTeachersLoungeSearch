import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const GET: RequestHandler = async ({ url, request }) => {
	try {
		// Get the access token from the Authorization header
		const authHeader = request.headers.get('Authorization');

		if (!authHeader?.startsWith('Bearer ')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split(' ')[1];

		// Create Supabase client with the provided token
		const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			},
			global: {
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		});

		// Verify the user session with the token
		const {
			data: { user },
			error: authError
		} = await supabase.auth.getUser(token);

		if (authError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const limit = parseInt(url.searchParams.get('limit') || '10');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Query user's episode submissions (contributions)
		const {
			data: contributions,
			error,
			count
		} = await supabase
			.from('episode_submissions')
			.select(
				`
				id,
				episode_ep,
				submission_type,
				transcript_data,
				status,
				created_at,
				reviewed_at,
				reviewed_by,
				notes,
				episodes!episode_submissions_episode_id_fkey (
					title
				)
			`,
				{ count: 'exact' }
			)
			.eq('submitted_by', user.id)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			console.error('Database error:', error);
			return json({ error: 'Failed to fetch contributions' }, { status: 500 });
		}

		// Transform the data to match the expected episode contribution format
		const formattedContributions =
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			contributions?.map((contrib: any) => {
				// Parse transcript data to count lines changed
				let linesChanged = 0;
				try {
					const transcriptData =
						typeof contrib.transcript_data === 'string'
							? JSON.parse(contrib.transcript_data)
							: contrib.transcript_data;
					linesChanged = Array.isArray(transcriptData) ? transcriptData.length : 0;
				} catch {
					linesChanged = 0;
				}

				return {
					id: contrib.id,
					episodeEp: contrib.episode_ep,
					episodeTitle: contrib.episodes?.title || 'Unknown Episode',
					submissionType: contrib.submission_type,
					linesChanged,
					status: contrib.status,
					createdAt: contrib.created_at,
					reviewedAt: contrib.reviewed_at,
					reviewedBy: contrib.reviewed_by,
					notes: contrib.notes
				};
			}) || [];

		return json({
			contributions: formattedContributions,
			totalCount: count || 0,
			hasMore: (count || 0) > offset + limit
		});
	} catch (error) {
		console.error('API error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
