<script lang="ts">
	interface Props {
		class?: string;
		size?: string;
	}

	let { class: className = 'w-6 h-6', size }: Props = $props();
	let finalClass = size ? `w-${size} h-${size}` : className;
</script>

<svg class={finalClass} fill="currentColor" viewBox="0 0 20 20">
	<path
		fill-rule="evenodd"
		d="M6.267 3.455a1 1 0 011.523-.859l8.485 5.545a1 1 0 010 1.708l-8.485 5.545a1 1 0 01-1.523-.859V3.455z"
		clip-rule="evenodd"
	/>
</svg>
