<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import EpisodeSelector from './EpisodeSelector.svelte';
	import EditorHeader from './EditorHeader.svelte';
	import EditorSidebar from './EditorSidebar.svelte';
	import TranscriptView from './TranscriptView.svelte';
	import EditorKeyboardHandler from './EditorKeyboardHandler.svelte';
	import EditorAutoSaveNotification from './EditorAutoSaveNotification.svelte';
	import EditorErrorBoundary from './EditorErrorBoundary.svelte';
	import LoadingState from '../ui/LoadingState.svelte';
	import ErrorMessage from '../ui/ErrorMessage.svelte';
	import Button from '../ui/Button.svelte';
	import Toast from '../ui/Toast.svelte';
	import { EpisodeInfo, TranscriptLine } from '../../types/episode';
	import { audioService } from '../../services/AudioService';
	import { audioStore } from '../../stores';
	import { editorStore } from '../../stores/editor.svelte';

	interface Props {
		initialEpisode?: string;
		initialTranscript?: TranscriptLine[];
		initialEpisodeInfo?: EpisodeInfo;
	}

	let { initialEpisode, initialTranscript, initialEpisodeInfo }: Props = $props();

	// Reactive state from stores
	let selectedEpisode = $derived(editorStore.selectedEpisode);
	let episodeInfo = $derived(editorStore.episodeInfo);
	let transcriptLines = $derived(editorStore.transcriptLines);
	let speakers = $derived(editorStore.speakers);
	let currentLineIndex = $derived(editorStore.currentLineIndex);
	let isLoading = $derived(editorStore.isLoading);
	let error = $derived(editorStore.error);
	let isAudioSynced = $derived(editorStore.isAudioSynced);
	let hasChanges = $derived(editorStore.hasChanges);
	let editedLinesCount = $derived(editorStore.editedLinesCount);

	// Audio state
	let audioCurrentTime = $derived($audioStore.currentTime);
	let currentLine = $derived(editorStore.currentLine);

	// UI state
	let showKeyboardHelp = $state(false);
	let controlsCollapsed = $state(false);
	let showAutoSaveNotification = $state(false);
	let autoSaveTimestamp = $state<Date | null>(null);
	let shiftControlsCollapsed = $state(true); // Default collapsed since only used once

	// Submission state
	let showSubmissionToast = $state(false);
	let submissionToastMessage = $state('');
	let submissionToastType: 'success' | 'error' | 'info' = $state('info');

	// Keyboard action handler
	function handleToggleHelp() {
		showKeyboardHelp = !showKeyboardHelp;
	}

	function handleToggleControls() {
		controlsCollapsed = !controlsCollapsed;
	}

	function handleToggleShiftControls() {
		shiftControlsCollapsed = !shiftControlsCollapsed;
	}

	function handleKeyboardAction(action: string) {
		switch (action) {
			case 'toggle-play':
				// Toggle play/pause in global audio player
				if ($audioStore.isPlaying) {
					audioService.pause();
				} else {
					// If no audio loaded, load current line's audio
					if (!$audioStore.currentTimestamp && currentLine && episodeInfo) {
						audioService.playTimestamp({
							timestamp: currentLine.time,
							episode: episodeInfo.title
						});
					} else {
						audioService.play();
					}
				}
				break;
			case 'skip-backward-5':
				audioService.seek(Math.max(0, $audioStore.currentTime - 5));
				break;
			case 'skip-forward-5':
				audioService.seek(Math.min($audioStore.duration, $audioStore.currentTime + 5));
				break;
			case 'skip-backward-10':
				audioService.seek(Math.max(0, $audioStore.currentTime - 10));
				break;
			case 'skip-forward-10':
				audioService.seek(Math.min($audioStore.duration, $audioStore.currentTime + 10));
				break;
			case 'previous-line':
				editorStore.goToPreviousLine();
				scrollToCurrentLine();
				break;
			case 'next-line':
				editorStore.goToNextLine();
				scrollToCurrentLine();
				break;
			case 'next-speaker':
				if (currentLineIndex >= 0) {
					editorStore.cycleToNextSpeaker(currentLineIndex);
				}
				break;
			case 'previous-speaker':
				if (currentLineIndex >= 0) {
					editorStore.cycleToPreviousSpeaker(currentLineIndex);
				}
				break;
			case 'new-line-after':
				if (currentLineIndex >= 0) {
					editorStore.addNewLineAfter(currentLineIndex);
					scrollToCurrentLine();
				}
				break;
			case 'new-line-before':
				if (currentLineIndex >= 0) {
					editorStore.addNewLineBefore(currentLineIndex);
					scrollToCurrentLine();
				}
				break;
			case 'cancel-edit':
				if (currentLineIndex >= 0) {
					editorStore.stopEditingLine(currentLineIndex);
				}
				break;
			case 'commit-line':
				if (currentLineIndex >= 0) {
					editorStore.commitLine(currentLineIndex);
				}
				break;
			case 'set-timestamp-previous-plus-one':
				if (currentLineIndex >= 0) {
					editorStore.setTimestampToPreviousPlusOne(currentLineIndex);
				}
				break;
			case 'show-help':
				showKeyboardHelp = !showKeyboardHelp;
				break;
		}
	}

	// Event handlers
	function handleEpisodeSelect(episodeId: string) {
		if (episodeId && episodeId !== selectedEpisode) {
			// Navigate to the episode-specific URL - this will trigger server-side data loading
			if (browser) {
				goto(`/editor/${episodeId}`);
			}
		} else if (!episodeId) {
			// Navigate back to main editor page
			if (browser) {
				goto('/editor');
			}
			editorStore.setSelectedEpisode(null);
		}
	}

	function handleSpeakersChange(newSpeakers: typeof speakers) {
		editorStore.setSpeakers(newSpeakers);
	}

	function handleAddSpeaker(name: string) {
		editorStore.addSpeaker(name);
	}

	function handleLineClick(index: number) {
		editorStore.setCurrentLineIndex(index);
	}

	function handleTextEdit(index: number, text: string) {
		editorStore.updateLineText(index, text);
	}

	function handleSpeakerEdit(index: number, speaker: string) {
		editorStore.updateLineSpeaker(index, speaker);
	}

	function handleTimestampEdit(index: number, timestamp: string) {
		editorStore.updateLineTimestamp(index, timestamp);
	}

	function handleSplitLine(index: number, position: number) {
		editorStore.splitLine(index, position);
	}

	function handleAddNewLineBefore(index: number) {
		editorStore.addNewLineBefore(index);
		scrollToCurrentLine();
	}

	function handleAddNewLineAfter(index: number) {
		editorStore.addNewLineAfter(index);
		scrollToCurrentLine();
	}

	function handleStartEditing(index: number) {
		editorStore.startEditingLine(index);
	}

	function handleStopEditing(index: number) {
		editorStore.stopEditingLine(index);
	}

	function handleNavigateAndEdit(index: number) {
		// Ensure valid index bounds
		if (index < 0 || index >= transcriptLines.length) return;

		editorStore.setCurrentLineIndex(index);
		editorStore.startEditingLine(index);
		scrollToCurrentLine();
	}

	function handleShiftAllLines(shiftSeconds: number) {
		editorStore.shiftAllLinesTime(shiftSeconds);
	}

	// Auto-save functions
	function loadAutoSavedData() {
		if (selectedEpisode && editorStore.loadFromLocalStorage(selectedEpisode)) {
			showAutoSaveNotification = false;
			autoSaveTimestamp = null;
		}
	}

	function discardAutoSavedData() {
		if (selectedEpisode) {
			editorStore.clearLocalStorage(selectedEpisode);
			showAutoSaveNotification = false;
			autoSaveTimestamp = null;
		}
	}

	function dismissAutoSaveNotification() {
		showAutoSaveNotification = false;
	}

	function scrollToCurrentLine() {
		if (currentLineIndex >= 0) {
			const activeElement = document.querySelector(`[data-line-index="${currentLineIndex}"]`);
			if (activeElement) {
				activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	}

	// Submission handlers
	function handleSubmitSuccess(editIds: string[]) {
		const count = editIds.length;
		submissionToastMessage = `Successfully submitted ${count} change${count === 1 ? '' : 's'} for review!`;
		submissionToastType = 'success';
		showSubmissionToast = true;

		// Reset the transcript lines to clear the changes indicators
		editorStore.resetLineChanges();

		// Clear local storage since changes are submitted
		if (selectedEpisode) {
			editorStore.clearLocalStorage(selectedEpisode);
		}
	}

	function handleSubmitError(error: Error) {
		console.error('Submission failed:', error);
		submissionToastMessage = `Failed to submit changes: ${error.message}`;
		submissionToastType = 'error';
		showSubmissionToast = true;
	}

	function handleCloseToast() {
		showSubmissionToast = false;
	}

	// Sync audio time with transcript
	$effect(() => {
		if (isAudioSynced && audioCurrentTime > 0) {
			editorStore.setAudioCurrentTime(audioCurrentTime);
		}
	});

	// Mount
	onMount(() => {
		// Initialize with pre-loaded data if available
		if (initialEpisode && initialTranscript && initialEpisodeInfo) {
			// Convert transcript data to editable format
			const editableLines = initialTranscript.map((line) => ({
				...line,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false,
				originalText: line.line,
				originalSpeaker: line.speaker,
				originalTime: line.time,
				hasChanges: false
			}));

			editorStore.setSelectedEpisode(initialEpisode);
			editorStore.setEpisodeInfo(initialEpisodeInfo);
			editorStore.setTranscriptLines(editableLines);

			// Auto-open audio player by loading the first line's audio
			if (editableLines.length > 0 && initialEpisodeInfo.title) {
				setTimeout(() => {
					audioService.playTimestamp({
						timestamp: editableLines[0].time,
						episode: initialEpisodeInfo.title
					});
					// Don't auto-play, just load the audio
					audioService.pause();
				}, 1000); // Small delay to ensure everything is loaded
			}

			// Check for auto-saved data
			if (editorStore.hasLocalStorageData(initialEpisode)) {
				autoSaveTimestamp = editorStore.getLocalStorageTimestamp(initialEpisode);
				showAutoSaveNotification = true;
			}
		}
	});
</script>

<EditorErrorBoundary>
	<div class="min-h-screen bg-gray-50">
		<div class="max-w-full mx-auto px-4 py-6 sm:mr-80 relative">
			<!-- Header -->
			<EditorHeader
				{episodeInfo}
				{selectedEpisode}
				{showKeyboardHelp}
				{transcriptLines}
				onToggleHelp={handleToggleHelp}
				onSubmitSuccess={handleSubmitSuccess}
				onSubmitError={handleSubmitError}
			/>

			<!-- Auto-save notification -->
			<EditorAutoSaveNotification
				show={showAutoSaveNotification}
				timestamp={autoSaveTimestamp}
				onLoadAutoSavedData={loadAutoSavedData}
				onDiscardAutoSavedData={discardAutoSavedData}
				onDismiss={dismissAutoSaveNotification}
			/>

			<!-- Episode Selection -->
			{#if !selectedEpisode}
				<div class="mb-6">
					<EpisodeSelector {selectedEpisode} onEpisodeSelect={handleEpisodeSelect} />
				</div>
			{/if}

			{#if selectedEpisode}
				<!-- Keyboard Handler -->
				<EditorKeyboardHandler onKeyboardAction={handleKeyboardAction} />

				<!-- Floating Controls Panel -->
				<EditorSidebar
					{selectedEpisode}
					{speakers}
					{controlsCollapsed}
					{shiftControlsCollapsed}
					onToggleControls={handleToggleControls}
					onToggleShiftControls={handleToggleShiftControls}
					onEpisodeSelect={handleEpisodeSelect}
					onSpeakersChange={handleSpeakersChange}
					onAddSpeaker={handleAddSpeaker}
					onShiftAllLines={handleShiftAllLines}
				/>

				<!-- Main Content - Full Width Transcript -->
				{#if isLoading}
					<LoadingState message="Loading transcript..." />
				{:else if error}
					<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
						<ErrorMessage {error} />
						<div class="mt-4 text-center">
							<Button onclick={() => editorStore.clearError()}>Try Again</Button>
						</div>
					</div>
				{:else}
					<TranscriptView
						{transcriptLines}
						{speakers}
						{currentLineIndex}
						{controlsCollapsed}
						onTextEdit={handleTextEdit}
						onSpeakerEdit={handleSpeakerEdit}
						onTimestampEdit={handleTimestampEdit}
						onLineClick={handleLineClick}
						onSplitLine={handleSplitLine}
						onAddNewLineBefore={handleAddNewLineBefore}
						onAddNewLineAfter={handleAddNewLineAfter}
						onStartEditing={handleStartEditing}
						onStopEditing={handleStopEditing}
						onNavigateAndEdit={handleNavigateAndEdit}
					/>
				{/if}
			{/if}
		</div>
	</div>
</EditorErrorBoundary>

<!-- Submission Toast -->
<Toast
	message={submissionToastMessage}
	type={submissionToastType}
	show={showSubmissionToast}
	onClose={handleCloseToast}
/>
