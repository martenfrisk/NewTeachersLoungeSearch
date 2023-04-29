import { error } from '@sveltejs/kit';
import { newRandom, searchMeili } from 'lib/utils';

/** @type {import('./$types').PageLoad} */
export async function load({ url }) {
	let query = url?.searchParams?.get('s') || '';
	// let editedOnly = ( url?.searchParams?.has('edited')) || false;
	let filter = url?.searchParams?.get('f')?.split(',') || [];
	if (query === '') query = newRandom();
	const { hits } = await searchMeili(query, !filter.length ? filter : [], true);
	return {
		query: query,
		filter: filter,
		hits: hits
	};
}