<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
		color?: string;
	}

	let { size = 'md', color = 'blue-600' }: Props = $props();

	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-8 h-8',
		lg: 'w-12 h-12'
	};
</script>

<div
	class="animate-spin rounded-full border-2 border-t-transparent {sizeClasses[size]} border-{color}"
	role="status"
	aria-label="Loading"
>
	<span class="sr-only">Loading...</span>
</div>
