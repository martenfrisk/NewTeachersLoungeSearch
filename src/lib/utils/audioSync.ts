import type { ProcessedTranscriptLine } from '../types/episode';

/**
 * Converts a time string in format "H:MM:SS" to total seconds
 */
export function timeStringToSeconds(timeString: string): number {
	const parts = timeString.split(':').map(Number);

	if (parts.length === 3) {
		return parts[0] * 3600 + parts[1] * 60 + parts[2];
	} else if (parts.length === 2) {
		return parts[0] * 60 + parts[1];
	}

	return 0;
}

/**
 * Finds the transcript line that matches the current playback time
 * Uses binary search for performance with large transcripts
 */
export function findCurrentTranscriptLine(
	transcript: ProcessedTranscriptLine[],
	currentPlaybackTime: string,
	bufferSeconds: number = 2
): ProcessedTranscriptLine | null {
	if (!transcript.length || !currentPlaybackTime) return null;

	const currentSeconds = timeStringToSeconds(currentPlaybackTime);

	// Binary search to find the closest timestamp
	let left = 0;
	let right = transcript.length - 1;
	let bestMatch: ProcessedTranscriptLine | null = null;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		const line = transcript[mid];
		const lineSeconds = timeStringToSeconds(line.time);

		// If we find an exact match or close enough match
		if (Math.abs(lineSeconds - currentSeconds) <= bufferSeconds) {
			bestMatch = line;

			// Continue searching for a closer match
			if (lineSeconds < currentSeconds) {
				left = mid + 1;
			} else if (lineSeconds > currentSeconds) {
				right = mid - 1;
			} else {
				break; // Exact match
			}
		} else if (lineSeconds < currentSeconds) {
			left = mid + 1;
			// Keep this as a potential match if it's close
			if (currentSeconds - lineSeconds <= bufferSeconds) {
				bestMatch = line;
			}
		} else {
			right = mid - 1;
		}
	}

	// If no close match found, find the most recent line that has passed
	if (!bestMatch && transcript.length > 0) {
		for (let i = transcript.length - 1; i >= 0; i--) {
			const lineSeconds = timeStringToSeconds(transcript[i].time);
			if (lineSeconds <= currentSeconds) {
				bestMatch = transcript[i];
				break;
			}
		}
	}

	return bestMatch;
}

/**
 * Throttle function to limit how often sync updates occur
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (this: any, ...args: Parameters<T>) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
	try {
		if (typeof window === 'undefined') return false;
		const test = '__localStorage_test__';
		window.localStorage.setItem(test, test);
		window.localStorage.removeItem(test);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get sync preference from localStorage
 */
export function getSyncPreference(): boolean {
	if (!isLocalStorageAvailable()) return false;

	const stored = window.localStorage.getItem('audioSyncEnabled');
	return stored ? JSON.parse(stored) : false;
}

/**
 * Save sync preference to localStorage
 */
export function setSyncPreference(enabled: boolean): void {
	if (!isLocalStorageAvailable()) return;

	window.localStorage.setItem('audioSyncEnabled', JSON.stringify(enabled));
}

/**
 * Converts transcript timestamp back to audio seconds (adding the intro offset)
 */
export function transcriptTimeToAudioSeconds(transcriptTime: string, startingTime: number): number {
	const transcriptSeconds = timeStringToSeconds(transcriptTime);
	return transcriptSeconds + startingTime; // Add back the intro offset
}
