<script lang="ts">
	import { audioStore } from '../../stores/audio';
	import { audioService } from '../../services/AudioService';
	import Button from '../ui/Button.svelte';

	interface Props {
		currEpTitle?: string;
	}

	let { currEpTitle = '' }: Props = $props();

	// Direct access to reactive stores - no need for additional derived computations
	const audioState = $derived($audioStore);

	let progressBar: HTMLInputElement;
	let volumeSlider: HTMLInputElement;

	function handlePlayPause() {
		if (audioState.isPlaying) {
			audioService.pause();
		} else {
			audioService.play();
		}
	}

	function handleSeek(event: Event) {
		const target = event.target as HTMLInputElement;
		const percentage = parseFloat(target.value);
		const newTime = (percentage / 100) * audioState.duration;
		audioService.seek(newTime);
	}

	function handleVolumeChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newVolume = parseFloat(target.value) / 100;
		audioService.setVolume(newVolume);
	}

	function handleMuteToggle() {
		const newMuted = !audioState.muted;
		audioService.setMuted(newMuted);
	}

	function handleRewind() {
		audioService.seek(Math.max(0, audioState.currentTime - 10));
	}

	function handleFastForward() {
		audioService.seek(Math.min(audioState.duration, audioState.currentTime + 10));
	}

	function handleClose() {
		audioService.stop();
		audioStore.reset();
	}

	function formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
	<div class="max-w-6xl mx-auto p-3 sm:p-4 relative">
		<!-- Close Button -->
		<Button
			variant="ghost"
			size="sm"
			onclick={handleClose}
			aria-label="Close audio player"
			class="absolute top-2 right-2 sm:top-3 sm:right-3 p-1"
		>
			<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
		</Button>

		<!-- Episode Info -->
		{#if currEpTitle}
			<div class="text-center mb-2 pr-8">
				<h3 class="text-xs sm:text-sm font-medium text-gray-900 truncate px-2">
					{currEpTitle}
				</h3>
			</div>
		{/if}

		<!-- Progress Bar -->
		<div class="mb-3">
			<input
				bind:this={progressBar}
				type="range"
				min="0"
				max="100"
				value={audioState.duration > 0 ? (audioState.currentTime / audioState.duration) * 100 : 0}
				oninput={handleSeek}
				class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
			/>
			<div class="flex justify-between text-xs text-gray-500 mt-1 px-1">
				<span>{formatTime(audioState.currentTime)}</span>
				<span>{formatTime(audioState.duration)}</span>
			</div>
		</div>

		<!-- Mobile-Optimized Controls -->
		<div class="space-y-2">
			<!-- Primary Controls Row -->
			<div class="flex items-center justify-center space-x-1 sm:space-x-3">
				<!-- Rewind -->
				<Button variant="ghost" size="sm" onclick={handleRewind} aria-label="Rewind 10 seconds">
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"
							clip-rule="evenodd"
						/>
					</svg>
				</Button>

				<!-- Play/Pause -->
				<Button
					variant="primary"
					onclick={handlePlayPause}
					aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
				>
					{#if audioState.isPlaying}
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

				<!-- Fast Forward -->
				<Button
					variant="ghost"
					size="sm"
					onclick={handleFastForward}
					aria-label="Fast forward 10 seconds"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M11.555 5.168A1 1 0 0010 6v2.798L4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z"
							clip-rule="evenodd"
						/>
					</svg>
				</Button>

				<!-- Volume Control -->
				<div class="flex items-center space-x-1 sm:space-x-2 ml-2">
					<Button
						variant="ghost"
						size="sm"
						onclick={handleMuteToggle}
						aria-label={audioState.muted ? 'Unmute' : 'Mute'}
					>
						{#if audioState.muted || audioState.volume === 0}
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.707 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.707l3.676-3.776a1 1 0 011 .076zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						{:else}
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
						value={audioState.volume * 100}
						oninput={handleVolumeChange}
						class="w-12 sm:w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
					/>
				</div>
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
