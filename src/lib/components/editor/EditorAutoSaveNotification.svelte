<script lang="ts">
	import Button from '../ui/Button.svelte';

	interface Props {
		show: boolean;
		timestamp: Date | null;
		onLoadAutoSavedData: () => void;
		onDiscardAutoSavedData: () => void;
		onDismiss: () => void;
	}

	let { show, timestamp, onLoadAutoSavedData, onDiscardAutoSavedData, onDismiss }: Props = $props();
</script>

{#if show && timestamp}
	<div class="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
		<div class="flex items-start justify-between">
			<div class="flex items-start">
				<svg
					class="w-5 h-5 text-orange-600 mr-3 mt-0.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
				<div>
					<h3 class="font-medium text-orange-900">Auto-saved changes found</h3>
					<p class="text-sm text-orange-800 mt-1">
						You have unsaved changes from {timestamp.toLocaleDateString()} at {timestamp.toLocaleTimeString()}.
					</p>
				</div>
			</div>
			<button
				onclick={onDismiss}
				class="text-orange-600 hover:text-orange-800 p-1"
				aria-label="Dismiss notification"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
		<div class="mt-3 flex gap-3">
			<Button
				variant="outline"
				size="sm"
				onclick={onLoadAutoSavedData}
				class="bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200"
			>
				Load Changes
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={onDiscardAutoSavedData}
				class="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
			>
				Discard Changes
			</Button>
		</div>
	</div>
{/if}
