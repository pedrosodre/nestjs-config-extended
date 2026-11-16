import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
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
	RELOADING_VARIABLES_FROM_STRATEGY_BY_INTERVAL,
	ON_CHANGE_HOOK_FAILED,
	ON_RELOAD_ERROR_HOOK_FAILED,
	LOADED_KEYS,
} from './config.constants';
import {
	ConfigChangeEvent,
	ConfigLoaderStrategy,
	ConfigPath,
	ConfigPathValue,
	CronScheduledTask,
	CronScheduler,
	ExtendedConfigModuleOptions,
} from './interfaces';
import {
	InvalidReloadIntervalException,
	InvalidScheduleException,
	MissingConfigException,
	ProcessEnvAssignmentException,
} from './exceptions';
import { retrieveVariablesByStrategy } from './util/loader.util';
import { isUndefined } from './util/is-undefined.util';
import { isDeepEqual } from './util/deep-equal.util';
import { parseDuration } from './util/duration.util';
import { cloneConfigValue } from './util/clone.util';
import { createConfigProxy } from './util/config-proxy.util';
import { redactConfig } from './util/redact.util';

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
	private readonly intervals: ReturnType<typeof setInterval>[] = [];
	/** Strategies (by index) whose background reload is already configured. */
	private readonly configuredSchedulers = new Set<number>();
	/** In-flight load of each strategy, so reloads never overlap. */
	private readonly inFlight = new Map<number, Promise<void>>();
	/** Merged view of the configuration, used to detect changes. */
	private current: Record<string, any> = {};
	private readonly version$ = new BehaviorSubject<number>(0);
	private readonly changes$ = new Subject<ConfigChangeEvent>();

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

		if (baseTarget && typeof baseTarget === 'object') {
			return createConfigProxy(() => this.get(propertyPath, defaultValue));
		}

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

	private async loadVariables(): Promise<void> {
		for (const strategy of this.options.strategies || []) {
			this.debug(STARTING_STRATEGY, strategy.identifier);
			await this.loadVariablesByStrategy(strategy);
			this.configureScheduler(strategy);
		}
	}

	private configureSchedulerOnPreload(): void {
		for (const strategy of this.options.strategies || []) {
			this.configureScheduler(strategy);
		}
	}

	private configureScheduler(strategy: ConfigLoaderStrategy): void {
		const {
			reloadable,
			identifier,
			schedule,
			scheduleTimezone,
			reloadInterval,
			disable,
		} = strategy;

		const index = (this.options.strategies || []).indexOf(strategy);
		if (disable || !reloadable || this.configuredSchedulers.has(index)) {
			return;
		}

		if (schedule && reloadInterval !== undefined) {
			throw new InvalidReloadIntervalException(
				'schedule and reloadInterval cannot be used together',
				identifier,
			);
		}

		if (schedule) {
			if (!this.scheduler.validate(schedule)) {
				throw new InvalidScheduleException(identifier);
			}

			const task = this.scheduler.schedule(
				schedule,
				() =>
					this.runBackgroundReload(
						strategy,
						RELOADING_VARIABLES_FROM_STRATEGY_BY_SCHEDULER,
					),
				{
					scheduled: true,
					timezone: scheduleTimezone,
				},
			);

			if (task) {
				this.scheduledTasks.push(task);
			}
		}

		if (reloadInterval !== undefined) {
			const interval = parseDuration(reloadInterval);
			if (interval === undefined) {
				throw new InvalidReloadIntervalException(
					`"${reloadInterval}" is not a positive duration (e.g. 30000, "30s", "5m")`,
					identifier,
				);
			}

			const timer = setInterval(
				() =>
					this.runBackgroundReload(
						strategy,
						RELOADING_VARIABLES_FROM_STRATEGY_BY_INTERVAL,
					),
				interval,
			);
			// Do not keep the process alive only because of config reloads.
			timer.unref?.();
			this.intervals.push(timer);
		}

		this.configuredSchedulers.add(index);
	}

	private async runBackgroundReload(
		strategy: ConfigLoaderStrategy,
		debugMessage: string,
	): Promise<void> {
		const { identifier } = strategy;
		this.debug(debugMessage, identifier);

		try {
			await this.loadVariablesByStrategy(strategy);
		} catch (err) {
			// Keep the last loaded values and report through the Nest logger.
			this.logger.error(
				`${DEBUG_LOG_PREFIX} ${
					identifier || NOT_IDENTIFIED
				}: ${SCHEDULED_RELOAD_FAILED}`,
				(err as Error)?.stack || String(err),
			);
			await this.handleReloadError(err, identifier);
		}
	}

	/**
	 * Stops every scheduled reload so timers do not outlive the application.
	 */
	onModuleDestroy(): void {
		for (const task of this.scheduledTasks.splice(0)) {
			task.destroy();
		}
		for (const timer of this.intervals.splice(0)) {
			clearInterval(timer);
		}
		this.changes$.complete();
		this.version$.complete();
	}

	/**
	 * Method that reloads environment variables on strategies that allows reload.
	 *
	 * @param strategyIdentifier optional strategy's identifier to allow reload environment variables from a single strategy.
	 */
	async reload(strategyIdentifier?: string | Symbol): Promise<void> {
		if (strategyIdentifier) {
			const strategy = this.options.strategies?.find(
				singleStrategy => singleStrategy.identifier === strategyIdentifier,
			);

			if (strategy?.reloadable) {
				this.debug(STARTING_RELOAD, strategy.identifier);
				try {
					await this.loadVariablesByStrategy(strategy);
				} catch (err) {
					await this.handleReloadError(err, strategy.identifier);
					throw err;
				}
			}
			return;
		}

		this.debug(STARTING_RELOAD, ALL_STRATEGIES);

		// Reload every reloadable strategy even if one fails, report each failure
		// with its identifier, then reject with the first error.
		let firstError: unknown;
		for (const strategy of this.options.strategies || []) {
			if (!strategy.reloadable) {
				continue;
			}

			this.debug(STARTING_STRATEGY, strategy.identifier);
			try {
				await this.loadVariablesByStrategy(strategy);
			} catch (err) {
				firstError = firstError ?? err;
				await this.handleReloadError(err, strategy.identifier);
			}
		}

		if (firstError !== undefined) {
			throw firstError;
		}
	}

	/**
	 * Emits the value at a key or dotted path now and every time it changes.
	 *
	 * @param propertyPath property path (key) to watch.
	 */
	watch<P extends ConfigPath<K>>(
		propertyPath: P,
	): Observable<ConfigPathValue<K, P> | undefined>;
	watch<T = any>(propertyPath: ConfigPath<K>): Observable<T | undefined>;
	watch(propertyPath: ConfigPath<K>): Observable<any> {
		return this.version$.pipe(
			map(() => this.get(propertyPath)),
			distinctUntilChanged(isDeepEqual),
		);
	}

	/**
	 * Returns a copy of the loaded configuration with sensitive values masked
	 * (see the "redact" module option). Also used by JSON.stringify(service).
	 */
	toJSON(): Record<string, any> {
		const { redact } = this.options;
		return redact === false
			? cloneConfigValue(this.current)
			: redactConfig(this.current, redact);
	}

	/**
	 * Emits an event every time a load or reload changes the configuration.
	 */
	changes(): Observable<ConfigChangeEvent> {
		return this.changes$.asObservable();
	}

	private loadVariablesByStrategy(
		strategy: ConfigLoaderStrategy,
	): Promise<void> {
		// Join an in-flight load of the same strategy instead of overlapping it.
		const index = (this.options.strategies || []).indexOf(strategy);
		const running = this.inFlight.get(index);
		if (running) {
			return running;
		}

		const promise = (async () => {
			try {
				await this.loadStrategy(strategy, index);
			} finally {
				this.inFlight.delete(index);
			}
		})();
		this.inFlight.set(index, promise);
		return promise;
	}

	private async loadStrategy(
		strategy: ConfigLoaderStrategy,
		index: number,
	): Promise<void> {
		const { disable, identifier } = strategy;

		if (!disable) {
			const loadedVariables: Record<string, any> =
				await this.retrieveVariables(strategy);

			// Only key names are logged, never values.
			this.debug(
				`${LOADED_KEYS}: ${Object.keys(loadedVariables).join(', ')}`,
				identifier,
			);

			if (this.isCacheEnabled) {
				this.debug(ASSIGNING_VARIABLES_TO_CACHE, identifier);
			} else {
				this.debug(ASSIGNING_VARIABLES_TO_PROCESS_ENV, identifier);
			}

			if (!this.isCacheEnabled) {
				// Validate before storing so an invalid result never becomes current.
				this.toProcessEnvValues(strategy, loadedVariables);
			}

			this.results[index] = { ...loadedVariables };
			this.applyResults(identifier);
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
	private applyResults(identifier?: string | Symbol): void {
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
			this.notifyChanges(next, identifier);
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
		this.notifyChanges(envValues, identifier);
	}

	private notifyChanges(
		next: Record<string, any>,
		identifier?: string | Symbol,
	): void {
		const previous = this.current;
		this.current = next;

		const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
		const changedKeys = [...keys].filter(
			key => !isDeepEqual(previous[key], next[key]),
		);

		if (!changedKeys.length) {
			return;
		}

		const event: ConfigChangeEvent = {
			reason: this.isLoaded ? 'reload' : 'load',
			identifier,
			changedKeys,
		};

		this.version$.next(this.version$.value + 1);
		this.changes$.next(event);
		this.runHook(ON_CHANGE_HOOK_FAILED, identifier, () =>
			this.options.onChange?.(event),
		);
	}

	private async handleReloadError(
		error: unknown,
		identifier?: string | Symbol,
	): Promise<void> {
		const err = error instanceof Error ? error : new Error(String(error));
		await this.runHook(ON_RELOAD_ERROR_HOOK_FAILED, identifier, () =>
			this.options.onReloadError?.(err, identifier),
		);
	}

	private async runHook(
		failureMessage: string,
		identifier: string | Symbol | undefined,
		hook: () => void | Promise<void> | undefined,
	): Promise<void> {
		try {
			await hook();
		} catch (err) {
			this.logger.error(
				`${DEBUG_LOG_PREFIX} ${identifier || NOT_IDENTIFIED}: ${failureMessage}`,
				(err as Error)?.stack || String(err),
			);
		}
	}

	private assignVariables(
		target: Record<string, any>,
		strategy: ConfigLoaderStrategy,
		variables: Record<string, any>,
	): void {
		const { registerAs } = strategy;

		// Clone so building the merged view never mutates stored strategy results
		// (or the previous snapshot used to detect changes).
		if (registerAs) {
			setOn(target, registerAs, cloneConfigValue(variables));
			return;
		}

		for (const key of Object.keys(variables)) {
			setOn(target, key, cloneConfigValue(variables[key]));
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

// Mask sensitive values when the service is printed with console.log or
// util.inspect. Same symbol as util.inspect.custom.
Object.defineProperty(
	ExtendedConfigService.prototype,
	Symbol.for('nodejs.util.inspect.custom'),
	{
		value(this: ExtendedConfigService) {
			return this.toJSON();
		},
	},
);
