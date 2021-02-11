import { DynamicModule, Module, Provider, Logger } from '@nestjs/common';
import {
	CRON_SCHEDULER,
	EXTENDED_CONFIG_OPTIONS,
	PRE_LOADED_VALUES,
} from './config.constants';
import { ExtendedConfigService } from './extended-config.service';
import {
	ExtendedConfigModuleSyncOptions,
	ExtendedConfigModuleAsyncOptions,
} from './interfaces';
import * as cron from 'node-cron';
import { retrieveVariablesByStrategy } from './util/loader.util';
import setOn from 'lodash.set';

@Module({
	providers: [
		Logger,
		{
			provide: CRON_SCHEDULER,
			useValue: cron,
		},
		{
			provide: EXTENDED_CONFIG_OPTIONS,
			useValue: {},
		},
		{
			provide: PRE_LOADED_VALUES,
			useValue: null,
		},
	],
})
export class ExtendedConfigModule {
	constructor(private extendedConfigService: ExtendedConfigService) {}

	/**
	 * Loads environment variables based on strategies.
	 * If no strategy is passed and cache is disabled, current process.env will be used.
	 * @param options
	 */
	static async forRoot(
		options: ExtendedConfigModuleSyncOptions,
	): Promise<DynamicModule> {
		let preLoadedVariables: Record<string, any> | null = null;

		if (options?.preload) {
			preLoadedVariables = {};

			for (const strategy of options.strategies || []) {
				const { registerAs } = strategy;
				const variables = await retrieveVariablesByStrategy(strategy);

				if (registerAs) {
					setOn(
						preLoadedVariables as Record<string, any>,
						registerAs,
						variables,
					);
				} else {
					Object.keys(variables).forEach((key: string) => {
						setOn(
							preLoadedVariables as Record<string, any>,
							key,
							variables[key],
						);
					});
				}
			}
		}

		return {
			module: ExtendedConfigModule,
			global: options.isGlobal,
			providers: [
				{
					provide: EXTENDED_CONFIG_OPTIONS,
					useValue: options,
				},
				{
					provide: PRE_LOADED_VALUES,
					useValue: preLoadedVariables,
				},
				ExtendedConfigService,
			],
			exports: [ExtendedConfigService],
		};
	}

	/**
	 * Asynchronously loads environment variables based on strategies.
	 * If no strategy is passed and cache is disabled, current process.env will be used.
	 * @param options
	 */
	static forRootAsync(
		options: ExtendedConfigModuleAsyncOptions,
	): DynamicModule {
		return {
			module: ExtendedConfigModule,
			global: options.isGlobal,
			providers: [...this.createAsyncProviders(options), ExtendedConfigService],
			exports: [ExtendedConfigService],
			imports: options.imports,
		};
	}

	private static createAsyncProviders(
		options: ExtendedConfigModuleAsyncOptions,
	): Provider[] {
		if (options.useFactory) {
			return [
				{
					provide: EXTENDED_CONFIG_OPTIONS,
					useFactory: options.useFactory,
					inject: options.inject || [],
				},
			];
		}

		return [];
	}

	protected async onModuleInit() {
		const ensureLoad = true;
		await this.extendedConfigService.load(ensureLoad);
	}
}
