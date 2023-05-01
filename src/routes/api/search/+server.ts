import { json } from '@sveltejs/kit';
import { searchMeili } from 'lib/utils';

export async function GET({ url, setHeaders }) {
	const query = url?.searchParams?.get('q') || '';
	const filter = url?.searchParams?.get('f')?.split(',') || [];
	const offset = Number(url?.searchParams?.get('o')) || 20;
	const filterEdited = url?.searchParams?.has('e') || false;

	setHeaders({
		'Cache-Control': 'max-age=604800, stale-while-revalidate=86400'
	});

	const hits = await searchMeili({
		query,
		filter,
		offset,
		filterEdited
	});
	return json(hits);
}
