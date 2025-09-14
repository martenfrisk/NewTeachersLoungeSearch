// Component barrel exports for easy importing

// UI Components
export { default as Button } from './ui/Button.svelte';
export { default as Icon } from './ui/Icon.svelte';
export { default as LoadingSpinner } from './ui/LoadingSpinner.svelte';
export { default as LoadingState } from './ui/LoadingState.svelte';
export { default as Toast } from './ui/Toast.svelte';
export { default as ErrorMessage } from './ui/ErrorMessage.svelte';
export { default as UserPreferencesForm } from './ui/UserPreferencesForm.svelte';
export { default as ContributionHistory } from './ui/ContributionHistory.svelte';

// Search Components
export { default as SearchContainer } from './search/SearchContainer.svelte';
export { default as SearchInput } from './search/SearchInput.svelte';
export { default as SearchFilters } from './search/SearchFilters.svelte';
export { default as SearchResults } from './search/SearchResults.svelte';
export { default as SearchHit } from './search/SearchHit.svelte';
export { default as EpisodeSearch } from './search/EpisodeSearch.svelte';

// Episode Components
export { default as EpisodeCard } from './episode/EpisodeCard.svelte';
export { default as EpisodeHeader } from './episode/EpisodeHeader.svelte';
export { default as EpisodeSearchResult } from './episode/EpisodeSearchResult.svelte';
export { default as EpisodeStats } from './episode/EpisodeStats.svelte';
export { default as FloatingSeasonNav } from './episode/FloatingSeasonNav.svelte';
export { default as HistoryTimeline } from './episode/HistoryTimeline.svelte';
export { default as SearchInstructions } from './episode/SearchInstructions.svelte';
export { default as SeasonNavigation } from './episode/SeasonNavigation.svelte';
export { default as SeasonScrollTracker } from './episode/SeasonScrollTracker.svelte';
export { default as SeasonSection } from './episode/SeasonSection.svelte';
export { default as TranscriptLine } from './episode/TranscriptLine.svelte';
export { default as TranscriptQualityBanner } from './episode/TranscriptQualityBanner.svelte';
export { default as VirtualTranscriptList } from './episode/VirtualTranscriptList.svelte';
export { default as EpisodeHistoryPanel } from './episode/EpisodeHistoryPanel.svelte';
export { default as EpisodeHistoryBadge } from './episode/EpisodeHistoryBadge.svelte';

// Audio Components
export { default as AudioPlayer } from './audio/AudioPlayer.svelte';
export { default as AudioWaveform } from './audio/AudioWaveform.svelte';
export { default as ReturnToActiveButton } from './audio/ReturnToActiveButton.svelte';

// Editor Components
export { default as TranscriptEditor } from './editor/TranscriptEditor.svelte';
export { default as TranscriptView } from './editor/TranscriptView.svelte';
export { default as EditableTranscriptLine } from './editor/EditableTranscriptLine.svelte';
export { default as EditorHeader } from './editor/EditorHeader.svelte';
export { default as EditorSidebar } from './editor/EditorSidebar.svelte';
export { default as EditorAutoSaveNotification } from './editor/EditorAutoSaveNotification.svelte';
export { default as EditorErrorBoundary } from './editor/EditorErrorBoundary.svelte';
export { default as EditorKeyboardHandler } from './editor/EditorKeyboardHandler.svelte';
export { default as EditorMouseControls } from './editor/EditorMouseControls.svelte';
export { default as EpisodeSelector } from './editor/EpisodeSelector.svelte';
export { default as MassActions } from './editor/MassActions.svelte';
export { default as SpeakerManager } from './editor/SpeakerManager.svelte';
export { default as SubmitControls } from './editor/SubmitControls.svelte';
export { default as ContributorForm } from './editor/ContributorForm.svelte';

// Auth Components
export { default as AuthModal } from './auth/AuthModal.svelte';

// Moderation Components
export { default as DiffViewer } from './moderation/DiffViewer.svelte';

// General Components
export { default as Episode } from './Episode.svelte';
export { default as Stats } from './Stats.svelte';
export { default as Tooltip } from './Tooltip.svelte';
export { default as Coffee } from './Coffee.svelte';
