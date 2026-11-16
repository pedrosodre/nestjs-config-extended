import {
	DynamicModule,
	FactoryProvider,
	ForwardReference,
	ModuleMetadata,
	Type,
} from '@nestjs/common';
import { ConfigChangeEvent } from './config-change-event.interface';
import { ConfigLoaderStrategy } from './config-loader-strategy.interface';
import { RedactOptions } from './redact-options.interface';

export interface ExtendedConfigModuleOptions {
	/**
	 * Array with all strategies used to load configuration variables.
	 * This module has some loaders ready to use, but feel free to create your own.
	 */
	strategies?: ConfigLoaderStrategy[];

	/**
	 * If "false", values will be stored directly in process.env object.
	 * In that mode values are stored as strings under their literal key, so only
	 * string, number and boolean values are accepted and registerAs is not supported.
	 * If "true", values will be stored only in the memory.
	 * If you already have something on process.env and cache is enabled, you should add a strategy to load it.
	 * Default value is "true", since it improves the overall application performance.
	 * See: https://github.com/nodejs/node/issues/3104
	 */
	cache?: boolean;

	/**
	 * If "true", service will log some internal process information.
	 */
	debug?: boolean;

	/**
	 * How sensitive values are masked by the service's toJSON() and util.inspect
	 * (used by console.log). Set to "false" to disable masking.
	 */
	redact?: RedactOptions | false;

	/**
	 * Called after a load or reload changes at least one top-level key.
	 * Errors thrown by this hook are logged and do not affect loading.
	 */
	onChange?: (event: ConfigChangeEvent) => void | Promise<void>;

	/**
	 * Called when a reload fails (scheduled or through reload()).
	 * The previously loaded values are kept.
	 */
	onReloadError?: (
		error: Error,
		identifier?: string | symbol,
	) => void | Promise<void>;
}

export interface ExtendedConfigModuleSyncOptions
	extends ExtendedConfigModuleOptions {
	/**
	 * If "true", registers `ExtendedConfigModule` as a global module.
	 * See: https://docs.nestjs.com/modules#global-modules
	 */
	isGlobal?: boolean;

	/**
	 * If "true", variables load will be done by the module and injected on service.
	 * This option is required if you need to inject the service on a custom provider and retrieve a variable before application is totally ready.
	 * This option isn't compatible with module's forRootAsync() method.
	 */
	preload?: boolean;
}

export interface ExtendedConfigModuleAsyncOptions
	extends Pick<ModuleMetadata, 'imports'> {
	/**
	 * If "true", registers `ExtendedConfigModule` as a global module.
	 * See: https://docs.nestjs.com/modules#global-modules
	 */
	isGlobal?: boolean;

	imports?: (
		| Type<any>
		| DynamicModule
		| Promise<DynamicModule>
		| ForwardReference
	)[];
	useFactory?: (
		...args: any[]
	) => Promise<ExtendedConfigModuleOptions> | ExtendedConfigModuleOptions;
	inject?: FactoryProvider['inject'];
}
