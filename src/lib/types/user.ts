export interface User {
	id: string;
	email: string;
	username: string;
	role: UserRole;
	createdAt: Date;
	updatedAt: Date;
}

export enum UserRole {
	USER = 'user',
	MODERATOR = 'moderator',
	ADMIN = 'admin'
}

export interface UserPreferences {
	theme: 'light' | 'dark' | 'auto';
	autoplay: boolean;
	searchHistory: boolean;
	notifications: boolean;
}

export interface Correction {
	id: string;
	userId: string;
	transcriptLineId: string;
	originalLine: string;
	correctedLine: string;
	reason: string;
	status: CorrectionStatus;
	createdAt: Date;
	reviewedAt?: Date;
	reviewedBy?: string;
}

export enum CorrectionStatus {
	PENDING = 'pending',
	APPROVED = 'approved',
	REJECTED = 'rejected'
}
