export interface StrategyStatus {
	/**
	 * Strategy identifier (symbols are converted to strings).
	 */
	identifier?: string;

	/**
	 * Whether the strategy is disabled.
	 */
	disabled: boolean;

	/**
	 * Whether the strategy loaded successfully at least once.
	 */
	loaded: boolean;

	lastSuccessAt?: Date;
	lastFailureAt?: Date;

	/**
	 * Message of the last failure, with URL credentials masked.
	 */
	lastError?: string;

	/**
	 * Failures since the last successful load.
	 */
	consecutiveFailures: number;
}

export interface ConfigStatus {
	/**
	 * Whether the first load finished successfully.
	 */
	loaded: boolean;

	strategies: StrategyStatus[];
}
