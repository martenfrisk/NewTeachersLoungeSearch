import { connectToDatabase } from '$lib/mongo';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function get({ params }) {
	const { query } = params;
	const mongo = await connectToDatabase();
	const lines = await mongo.db.collection('pcast');
  
	const results = await lines.aggregate([
		{
			$search: {
				index: 'teachers',
				text: {
					query: query,
					path: {
						wildcard: '*'
					}
				}
			}
		}
	]).toArray()
	if (results) {
		return {
			body: {
				results
			}
		};
	}
}

