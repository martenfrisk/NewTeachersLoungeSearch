<script lang="ts">
	import { audioStore } from '../../stores/audio';
	import { audioService } from '../../services/AudioService';
	import Button from '../ui/Button.svelte';
	import CloseIcon from 'lib/assets/icons/CloseIcon.svelte';
	import RewindIcon from 'lib/assets/icons/RewindIcon.svelte';
	import PlayIcon from 'lib/assets/icons/PlayIcon.svelte';
	import PauseIcon from 'lib/assets/icons/PauseIcon.svelte';
	import FastForwardIcon from 'lib/assets/icons/FastForwardIcon.svelte';
	import VolumeOffIcon from 'lib/assets/icons/VolumeOffIcon.svelte';
	import VolumeOnIcon from 'lib/assets/icons/VolumeOnIcon.svelte';
	import SyncIcon from 'lib/assets/icons/SyncIcon.svelte';
	import { page } from '$app/state';

	interface Props {
		currEpTitle?: string;
	}

	let { currEpTitle = '' }: Props = $props();

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

	function handleSyncToggle() {
		audioStore.toggleSync();
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

	function handleErrorDismiss() {
		audioStore.clearError();
	}

	function formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}

	let syncEnabled = $derived(page.route.id === '/ep/[id]');
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
			<CloseIcon />
		</Button>

		<!-- Error Message -->
		{#if audioState.error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 pr-8">
				<div class="flex items-start">
					<div class="flex-shrink-0">
						<svg class="h-4 w-4 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-2 flex-1">
						<p class="text-sm text-red-800">{audioState.error}</p>
					</div>
					<button
						onclick={handleErrorDismiss}
						class="ml-2 flex-shrink-0 text-red-400 hover:text-red-600"
						aria-label="Dismiss error"
					>
						<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path
								d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
							/>
						</svg>
					</button>
				</div>
			</div>
		{/if}

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
					<RewindIcon />
				</Button>

				<!-- Play/Pause -->
				<Button
					variant="primary"
					onclick={handlePlayPause}
					aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
				>
					{#if audioState.isPlaying}
						<PauseIcon />
					{:else}
						<PlayIcon />
					{/if}
				</Button>

				<!-- Fast Forward -->
				<Button
					variant="ghost"
					size="sm"
					onclick={handleFastForward}
					aria-label="Fast forward 10 seconds"
				>
					<FastForwardIcon />
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
							<VolumeOffIcon />
						{:else}
							<VolumeOnIcon />
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

			<!-- Sync Controls Row -->
			{#if syncEnabled}
				<div class="flex items-center justify-center mt-2">
					<label class="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
						<input
							type="checkbox"
							checked={audioState.syncEnabled}
							onchange={handleSyncToggle}
							class="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
						/>
						<span>Sync to lines</span>
						{#if audioState.syncEnabled}
							<SyncIcon class="w-3 h-3 text-blue-600" />
						{/if}
					</label>
				</div>
			{/if}
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
