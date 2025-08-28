import { json } from '@sveltejs/kit';
import { SearchService } from '$lib/services/SearchService';
import { handleError } from '$lib/utils/errors';

const searchService = new SearchService();

export async function GET({ url, setHeaders }) {
	try {
		const query = url?.searchParams?.get('q') || '';
		const filterParam = url?.searchParams?.get('f')?.split(',') || [];
		const offset = Number(url?.searchParams?.get('o')) || 0;
		const editedOnly = url?.searchParams?.has('e') || false;

		if (!query.trim()) {
			return json({ error: 'Query parameter is required' }, { status: 400 });
		}

		setHeaders({
			'Cache-Control': 'public, max-age=259200, s-maxage=259200, stale-while-revalidate=604800',
			Vary: 'Accept-Encoding'
		});

		const result = await searchService.search(query, {
			filter: filterParam,
			offset,
			editedOnly
		});

		return json({
			hits: result.items,
			stats: result.stats
		});
	} catch (error) {
		const appError = handleError(error);
		console.error('Search API Error:', appError);
		console.error('Full error details:', error);
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

		return json({ error: appError.message }, { status: appError.statusCode });
	}
}
