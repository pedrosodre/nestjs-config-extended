import { DynamicModule, Module } from '@nestjs/common';
import {
	ConfigLoaderStrategy,
	ExtendedConfigModule,
	ExtendedConfigModuleSyncOptions,
	processEnvLoader,
} from '../../lib';
import { SampleStrategyModule } from './sample-strategy.module';
import { SampleStrategyService } from './sample-strategy.service';

@Module({})
export class AppModule {
	static withCache(
		cache: boolean,
		variables: Record<string, any>,
	): DynamicModule {
		return {
			module: AppModule,
			imports: [
				ExtendedConfigModule.forRoot({
					cache,
					strategies: [
						{
							identifier: 'TEST_STRATEGY',
							loader: () => variables,
						},
					],
				}),
			],
		};
	}

	static withDebug(
		debug: boolean,
		variables: Record<string, any>,
	): DynamicModule {
		return {
			module: AppModule,
			imports: [
				ExtendedConfigModule.forRoot({
					debug,
					strategies: [
						{
							identifier: 'TEST_STRATEGY',
							loader: () => variables,
						},
					],
				}),
			],
		};
	}

	static withStrategy(
		strategies: ConfigLoaderStrategy[],
		options?: ExtendedConfigModuleSyncOptions,
	): DynamicModule {
		const moduleOptions = options ? { strategies, ...options } : { strategies };
		return {
			module: AppModule,
			imports: [ExtendedConfigModule.forRoot(moduleOptions)],
		};
	}

	static withInjectedStrategy(): DynamicModule {
		return {
			module: AppModule,
			imports: [
				SampleStrategyModule,
				ExtendedConfigModule.forRootAsync({
					imports: [SampleStrategyModule],
					useFactory: async (loaderClass: SampleStrategyService) => {
						return {
							strategies: [
								{
									identifier: 'INJECTED_CLASS_STRATEGY',
									loader: loaderClass,
								},
							],
						};
					},
					inject: [SampleStrategyService],
				}),
			],
		};
	}
}
