<script lang="ts">
	import LoadingSpinner from './LoadingSpinner.svelte';

	interface Props {
		message?: string;
		size?: 'sm' | 'md' | 'lg';
		fullScreen?: boolean;
		overlay?: boolean;
		showSpinner?: boolean;
		class?: string;
	}

	let {
		message = 'Loading...',
		size = 'md',
		fullScreen = false,
		overlay = false,
		showSpinner = true,
		class: className = ''
	}: Props = $props();

	// Size classes
	let containerClasses = $derived(() => {
		const baseClasses = 'flex items-center justify-center';
		const sizeClasses = {
			sm: 'p-4',
			md: 'p-8',
			lg: 'p-12'
		};

		let classes = `${baseClasses} ${sizeClasses[size]} ${className}`;

		if (fullScreen) {
			classes += ' min-h-screen bg-gray-50';
		}

		if (overlay) {
			classes += ' fixed inset-0 bg-black bg-opacity-50 z-50';
		}

		return classes;
	});

	let textClasses = $derived(() => {
		const sizeClasses = {
			sm: 'text-sm',
			md: 'text-base',
			lg: 'text-lg'
		};

		let classes = `text-gray-600 ${sizeClasses[size]}`;

		if (overlay) {
			classes = 'text-white';
		}

		return classes;
	});
</script>

<div class={containerClasses()}>
	{#if overlay}
		<div class="bg-white rounded-lg p-8 shadow-lg">
			<div class="flex items-center justify-center">
				{#if showSpinner}
					<LoadingSpinner />
					<span class="ml-3 text-gray-600">{message}</span>
				{:else}
					<span class="text-gray-600">{message}</span>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex items-center">
			{#if showSpinner}
				<LoadingSpinner />
				<span class={`ml-3 ${textClasses()}`}>{message}</span>
			{:else}
				<span class={textClasses()}>{message}</span>
			{/if}
		</div>
	{/if}
</div>
