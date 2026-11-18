<p align="center">
  <img src="./logo.png" width="320" alt="Nest Config Extended" />
</p>

<p align="center">
  Load, validate, reload and inject configuration in NestJS from any source.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nestjs-config-extended"><img src="https://img.shields.io/npm/v/nestjs-config-extended" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/nestjs-config-extended"><img src="https://img.shields.io/npm/dm/nestjs-config-extended" alt="npm downloads" /></a>
  <a href="https://github.com/pedrosodre/nestjs-config-extended/actions/workflows/release.yml"><img src="https://github.com/pedrosodre/nestjs-config-extended/actions/workflows/release.yml/badge.svg?branch=master" alt="CI and release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/nestjs-config-extended" alt="License" /></a>
</p>

## Description

Extended configuration module for [NestJS](https://nestjs.com), inspired by [Nest's configuration module](https://docs.nestjs.com/techniques/configuration). It combines configuration from several **strategies** (environment variables, `.env`, JSON and YAML files, or your own loaders such as a secrets manager) and adds:

- **Validation** with any [Standard Schema](https://standardschema.dev) library (Zod, Valibot, ArkType, ...) and **typed access** with autocompleted dotted paths.
- **Reloading** on demand, on a cron schedule or at an interval, with retries, and **change notifications** through RxJS observables and hooks.
- **Injectable namespaces** with `@InjectConfig()`, which always reflect the latest values.
- **Safe printing**: secrets are masked when the configuration is logged.
- **Health checks** for `@nestjs/terminus`.
- CommonJS and ESM support.

## Contents

- [Compatibility](#compatibility)
- [Installation](#installation)
- [Getting started](#getting-started)
- [Module configuration](#module-configuration) · [Strategies](#strategies) · [Pre-made loaders](#pre-made-loaders) · [Schema validation](#schema-validation)
- [Using the `ExtendedConfigService`](#using-the-extendedconfigservice)
- [Printing configuration safely](#printing-configuration-safely) · [Injecting namespaces](#injecting-configuration-namespaces) · [Reacting to changes](#reacting-to-changes) · [Health checks](#health-checks) · [Typed configuration](#typed-configuration)
- [Full example](#full-example)
- [Contributing](#contributing)

## Compatibility

| nestjs-config-extended | NestJS   | Node.js | TypeScript |
| ---------------------- | -------- | ------- | ---------- |
| 2.x                    | 11, 12   | 22.12+  | 5.4+       |
| 1.x                    | 8, 9, 10 | -       | -          |
| 0.x                    | 7        | -       | -          |

NestJS 12 is ESM-only. This package works with it from both CommonJS and ESM applications, relying on `require()` of ES modules, which Node.js supports without a flag since 22.12.

Upgrading from 1.x? Read the [migration guide](MIGRATION.md).

## Installation

```bash
npm install nestjs-config-extended
```

To use `yamlFileLoader`, also install the optional [`yaml`](https://www.npmjs.com/package/yaml) package:

```bash
npm install yaml
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

| Option          | Default value | Required | Type                                                   | Description                                                                                                                                                                                                               |
| --------------- | ------------- | -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strategies`    | `[]`          | `false`  | `ConfigLoaderStrategy[]`                               | Array with all strategies used to load configuration variables.                                                                                                                                                           |
| `cache`         | `true`        | `false`  | `boolean`                                              | If `false`, values will be stored directly in process.env object (as strings, under their literal key; object values and `registerAs` are not supported). <br> If `true`, values will be stored only in the memory.       |
| `debug`         | `false`       | `false`  | `boolean`                                              | If `true`, module will log some internal process information.                                                                                                                                                             |
| `isGlobal`      | `false`       | `false`  | `boolean`                                              | If `true`, registers `ExtendedConfigModule` as a global module.                                                                                                                                                           |
| `preload`       | `false`       | `false`  | `boolean`                                              | If `true`, variables load will be done by the module and injected on service. This option is required if you need to inject the service on a custom provider and retrieve a variable before application is totally ready. |
| `redact`        | defaults      | `false`  | `RedactOptions \| false`                               | How `toJSON()` and `console.log(service)` mask sensitive values: `{ keys?: (string \| RegExp)[], replacement?: string }`. `false` disables masking.                                                                       |
| `onChange`      | -             | `false`  | `(event: ConfigChangeEvent) => void \| Promise<void>`  | Called after a load or reload changes at least one top-level key. Errors are logged and never break loading.                                                                                                              |
| `onReloadError` | -             | `false`  | `(error: Error, identifier?) => void \| Promise<void>` | Called when a scheduled reload or `reload()` fails. Previously loaded values are kept.                                                                                                                                    |

### Strategies

To keep everything as flexible as possible, `ExtendedConfigModule` works with an array of strategies, that are specialized objects in load environment variables. Each strategy has its own options, as described below:

| Option             | Default value | Required | Type                                    | Description                                                                                                                                                                                                      |
| ------------------ | ------------- | -------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loader`           | -             | `true`   | `LoaderClass \| LoaderMethod`           | Class or function responsible for loading environment variables for this strategy. Accepts a custom function or class with `load()` method.                                                                      |
| `identifier`       | -             | `false`  | `string \| Symbol`                      | Identify a strategy to allow module to manipulate it directly on helper functions.                                                                                                                               |
| `disable`          | `false`       | `false`  | `boolean`                               | If `true`, this strategy will not be used. Useful to perform conditional strategy disabling.                                                                                                                     |
| `options`          | -             | `false`  | `Record<string, any>`                   | Options passed to the loader class or function.                                                                                                                                                                  |
| `reloadable`       | `false`       | `false`  | `boolean`                               | If `false`, this strategy will not be called again when service, scheduler or interval requests a reload.                                                                                                        |
| `schedule`         | -             | `false`  | `string`                                | Schedules the strategy reload (if reloadable) using cron syntax. This feature may not work correctly with serverless functions.                                                                                  |
| `scheduleTimezone` | -             | `false`  | `string`                                | Scheduler timezone as an IANA name, e.g. `America/Sao_Paulo`.                                                                                                                                                    |
| `reloadInterval`   | -             | `false`  | `number \| string`                      | Reloads the strategy (if reloadable) at a fixed interval, as an alternative to `schedule`. Milliseconds or a string like `'30s'`, `'5m'`, `'1h'`, at most `2147483647` ms (about 24.8 days, Node's timer limit). |
| `retry`            | -             | `false`  | `RetryOptions`                          | Retries a failing loader with exponential backoff: `{ retries, delay = 1000, factor = 2, maxDelay = 30000 }`. Applies to the first load and to reloads.                                                          |
| `registerAs`       | -             | `false`  | `string`                                | If set, all configuration will be set under the key passed on this variable.                                                                                                                                     |
| `transformer`      | -             | `false`  | `TransformerClass \| TransformerMethod` | Transforms the loaded variables. Accepts a function or a class with `transform()` method.                                                                                                                        |
| `validator`        | -             | `false`  | `ValidatorClass \| ValidatorMethod`     | Validates the loaded variables. Accepts a function or a class with `validate()` method.                                                                                                                          |
| `schema`           | -             | `false`  | `StandardSchemaV1`                      | [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, ...) that validates and parses the variables after the validator and transformer. Its output replaces the loaded variables.                |

Reloads of the same strategy never overlap: a reload requested while another one is running for that strategy waits for it instead of calling the loader again. When a background reload (schedule or interval) fails, the error is logged, `onReloadError` is called and the previous values are kept.

#### Pre-made loaders

Based on key use cases, `ExtendedConfigModule` has some pre-made loaders. To use them you simply need to import and refer it on strategy's `loader` option.

- `processEnvLoader`: loads variables from node's `process.env`.
- `dotEnvLoader`: loads variables from `.env` files, based on loader options. You can specify file(s) `path` and `encoding`, and enable `expandVariables`.
- `jsonFileLoader`: loads variables from a JSON file. Options: `path` (required, relative to `process.cwd()`), `encoding` and `optional` (a missing file loads nothing instead of failing; combined with `registerAs`, the key then holds an empty object).
- `yamlFileLoader`: loads variables from a YAML file, with the same options. Requires the optional [`yaml`](https://www.npmjs.com/package/yaml) package (`npm install yaml`).

```typescript
ExtendedConfigModule.forRoot({
	strategies: [
		{ loader: yamlFileLoader, options: { path: 'config/default.yaml' } },
		{
			loader: jsonFileLoader,
			options: { path: 'config/local.json', optional: true },
		},
	],
});
```

#### Schema validation

Any [Standard Schema](https://standardschema.dev) compatible library (Zod 3.24+, Valibot 1+, ArkType 2+, ...) can validate and parse a strategy's variables. The parsed output (with coerced types and defaults) replaces the loaded variables, and `InferConfig` types the service from the schema:

```typescript
import { z } from 'zod';
import { dotEnvLoader, ExtendedConfigService, InferConfig } from 'nestjs-config-extended';

export const envSchema = z.object({
	PORT: z.coerce.number().default(3000),
	DATABASE_URL: z.string().url(),
});

ExtendedConfigModule.forRoot({
	strategies: [{ loader: dotEnvLoader, schema: envSchema }],
});

// inject a typed service
constructor(private config: ExtendedConfigService<InferConfig<typeof envSchema>>) {}
```

When validation fails, loading throws a `SchemaValidationException` that lists every issue and exposes them on its `issues` property.

## Using the `ExtendedConfigService`

To access the loaded configuration values from our `ExtendedConfigService`, we first need to inject `ExtendedConfigService`. As with any provider, we need to import its containing module - the `ExtendedConfigModule` - into the module that will use it (unless you set the `isGlobal` property in the options to true). Then we can inject it using standard constructor injection:

```typescript
constructor(private extendedConfigService: ExtendedConfigService) {}
```

Once it's injected, you already can use the following service methods to work with environment variables.

```typescript
// force load process if didn't started yet
await this.extendedConfigService.load();

// force load process if didn't started yet or wait an in progress load to finish
await this.extendedConfigService.load(true);

// get an environment variable
const dbUser = this.extendedConfigService.get<string>('DATABASE_USER');

// get a proxy of an object from environment variable
const appConfig =
	this.extendedConfigService.getProxyOf<Record<string, unknown>>('APP_CONFIG');

// get a nested value using a dotted path
const dbHost = this.extendedConfigService.get('database.host');

// get a value or throw a MissingConfigException when it is not defined
const apiKey = this.extendedConfigService.getOrThrow<string>('API_KEY');

// verify if an environment variable exists
const hasPassword = this.extendedConfigService.has('DATABASE_USER');

// reload environment variables on strategies that allows reload
// (every reloadable strategy is attempted; rejects with the first error)
await this.extendedConfigService.reload();

// reload environment variables for a specific strategy that allows reload
await this.extendedConfigService.reload('STRATEGY_IDENTIFIER');
```

### Printing configuration safely

`JSON.stringify(service)`, `service.toJSON()` and `console.log(service)` return the loaded configuration with sensitive values masked. Keys matching password, secret, token, api key, private key, credential, session, cookie, salt or signature are replaced with `[REDACTED]`, and passwords embedded in URLs (`postgres://user:[REDACTED]@host`) are removed. Add your own keys with the `redact` option, or use `redactConfig()` directly:

```typescript
ExtendedConfigModule.forRoot({
	strategies: [{ loader: processEnvLoader }],
	redact: { keys: ['INTERNAL_ID', /^iban$/i] },
});

this.logger.log(`Config: ${JSON.stringify(this.config)}`);
```

With `debug: true`, logs only list the loaded key names, never their values.

### Injecting configuration namespaces

Register namespaces (a strategy's `registerAs` key or any object path) with `forFeature()` and inject them with `@InjectConfig()`. The root module must be global. The injection waits for the first load, so `preload` is not required, and the injected object is a read-only proxy that always reflects reloaded values:

```typescript
@Module({
	imports: [
		ExtendedConfigModule.forRoot({
			isGlobal: true,
			strategies: [{ loader: databaseLoader, registerAs: 'database' }],
		}),
		DatabaseModule,
	],
})
export class AppModule {}

@Module({
	imports: [ExtendedConfigModule.forFeature('database')],
	providers: [DatabaseService],
})
export class DatabaseModule {}

@Injectable()
export class DatabaseService {
	constructor(@InjectConfig('database') private readonly db: DatabaseConfig) {}
}
```

`getConfigToken('database')` returns the injection token, for example to use it in other providers' `inject` arrays.

> **Note:** the first injection of a namespace triggers the first load while Nest creates providers, which is earlier than the module's `onModuleInit`. If a `forRootAsync()` loader is a provider that needs its own `onModuleInit` before it can load, make sure its dependencies are ready in its constructor or factory, or inject the namespace only in modules that are initialized after it.

### Reacting to changes

Reloads (manual or scheduled) can change values while the application runs. `watch()` emits the current value of a key or dotted path and then every distinct change, and `changes()` emits an event with the top-level keys that changed:

```typescript
// emits now and on every distinct change
this.config.watch('database.host').subscribe(host => this.reconnect(host));

// { reason: 'load' | 'reload', identifier, changedKeys: string[] }
this.config.changes().subscribe(event => this.logger.log(event.changedKeys));
```

Both observables complete when the application shuts down. The same information is available through the `onChange` and `onReloadError` module options.

### Health checks

`getStatus()` returns whether the configuration finished loading and, per strategy, the last success, last failure (with URL credentials masked) and consecutive failures. `ExtendedConfigHealthIndicator` turns that into a [`@nestjs/terminus`](https://docs.nestjs.com/recipes/terminus) (v11+) health indicator without depending on it. It reports `down` until the first load finishes and while a strategy's consecutive failures reach `maxConsecutiveFailures` (default `1`):

```typescript
@Module({
	imports: [TerminusModule],
	controllers: [HealthController],
	providers: [ExtendedConfigHealthIndicator], // root module must be global
})
export class HealthModule {}

@Controller('health')
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private configHealth: ExtendedConfigHealthIndicator,
	) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([
			() =>
				this.configHealth.isHealthy('config', { maxConsecutiveFailures: 3 }),
		]);
	}
}
```

### Errors

Every error thrown by the module extends `ExtendedConfigException`, so one `instanceof` check catches them all. Errors have a specific `name` (`LoadingException`, `SchemaValidationException`, `MissingConfigException`, ...), the strategy's `identifier` when one is involved, and the original loader, validator or transformer error as `cause`:

```typescript
try {
	await this.config.reload('REMOTE');
} catch (error) {
	if (error instanceof ExtendedConfigException) {
		this.logger.error(
			`${error.name} in ${String(error.identifier)}`,
			error.cause,
		);
	}
}
```

### Typed configuration

Pass your configuration type to the service to get autocompleted dotted paths and inferred return types (up to 5 levels deep). With a [schema](#schema-validation), use `InferConfig<typeof schema>`.

```typescript
interface AppConfig {
	PORT: number;
	database: { host: string; ssl?: boolean };
}

constructor(private config: ExtendedConfigService<AppConfig>) {}

const port = this.config.get('PORT'); // number | undefined
const host = this.config.getOrThrow('database.host'); // string
this.config.get('database.nope'); // compile error
```

Untyped services keep accepting any string and explicit type arguments such as `get<string>('KEY')`.

> :warning: **Important:** `getProxyOf()` method only returns a proxy when returned value is an object, in any other cases, it will return the value directly. The proxy is read-only and supports property access, `in`, `Object.keys()`, spreading and `JSON.stringify()`.

## Full example

The examples below use most of the available options to show how they fit together. Some of them conflict with each other, so do not copy them as-is.

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

## Contributing

Contributions are welcome! Read the [contributing guide](CONTRIBUTING.md) to get started, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, see the [security policy](SECURITY.md).

An API summary for AI coding assistants ships with the package as [`llms.txt`](llms.txt) (also at `node_modules/nestjs-config-extended/llms.txt`).

Release notes are published on the [GitHub releases page](https://github.com/pedrosodre/nestjs-config-extended/releases).

## License

[MIT](LICENSE) © [Pedro Sodré](https://github.com/pedrosodre)
