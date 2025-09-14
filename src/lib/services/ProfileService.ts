import type { ContributionsResponseType } from '../types/user';
import { supabase } from '../supabase';

export class ProfileService {
	async getUserContributions(limit = 10, offset = 0): Promise<ContributionsResponseType> {
		try {
			// Get the current session token
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				throw new Error('No authentication token available');
			}

			const response = await fetch(`/api/profile/contributions?limit=${limit}&offset=${offset}`, {
				method: 'GET',
				credentials: 'include',
				headers: {
					Authorization: `Bearer ${session.access_token}`
				}
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch contributions: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.error('Failed to fetch user contributions:', error);
			throw error;
		}
	}
}

export const profileService = new ProfileService();
