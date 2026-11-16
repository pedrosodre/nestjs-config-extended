import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import getFrom from 'lodash.get';
import hasOn from 'lodash.has';
import { setOn } from './util/object.util';
import {
	EXTENDED_CONFIG_OPTIONS,
	CRON_SCHEDULER,
	PRE_LOADED_VALUES,
	NOT_IDENTIFIED,
	STARTING_STRATEGY,
	ASSIGNING_VARIABLES_TO_PROCESS_ENV,
	ASSIGNING_VARIABLES_TO_CACHE,
	STARTING_RELOAD,
	ALL_STRATEGIES,
	RELOADING_VARIABLES_FROM_STRATEGY_BY_SCHEDULER,
	NOT_LOADED_STRATEGY_DISABLED,
	FIRST_LOAD_REQUESTED,
	LOAD_REQUEST_IGNORED_DUE_ALREADY_LOADED,
	LOAD_REQUEST_IGNORED_DUE_IN_PROGRESS,
	VARIABLES_PRELOADED_BY_MODULE,
	DEBUG_LOG_PREFIX,
	SCHEDULED_RELOAD_FAILED,
} from './config.constants';
import {
	ConfigLoaderStrategy,
	CronScheduledTask,
	CronScheduler,
	ExtendedConfigModuleOptions,
} from './interfaces';
import { InvalidScheduleException } from './exceptions';
import { retrieveVariablesByStrategy } from './util/loader.util';
import { isUndefined } from './util/is-undefined.util';

@Injectable()
export class ExtendedConfigService<K = Record<string, any>>
	implements OnModuleDestroy {
	private loaded: boolean = false;
	private loadingPromise?: Promise<void>;
	private cache: Record<string, any> = {};
	/** Last successfully loaded variables of each strategy, by strategy index. */
	private results: (Record<string, any> | undefined)[] = [];
	/** Top-level keys this service wrote to process.env (cache disabled). */
	private processEnvKeys = new Set<string>();
	private readonly scheduledTasks: CronScheduledTask[] = [];

	constructor(
		@Inject(EXTENDED_CONFIG_OPTIONS)
		private readonly options: ExtendedConfigModuleOptions,
		@Inject(CRON_SCHEDULER)
		private readonly scheduler: CronScheduler,
		private readonly logger: Logger,
		@Inject(PRE_LOADED_VALUES)
		preLoadedResults?: (Record<string, any> | undefined)[] | null,
	) {
		if (preLoadedResults) {
			this.debug(VARIABLES_PRELOADED_BY_MODULE, ALL_STRATEGIES);

			this.results = [...preLoadedResults];
			this.applyResults();
			this.isLoaded = true;

			this.configureSchedulerOnPreload();
		}
	}

	private get isLoaded(): boolean {
		return this.loaded;
	}

	private set isLoaded(isLoaded: boolean) {
		this.loaded = isLoaded;
	}

	/**
	 * Method that initiates the first loading of the variables.
	 * This method can be called multiple times, but variables will be loaded only on first call.
	 *
	 * @param ensureLoad optional boolean that forces method to resolve the promise only after finishing the loading.
	 * If "false" and service already have a loading in progress, this method will not wait for it.
	 */
	async load(ensureLoad: boolean = false): Promise<void> {
		if (this.isLoaded) {
			this.debug(LOAD_REQUEST_IGNORED_DUE_ALREADY_LOADED, ALL_STRATEGIES);
			return;
		}

		if (this.loadingPromise) {
			this.debug(LOAD_REQUEST_IGNORED_DUE_IN_PROGRESS, ALL_STRATEGIES);
			if (ensureLoad) {
				await this.loadingPromise;
			}
			return;
		}

		this.debug(FIRST_LOAD_REQUESTED, ALL_STRATEGIES);

		// Share a single promise between concurrent callers. If loading fails,
		// every waiter receives the error and a later call can retry.
		this.loadingPromise = (async () => {
			try {
				await this.loadVariables();
				this.isLoaded = true;
			} finally {
				this.loadingPromise = undefined;
			}
		})();

		await this.loadingPromise;
	}

	/**
	 * Method that retrieve an environment variable given a key.
	 *
	 * @param propertyPath property path (key) associated with the desired variable.
	 * @param defaultValue optional default variable to be returned if the service does not have the requested variable.
	 */
	get<T = any>(propertyPath: keyof K, defaultValue?: T): T | undefined {
		if (this.isCacheEnabled) {
			const cachedValue = this.getFromCache(propertyPath);
			if (!isUndefined(cachedValue)) {
				return cachedValue;
			}
		} else {
			const processEnvValue = this.getFromProcessEnv(propertyPath);
			if (!isUndefined(processEnvValue)) {
				return processEnvValue;
			}
		}

		return defaultValue;
	}

	/**
	 * Method that retrieve a proxy of an environment variable given a key.
	 *
	 * @param propertyPath property path (key) associated with the desired variable.
	 * @param defaultValue optional default variable to be returned if the service does not have the requested variable.
	 */
	getProxyOf<T = any>(propertyPath: keyof K, defaultValue?: T): T | undefined {
		const baseTarget = this.get<T>(propertyPath, defaultValue);

		if (baseTarget && typeof baseTarget === 'object')
			return new Proxy(baseTarget as T & object, {
				get: (_target, property: string) => {
					const target: Record<string, unknown> =
						this.get<T>(propertyPath, defaultValue) || {};

					return target?.[property];
				},
			}) as T;

		return baseTarget;
	}

	private getFromCache<T = any>(propertyPath: keyof K): T | undefined {
		return getFrom(this.cache, propertyPath);
	}

	private getFromProcessEnv<T = any>(propertyPath: keyof K): T | undefined {
		return getFrom(process.env, propertyPath);
	}

	private hasOnCache(propertyPath: keyof K): boolean {
		return hasOn(this.cache, propertyPath);
	}

	private hasOnProcessEnv(propertyPath: keyof K): boolean {
		return hasOn(process.env, propertyPath);
	}

	/**
	 * Method that verify if an environment variable exists given a key.
	 *
	 * @param propertyPath property path (key) associated with the desired variable.
	 *
	 * @returns a boolean that indicates the existence of an environment variable.
	 */
	has(propertyPath: keyof K): boolean {
		if (this.isCacheEnabled) {
			return this.hasOnCache(propertyPath);
		} else {
			return this.hasOnProcessEnv(propertyPath);
		}
	}

	private get isCacheEnabled(): boolean {
		return this.options.cache === false ? this.options.cache : true;
	}

	private async loadVariables(onlyReloadable: boolean = false): Promise<void> {
		for await (const strategy of this.options.strategies || []) {
			const { reloadable, identifier } = strategy;

			if (!onlyReloadable || reloadable) {
				this.debug(STARTING_STRATEGY, identifier);

				await this.loadVariablesByStrategy(strategy);

				if (!onlyReloadable) {
					this.configureScheduler(strategy);
				}
			}
		}
	}

	private configureSchedulerOnPreload(): void {
		for (const strategy of this.options.strategies || []) {
			this.configureScheduler(strategy);
		}
	}

	private configureScheduler(strategy: ConfigLoaderStrategy): void {
		const { reloadable, identifier, schedule, scheduleTimezone, disable } =
			strategy;

		if (!disable && schedule && reloadable) {
			if (!this.scheduler.validate(schedule)) {
				throw new InvalidScheduleException(identifier);
			}

			const task = this.scheduler.schedule(
				schedule,
				async () => {
					this.debug(
						RELOADING_VARIABLES_FROM_STRATEGY_BY_SCHEDULER,
						identifier,
					);
					try {
						await this.loadVariablesByStrategy(strategy);
					} catch (err) {
						// Keep the last loaded values and report through the Nest logger
						// instead of letting node-cron print to console.error.
						this.logger.error(
							`${DEBUG_LOG_PREFIX} ${
								identifier || NOT_IDENTIFIED
							}: ${SCHEDULED_RELOAD_FAILED}`,
							(err as Error)?.stack || String(err),
						);
					}
				},
				{
					scheduled: true,
					timezone: scheduleTimezone,
				},
			);

			if (task) {
				this.scheduledTasks.push(task);
			}
		}
	}

	/**
	 * Stops every scheduled reload so timers do not outlive the application.
	 */
	onModuleDestroy(): void {
		for (const task of this.scheduledTasks.splice(0)) {
			task.destroy();
		}
	}

	/**
	 * Method that reloads environment variables on strategies that allows reload.
	 *
	 * @param strategyIdentifier optional strategy's identifier to allow reload environment variables from a single strategy.
	 */
	async reload(strategyIdentifier?: string | Symbol): Promise<void> {
		if (strategyIdentifier) {
			const strategy = this.options.strategies?.filter(
				singleStrategy => singleStrategy.identifier === strategyIdentifier,
			)?.[0];

			if (strategy?.reloadable) {
				this.debug(STARTING_RELOAD, strategy.identifier);
				await this.loadVariablesByStrategy(strategy);
			}
		} else {
			this.debug(STARTING_RELOAD, ALL_STRATEGIES);
			const onlyReloadable = true;
			await this.loadVariables(onlyReloadable);
		}
	}

	private async loadVariablesByStrategy(
		strategy: ConfigLoaderStrategy,
	): Promise<void> {
		const { disable, identifier } = strategy;

		if (!disable) {
			const loadedVariables: Record<string, any> =
				await this.retrieveVariables(strategy);

			if (this.isCacheEnabled) {
				this.debug(ASSIGNING_VARIABLES_TO_CACHE, identifier);
			} else {
				this.debug(ASSIGNING_VARIABLES_TO_PROCESS_ENV, identifier);
			}

			const index = (this.options.strategies || []).indexOf(strategy);
			this.results[index] = { ...loadedVariables };
			this.applyResults();
		} else {
			this.debug(NOT_LOADED_STRATEGY_DISABLED, identifier);
		}
	}

	private async retrieveVariables(
		strategy: ConfigLoaderStrategy,
	): Promise<Record<string, any>> {
		return retrieveVariablesByStrategy(
			strategy,
			this.options?.debug
				? (message: string, identifier?: string | Symbol) => {
						this.logger.debug(
							`${DEBUG_LOG_PREFIX} ${identifier || NOT_IDENTIFIED}: ${message}`,
						);
					}
				: undefined,
		);
	}

	/**
	 * Rebuilds the whole configuration from the latest result of every strategy,
	 * in declaration order. This keeps precedence stable (later strategies win)
	 * and drops keys that a reloaded strategy no longer returns.
	 */
	private applyResults(): void {
		const strategies = this.options.strategies || [];

		if (this.isCacheEnabled) {
			const next: Record<string, any> = {};
			strategies.forEach((strategy, index) => {
				const variables = this.results[index];
				if (variables) {
					this.assignVariables(next, strategy, variables);
				}
			});
			this.cache = next;
			return;
		}

		const written = new Set<string>();
		strategies.forEach((strategy, index) => {
			const variables = this.results[index];
			if (variables) {
				for (const key of this.assignVariables(
					process.env,
					strategy,
					variables,
				)) {
					written.add(key);
				}
			}
		});

		for (const key of this.processEnvKeys) {
			if (!written.has(key)) {
				delete process.env[key];
			}
		}
		this.processEnvKeys = written;
	}

	private assignVariables(
		target: Record<string, any>,
		strategy: ConfigLoaderStrategy,
		variables: Record<string, any>,
	): string[] {
		const { registerAs } = strategy;

		if (registerAs) {
			setOn(target, registerAs, variables);
			return [registerAs];
		}

		const keys = Object.keys(variables);
		for (const key of keys) {
			setOn(target, key, variables[key]);
		}
		return keys;
	}

	private debug(message: string, identifier?: string | Symbol): void {
		if (this.options?.debug) {
			this.logger.debug(
				`${DEBUG_LOG_PREFIX} ${identifier || NOT_IDENTIFIED}: ${message}`,
			);
		}
	}
}
