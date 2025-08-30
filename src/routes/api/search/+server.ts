import { json } from '@sveltejs/kit';
import { SearchService } from '$lib/services/SearchService';
import { handleError } from '$lib/utils/errors';

const searchService = new SearchService();

export async function GET({ url, setHeaders }) {
	const startTime = Date.now();

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

		const totalResponseTime = Date.now() - startTime;

		// Log API request summary for Vercel analytics
		console.log(
			JSON.stringify({
				event: 'search_api_request',
				query: query.substring(0, 50), // Truncate long queries for logs
				cacheHit: result.stats.cacheHit || false,
				cacheSource: result.stats.cacheSource || 'none',
				totalResponseTime,
				searchResponseTime: result.stats.cacheResponseTime || result.stats.processingTime,
				hits: result.items.length,
				hasFilters: filterParam.length > 0,
				isPageLoad: offset === 0,
				editedOnly,
				timestamp: new Date().toISOString()
			})
		);

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
