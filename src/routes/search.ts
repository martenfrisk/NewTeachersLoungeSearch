import { connectToDatabase } from '$lib/mongo';
import type { MongoHighlightHit } from '$lib/types';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function post({
	body
}: {
	body: { query: string; offset: number };
}): Promise<{ body: { results: MongoHighlightHit[] } }> {
	const { query, offset } = body;
	const mongo = await connectToDatabase();
	const lines = await mongo.db.collection('pcast');

	const results: MongoHighlightHit[] = await lines
		.aggregate([
			{
				$search: {
					index: 'teachers',
					text: {
						query: query,
						path: 'line'
					},
					highlight: {
						path: 'line'
					}
				}
			},
			{
				$project: {
					line: 1,
					_id: 1,
					id: 1,
					season: 1,
					time: 1,
					speaker: 1,
					episode: 1,
					edited: 1,
					highlights: { $meta: 'searchHighlights' }
				}
			}
		])
		.toArray();
	if (results) {
		return {
			body: {
				results: results.slice(offset, offset + 25)
			}
		};
	}
}
