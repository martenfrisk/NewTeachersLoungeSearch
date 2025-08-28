export interface SearchHitType {
	id: string;
	season: string;
	time: string;
	speaker: string;
	line: string;
	episode: string;
	edited: boolean;
	_formatted: FormattedHit;
}

export interface FormattedHit {
	id: string;
	season: string;
	time: string;
	speaker: string;
	line: string;
	episode: string;
	edited: boolean;
}

export interface SearchResult {
	hits: SearchHitType[];
	offset: number;
	limit: number;
	estimatedTotalHits: number;
	processingTimeMs: number;
	query: string;
	facetDistribution?: FacetDistribution;
}

export interface FacetDistribution {
	[key: string]: {
		[key: string]: number;
	};
}

export interface SearchStats {
	estimatedTotalHits: number;
	processingTime: number;
	facets: SearchFacet[];
}

export interface SearchFacet {
	facetName: string;
	facetHits: FacetHit[];
}

export interface FacetHit {
	ep: string;
	hits: number;
}

export interface SearchParams {
	query: string;
	filter: string[];
	offset: number;
	limit?: number;
	editedOnly: boolean;
}

export interface SearchState {
	query: string;
	hits: SearchHitType[];
	stats: SearchStats | null;
	loading: boolean;
	error: string | null;
	hasMore: boolean;
}

export interface SearchFilters {
	seasons: string[];
	episodes: string[];
	editedOnly: boolean;
}

export interface HitStats {
	estimatedTotalHits: number;
	processingTime: number;
	facets: SearchFacet[];
}
