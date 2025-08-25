import { json } from '@sveltejs/kit';
import { SearchService } from '$lib/services/SearchService';
import { handleError } from '$lib/utils/errors';

const searchService = new SearchService();

export async function GET({ url, setHeaders }) {
	try {
		const query = url?.searchParams?.get('q') || '';
		const filterParam = url?.searchParams?.get('f')?.split(',') || [];
		const offset = Number(url?.searchParams?.get('o')) || 20;
		const editedOnly = url?.searchParams?.has('e') || false;

		// Validate required parameters
		if (!query.trim()) {
			return json({ error: 'Query parameter is required' }, { status: 400 });
		}

		setHeaders({
			'Cache-Control': 'max-age=300, s-maxage=600' // Reduced cache time for better UX
		});

		const result = await searchService.search(query, {
			filter: filterParam,
			offset,
			editedOnly,
			useCache: true
		});

		// Transform result to match expected API format
		return json({
			hits: result.items,
			stats: result.stats
		});
	} catch (error) {
		const appError = handleError(error);
		console.error('Search API Error:', appError);

		return json({ error: appError.message }, { status: appError.statusCode });
	}
}
