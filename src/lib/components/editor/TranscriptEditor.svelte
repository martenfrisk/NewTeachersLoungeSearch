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
	import type { EpisodeInfo, TranscriptLine } from '../../types/episode';
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
	let changedLinesCount = $derived(editorStore.editedLinesCount);
	let selectedLineIndices = $derived(editorStore.selectedLineIndices);

	// Audio state
	let audioCurrentTime = $derived($audioStore.currentTime);
	let currentLine = $derived(editorStore.currentLine);

	// Track last selected index for shift-click range selection
	let lastSelectedIndex = $state<number>(-1);

	// UI state
	let showKeyboardHelp = $state(false);
	let controlsCollapsed = $state(false);
	let showAutoSaveNotification = $state(false);
	let autoSaveTimestamp = $state<Date | null>(null);
	let shiftControlsCollapsed = $state(true); // Default collapsed since only used once
	let mouseControlsCollapsed = $state(false); // Show mouse controls by default

	// Submission state
	let showSubmissionToast = $state(false);
	let submissionToastMessage = $state('');
	let submissionToastType: 'success' | 'error' | 'info' = $state('info');

	// Keyboard action handler
	function handleToggleHelp() {
		showKeyboardHelp = !showKeyboardHelp;
	}

	function handleToggleShiftControls() {
		shiftControlsCollapsed = !shiftControlsCollapsed;
	}

	function handleToggleMouseControls() {
		mouseControlsCollapsed = !mouseControlsCollapsed;
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
			case 'delete-line':
				if (currentLineIndex >= 0 && transcriptLines.length > 1) {
					// Confirm deletion for safety
					const confirmed = confirm('Are you sure you want to delete this line?');
					if (confirmed) {
						editorStore.deleteLine(currentLineIndex);
						scrollToCurrentLine();
					}
				}
				break;
			case 'cancel-edit':
				if (currentLineIndex >= 0) {
					editorStore.stopEditingLine(currentLineIndex);
				}
				break;
			case 'save-line':
				if (currentLineIndex >= 0) {
					editorStore.saveLine(currentLineIndex);
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
			case 'reset-edited':
				if (currentLineIndex >= 0) {
					editorStore.resetLineEditedState(currentLineIndex);
				}
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

	function handleSaveAllChanges() {
		editorStore.saveAllChanges();
	}

	function handleSelectionChange(index: number, selected: boolean, shiftKey?: boolean) {
		// Handle special index values for select all/clear
		if (index === -1) {
			// Clear selection
			editorStore.clearLineSelection();
			lastSelectedIndex = -1;
			return;
		}

		if (index === -2) {
			// Select/deselect all
			if (selected) {
				editorStore.selectAllLines();
			} else {
				editorStore.clearLineSelection();
			}
			lastSelectedIndex = -1;
			return;
		}

		// Handle normal line selection
		if (shiftKey && lastSelectedIndex >= 0) {
			// Range selection - select everything between lastSelectedIndex and current index
			editorStore.selectLineRange(lastSelectedIndex, index);
			// Don't update lastSelectedIndex for shift-click, keep it as the anchor point
		} else {
			// Normal checkbox behavior - just toggle the individual line
			if (selected) {
				// Add to selection (don't clear others - checkboxes support multi-select naturally)
				if (!editorStore.isLineSelected(index)) {
					editorStore.toggleLineSelection(index);
				}
			} else {
				// Remove from selection
				if (editorStore.isLineSelected(index)) {
					editorStore.toggleLineSelection(index);
				}
			}
			lastSelectedIndex = index;
		}
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
	function handleSubmitSuccess(submissionId: string) {
		submissionToastMessage = `Successfully submitted episode transcript for review! (ID: ${submissionId})`;
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
				editState: 'unedited' as const
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
	<div class="min-h-screen mb-20 bg-gray-50">
		<!-- Grid Container for Two-Frame Layout (Content + Sidebar) -->
		<div
			class="h-[calc(100vh-theme(spacing.16))] max-w-none grid lg:grid-cols-[1fr_320px] grid-cols-1 pb-32"
		>
			<!-- Main Content Frame -->
			<div class="overflow-y-auto px-4 py-6 relative max-w-none">
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
							onKeyboardAction={handleKeyboardAction}
							{selectedLineIndices}
							onSelectionChange={handleSelectionChange}
						/>
					{/if}
				{/if}
			</div>

			<!-- Sidebar Frame -->
			<div class="lg:block hidden">
				<!-- Floating Controls Panel - Hidden on smaller screens -->
				<EditorSidebar
					{selectedEpisode}
					{speakers}
					{shiftControlsCollapsed}
					{mouseControlsCollapsed}
					onToggleShiftControls={handleToggleShiftControls}
					onToggleMouseControls={handleToggleMouseControls}
					onEpisodeSelect={handleEpisodeSelect}
					onSpeakersChange={handleSpeakersChange}
					onAddSpeaker={handleAddSpeaker}
					onShiftAllLines={handleShiftAllLines}
					onSaveAllChanges={handleSaveAllChanges}
					onKeyboardAction={handleKeyboardAction}
					{changedLinesCount}
					{currentLineIndex}
					transcriptLinesLength={transcriptLines.length}
					{isLoading}
				/>
			</div>
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
