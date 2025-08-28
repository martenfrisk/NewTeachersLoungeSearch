export interface ParsedQuery {
	terms: string[];
	exactPhrases: string[];
	excludedTerms: string[];
	excludedPhrases: string[];
}

export function parseSearchQuery(query: string): ParsedQuery {
	const result: ParsedQuery = {
		terms: [],
		exactPhrases: [],
		excludedTerms: [],
		excludedPhrases: []
	};

	let currentPosition = 0;
	const chars = query.split('');

	while (currentPosition < chars.length) {
		const char = chars[currentPosition];

		if (char === ' ') {
			currentPosition++;
			continue;
		}

		if (char === '-') {
			currentPosition++;
			const nextResult = parseToken(chars, currentPosition);
			if (nextResult) {
				if (nextResult.isPhrase) {
					result.excludedPhrases.push(nextResult.token);
				} else {
					result.excludedTerms.push(nextResult.token);
				}
				currentPosition = nextResult.nextPosition;
			}
		} else {
			const nextResult = parseToken(chars, currentPosition);
			if (nextResult) {
				if (nextResult.isPhrase) {
					result.exactPhrases.push(nextResult.token);
				} else {
					result.terms.push(nextResult.token);
				}
				currentPosition = nextResult.nextPosition;
			}
		}
	}

	return result;
}

function parseToken(
	chars: string[],
	startPosition: number
): { token: string; isPhrase: boolean; nextPosition: number } | null {
	let position = startPosition;

	while (position < chars.length && chars[position] === ' ') {
		position++;
	}

	if (position >= chars.length) {
		return null;
	}

	if (chars[position] === '"') {
		return parseQuotedString(chars, position);
	} else {
		return parseUnquotedToken(chars, position);
	}
}

function parseQuotedString(
	chars: string[],
	startPosition: number
): { token: string; isPhrase: boolean; nextPosition: number } | null {
	let position = startPosition + 1;
	let token = '';

	while (position < chars.length && chars[position] !== '"') {
		token += chars[position];
		position++;
	}

	if (position < chars.length && chars[position] === '"') {
		position++;
	}

	return {
		token: token.trim(),
		isPhrase: true,
		nextPosition: position
	};
}

function parseUnquotedToken(
	chars: string[],
	startPosition: number
): { token: string; isPhrase: boolean; nextPosition: number } | null {
	let position = startPosition;
	let token = '';

	while (position < chars.length && chars[position] !== ' ') {
		token += chars[position];
		position++;
	}

	return {
		token: token.trim(),
		isPhrase: false,
		nextPosition: position
	};
}

export function buildPostgresQuery(parsedQuery: ParsedQuery): string {
	const queryParts: string[] = [];

	// Add regular terms
	parsedQuery.terms.forEach((term) => {
		queryParts.push(term);
	});

	// Add exact phrases with quotes
	parsedQuery.exactPhrases.forEach((phrase) => {
		queryParts.push(`"${phrase}"`);
	});

	// Add excluded terms with minus operator (PostgreSQL websearch_to_tsquery supports this)
	parsedQuery.excludedTerms.forEach((term) => {
		queryParts.push(`-${term}`);
	});

	// Add excluded phrases with minus operator and quotes
	parsedQuery.excludedPhrases.forEach((phrase) => {
		queryParts.push(`-"${phrase}"`);
	});

	return queryParts.join(' ');
}
