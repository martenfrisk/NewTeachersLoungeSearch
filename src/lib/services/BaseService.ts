import type { AppError } from '../utils/errors';
import { createErrorHandler } from '../utils/errors';

interface ServiceOptions {
	enableLogging?: boolean;
	context?: string;
}

interface ServiceMetrics {
	operationCount: number;
	errorCount: number;
	lastOperation?: string;
	lastOperationTime?: number;
}

export abstract class BaseService {
	protected readonly serviceName: string;
	protected readonly handleError: (error: unknown) => AppError;
	protected readonly enableLogging: boolean;
	protected readonly metrics: ServiceMetrics;

	constructor(serviceName: string, options: ServiceOptions = {}) {
		this.serviceName = serviceName;
		this.enableLogging = options.enableLogging ?? true;
		this.handleError = createErrorHandler(options.context || serviceName);
		this.metrics = {
			operationCount: 0,
			errorCount: 0
		};
	}

	protected async executeWithErrorHandling<T>(
		operation: () => Promise<T> | T,
		operationName: string,
		logContext?: Record<string, unknown>
	): Promise<T> {
		const startTime = performance.now();
		this.metrics.operationCount++;
		this.metrics.lastOperation = operationName;

		try {
			if (this.enableLogging) {
				this.log('debug', `Starting ${operationName}`, logContext);
			}

			const result = await Promise.resolve(operation());

			const duration = performance.now() - startTime;
			this.metrics.lastOperationTime = duration;

			if (this.enableLogging) {
				this.log('info', `Completed ${operationName}`, {
					...logContext,
					duration: `${duration.toFixed(2)}ms`
				});
			}

			return result;
		} catch (error) {
			this.metrics.errorCount++;
			const duration = performance.now() - startTime;

			const appError = this.handleError(error);

			if (this.enableLogging) {
				this.log('error', `Failed ${operationName}`, {
					...logContext,
					error: appError.message,
					code: appError.code,
					duration: `${duration.toFixed(2)}ms`
				});
			}

			throw appError;
		}
	}

	protected validateInput<T>(
		value: T,
		validator: (value: T) => { valid: boolean; error?: string },
		valueName: string
	): T {
		const validation = validator(value);
		if (!validation.valid) {
			throw this.handleError(new Error(`Invalid ${valueName}: ${validation.error}`));
		}
		return value;
	}

	protected log(
		level: 'debug' | 'info' | 'warn' | 'error',
		message: string,
		context?: Record<string, unknown>
	): void {
		if (!this.enableLogging) return;

		const logEntry = {
			service: this.serviceName,
			level,
			message,
			timestamp: new Date().toISOString(),
			...context
		};

		switch (level) {
			case 'debug':
				console.debug(JSON.stringify(logEntry));
				break;
			case 'info':
				console.info(JSON.stringify(logEntry));
				break;
			case 'warn':
				console.warn(JSON.stringify(logEntry));
				break;
			case 'error':
				console.error(JSON.stringify(logEntry));
				break;
		}
	}

	getMetrics(): ServiceMetrics {
		return { ...this.metrics };
	}

	resetMetrics(): void {
		this.metrics.operationCount = 0;
		this.metrics.errorCount = 0;
		this.metrics.lastOperation = undefined;
		this.metrics.lastOperationTime = undefined;
	}
}
