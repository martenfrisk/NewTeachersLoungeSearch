/**
 * Application constants
 */

/**
 * Default starting time offset for episodes in seconds.
 * Most episodes have an intro song that lasts approximately 30.29 seconds.
 * This offset is used to synchronize transcript timestamps with actual audio playback.
 * Mini episodes and live episodes may have different starting times.
 */
export const DEFAULT_EPISODE_START_TIME = 30.29;
