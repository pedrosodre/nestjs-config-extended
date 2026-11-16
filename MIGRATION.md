# Migrating from 1.x to 2.0

Version 2 targets NestJS 11 and 12, adds several features and fixes behaviors that were inconsistent in 1.x. Most applications only need the first section; the rest describes behavior changes to check if you rely on them.

## Requirements

- **NestJS 11 or 12** (`@nestjs/common` and `@nestjs/core`). Stay on 1.x for NestJS 8 to 10.
- **Node.js 22.12 or newer.** Node.js 20 reached end-of-life in April 2026, and 22.12 is the first Node.js 22 release that loads ES modules with `require()` without a flag, which this CommonJS package needs for ESM-only NestJS 12.
- **TypeScript 5.4 or newer**, if you use TypeScript (the typings use `NoInfer`).
- **`rxjs` is a peer dependency** and is no longer installed by this package. NestJS already requires it, so no action is usually needed.
- **`yaml`** is an optional peer dependency, only needed for the new `yamlFileLoader`.

## Package entry points

The package now declares an `exports` map with CommonJS and ESM entry points. Deep imports such as `nestjs-config-extended/dist/...` are no longer allowed; import everything from `nestjs-config-extended`.

## Behavior changes

### `dotEnvLoader` with `expandVariables`

Expanded variables are no longer written to `process.env`. Read them through `ExtendedConfigService`, or set `cache: false` if you need them on `process.env`.

### `cache: false`

`process.env` can only hold strings, which made several cases silently broken in 1.x. Now:

- values are stored as strings under their literal key (`'a.b'` stays a single key instead of becoming a nested path);
- `null` and `undefined` values are skipped;
- object and array values throw `ProcessEnvAssignmentException` instead of being stored as `"[object Object]"`;
- `registerAs` throws `ProcessEnvAssignmentException` at startup.

### Reloads rebuild the whole configuration

After every load or reload, the configuration is rebuilt from the latest result of every strategy, in declaration order:

- keys a strategy stops returning are removed (from the cache, or from `process.env` when `cache: false`);
- reloading an earlier strategy no longer overrides values of later strategies;
- loader results are copied, so `get()` no longer returns the exact object instance your loader returned.

### Reload errors

- `reload()` without an identifier now tries every reloadable strategy, even if one fails, and then rejects with the first error.
- Failed scheduled reloads are logged with the Nest logger (instead of `console.error`) and keep the previous values.
- The new `onReloadError` option is called for each failure.

### Messages and logs

- All errors now extend `ExtendedConfigException`, have a specific `name`, expose the strategy `identifier` and keep the original error as `cause`. Messages are unchanged.

- Exceptions and debug logs now work with `symbol` identifiers (1.x threw `TypeError: Cannot convert a Symbol value to a string`).
- With `debug: true`, logs now include the names of loaded keys, never their values.

## Type changes

- `identifier` is typed as `string | symbol` (was the boxed `Symbol` type).
- `scheduleTimezone` is typed as `string` (an IANA name such as `America/Sao_Paulo`) and no longer depends on `tz-offset` types.
- `get()`, `getOrThrow()`, `getProxyOf()` and `has()` accept dotted paths and infer types when the service is typed (`ExtendedConfigService<Config>`). Untyped services and explicit type arguments such as `get<string>('KEY')` keep working.
- The `ExtendedConfigService` constructor changed. This only matters if you create the service manually instead of injecting it.

## New features

- Standard Schema validation (`schema` strategy option, `InferConfig`)
- Typed dotted paths and `getOrThrow()`
- `watch()`, `changes()`, `onChange` and `onReloadError`
- `jsonFileLoader` and `yamlFileLoader`
- `reloadInterval`, `retry` and non-overlapping reloads
- `ExtendedConfigModule.forFeature()` and `@InjectConfig()`
- Secret masking in `toJSON()` and `console.log(service)`, and `redactConfig()`
- `getStatus()` and `ExtendedConfigHealthIndicator` for `@nestjs/terminus`

See the [README](README.md) for details on each feature.
