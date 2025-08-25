<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		audioStore,
		currentTimestamp,
		isPlaying,
		audioProgress,
		formattedCurrentTime,
		formattedDuration
	} from '../../stores/audio';
	import { audioService } from '../../services/AudioService';
	import Button from '../ui/Button.svelte';

	interface Props {
		src?: string;
		currTime?: number;
		currEpTitle?: string;
	}

	let { src = '', currTime = 0, currEpTitle = '' }: Props = $props();

	let progressBar: HTMLInputElement;
	let volumeSlider: HTMLInputElement;

	// Local reactive values from stores
	let playing = $state(false);
	let progress = $state(0);
	let currentTimeFormatted = $state('0:00');
	let durationFormatted = $state('0:00');
	let volume = $state(1.0);
	let muted = $state(false);

	// Subscribe to audio store changes
	let unsubscribeAudio: (() => void) | undefined;
	let unsubscribeProgress: (() => void) | undefined;
	let unsubscribeCurrentTime: (() => void) | undefined;
	let unsubscribeDuration: (() => void) | undefined;

	onMount(() => {
		// Subscribe to store changes
		unsubscribeAudio = isPlaying.subscribe((value) => (playing = value));
		unsubscribeProgress = audioProgress.subscribe((value) => (progress = value));
		unsubscribeCurrentTime = formattedCurrentTime.subscribe(
			(value) => (currentTimeFormatted = value)
		);
		unsubscribeDuration = formattedDuration.subscribe((value) => (durationFormatted = value));
	});

	onDestroy(() => {
		// Clean up subscriptions
		unsubscribeAudio?.();
		unsubscribeProgress?.();
		unsubscribeCurrentTime?.();
		unsubscribeDuration?.();
	});

	function handlePlayPause() {
		if (playing) {
			audioService.pause();
		} else {
			audioService.play();
		}
	}

	function handleStop() {
		audioService.stop();
	}

	function handleSeek(event: Event) {
		const target = event.target as HTMLInputElement;
		const percentage = parseFloat(target.value);
		const duration = audioStore.subscribe((state) => state.duration);

		// Calculate the new time position
		let newTime = 0;
		const unsubscribe = audioStore.subscribe((state) => {
			newTime = (percentage / 100) * state.duration;
		});
		unsubscribe();

		audioService.seek(newTime);
	}

	function handleVolumeChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newVolume = parseFloat(target.value) / 100;
		audioService.setVolume(newVolume);
		volume = newVolume;
	}

	function handleMuteToggle() {
		const newMuted = !muted;
		audioService.setMuted(newMuted);
		muted = newMuted;
	}

	function handleRewind() {
		let currentTime = 0;
		const unsubscribe = audioStore.subscribe((state) => {
			currentTime = state.currentTime;
		});
		unsubscribe();

		audioService.seek(Math.max(0, currentTime - 10));
	}

	function handleFastForward() {
		let currentTime = 0;
		let duration = 0;
		const unsubscribe = audioStore.subscribe((state) => {
			currentTime = state.currentTime;
			duration = state.duration;
		});
		unsubscribe();

		audioService.seek(Math.min(duration, currentTime + 10));
	}
</script>

<div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
	<div class="max-w-6xl mx-auto">
		<!-- Episode Info -->
		{#if currEpTitle}
			<div class="text-center mb-2">
				<h3 class="text-sm font-medium text-gray-900 truncate">
					{currEpTitle}
				</h3>
			</div>
		{/if}

		<!-- Progress Bar -->
		<div class="mb-4">
			<input
				bind:this={progressBar}
				type="range"
				min="0"
				max="100"
				value={progress}
				oninput={handleSeek}
				class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
			/>
			<div class="flex justify-between text-xs text-gray-500 mt-1">
				<span>{currentTimeFormatted}</span>
				<span>{durationFormatted}</span>
			</div>
		</div>

		<!-- Controls -->
		<div class="flex items-center justify-center space-x-4">
			<!-- Rewind -->
			<Button variant="ghost" size="sm" onclick={handleRewind}>
				<!-- aria-label="Rewind 10 seconds" -->
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M15.707 4.293a1 1 0 010 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="text-xs">-10</span>
			</Button>

			<!-- Play/Pause -->
			<Button variant="primary" onclick={handlePlayPause} aria-label={playing ? 'Pause' : 'Play'}>
				{#if playing}
					<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M6 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1zM14 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M6.267 3.455a1 1 0 011.523-.859l8.485 5.545a1 1 0 010 1.708l-8.485 5.545a1 1 0 01-1.523-.859V3.455z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</Button>

			<!-- Stop -->
			<Button variant="ghost" size="sm" onclick={handleStop} aria-label="Stop">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M6 4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2H6z"
						clip-rule="evenodd"
					/>
				</svg>
			</Button>

			<!-- Fast Forward -->
			<Button
				variant="ghost"
				size="sm"
				onclick={handleFastForward}
				aria-label="Fast forward 10 seconds"
			>
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 111.414-1.414L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="text-xs">+10</span>
			</Button>

			<!-- Volume Control -->
			<div class="flex items-center space-x-2 ml-8">
				<Button
					variant="ghost"
					size="sm"
					onclick={handleMuteToggle}
					aria-label={muted ? 'Unmute' : 'Mute'}
				>
					{#if muted || volume === 0}
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.707 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.707l3.676-3.776a1 1 0 011 .076zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.707 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.707l3.676-3.776a1 1 0 011 .076zM12 8a1 1 0 011.414 0C14.732 9.318 15.5 10.556 15.5 12s-.768 2.682-2.086 4a1 1 0 11-1.414-1.414C12.732 13.864 13.5 12.993 13.5 12s-.768-1.864-1.5-2.586A1 1 0 0112 8z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</Button>
				<input
					bind:this={volumeSlider}
					type="range"
					min="0"
					max="100"
					value={volume * 100}
					oninput={handleVolumeChange}
					class="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.slider::-webkit-slider-thumb {
		appearance: none;
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background: #2563eb;
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background: #2563eb;
		cursor: pointer;
		border: none;
	}
</style>
