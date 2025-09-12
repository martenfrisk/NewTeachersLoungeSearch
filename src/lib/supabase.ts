import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { dev } from '$app/environment';

export const supabase = createClient(PUBLIC_SUPABASE_URL ?? '', PUBLIC_SUPABASE_ANON_KEY ?? '', {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true
	},
	global: {
		headers: {
			statement_timeout: '15000' // 15 second timeout - FTS should be much faster
		}
	},
	db: {
		schema: 'public'
	},
	realtime: {
		params: {
			eventsPerSecond: 10
		}
	}
});

// Helper to get the correct redirect URL based on environment
export const getAuthRedirectUrl = (returnTo?: string) => {
	const baseUrl = dev ? 'http://localhost:5173' : window.location.origin;
	return returnTo ? `${baseUrl}${returnTo}` : `${baseUrl}${window.location.pathname}`;
};

export default supabase;
