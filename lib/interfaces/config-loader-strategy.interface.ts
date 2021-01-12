import { Timezone } from 'tz-offset';

type LoaderReturnValue = Record<string, any> | Promise<Record<string, any>>;

export type LoaderMethod<T extends LoaderReturnValue = LoaderReturnValue> = (
	options?: Record<string, any>,
) => T;

export interface LoaderClass {
	load: LoaderMethod;
}

export type TransformerMethod<
	T extends LoaderReturnValue = LoaderReturnValue
> = (variables: Record<string, any>) => T;

export interface TransformerClass {
	transform: TransformerMethod;
}

export type ValidatorMethod = (
	variables: Record<string, any>,
) => boolean | Promise<boolean>;

export interface ValidatorClass {
	validate: ValidatorMethod;
}

export interface ConfigLoaderStrategy {
	/**
	 * This module has some loaders ready to use.
	 * Accepts a custom function or class with load() method.
	 */
	loader: LoaderClass | LoaderMethod;

	/**
	 * Identify a strategy to allow module to manipulate it directly on helper functions.
	 */
	identifier?: string | Symbol;

	/**
	 * If "true", this strategy will not used.
	 * This flag is useful to perform conditional strategy disabling.
	 */
	disable?: boolean;

	/**
	 * Set options to loader class or function.
	 */
	options?: Record<string, any>;

	/**
	 * If "false", this strategy will not be called again when service or scheduler requests a reload.
	 */
	reloadable?: boolean;

	/**
	 * Schedules the strategy reload (if reloadable) using cron syntax.
	 * This feature may not work correctly with serverless functions.
	 */
	schedule?: string;

	/**
	 * Set scheduler timezone.
	 */
	scheduleTimezone?: Timezone;

	/**
	 * If set, all configuration will be set under the key passed on this variable.
	 */
	registerAs?: string;

	/**
	 * If you wish to transform the loaded configuration variables, you can pass a function to handle it.
	 * Accepts a function or a class with transform() method.
	 */
	transformer?: TransformerClass | TransformerMethod;

	/**
	 * If you wish to transform the loaded configuration variables, you can pass a function to handle it.
	 * Accepts a function or a class with validate() method.
	 */
	validator?: ValidatorClass | ValidatorMethod;
}
