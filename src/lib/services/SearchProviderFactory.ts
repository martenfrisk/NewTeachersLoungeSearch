import type { ISearchRepository } from '../repositories/SearchRepository';
import { SupabaseSearchRepository } from '../repositories/SearchRepository';

export class SearchProviderFactory {
	private static supabaseSearchInstance: SupabaseSearchRepository | null = null;

	static async createSearchRepository(): Promise<ISearchRepository> {
		// Only use Supabase search with optimized PostgreSQL FTS
		if (!this.supabaseSearchInstance) {
			this.supabaseSearchInstance = new SupabaseSearchRepository();
		}
		return this.supabaseSearchInstance;
	}

	// For server-side usage - simplified to always use Supabase
	static createSearchRepositoryWithFlag(): ISearchRepository {
		if (!this.supabaseSearchInstance) {
			this.supabaseSearchInstance = new SupabaseSearchRepository();
		}
		return this.supabaseSearchInstance;
	}

	// For testing purposes - allows injecting mock repositories
	static createSearchRepositoryForTesting(repository: ISearchRepository): ISearchRepository {
		return repository;
	}

	// Clear instances (useful for testing)
	static clearInstances(): void {
		this.supabaseSearchInstance = null;
	}
}
