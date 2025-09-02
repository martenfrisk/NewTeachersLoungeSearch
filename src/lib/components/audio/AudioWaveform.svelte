<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { audioStore } from '../../stores/audio';
	import WaveSurfer from 'wavesurfer.js';
	import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js';

	interface Props {
		height?: number;
	}

	let { height = 80 }: Props = $props();

	let containerRef: HTMLDivElement;
	let wavesurfer: WaveSurfer | null = null;

	const audioState = $derived($audioStore);

	function initializeWaveform() {
		if (!containerRef) return;

		try {
			wavesurfer = WaveSurfer.create({
				container: containerRef,
				height,
				waveColor: '#d1d5db',
				progressColor: '#3b82f6',
				cursorColor: '#ef4444',
				cursorWidth: 2,
				// interact: false,
				// autoCenter: true,
				// autoScroll: true
				minPxPerSec: 200 // Start with a good zoom level
			});

			// Initialize the Zoom plugin
			wavesurfer.registerPlugin(
				ZoomPlugin.create({
					// the amount of zoom per wheel step, e.g. 0.5 means a 50% magnification per scroll
					scale: 0.5,
					// Optionally, specify the maximum pixels-per-second factor while zooming
					maxZoom: 100
				})
			);

			wavesurfer.on('ready', () => {
				// Sync initial position if we have a current time
				if (audioState.currentTime > 0 && audioState.duration > 0) {
					const progress = audioState.currentTime / audioState.duration;
					wavesurfer?.seekTo(progress);
				}
			});

			// Load audio URL if available
			if (audioState.url) {
				wavesurfer.load(audioState.url);
			}
		} catch (error) {
			console.error('Failed to initialize waveform:', error);
		}
	}

	// Progress sync with throttling to avoid conflicts with zoom
	let lastSyncTime = $state(0);
	$effect(() => {
		if (wavesurfer && audioState.duration > 0) {
			// Only sync if time has changed by more than 0.1 seconds to reduce updates
			if (Math.abs(audioState.currentTime - lastSyncTime) > 0.1) {
				const progress = audioState.currentTime / audioState.duration;
				console.log('Syncing waveform progress:', audioState.currentTime, 'progress:', progress);
				wavesurfer.seekTo(progress);
				lastSyncTime = audioState.currentTime;
			}
		}
	});

	// Load new audio when URL changes
	$effect(() => {
		if (wavesurfer && audioState.url) {
			wavesurfer.load(audioState.url);
		}
	});

	onMount(initializeWaveform);

	onDestroy(() => {
		wavesurfer?.destroy();
	});
</script>

<div class="waveform-container">
	<div bind:this={containerRef} class="waveform-display"></div>
</div>

<style>
	.waveform-container {
		background: white;
		border-radius: 6px;
		padding: 8px;
		margin: 8px 0;
	}

	.waveform-display {
		border-radius: 4px;
		overflow: hidden;
		cursor: pointer;
	}

	:global(.wavesurfer-region) {
		border-radius: 2px;
	}
</style>
