<script lang="ts">
	import type { SpeakerType } from '$lib/types/editor';
	import { focusOnMount } from './focus-management';
	import Button from '../ui/Button.svelte';

	interface Props {
		speakers: SpeakerType[];
		/** Lines per speaker, keyed by the stored `speaker` value. */
		counts: Map<string, number>;
		/** Returns how many lines changed. */
		onRename: (from: string, to: string) => number;
		onAddSpeaker: (name: string) => void;
		onRemoveSpeaker: (id: string) => void;
		onSelectSpeaker: (name: string) => void;
		/** Present while the last rename can still be put back. */
		pendingUndo: { from: string; to: string; indices: number[] } | null;
		onUndoRename: () => void;
	}

	let {
		speakers,
		counts,
		onRename,
		onAddSpeaker,
		onRemoveSpeaker,
		onSelectSpeaker,
		pendingUndo,
		onUndoRename
	}: Props = $props();

	let renamingId = $state<string | null>(null);
	let renameTo = $state('');
	let showAddForm = $state(false);
	let newSpeakerName = $state('');

	const DATALIST_ID = 'speaker-roster-names';

	function startRename(speaker: SpeakerType) {
		renamingId = speaker.id;
		// Blank rather than prefilled: the whole point is typing a different name,
		// and prefilling means selecting the old one first every time.
		renameTo = '';
	}

	function cancelRename() {
		renamingId = null;
		renameTo = '';
	}

	function confirmRename(speaker: SpeakerType) {
		const to = renameTo.trim();
		if (!to || to === speaker.name) {
			cancelRename();
			return;
		}
		onRename(speaker.name, to);
		cancelRename();
	}

	function handleRenameKeydown(event: KeyboardEvent, speaker: SpeakerType) {
		event.stopPropagation();
		if (event.key === 'Enter') {
			event.preventDefault();
			confirmRename(speaker);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelRename();
		}
	}

	function handleAdd() {
		const name = newSpeakerName.trim();
		if (name) onAddSpeaker(name);
		newSpeakerName = '';
		showAddForm = false;
	}

	const lineCount = (speaker: SpeakerType) => counts.get(speaker.name) ?? 0;

	/**
	 * Only a guest nobody is using can be removed. Removing a speaker that lines
	 * reference does not remove those lines, it just drops the label from the
	 * roster - and previously it also crashed the transcript when the entry
	 * removed was the "Unknown" one everything fell back to.
	 */
	const canRemove = (speaker: SpeakerType) =>
		speaker.origin === 'custom' && lineCount(speaker) === 0;

	// Renaming to a name already present merges the two, which is how two
	// diarization labels for one person get combined - worth saying out loud.
	let renameTargetExists = $derived(
		renameTo.trim().length > 0 &&
			speakers.some(
				(s) => s.name.trim().toLowerCase() === renameTo.trim().toLowerCase() && s.id !== renamingId
			)
	);
</script>

<datalist id={DATALIST_ID}>
	{#each speakers as speaker (speaker.id)}
		<option value={speaker.name} label={speaker.displayName}></option>
	{/each}
</datalist>

<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
	<div class="p-4 border-b border-gray-200">
		<h3 class="font-medium text-gray-900">Speakers</h3>
		<p class="text-xs text-gray-600 mt-1">
			Rename a speaker to relabel every one of their lines at once.
		</p>
	</div>

	{#if pendingUndo}
		<div
			class="mx-4 mt-3 flex items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2"
		>
			<span class="text-xs text-amber-900">
				Renamed {pendingUndo.indices.length} line{pendingUndo.indices.length === 1 ? '' : 's'} to "{pendingUndo.to}"
			</span>
			<button onclick={onUndoRename} class="text-xs font-medium text-amber-900 underline">
				Undo
			</button>
		</div>
	{/if}

	<ul class="p-2 space-y-1">
		{#each speakers as speaker (speaker.id)}
			{@const count = lineCount(speaker)}
			<li class="rounded px-2 py-1.5 hover:bg-gray-50">
				<div class="flex items-center gap-2">
					<button
						class="flex min-w-0 flex-1 items-center gap-2 text-left"
						onclick={() => count > 0 && onSelectSpeaker(speaker.name)}
						disabled={count === 0}
						title={count > 0 ? `Select all ${count} lines` : 'Not in this episode'}
					>
						<span class={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${speaker.color}`}
						></span>
						<span class="truncate text-sm text-gray-900">{speaker.displayName}</span>
						<span class="ml-auto flex-shrink-0 text-xs text-gray-500">
							{count === 0 ? '—' : `${count} line${count === 1 ? '' : 's'}`}
						</span>
					</button>

					<button
						onclick={() => startRename(speaker)}
						class="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800"
						title="Rename every line by this speaker"
					>
						Rename
					</button>

					{#if canRemove(speaker)}
						<button
							onclick={() => onRemoveSpeaker(speaker.id)}
							class="flex-shrink-0 text-xs text-gray-400 hover:text-red-600"
							aria-label={`Remove ${speaker.displayName}`}
						>
							×
						</button>
					{/if}
				</div>

				{#if renamingId === speaker.id}
					<div class="mt-2 space-y-2 pl-4">
						<input
							type="text"
							list={DATALIST_ID}
							bind:value={renameTo}
							onkeydown={(e) => handleRenameKeydown(e, speaker)}
							placeholder="New name, e.g. Todd"
							aria-label={`New name for ${speaker.displayName}`}
							class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							use:focusOnMount
						/>
						{#if renameTargetExists}
							<p class="text-xs text-amber-700">
								"{renameTo.trim()}" already exists — these lines will be merged into them.
							</p>
						{/if}
						<div class="flex gap-2">
							<Button
								size="sm"
								variant="primary"
								onclick={() => confirmRename(speaker)}
								disabled={!renameTo.trim()}
								class="text-xs"
							>
								{#if renameTo.trim()}
									Rename {count} line{count === 1 ? '' : 's'} → "{renameTo.trim()}"
								{:else}
									Rename
								{/if}
							</Button>
							<Button size="sm" variant="outline" onclick={cancelRename} class="text-xs">
								Cancel
							</Button>
						</div>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<div class="border-t border-gray-200 p-3">
		{#if showAddForm}
			<div class="space-y-2">
				<input
					type="text"
					bind:value={newSpeakerName}
					onkeydown={(e) => {
						e.stopPropagation();
						if (e.key === 'Enter') handleAdd();
						if (e.key === 'Escape') {
							showAddForm = false;
							newSpeakerName = '';
						}
					}}
					placeholder="Guest name"
					aria-label="New speaker name"
					class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					use:focusOnMount
				/>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant="primary"
						onclick={handleAdd}
						disabled={!newSpeakerName.trim()}
						class="text-xs">Add</Button
					>
					<Button
						size="sm"
						variant="outline"
						onclick={() => {
							showAddForm = false;
							newSpeakerName = '';
						}}
						class="text-xs">Cancel</Button
					>
				</div>
			</div>
		{:else}
			<button
				onclick={() => (showAddForm = true)}
				class="text-xs text-blue-600 hover:text-blue-800"
			>
				+ Add a guest
			</button>
		{/if}
	</div>
</div>
