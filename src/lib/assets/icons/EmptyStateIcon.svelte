<script lang="ts">
	interface Props {
		class?: string;
		size?: string;
	}

	let { class: className = 'w-12 h-12', size }: Props = $props();
	let finalClass = size ? `w-${size} h-${size}` : className;
</script>

<svg class={finalClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
	<path
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
	/>
</svg>
