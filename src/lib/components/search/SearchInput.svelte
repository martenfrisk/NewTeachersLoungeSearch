<script lang="ts">
	import { newRandom } from '../../utils';
	import Button from '../ui/Button.svelte';

	interface Props {
		query?: string;
		placeholder?: string;
		disabled?: boolean;
	}

	let {
		query = $bindable(''),
		placeholder = 'Search transcripts...',
		disabled = false
	}: Props = $props();

	let inputElement: HTMLInputElement;

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		query = target.value;
	}

	function handleRandomSearch() {
		const randomQuery = newRandom();
		query = randomQuery;
		inputElement?.focus();
	}

	function handleClear() {
		query = '';
		inputElement?.focus();
	}
</script>

<div class="w-full">
	<label for="search" class="block text-sm font-medium text-gray-700 mb-2"> Search </label>

	<div class="relative">
		<div class="relative">
			<input
				id="search"
				bind:this={inputElement}
				type="text"
				{placeholder}
				{disabled}
				value={query}
				oninput={handleInput}
				class="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
				class:pr-20={query}
			/>

			{#if query}
				<button
					class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
					onclick={handleClear}
					aria-label="Clear search"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}
		</div>

		<div class="mt-2 flex justify-between items-center">
			<Button variant="outline" size="sm" onclick={handleRandomSearch} {disabled}>
				🎲 Random Search
			</Button>

			{#if query}
				<span class="text-sm text-gray-500"> Press Enter or wait to search </span>
			{/if}
		</div>
	</div>
</div>
