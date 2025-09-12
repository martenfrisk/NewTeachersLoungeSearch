<script lang="ts">
	import type { EditableTranscriptLineType } from '$lib/types/editor';
	import { timestampToSeconds } from '$lib/utils/audioSync';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		original: EditableTranscriptLineType[];
		submitted: EditableTranscriptLineType[];
		episodeEp: string;
	}

	let { original, submitted, episodeEp }: Props = $props();

	// Diff types for styling
	type DiffType = 'unchanged' | 'modified' | 'added' | 'removed';

	interface DiffLine {
		type: DiffType;
		originalLine?: EditableTranscriptLineType;
		submittedLine?: EditableTranscriptLineType;
		index: number;
	}

	// Simple diff algorithm - matches lines by timestamp or position
	function computeDiff(
		orig: EditableTranscriptLineType[],
		sub: EditableTranscriptLineType[]
	): DiffLine[] {
		const diffs: DiffLine[] = [];
		const origMap = new Map(orig.map((line, i) => [line.time || `pos-${i}`, { line, index: i }]));
		const usedOriginalIndices = new SvelteSet<number>();

		// Process submitted lines
		sub.forEach((subLine, subIndex) => {
			const timeKey = subLine.time || `pos-${subIndex}`;
			const originalMatch = origMap.get(timeKey);

			if (originalMatch && !usedOriginalIndices.has(originalMatch.index)) {
				usedOriginalIndices.add(originalMatch.index);
				const origLine = originalMatch.line;

				// Check if line was modified
				const isModified =
					origLine.line !== subLine.line ||
					origLine.speaker !== subLine.speaker ||
					origLine.time !== subLine.time;

				diffs.push({
					type: isModified ? 'modified' : 'unchanged',
					originalLine: origLine,
					submittedLine: subLine,
					index: subIndex
				});
			} else {
				// New line added
				diffs.push({
					type: 'added',
					submittedLine: subLine,
					index: subIndex
				});
			}
		});

		// Find removed lines (in original but not in submitted)
		orig.forEach((origLine, origIndex) => {
			if (!usedOriginalIndices.has(origIndex)) {
				diffs.push({
					type: 'removed',
					originalLine: origLine,
					index: origIndex
				});
			}
		});

		return diffs.sort((a, b) => {
			// Sort by timestamp or position
			const aTime = a.originalLine?.time || a.submittedLine?.time || '00:00:00';
			const bTime = b.originalLine?.time || b.submittedLine?.time || '00:00:00';
			return timestampToSeconds(aTime) - timestampToSeconds(bTime);
		});
	}

	let diffLines = $derived(computeDiff(original, submitted));
	let stats = $derived.by(() => {
		const s = { unchanged: 0, modified: 0, added: 0, removed: 0 };
		diffLines.forEach((diff) => s[diff.type]++);
		return s;
	});

	// eslint-disable-next-line svelte/no-unnecessary-state-wrap
	let selectedDiffTypes = $state(new SvelteSet(['modified', 'added', 'removed']));
	let showContext = $state(true);
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap
	let expandedLines = $state(new SvelteSet<number>());

	function toggleDiffType(type: DiffType) {
		if (selectedDiffTypes.has(type)) {
			selectedDiffTypes.delete(type);
		} else {
			selectedDiffTypes.add(type);
		}
		selectedDiffTypes = new SvelteSet(selectedDiffTypes);
	}

	function toggleLineExpansion(index: number) {
		if (expandedLines.has(index)) {
			expandedLines.delete(index);
		} else {
			expandedLines.add(index);
		}
		expandedLines = new SvelteSet(expandedLines);
	}

	let filteredDiffs = $derived.by(() => {
		let filtered = diffLines.filter(
			(diff) => selectedDiffTypes.has(diff.type) || (showContext && diff.type === 'unchanged')
		);

		// If showing context, include surrounding unchanged lines
		if (showContext) {
			const result: DiffLine[] = [];
			const contextSize = 2;

			filtered.forEach((diff, i) => {
				if (diff.type !== 'unchanged') {
					// Add context before
					for (let j = Math.max(0, i - contextSize); j < i; j++) {
						if (diffLines[j] && diffLines[j].type === 'unchanged') {
							result.push(diffLines[j]);
						}
					}

					result.push(diff);

					// Add context after
					for (let j = i + 1; j <= Math.min(diffLines.length - 1, i + contextSize); j++) {
						if (diffLines[j] && diffLines[j].type === 'unchanged') {
							result.push(diffLines[j]);
						}
					}
				}
			});

			// Remove duplicates while preserving order
			const seen = new SvelteSet();
			return result.filter((diff) => {
				const key = `${diff.type}-${diff.index}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		}

		return filtered;
	});

	function formatTimestamp(time: string): string {
		return time || '00:00:00';
	}

	function getDiffLineClasses(type: DiffType): string {
		switch (type) {
			case 'added':
				return 'bg-green-50 border-l-4 border-green-400';
			case 'removed':
				return 'bg-red-50 border-l-4 border-red-400';
			case 'modified':
				return 'bg-yellow-50 border-l-4 border-yellow-400';
			default:
				return 'bg-gray-50 border-l-4 border-gray-200';
		}
	}

	function getTypeIcon(type: DiffType): string {
		switch (type) {
			case 'added':
				return '+';
			case 'removed':
				return '-';
			case 'modified':
				return '~';
			default:
				return '=';
		}
	}

	function getTypeColor(type: DiffType): string {
		switch (type) {
			case 'added':
				return 'text-green-600';
			case 'removed':
				return 'text-red-600';
			case 'modified':
				return 'text-yellow-600';
			default:
				return 'text-gray-500';
		}
	}
</script>

<div class="max-w-6xl mx-auto p-6">
	<!-- Header -->
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900 mb-2">
			Episode Transcript Changes: {episodeEp}
		</h2>

		<!-- Statistics -->
		<div class="flex flex-wrap gap-4 mb-4">
			<div class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
				{stats.added} Added
			</div>
			<div class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
				{stats.removed} Removed
			</div>
			<div class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
				{stats.modified} Modified
			</div>
			<div class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
				{stats.unchanged} Unchanged
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
		<div class="flex flex-wrap items-center gap-4">
			<span class="text-sm font-medium text-gray-700">Show:</span>

			<!-- Filter toggles -->
			<button
				onclick={() => toggleDiffType('added')}
				class="px-3 py-1 text-sm rounded-md transition-colors {selectedDiffTypes.has('added')
					? 'bg-green-100 text-green-800 border border-green-300'
					: 'bg-gray-100 text-gray-600 border border-gray-300'}"
			>
				Added ({stats.added})
			</button>

			<button
				onclick={() => toggleDiffType('removed')}
				class="px-3 py-1 text-sm rounded-md transition-colors {selectedDiffTypes.has('removed')
					? 'bg-red-100 text-red-800 border border-red-300'
					: 'bg-gray-100 text-gray-600 border border-gray-300'}"
			>
				Removed ({stats.removed})
			</button>

			<button
				onclick={() => toggleDiffType('modified')}
				class="px-3 py-1 text-sm rounded-md transition-colors {selectedDiffTypes.has('modified')
					? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
					: 'bg-gray-100 text-gray-600 border border-gray-300'}"
			>
				Modified ({stats.modified})
			</button>

			<button
				onclick={() => toggleDiffType('unchanged')}
				class="px-3 py-1 text-sm rounded-md transition-colors {selectedDiffTypes.has('unchanged')
					? 'bg-gray-100 text-gray-800 border border-gray-300'
					: 'bg-gray-100 text-gray-600 border border-gray-300'}"
			>
				Unchanged ({stats.unchanged})
			</button>

			<div class="border-l border-gray-300 pl-4 ml-2">
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={showContext} class="rounded border-gray-300" />
					Show Context
				</label>
			</div>
		</div>
	</div>

	<!-- Diff Display -->
	<div class="space-y-2">
		{#each filteredDiffs as diff (`${diff.type}-${diff.index}-${diff.originalLine?.time || ''}-${diff.submittedLine?.time || ''}`)}
			<div
				class="rounded-lg border border-gray-200 overflow-hidden {getDiffLineClasses(diff.type)}"
			>
				<!-- Line header with controls -->
				<div class="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<span
							class="w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono font-bold {getTypeColor(
								diff.type
							)} bg-white border"
						>
							{getTypeIcon(diff.type)}
						</span>
						<span class="text-sm font-medium text-gray-900">
							Line {diff.index + 1}
						</span>
						<span class="text-xs text-gray-500">
							{formatTimestamp(diff.originalLine?.time || diff.submittedLine?.time || '')}
						</span>
						{#if diff.type === 'modified'}
							<button
								onclick={() => toggleLineExpansion(diff.index)}
								class="text-xs text-blue-600 hover:text-blue-800"
							>
								{expandedLines.has(diff.index) ? 'Hide Details' : 'Show Details'}
							</button>
						{/if}
					</div>
				</div>

				<!-- Line content -->
				<div class="p-4">
					{#if diff.type === 'added'}
						<!-- Added line -->
						<div class="space-y-2">
							<div class="text-sm font-medium text-green-700">Added:</div>
							<div class="bg-green-100 rounded p-3">
								<div class="flex items-start gap-3">
									<span class="text-xs text-green-600 font-mono"
										>{formatTimestamp(diff.submittedLine?.time || '')}</span
									>
									<span class="font-medium text-green-800">{diff.submittedLine?.speaker}:</span>
									<span class="text-green-900">{diff.submittedLine?.line}</span>
								</div>
							</div>
						</div>
					{:else if diff.type === 'removed'}
						<!-- Removed line -->
						<div class="space-y-2">
							<div class="text-sm font-medium text-red-700">Removed:</div>
							<div class="bg-red-100 rounded p-3">
								<div class="flex items-start gap-3">
									<span class="text-xs text-red-600 font-mono"
										>{formatTimestamp(diff.originalLine?.time || '')}</span
									>
									<span class="font-medium text-red-800 line-through"
										>{diff.originalLine?.speaker}:</span
									>
									<span class="text-red-900 line-through">{diff.originalLine?.line}</span>
								</div>
							</div>
						</div>
					{:else if diff.type === 'modified'}
						<!-- Modified line -->
						<div class="space-y-2">
							<div class="text-sm font-medium text-yellow-700">Modified:</div>

							{#if expandedLines.has(diff.index)}
								<!-- Detailed view -->
								<div class="space-y-3">
									<!-- Before -->
									<div class="bg-red-50 rounded p-3 border border-red-200">
										<div class="text-xs font-medium text-red-600 mb-2">Before:</div>
										<div class="flex items-start gap-3">
											<span class="text-xs text-red-500 font-mono"
												>{formatTimestamp(diff.originalLine?.time || '')}</span
											>
											<span class="font-medium text-red-700">{diff.originalLine?.speaker}:</span>
											<span class="text-red-800">{diff.originalLine?.line}</span>
										</div>
									</div>

									<!-- After -->
									<div class="bg-green-50 rounded p-3 border border-green-200">
										<div class="text-xs font-medium text-green-600 mb-2">After:</div>
										<div class="flex items-start gap-3">
											<span class="text-xs text-green-500 font-mono"
												>{formatTimestamp(diff.submittedLine?.time || '')}</span
											>
											<span class="font-medium text-green-700">{diff.submittedLine?.speaker}:</span>
											<span class="text-green-800">{diff.submittedLine?.line}</span>
										</div>
									</div>

									<!-- Changes summary -->
									<div class="bg-yellow-50 rounded p-3 border border-yellow-200">
										<div class="text-xs font-medium text-yellow-600 mb-2">Changes:</div>
										<div class="text-xs text-yellow-800 space-y-1">
											{#if diff.originalLine?.time !== diff.submittedLine?.time}
												<div>
													⏱️ Timestamp: {diff.originalLine?.time} → {diff.submittedLine?.time}
												</div>
											{/if}
											{#if diff.originalLine?.speaker !== diff.submittedLine?.speaker}
												<div>
													🎤 Speaker: {diff.originalLine?.speaker} → {diff.submittedLine?.speaker}
												</div>
											{/if}
											{#if diff.originalLine?.line !== diff.submittedLine?.line}
												<div>💬 Text: Modified</div>
											{/if}
										</div>
									</div>
								</div>
							{:else}
								<!-- Compact view -->
								<div class="bg-yellow-100 rounded p-3">
									<div class="flex items-start gap-3">
										<span class="text-xs text-yellow-600 font-mono"
											>{formatTimestamp(diff.submittedLine?.time || '')}</span
										>
										<span class="font-medium text-yellow-800">{diff.submittedLine?.speaker}:</span>
										<span class="text-yellow-900">{diff.submittedLine?.line}</span>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<!-- Unchanged line (context) -->
						<div class="bg-gray-50 rounded p-3">
							<div class="flex items-start gap-3">
								<span class="text-xs text-gray-500 font-mono"
									>{formatTimestamp(diff.originalLine?.time || '')}</span
								>
								<span class="font-medium text-gray-600">{diff.originalLine?.speaker}:</span>
								<span class="text-gray-800">{diff.originalLine?.line}</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/each}

		{#if filteredDiffs.length === 0}
			<div class="text-center py-12">
				<div class="text-gray-500 text-lg font-medium mb-2">No changes to display</div>
				<div class="text-gray-400 text-sm">
					Adjust your filter settings to view different types of changes.
				</div>
			</div>
		{/if}
	</div>
</div>
