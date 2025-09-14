// Type definitions for Supabase integration

export interface SupabaseSearchResultType {
	id: string;
	season: string;
	timestamp_str: string;
	speaker: string;
	line: string;
	episode: string;
	edited: boolean;
	total_count?: number;
}

export interface SupabaseFacetResultType {
	facet_type: string;
	facet_value: string;
	count: number;
}

export interface SupabaseRpcResponse<T> {
	data: T | null;
	error: SupabaseError | null;
}

export interface SupabaseError {
	message: string;
	details?: string;
	hint?: string;
	code?: string;
}

export interface SupabaseSearchParams {
	search_query: string;
	season_filter: string[] | null;
	episode_filter: string[] | null;
	edited_only_filter: boolean;
	limit_count: number;
	offset_count: number;
}

export interface SupabaseFacetParams {
	search_query: string;
	edited_only_filter: boolean;
}

// Type-safe Supabase client interface
export interface TypedSupabaseClient {
	rpc(
		fnName: 'optimized_search_transcripts',
		args: SupabaseSearchParams
	): Promise<SupabaseRpcResponse<SupabaseSearchResultType[]>>;

	rpc(
		fnName: 'optimized_search_facets',
		args: SupabaseFacetParams
	): Promise<SupabaseRpcResponse<SupabaseFacetResultType[]>>;
}
