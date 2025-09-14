<script lang="ts">
	export type IconName =
		| 'play'
		| 'pause'
		| 'fast-forward'
		| 'rewind'
		| 'replay-ten'
		| 'forward-ten'
		| 'volume-on'
		| 'volume-off'
		| 'close'
		| 'arrow'
		| 'audio'
		| 'clock'
		| 'document'
		| 'episodes'
		| 'search'
		| 'star'
		| 'sync'
		| 'empty-state'
		| 'check'
		| 'check-badge'
		| 'minus'
		| 'minus-circle'
		| 'up-arrow'
		| 'fill'
		| 'stroke';

	interface Props {
		name: IconName;
		size?: number | string;
		class?: string;
		color?: string;
		'aria-label'?: string;
		'aria-hidden'?: boolean;
		onclick?: () => void;
	}

	let {
		name,
		size = 24,
		class: className = '',
		color = 'currentColor',
		'aria-label': ariaLabel,
		'aria-hidden': ariaHidden,
		onclick
	}: Props = $props();

	const sizeValue = typeof size === 'number' ? `${size}px` : size;

	// Icon paths organized by name
	const iconPaths: Record<IconName, string> = {
		play: 'M8 5v14l11-7z',
		pause: 'M6 4h4v16H6V4zm8 0h4v16h-4V4z',
		'fast-forward': 'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z',
		rewind: 'M20 6l-8.5 6L20 18V6zm-9 12V6l-8.5 6L11 18z',
		'replay-ten':
			'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1.93zm6.9-2.54c-.26.81-.64 1.58-1.15 2.25L14 17.5v-1.39L16.9 16.39z',
		'forward-ten':
			'M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6c1.01 0 1.97.25 2.8.7L12 10h9V1l-3.15 3.15C16.17 2.45 14.17 1 12 1 5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11h-2zm-7-6v8l6-4-6-4z',
		'volume-on':
			'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
		'volume-off':
			'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z',
		close:
			'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
		arrow: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
		audio:
			'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z',
		clock:
			'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
		document:
			'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
		episodes:
			'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z',
		search:
			'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
		star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
		sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
		'empty-state':
			'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
		check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
		'check-badge':
			'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
		minus: 'M19 13H5v-2h14v2z',
		'minus-circle': 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
		'up-arrow': 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
		fill: 'M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z',
		stroke:
			'M18.85 10.39l1.06 1.06c.78.78.78 2.05 0 2.83L8.7 25.49c-.78.78-2.05.78-2.83 0L.7 20.32c-.78-.78-.78-2.05 0-2.83L11.91 6.28c.78-.78 2.05-.78 2.83 0l1.06 1.06-1.41 1.41-1.06-1.06c-.39-.39-1.02-.39-1.41 0L.7 18.91c-.39.39-.39 1.02 0 1.41l5.17 5.17c.39.39 1.02.39 1.41 0L18.5 14.28c.39-.39.39-1.02 0-1.41l-1.06-1.06 1.41-1.42z'
	};

	const viewBoxes: Record<IconName, string> = {
		play: '0 0 24 24',
		pause: '0 0 24 24',
		'fast-forward': '0 0 24 24',
		rewind: '0 0 24 24',
		'replay-ten': '0 0 24 24',
		'forward-ten': '0 0 24 24',
		'volume-on': '0 0 24 24',
		'volume-off': '0 0 24 24',
		close: '0 0 24 24',
		arrow: '0 0 24 24',
		audio: '0 0 24 24',
		clock: '0 0 24 24',
		document: '0 0 24 24',
		episodes: '0 0 24 24',
		search: '0 0 24 24',
		star: '0 0 24 24',
		sync: '0 0 24 24',
		'empty-state': '0 0 24 24',
		check: '0 0 24 24',
		'check-badge': '0 0 24 24',
		minus: '0 0 24 24',
		'minus-circle': '0 0 24 24',
		'up-arrow': '0 0 24 24',
		fill: '0 0 24 24',
		stroke: '0 0 26 26'
	};

	const path = iconPaths[name];
	const viewBox = viewBoxes[name];

	if (!path) {
		console.warn(`Icon "${name}" not found`);
	}
</script>

<svg
	class={`icon icon-${name} ${className}`}
	width={sizeValue}
	height={sizeValue}
	{viewBox}
	fill={color}
	{onclick}
	aria-label={ariaLabel || name}
	aria-hidden={ariaHidden}
	role={onclick ? 'button' : 'img'}
	{...onclick ? { tabindex: 0 } : {}}
>
	{#if path}
		<path d={path} />
	{:else}
		<!-- Fallback for missing icons -->
		<rect width="20" height="20" x="2" y="2" fill="none" stroke={color} stroke-width="2" />
		<text x="12" y="16" text-anchor="middle" fill={color} font-size="12">?</text>
	{/if}
</svg>

<style>
	.icon {
		display: inline-block;
		vertical-align: middle;
		flex-shrink: 0;
	}

	.icon[role='button'] {
		cursor: pointer;
		transition: opacity 0.2s ease;
	}

	.icon[role='button']:hover {
		opacity: 0.7;
	}

	.icon[role='button']:focus {
		outline: 2px solid currentColor;
		outline-offset: 2px;
		border-radius: 2px;
	}
</style>
