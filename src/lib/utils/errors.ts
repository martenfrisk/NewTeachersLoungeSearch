export class AppError extends Error {
	public readonly code: string;
	public readonly statusCode: number;
	public readonly isOperational: boolean;

	constructor(
		message: string,
		code: string = 'UNKNOWN_ERROR',
		statusCode: number = 500,
		isOperational: boolean = true
	) {
		super(message);
		this.code = code;
		this.statusCode = statusCode;
		this.isOperational = isOperational;

		Error.captureStackTrace(this, this.constructor);
	}
}

export class SearchError extends AppError {
	constructor(message: string, code: string = 'SEARCH_ERROR') {
		super(message, code, 400);
	}
}

export class NetworkError extends AppError {
	constructor(message: string = 'Network request failed') {
		super(message, 'NETWORK_ERROR', 503);
	}
}

export class CacheError extends AppError {
	constructor(message: string = 'Cache operation failed') {
		super(message, 'CACHE_ERROR', 500);
	}
}

export function handleError(error: unknown): AppError {
	if (error instanceof AppError) {
		return error;
	}

	if (error instanceof Error) {
		return new AppError(error.message, 'UNKNOWN_ERROR');
	}

	return new AppError('An unknown error occurred', 'UNKNOWN_ERROR');
}

export function createErrorHandler(context: string) {
	return (error: unknown): AppError => {
		const appError = handleError(error);
		console.error(`[${context}] Error:`, appError);
		return appError;
	};
}
