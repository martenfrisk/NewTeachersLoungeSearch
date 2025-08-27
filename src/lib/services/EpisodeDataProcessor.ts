import type { TranscriptLine, ProcessedTranscriptLine, TranscriptStats } from '$lib/types/episode';
import { processTranscriptSpeakers } from '$lib/utils/speakerUtils';

export class EpisodeDataProcessor {
	private static instance: EpisodeDataProcessor;
	private processedCache = new Map<string, ProcessedTranscriptLine[]>();
	private statsCache = new Map<string, TranscriptStats>();

	static getInstance(): EpisodeDataProcessor {
		if (!EpisodeDataProcessor.instance) {
			EpisodeDataProcessor.instance = new EpisodeDataProcessor();
		}
		return EpisodeDataProcessor.instance;
	}

	processTranscript(episodeId: string, rawTranscript: TranscriptLine[]): ProcessedTranscriptLine[] {
		if (this.processedCache.has(episodeId)) {
			return this.processedCache.get(episodeId)!;
		}

		if (!Array.isArray(rawTranscript) || rawTranscript.length === 0) {
			throw new Error(`Invalid transcript data for episode ${episodeId}`);
		}

		const processedTranscript = processTranscriptSpeakers(rawTranscript);
		this.processedCache.set(episodeId, processedTranscript);

		return processedTranscript;
	}

	calculateTranscriptStats(episodeId: string, transcript: TranscriptLine[]): TranscriptStats {
		if (this.statsCache.has(episodeId)) {
			return this.statsCache.get(episodeId)!;
		}

		if (!Array.isArray(transcript) || transcript.length === 0) {
			const emptyStats: TranscriptStats = {
				totalLines: 0,
				editedLines: 0,
				editedPercentage: 0,
				isFullyEdited: false,
				isMostlyEdited: false
			};
			return emptyStats;
		}

		const totalLines = transcript.length;
		const editedLines = transcript.filter((line) => line.edited).length;
		const editedPercentage = totalLines > 0 ? Math.round((editedLines / totalLines) * 100) : 0;

		const stats: TranscriptStats = {
			totalLines,
			editedLines,
			editedPercentage,
			isFullyEdited: editedPercentage === 100,
			isMostlyEdited: editedPercentage >= 50
		};

		this.statsCache.set(episodeId, stats);
		return stats;
	}

	validateTranscriptLine(line: unknown, lineIndex: number): TranscriptLine {
		if (typeof line !== 'object' || line === null) {
			throw new Error(`Invalid transcript line at index ${lineIndex}: not an object`);
		}

		const requiredFields = ['speaker', 'edited', 'time', 'line'];
		for (const field of requiredFields) {
			if (!(field in line)) {
				throw new Error(
					`Missing required field '${field}' in transcript line at index ${lineIndex}`
				);
			}
		}

		const typedLine = line as Record<string, unknown>;

		if (typeof typedLine.speaker !== 'string') {
			throw new Error(`Invalid speaker field at line ${lineIndex}: must be string`);
		}

		if (typeof typedLine.edited !== 'boolean') {
			throw new Error(`Invalid edited field at line ${lineIndex}: must be boolean`);
		}

		if (typeof typedLine.time !== 'string') {
			throw new Error(`Invalid time field at line ${lineIndex}: must be string`);
		}

		if (typeof typedLine.line !== 'string') {
			throw new Error(`Invalid line field at line ${lineIndex}: must be string`);
		}

		return line as TranscriptLine;
	}

	validateTranscript(rawTranscript: unknown): TranscriptLine[] {
		if (!Array.isArray(rawTranscript)) {
			throw new Error('Transcript data must be an array');
		}

		return rawTranscript.map((line, index) => this.validateTranscriptLine(line, index));
	}

	clearCache(episodeId?: string): void {
		if (episodeId) {
			this.processedCache.delete(episodeId);
			this.statsCache.delete(episodeId);
		} else {
			this.processedCache.clear();
			this.statsCache.clear();
		}
	}

	getCacheSize(): { processed: number; stats: number } {
		return {
			processed: this.processedCache.size,
			stats: this.statsCache.size
		};
	}
}
