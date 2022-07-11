<p align="center">
  <img src="./logo.png" width="320" alt="Nest Config Extended" />
</p>

<p align="center">
  Extended Configuration Module for Nest to load environment variables package.
</p>

<div>
    <img src="https://visitor-badge.glitch.me/badge?page_id=pedrosodre.nestjs-config-extended" alt="Visitor count" />
    <img src="https://img.shields.io/github/package-json/v/pedrosodre/nestjs-config-extended" alt="Module Version" />
    <img src="https://sonarcloud.io/api/project_badges/measure?project=nestjs-config-extended&metric=alert_status" alt="SonarCloud Alert Status">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=nestjs-config-extended&metric=security_rating" alt="SonarCloud Security Rating">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=nestjs-config-extended&metric=coverage" alt="SonarCloud Coverage">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=nestjs-config-extended&metric=bugs" alt="SonarCloud Bugs">
    <img src="https://img.shields.io/github/license/pedrosodre/nestjs-config-extended" alt="License" />
    <img src="https://img.shields.io/github/issues-raw/pedrosodre/nestjs-config-extended" alt="Issues" />
    <img src="https://img.shields.io/github/last-commit/pedrosodre/nestjs-config-extended" alt="GitHub Last Commit" />
</div>
<br />

> :warning: **Attention:** To support NestJS v8 and v9, this library will keep two stable versions. For NestJS v7, use `0.x` version.

## Description

Extended Configuration Module for [Nest](https://github.com/nestjs/nest) based on the [Nest's Configuration Module](https://docs.nestjs.com/techniques/configuration) to load environment variables.

## Installation

To begin using it, we first install the module itself.

```bash
$ npm i --save nestjs-config-extended
```

## Getting started

Once the module is installed, we can import the `ExtendedConfigModule`. Typically, we'll import it into the root application module. During the module initialization step, environment variable key/value pairs will be parsed and resolved.

```typescript
import { Module } from '@nestjs/common';
import { ExtendedConfigModule } from 'nestjs-config-extended';

@Module({
	imports: [ExtendedConfigModule],
})
export class AppModule {}
```

By default, `ExtendedConfigModule` will load variables in memory and should be empty since we didn't selected any strategy to load environment variables. If the key/value pairs we want already is on node's `process.env`, we can just disable cache and work with `ExtendedConfigService`, by using `forRoot()` method.

```typescript
import { Module } from '@nestjs/common';
import { ExtendedConfigModule } from 'nestjs-config-extended';

@Module({
	imports: [
		ExtendedConfigModule.forRoot({
			cache: false,
		}),
	],
})
export class AppModule {}
```

If needed, you can also initialize `ExtendedConfigModule` using `.forRootAsync()` method, to use Nest's dependency injection to provide variables or classes to module's configuration.

## Module configuration

To customize module's configuration, you can setup few options by importing it using one of `.forRoot()` or `.forRootAsync()` method.

| Option       | Default value | Required | Type                     | Description                                                                                                                                                                                                               |
| ------------ | ------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strategies` | `[]`          | `false`  | `ConfigLoaderStrategy[]` | Array with all strategies used to load configuration variables.                                                                                                                                                           |
| `cache`      | `true`        | `false`  | `boolean`                | If `false`, values will be stored directly in process.env object. <br> If `true`, values will be stored only in the memory.                                                                                               |
| `debug`      | `false`       | `false`  | `boolean`                | If `true`, module will log some internal process information.                                                                                                                                                             |
| `isGlobal`   | `false`       | `false`  | `boolean`                | If `true`, registers `ExtendedConfigModule` as a global module.                                                                                                                                                           |
| `preload`    | `false`       | `false`  | `boolean`                | If `true`, variables load will be done by the module and injected on service. This option is required if you need to inject the service on a custom provider and retrieve a variable before application is totally ready. |

### Strategies

To keep everything as flexible as possible, `ExtendedConfigModule` works with an array of strategies, that are specialized objects in load environment variables. Each strategy has its own options, as described below:

| Option             | Default value | Required | Type                  | Description                                                                                                                     |
| ------------------ | ------------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loader`           | -             | `true`   | `LoaderClass          | LoaderMethod`                                                                                                                   | Class or function responsible for loading environment variables for this strategy. Accepts a custom function or class with load() method.                 |
| `identifier`       | -             | `false`  | `string               | Symbol`                                                                                                                         | Identify a strategy to allow module to manipulate it directly on helper functions.                                                                        |
| `disable`          | `false`       | `false`  | `boolean`             | If `true`, this strategy will not used. This flag is useful to perform conditional strategy disabling.                          |
| `options`          | -             | `false`  | `Record<string, any>` | Set options to loader class or function.                                                                                        |
| `reloadable`       | `false`       | `false`  | `boolean`             | If `false`, this strategy will not be called again when service or scheduler requests a reload.                                 |
| `schedule`         | -             | `false`  | `string`              | Schedules the strategy reload (if reloadable) using cron syntax. This feature may not work correctly with serverless functions. |
| `scheduleTimezone` | -             | `false`  | `Timezone`            | Set scheduler timezone.                                                                                                         |
| `registerAs`       | -             | `false`  | `string`              | If set, all configuration will be set under the key passed on this variable.                                                    |
| `transformer`      | -             | `false`  | `TransformerClass     | TransformerMethod`                                                                                                              | If you wish to transform the loaded configuration variables, you can pass a function to handle it. Accepts a function or a class with transform() method. |
| `validator`        | -             | `false`  | `ValidatorClass       | ValidatorMethod`                                                                                                                | If you wish to transform the loaded configuration variables, you can pass a function to handle it. Accepts a function or a class with validate() method.  |

#### Pre-made loaders

Based on key use cases, `ExtendedConfigModule` has two pre-made loaders. To use them you simply need to import and refer it on strategy's `loader` option.

- `processEnvLoader`: loads variables from node's `process.env`.
- `dotEnvLoader`: loads variables from `.env` files, based on loader options. You can specify file(s) `path` and `encoding`, and enable `expandVariables`.

## Using the `ExtendedConfigService`

To access the loaded configuration values from our `ExtendedConfigService`, we first need to inject `ExtendedConfigService`. As with any provider, we need to import its containing module - the `ExtendedConfigModule` - into the module that will use it (unless you set the `isGlobal` property in the options to true). Then we can inject it using standard constructor injection:

```typescript
constructor(private extendedConfigService: ExtendedConfigModule) {}
```

Once it's injected, you already can use the following service methods to work with environment variables.

```typescript
// force load process if didn't started yet
await this.extendedConfigService.load();

// force load process if didn't started yet or wait an in progress load to finish
await this.extendedConfigService.load(true);

// get an environment variable
const dbUser = this.extendedConfigService.get<string>('DATABASE_USER');

// verify if an environment variable exists
const hasPassword = this.extendedConfigService.has('DATABASE_USER');

// reload environment variables on strategies that allows reload
await this.extendedConfigService.reload();

// reload environment variables for a specific strategy that allows reload
await this.extendedConfigService.reload('STRATEGY_IDENTIFIER');
```

## Full example

The examples below uses all availables options to help you to understand the module, but some of them are conflicting.

### Using `.forRoot()`

```typescript
import { Module } from '@nestjs/common';
import { ExtendedConfigModule, dotEnvLoader } from 'nestjs-config-extended';

@Module({
	imports: [
		ExtendedConfigModule.forRoot({
			cache: true,
			debug: false,
			isGlobal: true,
			preload: true,
			strategies: [
				{
					identifier: 'DOT_ENV_STRATEGY',
					loader: dotEnvLoader,
					disable: false,
					options: {
						path: '.env',
						encoding: 'UTF-8',
						expandVariables: true,
					},
					reloadable: false,
					schedule: '* * * * *', // Every minute, but will not schedule since strategy is not reloadable
					scheduleTimezone: 'America/Sao_Paulo',
					registerAs: 'anyKey',
					transformer: (variables: Record<string, any>) => {
						variables.number = Number(variables.number);
						return variables;
					},
					validator: (variables: Record<string, any>) => {
						if (variables.number > 0) {
							return true;
						}

						return false;
					},
				},
			],
		}),
	],
})
export class AppModule {}
```

### Using `.forRootAsync()`

```typescript
import { Module } from '@nestjs/common';
import { ExtendedConfigModule, dotEnvLoader } from 'nestjs-config-extended';

@Module({
	imports: [
		ExtendedConfigModule.forRootAsync({
			isGlobal: true,
			imports: [SampleStrategyModule],
			inject: [SampleStrategyService],
			useFactory: async (loaderClass: SampleStrategyService) => {
				return {
					cache: true,
					debug: false,
					strategies: [
						{
							identifier: 'INJECTED_CLASS_STRATEGY',
							loader: loaderClass,
							disable: false,
							options: {},
							reloadable: true,
							schedule: '* * * * *', // Every minute
							scheduleTimezone: 'America/Sao_Paulo',
							registerAs: 'anyKey',
							transformer: (variables: Record<string, any>) => {
								variables.number = Number(variables.number);
								return variables;
							},
							validator: (variables: Record<string, any>) => {
								if (variables.number > 0) {
									return true;
								}

								return false;
							},
						},
					],
				};
			},
		}),
	],
})
export class AppModule {}
```

## Stay in touch

- Author - [Pedro Sodré](https://github.com/pedrosodre)

## License

This module is [MIT licensed](LICENSE).

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).
