import epList from '../assets/episodes6.json';

type ThrottleFunction = (args: unknown) => void;
export const debounceFn = (delay: number, fn: ThrottleFunction): ThrottleFunction => {
	let inDebounce: ReturnType<typeof setTimeout> | null = null;
	return (args) => {
		if (inDebounce) clearTimeout(inDebounce);
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
	'obsessed with corn',
	'permit crab',
	'Wimberley',
	'tricky dick',
	'picasso',
	'grotesque genitals',
	'bethany hart',
	'morrissey',
	'goths',
	'famously',
	'oj simpson',
	"let's just say",
	'real hair',
	'refrigerator',
	'large olive',
	'Gandhi',
	'gazpacho'
];

export const getRandomInt = (max: number): number => Math.floor(Math.random() * Math.floor(max));
export const timeToUrl = (time: string): URLSearchParams => {
	const urlTime = new URLSearchParams();
	urlTime.append('t', time);
	return urlTime;
};

export function findEpNr(title: string, returnValue: keyof (typeof epList)[0]): string | null {
	const epNr = epList.find((x) => x.title == title);
	if (epNr) {
		// @ts-expect-error - Dynamic property access with validated key
		return epNr[returnValue];
	} else {
		return null;
	}
}
export function newRandom(): string {
	return randomQuery[getRandomInt(randomQuery.length)];
}

export function epName(episode: string) {
	return epList.find((x) => x.ep === episode);
}

export function createSearchParams({
	query,
	offset = 20,
	filter,
	editedOnly
}: {
	query: string;
	offset?: number;
	filter?: string[];
	editedOnly?: boolean;
}) {
	const params = new URLSearchParams();
	params.set('q', query);
	if (offset) params.set('o', offset.toString());
	if (filter && filter?.length > 0) {
		params.set('f', filter.join(','));
	}
	if (editedOnly) params.set('e', 'true');
	return params;
}
