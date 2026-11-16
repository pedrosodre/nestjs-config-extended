import { Injectable } from '@nestjs/common';
import { ExtendedConfigService } from './extended-config.service';

export interface ExtendedConfigHealthOptions {
	/**
	 * Consecutive failures of a strategy that make the check report "down".
	 * Defaults to 1, so any failed reload marks the configuration as down until
	 * the next successful load.
	 */
	maxConsecutiveFailures?: number;
}

/**
 * Same shape as @nestjs/terminus' HealthIndicatorResult.
 */
export type ExtendedConfigHealthResult = Record<
	string,
	{ status: 'up' | 'down'; [details: string]: unknown }
>;

/**
 * Health indicator for @nestjs/terminus (v11+). It does not import terminus:
 * it returns a HealthIndicatorResult with status "up" or "down".
 *
 * Usage: this.health.check([() => this.configHealth.isHealthy('config')])
 */
@Injectable()
export class ExtendedConfigHealthIndicator {
	constructor(private readonly config: ExtendedConfigService) {}

	isHealthy(
		key: string = 'config',
		options: ExtendedConfigHealthOptions = {},
	): ExtendedConfigHealthResult {
		const maxConsecutiveFailures = Math.max(
			1,
			options.maxConsecutiveFailures ?? 1,
		);
		const { loaded, strategies } = this.config.getStatus();
		const enabled = strategies.filter(strategy => !strategy.disabled);

		const healthy =
			loaded &&
			enabled.every(
				strategy =>
					strategy.loaded &&
					strategy.consecutiveFailures < maxConsecutiveFailures,
			);

		return {
			[key]: {
				status: healthy ? 'up' : 'down',
				loaded,
				strategies: enabled.map(strategy => ({
					identifier: strategy.identifier,
					loaded: strategy.loaded,
					consecutiveFailures: strategy.consecutiveFailures,
					lastSuccessAt: strategy.lastSuccessAt?.toISOString(),
					lastFailureAt: strategy.lastFailureAt?.toISOString(),
					lastError: strategy.lastError,
				})),
			},
		};
	}
}
