import { useSupabaseSearch } from '$lib/flags';
import type { ISearchRepository } from '../repositories/SearchRepository';
import { MeiliSearchRepository, SupabaseSearchRepository } from '../repositories/SearchRepository';

export class SearchProviderFactory {
	private static meiliSearchInstance: MeiliSearchRepository | null = null;
	private static supabaseSearchInstance: SupabaseSearchRepository | null = null;

	static async createSearchRepository(): Promise<ISearchRepository> {
		// Check feature flag to determine which search provider to use
		const useSupabaseSearchFlag = await useSupabaseSearch();

		if (useSupabaseSearchFlag) {
			// Return Supabase search instance (singleton pattern for efficiency)
			if (!this.supabaseSearchInstance) {
				this.supabaseSearchInstance = new SupabaseSearchRepository();
			}
			return this.supabaseSearchInstance;
		} else {
			// Return MeiliSearch instance (default)
			if (!this.meiliSearchInstance) {
				this.meiliSearchInstance = new MeiliSearchRepository();
			}
			return this.meiliSearchInstance;
		}
	}

	// For server-side usage where we can pass the flag value directly
	static createSearchRepositoryWithFlag(useSupabaseSearch: boolean): ISearchRepository {
		if (useSupabaseSearch) {
			if (!this.supabaseSearchInstance) {
				this.supabaseSearchInstance = new SupabaseSearchRepository();
			}
			return this.supabaseSearchInstance;
		} else {
			if (!this.meiliSearchInstance) {
				this.meiliSearchInstance = new MeiliSearchRepository();
			}
			return this.meiliSearchInstance;
		}
	}

	// For testing purposes - allows injecting mock repositories
	static createSearchRepositoryForTesting(repository: ISearchRepository): ISearchRepository {
		return repository;
	}

	// Clear instances (useful for testing)
	static clearInstances(): void {
		this.meiliSearchInstance = null;
		this.supabaseSearchInstance = null;
	}
}
