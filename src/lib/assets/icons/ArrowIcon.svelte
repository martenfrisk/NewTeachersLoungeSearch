<script lang="ts">
	interface Props {
		class?: string;
		size?: string;
		direction: 'up' | 'down';
	}

	let { class: className = 'w-3 h-3', size, direction }: Props = $props();
	let finalClass = size ? `w-${size} h-${size}` : className;

	const paths = {
		up: 'M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z',
		down: 'M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z'
	};
</script>

<svg class={finalClass} fill="currentColor" viewBox="0 0 20 20">
	<path fill-rule="evenodd" d={paths[direction]} clip-rule="evenodd" />
</svg>
