import episodesPageData from 'assets/generated/episodes-page-data.json';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load = (() => {
	return episodesPageData;
}) satisfies PageServerLoad;
