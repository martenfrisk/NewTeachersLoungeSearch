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
		d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.707 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.707l3.676-3.776a1 1 0 011 .076zM12 8a1 1 0 011.414 0C14.732 9.318 15.5 10.556 15.5 12s-.768 2.682-2.086 4a1 1 0 11-1.414-1.414C12.732 13.864 13.5 12.993 13.5 12s-.768-1.864-1.5-2.586A1 1 0 0112 8z"
		clip-rule="evenodd"
	/>
</svg>
