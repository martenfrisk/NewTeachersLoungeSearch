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
		d="M6 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1zM14 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1z"
		clip-rule="evenodd"
	/>
</svg>
