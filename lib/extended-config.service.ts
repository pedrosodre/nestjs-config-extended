import { Inject, Injectable, Logger } from '@nestjs/common';
import { isUndefined } from 'util';
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
} from './config.constants';
import {
	ConfigLoaderStrategy,
	ExtendedConfigModuleOptions,
} from './interfaces';
import { InvalidScheduleException } from './exceptions';
import cron from 'node-cron';
import { retrieveVariablesByStrategy } from './util/loader.util';

@Injectable()
export class ExtendedConfigService<K = Record<string, any>> {
	private loaded: boolean = false;
	private loading: boolean = false;
	private readonly cache: Record<string, any> = {};

	private DEBUG_LOG_PREFIX = '[Extended Config Module]';

	constructor(
		@Inject(EXTENDED_CONFIG_OPTIONS)
		private readonly options: ExtendedConfigModuleOptions,
		@Inject(CRON_SCHEDULER)
		private readonly scheduler: typeof cron,
		private readonly logger: Logger,
		@Inject(PRE_LOADED_VALUES) preLoadedValues?: Record<string, any>,
	) {
		if (preLoadedValues) {
			this.debug(VARIABLES_PRELOADED_BY_MODULE, ALL_STRATEGIES);

			for (const key of Object.keys(preLoadedValues)) {
				this.set(key as any, preLoadedValues[key]);
			}
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

	private get isLoading(): boolean {
		return this.loading;
	}

	private set isLoading(isLoading: boolean) {
		this.loading = isLoading;
	}

	/**
	 * Method that initiates the first loading of the variables.
	 * This method can be called multiple times, but variables will be loaded only on first call.
	 *
	 * @param ensureLoad optional boolean that forces method to resolve the promise only after finishing the loading.
	 * If "false" and service already have a loading in progress, this method will not wait for it.
	 */
	async load(ensureLoad: boolean = false): Promise<void> {
		if (!this.isLoaded && !this.isLoading) {
			this.debug(FIRST_LOAD_REQUESTED, ALL_STRATEGIES);

			this.isLoading = true;
			await this.loadVariables();
			this.isLoading = false;
			this.isLoaded = true;
		} else {
			if (this.isLoaded) {
				this.debug(LOAD_REQUEST_IGNORED_DUE_ALREADY_LOADED, ALL_STRATEGIES);
			} else if (this.isLoading) {
				this.debug(LOAD_REQUEST_IGNORED_DUE_IN_PROGRESS, ALL_STRATEGIES);
			}

			if (ensureLoad) {
				while (!this.isLoaded) {
					await new Promise(r => setTimeout(r, 100));
				}
			}
		}
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

	private set<T = any>(propertyPath: keyof K, value: T): void {
		if (this.isCacheEnabled) {
			setOn(this.cache, propertyPath, value);
		} else {
			setOn(process.env, propertyPath, value);
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
		const {
			reloadable,
			identifier,
			schedule,
			scheduleTimezone,
			disable,
		} = strategy;

		if (!disable && schedule && reloadable) {
			if (!this.scheduler.validate(schedule)) {
				throw new InvalidScheduleException(identifier);
			}

			this.scheduler.schedule(
				schedule,
				async () => {
					this.debug(
						RELOADING_VARIABLES_FROM_STRATEGY_BY_SCHEDULER,
						identifier,
					);
					await this.loadVariablesByStrategy(strategy);
				},
				{
					scheduled: true,
					timezone: scheduleTimezone,
				},
			);
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
			const loadedVariables: Record<string, any> = await this.retrieveVariables(
				strategy,
			);

			this.assignVariables(strategy, loadedVariables);
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
							`${this.DEBUG_LOG_PREFIX} ${
								identifier || NOT_IDENTIFIED
							}: ${message}`,
						);
				  }
				: undefined,
		);
	}

	private assignVariables(
		strategy: ConfigLoaderStrategy,
		variables: Record<string, any>,
	): void {
		const { registerAs, identifier } = strategy;

		if (this.isCacheEnabled) {
			this.debug(ASSIGNING_VARIABLES_TO_CACHE, identifier);
		} else {
			this.debug(ASSIGNING_VARIABLES_TO_PROCESS_ENV, identifier);
		}

		if (registerAs) {
			this.set(registerAs as keyof K, variables);
		} else {
			Object.keys(variables).forEach((key: string) => {
				this.set(key as keyof K, variables[key]);
			});
		}
	}

	private debug(message: string, identifier?: string | Symbol): void {
		if (this.options?.debug) {
			this.logger.debug(
				`${this.DEBUG_LOG_PREFIX} ${identifier || NOT_IDENTIFIED}: ${message}`,
			);
		}
	}
}
