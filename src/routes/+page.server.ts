import { createSearchParams, newRandom } from 'lib/utils';
import type { SearchHitType } from '$lib/types/search';

/** @type {import('./$types').PageLoad} */
export async function load({ url, fetch }) {
	const query = url?.searchParams?.get('s') || '';
	const editedOnly = url?.searchParams?.has('edited') || false;
	const filter = url?.searchParams?.get('f')?.split(',') || [];
	let hits: SearchHitType[] = [];
	const searchQuery = query || newRandom();
	if (searchQuery) {
		try {
			const searchParams = createSearchParams({ query: searchQuery, filter, editedOnly });
			const response = await fetch(`/api/search?${searchParams}`);
			if (response.ok) {
				const data = await response.json();
				hits = data.hits || [];
			} else {
				console.error('Search failed:', response.status, response.statusText);
			}
		} catch (error) {
			console.error('Failed to load search results:', error);
		}
	}

	return {
		query: searchQuery,
		filter,
		hits,
		editedOnly
	};
}
