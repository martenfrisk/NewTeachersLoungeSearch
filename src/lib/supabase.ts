import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

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

export default supabase;
