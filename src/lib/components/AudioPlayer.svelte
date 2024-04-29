<script lang="ts">
	import ForwardTen from 'lib/icons/ForwardTen.svelte';
	import ReplayTen from 'lib/icons/ReplayTen.svelte';
	import { onMount } from 'svelte';

	export let src: string;
	export let title: string;
	export let currTime: number;
	export let paused = true;

	let time = 0;
	let duration = 0;
	let audioRef: HTMLAudioElement;

	function format(time: number) {
		if (isNaN(time)) return '...';

		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);

		return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
	}

	function handlePointer(
		event: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		const div = event.currentTarget;

		function seek(e: PointerEvent) {
			const { left, width } = div?.getBoundingClientRect();

			let p = (e.clientX - left) / width;
			if (p < 0) p = 0;
			if (p > 1) p = 1;

			time = p * duration;
		}

		seek(event);

		window.addEventListener('pointermove', seek);

		window.addEventListener(
			'pointerup',
			() => {
				window.removeEventListener('pointermove', seek);
			},
			{
				once: true
			}
		);
	}
	onMount(() => {
		if (audioRef) {
			audioRef.addEventListener('loadedmetadata', () => {
				if (currTime) {
					time = currTime + 29; // Set time after ensuring the metadata is loaded
					audioRef.currentTime = time;
					if (!paused) {
						audioRef.play();
					}
				}
			});
		}
	});

	function handleButtonClick() {
		if (paused) {
			audioRef?.play();
			paused = false;
		} else {
			audioRef?.pause();
			paused = true;
		}
	}
</script>

<div
	class="player items-center gap-1 md:gap-4 p-1 md:p-2 bg-white text-gray-600 select-none flex h-10"
>
	<audio {src} bind:currentTime={time} bind:duration bind:this={audioRef} preload="metadata" />
	<!-- bind:paused -->
	<div class="flex md:px-2 md:gap-2">
		<button class="size-5" on:click={() => (time = time - 10)}><ReplayTen /></button>
		<button class="size-5" on:click={() => (time = time + 10)}><ForwardTen /></button>
	</div>
	<!-- on:ended={() => {
    time = 0;
  }} -->

	<button
		class="play bg-blue-700 size-8 md:size-10"
		aria-label={paused ? 'play' : 'pause'}
		on:click={handleButtonClick}
	/>

	<div class="overflow-hidden grow">
		<div class="whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
			<strong>{title}</strong>
		</div>

		<div class="flex items-center gap-2">
			<span class="text-xs">{format(time)}</span>
			<div class="h-2 bg-gray-300 rounded-lg flex-1 overflow-hidden" on:pointerdown={handlePointer}>
				<div
					class="w-[calc(100_*_var(--progress))] h-full bg-blue-500"
					style="--progress: {time / duration}%"
				/>
			</div>
			<span class="text-xs">{duration ? format(duration) : '--:--'}</span>
		</div>
	</div>
</div>

<style>
	/* .player:not(.paused) {
		color: var(--fg-1);
		filter: drop-shadow(0.5em 0.5em 1em rgba(0, 0, 0, 0.1));
	} */

	button.play {
		/* width: 100%; */
		aspect-ratio: 1;
		background-repeat: no-repeat;
		background-position: 50% 50%;
		border-radius: 50%;
	}

	[aria-label='pause'] {
		background-image: url(/src/lib/icons/pause.svg);
	}

	[aria-label='play'] {
		background-image: url(/src/lib/icons/play.svg);
	}
</style>
