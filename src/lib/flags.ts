// Simple flag implementation without external dependencies
// These replace the Vercel flags system for local development

export const useSupabaseSearch = async (): Promise<boolean> => {
	// For local development, just return false to use MeiliSearch
	// In production, this could read from environment variables or other config
	return true; // Change to true to enable Supabase search
};

export const enableUserAuth = async (): Promise<boolean> => {
	// User authentication features
	return false; // Default to disabled
};

export const showEditFeatures = async (): Promise<boolean> => {
	// Transcript editing UI components
	return false; // Default to hidden
};
