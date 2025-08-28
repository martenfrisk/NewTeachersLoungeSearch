<script lang="ts">
	interface Props {
		class?: string;
		size?: string;
	}

	let { class: className = 'w-4 h-4', size }: Props = $props();
	let finalClass = size ? `w-${size} h-${size}` : className;
</script>

<svg class={finalClass} fill="currentColor" viewBox="0 0 20 20">
	<path
		fill-rule="evenodd"
		d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.707 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.707l3.676-3.776a1 1 0 011 .076zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
		clip-rule="evenodd"
	/>
</svg>
