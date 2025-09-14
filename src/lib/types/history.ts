export interface LineEditHistoryType {
	id: string;
	originalLineId: string;
	versionNumber: number;
	lineText?: string;
	timestampStr?: string;
	speaker?: string;
	changeType: string[];
	editedBy: string;
	status: 'pending' | 'approved' | 'rejected' | 'deleted';
	deleteReason?: string;
	confidenceScore: number;
	reviewedBy?: string;
	reviewedAt?: string;
	createdAt: string;
	editorName?: string;
	editorEmail?: string;
}

export interface LineHistorySummaryType {
	lineId: string;
	timestamp: string;
	speaker: string;
	originalText: string;
	currentText: string;
	editCount: number;
	lastEditedAt: string;
	lastEditedBy: string;
	hasActiveEdits: boolean;
}

export interface EpisodeHistoryStatsType {
	totalEdits: number;
	approvedEdits: number;
	pendingEdits: number;
	uniqueContributors: number;
	lastEditedAt?: string;
	editsByType: {
		text: number;
		timestamp: number;
		speaker: number;
		combined: number;
	};
}

export interface HistoryTimelineEntryType {
	id: string;
	timestamp: string;
	contributorName: string;
	editType: string[];
	lineTimestamp: string;
	lineSpeaker: string;
	changeDescription: string;
	status: 'pending' | 'approved' | 'rejected' | 'deleted';
}

export interface EpisodeHistoryDataType {
	episodeId: string;
	episodeEp: string;
	stats: EpisodeHistoryStatsType;
	timeline: HistoryTimelineEntryType[];
	lineHistories: LineHistorySummaryType[];
	hasHistory: boolean;
}

export interface HistoryFilterType {
	status?: ('pending' | 'approved' | 'rejected' | 'deleted')[];
	changeType?: string[];
	contributor?: string;
	dateRange?: {
		start: string;
		end: string;
	};
}
