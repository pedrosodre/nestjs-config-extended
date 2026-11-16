# AGENTS.md

Guide for AI coding agents working on `nestjs-config-extended`, a NestJS configuration module that loads configuration from strategies (env, `.env`, JSON, YAML, custom loaders), validates it (Standard Schema), reloads it and exposes it through `ExtendedConfigService`. Human contributors: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

Run from the repository root. Node.js 22.12+ is required.

| Task                                        | Command                                      |
| ------------------------------------------- | -------------------------------------------- |
| Install (also installs git hooks)           | `npm ci`                                     |
| Everything CI runs (use before finishing)   | `npm run check`                              |
| All tests                                   | `npm test`                                   |
| One test file                               | `npx jest tests/unit/service/reload.spec.ts` |
| One test by name                            | `npx jest -t "should drop keys"`             |
| Type check                                  | `npm run typecheck`                          |
| Lint / fix                                  | `npm run lint` / `npx eslint --fix <files>`  |
| Format                                      | `npm run format`                             |
| Build `dist/`                               | `npm run build`                              |
| Public API report (after API changes)       | `npm run api:update`                         |
| Validate the packed package                 | `npm run lint:package`                       |
| Runtime smoke tests (needs `npm run build`) | `npm run test:compat`                        |

Prefer the narrowest command that proves your change (a single test file), then run `npm run check` once at the end. Keep the full output of failing commands.

## Layout

```
lib/index.ts                  public API: everything exported here is public
lib/extended-config.module.ts forRoot / forRootAsync / forFeature
lib/extended-config.service.ts loading, merging, reloads, get/watch/status
lib/extended-config.health.ts terminus health indicator
lib/config-namespace.ts       @InjectConfig and getConfigToken
lib/strategies/               built-in loaders (processEnv, dotEnv, file: JSON/YAML)
lib/interfaces/               public types (options, strategy, paths, schema, status)
lib/exceptions/               public error classes
lib/util/                     internal helpers (not exported unless listed in lib/index.ts)
index.mjs, index.d.mts        ESM entry, re-exports the CommonJS build
etc/                          API Extractor report of the public API
tests/unit/                   unit tests (most service tests build the service directly)
tests/e2e/                    tests that bootstrap Nest testing modules
tests/compat/                 runtime smoke tests against the built package (CJS + ESM)
```

## How the service works

- Each strategy runs `loader → validator → transformer → schema` (`lib/util/loader.util.ts`), with optional retries.
- The service keeps the last successful result of each strategy and **rebuilds the whole configuration** from all results, in declaration order, after every load or reload (`applyResults`). Later strategies win. Values are deep-cloned while merging so stored results are never mutated.
- `cache: true` (default) stores values in memory; `cache: false` writes flat string values to `process.env` and rejects objects and `registerAs`.
- Loads of the same strategy never overlap (`inFlight`), background reloads (cron `schedule` or `reloadInterval`) are configured once per strategy and stopped in `onModuleDestroy`.
- Changes are published through `watch()`, `changes()` and the `onChange` hook; failures through `onReloadError` and `getStatus()`.

## Rules

- **Tests are required.** Every bug fix needs a test that fails without the fix; every feature needs tests. Coverage thresholds are enforced.
- **Public API changes are deliberate.** If `npm run api:check` fails, the public API changed: make sure it is intended, run `npm run api:update` and commit the updated `etc/*.api.md`. Breaking changes need `!` in the commit type and a `BREAKING CHANGE:` footer, and a note in MIGRATION.md.
- **Never edit `dist/`** (generated) or bump the `version` in `package.json` / create tags (semantic-release does it).
- **Keep the ESM entry a re-export of the CommonJS build.** Nest's dependency injection relies on class identity; shipping a second copy of the classes breaks it.
- **Symbols:** strategy identifiers can be symbols. Never interpolate them in template literals directly; use `formatIdentifier()`.
- **No values in logs.** Debug logs may list key names, never configuration values.
- **Style:** Prettier (tabs, single quotes) and ESLint. JSON files use 2 spaces (npm copies `package.json` indentation into the lockfile).
- **Dependencies:** pin exact versions, prefer releases at least two weeks old, and do not add runtime dependencies without a strong reason (optional integrations such as `yaml` are optional peer dependencies loaded lazily).
- **Do not read or modify `.npmrc`**, `.env` files outside `tests/`, or any credentials.

## Commits and pull requests

- Conventional Commits, enforced by commitlint: `fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major; `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `style`, `perf` → no release.
- One logical change per commit, with a body explaining what changed and why.
- Pull requests target `master` and are squash merged (the PR title becomes the commit). `next` is only for the upcoming major version.

## Gotchas

- NestJS 12 is ESM-only and cannot be loaded by Jest's CommonJS runtime. The Jest suite runs against NestJS 11; NestJS 12 is covered by `tests/compat` in CI.
- `rm` and `cp` may be aliased to interactive versions in maintainers' shells; use `command rm -f` / `command cp -f` in scripts.
- `@ts-expect-error` assertions in `tests/unit/service/typed-get.spec.ts` are real type tests: ts-jest fails the suite if they stop erroring.
