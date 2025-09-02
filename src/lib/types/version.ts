// Types for episode transcript version history

export interface EpisodeVersionType {
	id: string;
	episodeId: string;
	versionNumber: number;
	createdBy?: string;
	createdByUsername?: string;
	createdAt: string;
	sourceType: 'original' | 'submission' | 'manual';
	submissionId?: string;
	changeSummary?: string;
	isCurrent: boolean;
	linesCount: number;
}

export interface VersionHistoryEntryType extends EpisodeVersionType {
	ep: string;
	title: string;
	episodeSeason: string;
}

export interface VersionDiffSummaryType {
	linesAdded: number;
	linesRemoved: number;
	linesModified: number;
	totalChanges: number;
}

export interface ArchivedTranscriptLineType {
	id: string;
	episodeId: string;
	season: string;
	timestampStr: string;
	speaker: string;
	line: string;
	edited: boolean;
	createdAt: string;
	updatedAt: string;
	versionId: string;
	archivedAt: string;
}
