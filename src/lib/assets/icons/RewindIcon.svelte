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
		d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"
		clip-rule="evenodd"
	/>
</svg>
