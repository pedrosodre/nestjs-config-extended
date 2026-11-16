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
	CronScheduler,
} from './interfaces';
import * as cron from 'node-cron';
import { retrieveVariablesByStrategy } from './util/loader.util';

@Module({
	providers: [
		Logger,
		{
			provide: CRON_SCHEDULER,
			useValue: cron as unknown as CronScheduler,
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
		// Results are kept per strategy (same order as options.strategies) so the
		// service can rebuild the configuration exactly as it does on reload.
		let preLoadedResults: (Record<string, any> | undefined)[] | null = null;

		if (options?.preload) {
			preLoadedResults = [];

			for (const strategy of options.strategies || []) {
				preLoadedResults.push(
					strategy.disable
						? undefined
						: { ...(await retrieveVariablesByStrategy(strategy)) },
				);
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
					useValue: preLoadedResults,
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
