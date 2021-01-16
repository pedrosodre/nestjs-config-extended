import { Inject, Injectable, Logger } from '@nestjs/common';
import isFunction from 'lodash.isfunction';
import { isUndefined } from 'util';
import getFrom from 'lodash.get';
import hasOn from 'lodash.has';
import setOn from 'lodash.set';
import {
	EXTENDED_CONFIG_OPTIONS,
	CRON_SCHEDULER,
	INVALID_VARIABLES,
	NOT_IDENTIFIED,
	STARTING_STRATEGY,
	LOADING_VARIABLES_FROM_STRATEGY,
	VALIDATING_VARIABLES_FROM_STRATEGY,
	TRANSFORMING_VARIABLES_FROM_STRATEGY,
	ASSIGNING_VARIABLES_TO_PROCESS_ENV,
	ASSIGNING_VARIABLES_TO_CACHE,
	STARTING_RELOAD,
	ALL_STRATEGIES,
	RELOADING_VARIABLES_FROM_STRATEGY_BY_SCHEDULER,
	NOT_LOADED_STRATEGY_DISABLED,
	FIRST_LOAD_REQUESTED,
	LOAD_REQUEST_IGNORED_DUE_ALREADY_LOADED,
	LOAD_REQUEST_IGNORED_DUE_IN_PROGRESS,
} from './config.constants';
import {
	ConfigLoaderStrategy,
	ExtendedConfigModuleOptions,
	LoaderClass,
	LoaderMethod,
	TransformerClass,
	TransformerMethod,
	ValidatorClass,
	ValidatorMethod,
} from './interfaces';
import {
	InvalidLoaderException,
	InvalidScheduleException,
	InvalidTransformerException,
	InvalidValidatorException,
	LoadingException,
	TransformationException,
	ValidationException,
} from './exceptions';
import cron from 'node-cron';

@Injectable()
export class ExtendedConfigService<K = Record<string, any>> {
	private loaded: boolean = false;
	private loading: boolean = false;
	private readonly cache: Record<string, any> = {};

	constructor(
		@Inject(EXTENDED_CONFIG_OPTIONS)
		private readonly options: ExtendedConfigModuleOptions,
		@Inject(CRON_SCHEDULER)
		private readonly scheduler: typeof cron,
		private readonly logger: Logger,
	) {}

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

	private get isDebugEnabled(): boolean {
		return this.options.debug || false;
	}

	private async loadVariables(onlyReloadable: boolean = false): Promise<void> {
		for await (const strategy of this.options.strategies || []) {
			const { reloadable, identifier, schedule, scheduleTimezone } = strategy;

			if (!onlyReloadable || reloadable) {
				this.debug(STARTING_STRATEGY, identifier);

				await this.loadVariablesByStrategy(strategy);

				if (!onlyReloadable && schedule && reloadable) {
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
		const { loader, identifier, options } = strategy;
		let loadedVariables: Record<string, any> = {};

		try {
			this.debug(LOADING_VARIABLES_FROM_STRATEGY, identifier);

			if (isFunction(loader)) {
				loadedVariables = await (loader as LoaderMethod)(options);
			} else if (isFunction(loader?.load)) {
				loadedVariables = await (loader as LoaderClass).load(options);
			} else {
				throw new InvalidLoaderException(identifier);
			}
		} catch (err) {
			if (err instanceof InvalidLoaderException) {
				throw err;
			}

			throw new LoadingException(err, identifier);
		}

		await this.validateVariables(strategy, loadedVariables);

		loadedVariables = await this.transformVariables(strategy, loadedVariables);

		return loadedVariables;
	}

	private async transformVariables(
		strategy: ConfigLoaderStrategy,
		variables: Record<string, any>,
	): Promise<Record<string, any>> {
		const { transformer, identifier } = strategy;

		if (transformer) {
			this.debug(TRANSFORMING_VARIABLES_FROM_STRATEGY, identifier);

			try {
				if (isFunction(transformer)) {
					variables = await (transformer as TransformerMethod)(variables);
				} else if (isFunction(transformer?.transform)) {
					variables = await (transformer as TransformerClass).transform(
						variables,
					);
				} else {
					throw new InvalidTransformerException(identifier);
				}
			} catch (err) {
				if (err instanceof InvalidTransformerException) {
					throw err;
				}

				throw new TransformationException(err, identifier);
			}
		}

		return variables;
	}

	private async validateVariables(
		strategy: ConfigLoaderStrategy,
		variables: Record<string, any>,
	): Promise<void> {
		const { validator, identifier } = strategy;
		let isValid = true;

		try {
			if (validator) {
				this.debug(VALIDATING_VARIABLES_FROM_STRATEGY, identifier);

				if (isFunction(validator)) {
					isValid = await (validator as ValidatorMethod)(variables);
				} else if (isFunction(validator?.validate)) {
					isValid = await (validator as ValidatorClass).validate(variables);
				} else {
					throw new InvalidValidatorException(identifier);
				}
			}
		} catch (err) {
			if (err instanceof InvalidValidatorException) {
				throw err;
			}

			throw new ValidationException(err, identifier);
		}

		if (!isValid) {
			throw new ValidationException(INVALID_VARIABLES, identifier);
		}
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
		if (this.isDebugEnabled) {
			this.logger.debug(
				`[Extended Config Module] ${identifier || NOT_IDENTIFIED}: ${message}`,
			);
		}
	}
}
