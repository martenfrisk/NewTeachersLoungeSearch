// eslint-disable-next-line @typescript-eslint/no-explicit-any

import { MeiliKey } from '$lib/Env';
import type { SearchResult } from '$lib/types';
import { MeiliSearch } from 'meilisearch';

import epList from '../../assets/episodes.json';
type throttleFunction = (args: any) => void;
export const throttle = (delay: number, fn: throttleFunction): throttleFunction => {
	let inDebounce = null;
	return (args) => {
		clearTimeout(inDebounce);
		inDebounce = setTimeout(() => fn(args), delay);
	};
};

export const highlight = (needle: string, haystack: string): string => {
	const result: string = haystack.replace(new RegExp(needle, 'gi'), (str) => `<em>${str}</em>`);
	return result;
};

export const secToMins = (seconds: number): string => {
	const minutes: number = seconds / 60;
	const totMins: string = minutes.toFixed(2);
	const number = totMins.replace('.', ':');
	return number;
};

export const randomQuery = [
	'guinness',
	'ridiculous voice',
	'bronco',
	'lasagna',
	'big nightmare',
	'el chapo',
	'cheetah man',
	'see you in court',
	'beef diaper',
	'bottomless piggy bank',
	'scarecrow',
	'south pole santa',
	'Wimberley',
	'tricky dick',
	'picasso',
	'grotesque genitals',
	'bethany hart',
	'morrissey',
	'goths',
	'famously',
	'oj simpson',
	"let's just say"
];

export const getRandomInt = (max: number): number => Math.floor(Math.random() * Math.floor(max));

export interface MeiliResult {
	stats: {
		nbHits: SearchResult['nbHits'];
		processingTime: SearchResult['processingTimeMs'];
		facets: {
			facetName: string;
			facetHits: {
				ep: string;
				hits: number;
			}[];
		}[];
	};
	hits: SearchResult['hits'];
}

export const client = new MeiliSearch({
	host: 'https://ts.pcast.site/',
	apiKey: MeiliKey
});

export async function searchMeili(query: string, filter = '', isSSR = false): Promise<MeiliResult> {
	const index = client.index('teachers');
	const urlParams = new URLSearchParams(`s=${query}`);

	if (!isSSR && history.pushState) {
		let newUrl =
			window.location.protocol +
			'//' +
			window.location.host +
			window.location.pathname +
			'?' +
			urlParams;

		if (filter !== '') newUrl = `${newUrl}&f=${filter.replace(' = ', '=')}`;
		window.history.pushState({ path: newUrl }, '', newUrl);
	}

	const data =
		filter === ''
			? await index.search(query, {
					attributesToHighlight: ['line'],
					facetsDistribution: ['season', 'episode']
			  })
			: await index.search(query, {
					attributesToHighlight: ['line'],
					filters: filter,
					facetsDistribution: ['season', 'episode']
			  });

	const facets = [];
	interface FacetHit {
		ep: string;
		hits: number;
	}
	if (data !== undefined && data.facetsDistribution) {
		Object.entries(data.facetsDistribution).forEach(([facetKey, facetValue]) => {
			const valuesArr = [];
			Object.entries(facetValue).forEach(([key, value]) => {
				valuesArr.push({ ep: key, hits: value });
			});
			valuesArr.sort((a: FacetHit, b: FacetHit) => {
				return b.hits - a.hits;
			});
			facets.push({ facetName: facetKey, facetHits: valuesArr.slice(0, 9) });
		});
	}

	console.log({ facets });
	return {
		stats: {
			nbHits: data.nbHits,
			processingTime: data.processingTimeMs,
			facets: facets
		},
		hits: data.hits
	};
}
export const timeToUrl = (time: string): URLSearchParams => {
	const urlTime = new URLSearchParams();
	urlTime.append('t', time);
	return urlTime;
};

export function findEpNr(title: string, returnValue: string): string | null {
	const epNr = epList.find((x) => x.title == title);
	if (epNr) return epNr[returnValue];
	return null;
}
export function newRandom(): string {
	return randomQuery[getRandomInt(randomQuery.length)];
}
