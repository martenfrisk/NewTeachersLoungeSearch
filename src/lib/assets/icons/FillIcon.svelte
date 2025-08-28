<script lang="ts">
	interface Props {
		class?: string;
		size?: string;
		path: string;
		viewBox?: string;
	}

	let { class: className = 'w-4 h-4', size, path, viewBox = '0 0 20 20' }: Props = $props();
	let finalClass = size ? `w-${size} h-${size}` : className;
</script>

<svg class={finalClass} fill="currentColor" {viewBox}>
	<path fill-rule="evenodd" d={path} clip-rule="evenodd" />
</svg>
