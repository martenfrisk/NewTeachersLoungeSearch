<script lang="ts">
	interface Props {
		class?: string;
		size?: string;
		path: string;
	}

	let { class: className = 'w-8 h-8', size, path }: Props = $props();
	let finalClass = size ? `w-${size} h-${size}` : className;
</script>

<svg class={finalClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={path} />
</svg>
