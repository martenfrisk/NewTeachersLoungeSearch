import { error } from '@sveltejs/kit';

export function load({ params, url }) {
	const { id } = params;
	if (id) {
		return {
			episode: id,
			query: url.searchParams
		};
	}

	throw error(404, 'Not found');
}
