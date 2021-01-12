import {
	ModuleMetadata,
	Type,
	DynamicModule,
	ForwardReference,
	Abstract,
} from '@nestjs/common';
import { ExtendedConfigModule } from '../extended-config.module';
import { ConfigLoaderStrategy } from './config-loader-strategy.interface';

export interface ExtendedConfigModuleOptions {
	/**
	 * Array with all strategies used to load configuration variables.
	 * This module has some loaders ready to use, but feel free to create your own.
	 */
	strategies?: ConfigLoaderStrategy[];

	/**
	 * If "false", values will be stored directly in process.env object.
	 * If "true", values will be stored only in the memory.
	 * If you already have something on process.env and cache is enabled, you should add a strategy to load it.
	 * Default value is "true", since it improves the overall application performance.
	 * See: https://github.com/nodejs/node/issues/3104
	 */
	cache?: boolean;

	/**
	 * If "true", module will log some internal process information.
	 */
	debug?: boolean;
}

export interface ExtendedConfigModuleSyncOptions
	extends ExtendedConfigModuleOptions {
	/**
	 * If "true", registers `ExtendedConfigModule` as a global module.
	 * See: https://docs.nestjs.com/modules#global-modules
	 */
	isGlobal?: boolean;
}

export interface ExtendedConfigModuleAsyncOptions
	extends Pick<ModuleMetadata, 'imports'> {
	/**
	 * If "true", registers `ExtendedConfigModule` as a global module.
	 * See: https://docs.nestjs.com/modules#global-modules
	 */
	isGlobal?: boolean;

	imports?: (
		Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
	)[];
	useFactory?: (
		...args: any[]
	) => Promise<ExtendedConfigModuleOptions> | ExtendedConfigModuleOptions;
	inject?: (Type<any> | string | symbol | Abstract<any> | Function)[];
}
