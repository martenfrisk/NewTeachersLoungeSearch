// Simple flag implementation without external dependencies
// These replace the Vercel flags system for local development

export const useSupabaseSearch = async (): Promise<boolean> => {
	// Always use Supabase search with optimized PostgreSQL FTS
	return true;
};

export const enableUserAuth = async (): Promise<boolean> => {
	// User authentication features
	return false; // Default to disabled
};

export const showEditFeatures = async (): Promise<boolean> => {
	// Transcript editing UI components
	return false; // Default to hidden
};
