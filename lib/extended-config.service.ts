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
	ConfigPath,
	ConfigPathValue,
	CronScheduledTask,
	CronScheduler,
	ExtendedConfigModuleOptions,
} from './interfaces';
import {
	InvalidScheduleException,
	MissingConfigException,
	ProcessEnvAssignmentException,
} from './exceptions';
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
		if (!this.isCacheEnabled) {
			const withRegisterAs = (options.strategies || []).find(
				strategy => strategy.registerAs && !strategy.disable,
			);
			if (withRegisterAs) {
				throw new ProcessEnvAssignmentException(
					'registerAs requires cache to be enabled',
					withRegisterAs.identifier,
				);
			}
		}

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
	 * Retrieves a configuration value by key or dotted path (e.g. "db.host").
	 * When the service is typed (`ExtendedConfigService<Config>`), paths are
	 * autocompleted and the return type is inferred.
	 *
	 * @param propertyPath property path (key) associated with the desired variable.
	 * @param defaultValue optional default variable to be returned if the service does not have the requested variable.
	 */
	get<P extends ConfigPath<K>>(
		propertyPath: P,
	): ConfigPathValue<K, P> | undefined;
	get<P extends ConfigPath<K>>(
		propertyPath: P,
		defaultValue: ConfigPathValue<K, P>,
	): ConfigPathValue<K, P>;
	get<T = any>(propertyPath: ConfigPath<K>, defaultValue?: T): T | undefined;
	get(propertyPath: string, defaultValue?: unknown): any {
		const value = this.isCacheEnabled
			? getFrom(this.cache, propertyPath)
			: getFrom(process.env, propertyPath);

		return isUndefined(value) ? defaultValue : value;
	}

	/**
	 * Retrieves a configuration value and throws a MissingConfigException when
	 * it is not defined.
	 *
	 * @param propertyPath property path (key) associated with the desired variable.
	 */
	getOrThrow<P extends ConfigPath<K>>(
		propertyPath: P,
	): NonNullable<ConfigPathValue<K, P>>;
	getOrThrow<T = any>(propertyPath: ConfigPath<K>): T;
	getOrThrow(propertyPath: string): any {
		const value = this.get(propertyPath as ConfigPath<K>);

		if (isUndefined(value)) {
			throw new MissingConfigException(propertyPath);
		}

		return value;
	}

	/**
	 * Method that retrieve a proxy of an environment variable given a key.
	 *
	 * @param propertyPath property path (key) associated with the desired variable.
	 * @param defaultValue optional default variable to be returned if the service does not have the requested variable.
	 */
	getProxyOf<P extends ConfigPath<K>>(
		propertyPath: P,
		defaultValue?: ConfigPathValue<K, P>,
	): ConfigPathValue<K, P> | undefined;
	getProxyOf<T = any>(
		propertyPath: ConfigPath<K>,
		defaultValue?: T,
	): T | undefined;
	getProxyOf(propertyPath: ConfigPath<K>, defaultValue?: unknown): any {
		const baseTarget = this.get(propertyPath, defaultValue);

		if (baseTarget && typeof baseTarget === 'object')
			return new Proxy(baseTarget, {
				get: (_target, property: string) => {
					const target: Record<string, unknown> =
						this.get<Record<string, unknown>>(
							propertyPath,
							defaultValue as Record<string, unknown>,
						) || {};

					return target?.[property];
				},
			});

		return baseTarget;
	}

	/**
	 * Method that verify if an environment variable exists given a key.
	 *
	 * @param propertyPath property path (key) associated with the desired variable.
	 *
	 * @returns a boolean that indicates the existence of an environment variable.
	 */
	has(propertyPath: ConfigPath<K>): boolean {
		return this.isCacheEnabled
			? hasOn(this.cache, propertyPath)
			: hasOn(process.env, propertyPath);
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

			if (!this.isCacheEnabled) {
				// Validate before storing so an invalid result never becomes current.
				this.toProcessEnvValues(strategy, loadedVariables);
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

		// process.env only holds strings, so values are written flat under their
		// literal key (no path splitting) and must be primitives.
		const envValues: Record<string, string> = {};
		strategies.forEach((strategy, index) => {
			const variables = this.results[index];
			if (variables) {
				Object.assign(envValues, this.toProcessEnvValues(strategy, variables));
			}
		});

		const written = new Set(Object.keys(envValues));
		for (const key of written) {
			process.env[key] = envValues[key];
		}

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
	): void {
		const { registerAs } = strategy;

		if (registerAs) {
			setOn(target, registerAs, variables);
			return;
		}

		for (const key of Object.keys(variables)) {
			setOn(target, key, variables[key]);
		}
	}

	private toProcessEnvValues(
		strategy: ConfigLoaderStrategy,
		variables: Record<string, any>,
	): Record<string, string> {
		const { identifier } = strategy;
		const values: Record<string, string> = {};

		for (const key of Object.keys(variables)) {
			const value = variables[key];

			if (value === undefined || value === null) {
				continue;
			}

			if (!['string', 'number', 'boolean'].includes(typeof value)) {
				throw new ProcessEnvAssignmentException(
					`value of "${key}" is a ${
						Array.isArray(value) ? 'array' : typeof value
					}, only strings, numbers and booleans are supported`,
					identifier,
				);
			}

			values[key] = String(value);
		}

		return values;
	}

	private debug(message: string, identifier?: string | Symbol): void {
		if (this.options?.debug) {
			this.logger.debug(
				`${DEBUG_LOG_PREFIX} ${identifier || NOT_IDENTIFIED}: ${message}`,
			);
		}
	}
}
