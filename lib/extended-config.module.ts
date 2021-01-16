import { DynamicModule, Module, Provider, Logger } from '@nestjs/common';
import { CRON_SCHEDULER, EXTENDED_CONFIG_OPTIONS } from './config.constants';
import { ExtendedConfigService } from './extended-config.service';
import {
	ExtendedConfigModuleSyncOptions,
	ExtendedConfigModuleAsyncOptions,
} from './interfaces';
import * as cron from 'node-cron';

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
	],
})
export class ExtendedConfigModule {
	constructor(private extendedConfigService: ExtendedConfigService) { }

	/**
	 * Loads environment variables based on strategies.
	 * If no strategy is passed and cache is disabled, current process.env will be used.
	 * @param options
	 */
	static forRoot(options: ExtendedConfigModuleSyncOptions): DynamicModule {
		return {
			module: ExtendedConfigModule,
			global: options.isGlobal,
			providers: [
				{
					provide: EXTENDED_CONFIG_OPTIONS,
					useValue: options,
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
		await this.extendedConfigService.load();
	}
}
