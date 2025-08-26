import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	audioStore,
	currentTimestamp,
	isPlaying,
	audioProgress,
	formattedCurrentTime,
	formattedDuration
} from './audio';
import type { AudioTimestamp } from '../types/audio';

describe('audio store', () => {
	// Helper function to create mock AudioTimestamp
	const createMockTimestamp = (
		timestamp: string = '00:10:30',
		episode: string = 'Test Episode'
	): AudioTimestamp => ({
		timestamp,
		episode
	});

	beforeEach(() => {
		// Reset the store before each test
		audioStore.reset();
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const state = get(audioStore);

			expect(state).toEqual({
				currentTimestamp: null,
				isPlaying: false,
				currentTime: 0,
				duration: 0,
				volume: 1.0,
				muted: false
			});
		});

		it('should have initial derived store values', () => {
			expect(get(currentTimestamp)).toBe(null);
			expect(get(isPlaying)).toBe(false);
			expect(get(audioProgress)).toBe(0);
			expect(get(formattedCurrentTime)).toBe('0:00');
			expect(get(formattedDuration)).toBe('0:00');
		});
	});

	describe('timestamp management', () => {
		it('should set timestamp correctly', () => {
			const mockTimestamp = createMockTimestamp('00:05:15', 'Episode 101');

			audioStore.setTimestamp(mockTimestamp);

			const state = get(audioStore);
			expect(state.currentTimestamp).toEqual(mockTimestamp);
			expect(get(currentTimestamp)).toEqual(mockTimestamp);
		});

		it('should update timestamp without affecting other state', () => {
			// Set some initial state
			audioStore.play();
			audioStore.setVolume(0.5);
			audioStore.setCurrentTime(60);

			const mockTimestamp = createMockTimestamp();
			audioStore.setTimestamp(mockTimestamp);

			const state = get(audioStore);
			expect(state.currentTimestamp).toEqual(mockTimestamp);
			expect(state.isPlaying).toBe(true);
			expect(state.volume).toBe(0.5);
			expect(state.currentTime).toBe(60);
		});

		it('should handle null timestamp', () => {
			// First set a timestamp
			audioStore.setTimestamp(createMockTimestamp());
			expect(get(currentTimestamp)).not.toBe(null);

			// Then clear it (although not exposed as a method, we can do it internally)
			audioStore.stop(); // This sets currentTimestamp to null
			expect(get(currentTimestamp)).toBe(null);
		});
	});

	describe('playback control actions', () => {
		it('should set playing state to true when play is called', () => {
			expect(get(isPlaying)).toBe(false);

			audioStore.play();

			expect(get(isPlaying)).toBe(true);
			expect(get(audioStore).isPlaying).toBe(true);
		});

		it('should set playing state to false when pause is called', () => {
			audioStore.play();
			expect(get(isPlaying)).toBe(true);

			audioStore.pause();

			expect(get(isPlaying)).toBe(false);
			expect(get(audioStore).isPlaying).toBe(false);
		});

		it('should reset playback state when stop is called', () => {
			// Set up some playback state
			audioStore.setTimestamp(createMockTimestamp());
			audioStore.play();
			audioStore.setCurrentTime(120);

			audioStore.stop();

			const state = get(audioStore);
			expect(state.isPlaying).toBe(false);
			expect(state.currentTime).toBe(0);
			expect(state.currentTimestamp).toBe(null);

			// Other properties should be unchanged
			expect(state.volume).toBe(1.0);
			expect(state.muted).toBe(false);
		});
	});

	describe('time management', () => {
		it('should set current time correctly', () => {
			audioStore.setCurrentTime(95.5);

			const state = get(audioStore);
			expect(state.currentTime).toBe(95.5);
			expect(get(formattedCurrentTime)).toBe('1:35');
		});

		it('should set duration correctly', () => {
			audioStore.setDuration(240.8);

			const state = get(audioStore);
			expect(state.duration).toBe(240.8);
			expect(get(formattedDuration)).toBe('4:00');
		});

		it('should calculate progress correctly', () => {
			audioStore.setDuration(100);
			audioStore.setCurrentTime(25);

			expect(get(audioProgress)).toBe(25);

			audioStore.setCurrentTime(50);
			expect(get(audioProgress)).toBe(50);

			audioStore.setCurrentTime(75);
			expect(get(audioProgress)).toBe(75);
		});

		it('should handle progress calculation with zero duration', () => {
			audioStore.setDuration(0);
			audioStore.setCurrentTime(50);

			expect(get(audioProgress)).toBe(0);
		});

		it('should handle progress calculation with invalid duration', () => {
			audioStore.setDuration(-10);
			audioStore.setCurrentTime(50);

			expect(get(audioProgress)).toBe(0);
		});
	});

	describe('volume management', () => {
		it('should set volume within valid range', () => {
			audioStore.setVolume(0.7);

			const state = get(audioStore);
			expect(state.volume).toBe(0.7);
		});

		it('should clamp volume to minimum value (0)', () => {
			audioStore.setVolume(-0.5);

			const state = get(audioStore);
			expect(state.volume).toBe(0);
		});

		it('should clamp volume to maximum value (1)', () => {
			audioStore.setVolume(1.5);

			const state = get(audioStore);
			expect(state.volume).toBe(1);
		});

		it('should handle edge cases for volume', () => {
			// Test exact boundaries
			audioStore.setVolume(0);
			expect(get(audioStore).volume).toBe(0);

			audioStore.setVolume(1);
			expect(get(audioStore).volume).toBe(1);

			// Test very small numbers
			audioStore.setVolume(0.001);
			expect(get(audioStore).volume).toBe(0.001);

			// Test very large numbers
			audioStore.setVolume(100);
			expect(get(audioStore).volume).toBe(1);
		});
	});

	describe('mute management', () => {
		it('should set muted state directly', () => {
			expect(get(audioStore).muted).toBe(false);

			audioStore.setMuted(true);
			expect(get(audioStore).muted).toBe(true);

			audioStore.setMuted(false);
			expect(get(audioStore).muted).toBe(false);
		});

		it('should toggle muted state', () => {
			expect(get(audioStore).muted).toBe(false);

			audioStore.toggleMute();
			expect(get(audioStore).muted).toBe(true);

			audioStore.toggleMute();
			expect(get(audioStore).muted).toBe(false);

			audioStore.toggleMute();
			expect(get(audioStore).muted).toBe(true);
		});

		it('should not affect volume when muting/unmuting', () => {
			audioStore.setVolume(0.8);

			audioStore.setMuted(true);
			expect(get(audioStore).volume).toBe(0.8);

			audioStore.setMuted(false);
			expect(get(audioStore).volume).toBe(0.8);

			audioStore.toggleMute();
			expect(get(audioStore).volume).toBe(0.8);
		});
	});

	describe('derived store calculations', () => {
		describe('time formatting', () => {
			it('should format seconds correctly', () => {
				audioStore.setCurrentTime(0);
				expect(get(formattedCurrentTime)).toBe('0:00');

				audioStore.setCurrentTime(30);
				expect(get(formattedCurrentTime)).toBe('0:30');

				audioStore.setCurrentTime(60);
				expect(get(formattedCurrentTime)).toBe('1:00');

				audioStore.setCurrentTime(125);
				expect(get(formattedCurrentTime)).toBe('2:05');

				audioStore.setCurrentTime(3661);
				expect(get(formattedCurrentTime)).toBe('61:01');
			});

			it('should format duration correctly', () => {
				audioStore.setDuration(0);
				expect(get(formattedDuration)).toBe('0:00');

				audioStore.setDuration(45);
				expect(get(formattedDuration)).toBe('0:45');

				audioStore.setDuration(90);
				expect(get(formattedDuration)).toBe('1:30');

				audioStore.setDuration(3725);
				expect(get(formattedDuration)).toBe('62:05');
			});

			it('should handle fractional seconds by flooring', () => {
				audioStore.setCurrentTime(65.9);
				expect(get(formattedCurrentTime)).toBe('1:05');

				audioStore.setDuration(125.4);
				expect(get(formattedDuration)).toBe('2:05');
			});

			it('should handle NaN values gracefully', () => {
				audioStore.setCurrentTime(NaN);
				expect(get(formattedCurrentTime)).toBe('0:00');

				audioStore.setDuration(NaN);
				expect(get(formattedDuration)).toBe('0:00');
			});

			it('should pad seconds with leading zero', () => {
				audioStore.setCurrentTime(65); // 1:05
				expect(get(formattedCurrentTime)).toBe('1:05');

				audioStore.setCurrentTime(125); // 2:05
				expect(get(formattedCurrentTime)).toBe('2:05');

				audioStore.setCurrentTime(3605); // 60:05
				expect(get(formattedCurrentTime)).toBe('60:05');
			});
		});

		describe('progress calculation', () => {
			it('should calculate correct progress percentage', () => {
				audioStore.setDuration(200);

				audioStore.setCurrentTime(0);
				expect(get(audioProgress)).toBe(0);

				audioStore.setCurrentTime(50);
				expect(get(audioProgress)).toBe(25);

				audioStore.setCurrentTime(100);
				expect(get(audioProgress)).toBe(50);

				audioStore.setCurrentTime(150);
				expect(get(audioProgress)).toBe(75);

				audioStore.setCurrentTime(200);
				expect(get(audioProgress)).toBe(100);
			});

			it('should handle fractional progress values', () => {
				audioStore.setDuration(300);
				audioStore.setCurrentTime(100);
				expect(get(audioProgress)).toBeCloseTo(33.33, 2);
			});

			it('should handle progress over 100%', () => {
				audioStore.setDuration(100);
				audioStore.setCurrentTime(150);
				expect(get(audioProgress)).toBe(150);
			});
		});
	});

	describe('state reset functionality', () => {
		it('should reset all state to initial values', () => {
			// Set up complex state
			audioStore.setTimestamp(createMockTimestamp('00:15:30', 'Test Episode'));
			audioStore.play();
			audioStore.setCurrentTime(95);
			audioStore.setDuration(240);
			audioStore.setVolume(0.7);
			audioStore.setMuted(true);

			// Verify state was changed
			const stateBefore = get(audioStore);
			expect(stateBefore.currentTimestamp).not.toBe(null);
			expect(stateBefore.isPlaying).toBe(true);
			expect(stateBefore.currentTime).toBe(95);
			expect(stateBefore.duration).toBe(240);
			expect(stateBefore.volume).toBe(0.7);
			expect(stateBefore.muted).toBe(true);

			// Reset
			audioStore.reset();

			// Verify reset to initial state
			const stateAfter = get(audioStore);
			expect(stateAfter).toEqual({
				currentTimestamp: null,
				isPlaying: false,
				currentTime: 0,
				duration: 0,
				volume: 1.0,
				muted: false
			});

			// Verify derived stores are also reset
			expect(get(currentTimestamp)).toBe(null);
			expect(get(isPlaying)).toBe(false);
			expect(get(audioProgress)).toBe(0);
			expect(get(formattedCurrentTime)).toBe('0:00');
			expect(get(formattedDuration)).toBe('0:00');
		});
	});

	describe('store reactivity', () => {
		it('should trigger reactive updates when state changes', () => {
			let updateCount = 0;

			// Subscribe to store to count updates
			const unsubscribe = audioStore.subscribe(() => {
				updateCount++;
			});

			const initialCount = updateCount;

			// Make several state changes
			audioStore.play();
			audioStore.setVolume(0.8);
			audioStore.setCurrentTime(60);

			expect(updateCount).toBeGreaterThan(initialCount);

			unsubscribe();
		});

		it('should have derived stores react to base store changes', () => {
			let progressUpdateCount = 0;
			let timeUpdateCount = 0;

			const unsubscribeProgress = audioProgress.subscribe(() => {
				progressUpdateCount++;
			});

			const unsubscribeTime = formattedCurrentTime.subscribe(() => {
				timeUpdateCount++;
			});

			const initialProgressCount = progressUpdateCount;
			const initialTimeCount = timeUpdateCount;

			// Change duration and current time
			audioStore.setDuration(100);
			audioStore.setCurrentTime(25);

			expect(progressUpdateCount).toBeGreaterThan(initialProgressCount);
			expect(timeUpdateCount).toBeGreaterThan(initialTimeCount);

			unsubscribeProgress();
			unsubscribeTime();
		});
	});

	describe('edge cases and error handling', () => {
		it('should handle negative time values gracefully', () => {
			audioStore.setCurrentTime(-10);
			audioStore.setDuration(-5);

			// Should still set the values (implementation doesn't clamp these)
			expect(get(audioStore).currentTime).toBe(-10);
			expect(get(audioStore).duration).toBe(-5);

			// But derived calculations should handle it gracefully
			expect(get(audioProgress)).toBe(0); // Due to negative or zero duration
		});

		it('should handle extremely large time values', () => {
			const largeTime = 999999999;
			audioStore.setCurrentTime(largeTime);
			audioStore.setDuration(largeTime);

			expect(get(audioStore).currentTime).toBe(largeTime);
			expect(get(audioStore).duration).toBe(largeTime);

			// Progress should still calculate correctly
			expect(get(audioProgress)).toBe(100);
		});

		it('should handle infinity and special number values', () => {
			audioStore.setCurrentTime(Infinity);
			audioStore.setDuration(Infinity);

			// Should set the values
			expect(get(audioStore).currentTime).toBe(Infinity);
			expect(get(audioStore).duration).toBe(Infinity);
		});
	});
});
