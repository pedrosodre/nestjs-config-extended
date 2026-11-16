# Contributing

Thanks for helping improve `nestjs-config-extended`! This guide explains how to set up the project, the conventions we follow and how changes get released.

- [Questions and bug reports](#questions-and-bug-reports)
- [Development setup](#development-setup)
- [Project layout](#project-layout)
- [Making a change](#making-a-change)
- [Branches](#branches)
- [Commit messages](#commit-messages)
- [Pull requests](#pull-requests)
- [Releases](#releases)

## Questions and bug reports

- **Questions and ideas:** open a [discussion](https://github.com/pedrosodre/nestjs-config-extended/discussions).
- **Bugs and feature requests:** open an [issue](https://github.com/pedrosodre/nestjs-config-extended/issues/new/choose) using the templates. A minimal reproduction makes bugs much faster to fix.
- **Security vulnerabilities:** do not open a public issue. Follow [SECURITY.md](SECURITY.md).

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in every interaction.

## Development setup

Requirements: Node.js 20 or newer and npm.

```bash
git clone https://github.com/pedrosodre/nestjs-config-extended.git
cd nestjs-config-extended
npm ci        # also installs the git hooks
npm run check # everything CI runs
```

Useful scripts:

| Script                  | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `npm test`              | Unit and e2e tests (Jest)                                       |
| `npx jest <path>`       | Run a single test file                                          |
| `npm run test:coverage` | Tests with coverage thresholds                                  |
| `npm run typecheck`     | Type check the library                                          |
| `npm run lint`          | ESLint                                                          |
| `npm run format`        | Format everything with Prettier                                 |
| `npm run build`         | Compile `lib/` to `dist/`                                       |
| `npm run lint:package`  | Validate the packed package with publint and arethetypeswrong   |
| `npm run test:compat`   | Bootstrap a Nest app against the built CommonJS and ESM entries |
| `npm run check`         | All of the above, in the same order as CI                       |

## Project layout

```
lib/                   library source (the public API is lib/index.ts)
  strategies/          built-in loaders (process.env, .env, JSON, YAML)
  interfaces/          public types
  exceptions/          public error classes
  util/                internal helpers
index.mjs, index.d.mts ESM entry, re-exports the CommonJS build
tests/unit/            unit tests
tests/e2e/             tests that bootstrap Nest testing modules
tests/compat/          runtime smoke tests against the built package
```

Notes:

- `dist/` is generated. Never edit it.
- The ESM entry re-exports the CommonJS build on purpose, so ESM and CommonJS consumers share one copy of the classes (Nest's dependency injection relies on class identity). Keep it that way.

## Making a change

1. For anything larger than a small fix, open an issue or discussion first so we can agree on the approach.
2. Create a branch from `master` (see [Branches](#branches)).
3. Add or update tests. Every bug fix needs a test that fails without the fix.
4. Update the README when you change public behavior or options.
5. Run `npm run check` before pushing.

Code style is enforced by ESLint and Prettier (tabs, single quotes). The pre-commit hook formats staged files for you.

## Branches

| Branch             | Purpose                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| `master`           | Current stable version. Every merge can trigger a release.             |
| `next`             | Next major version. Merges publish prereleases (`x.y.z-next.N`).       |
| `N.x` (e.g. `1.x`) | Maintenance of an older major version.                                 |
| `<type>/<topic>`   | Short-lived work branches, e.g. `feat/yaml-loader`, `fix/reload-race`. |

Work branches use the same types as commit messages: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `build/`, `ci/`, `chore/`.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org). Versions and release notes are generated from them, and a git hook (commitlint) checks every commit.

```
<type>(<optional scope>): <short summary in the imperative>

<optional body: what changed and why>

<optional footer: BREAKING CHANGE: ..., Closes #123>
```

| Type                                                                | Effect on the next release |
| ------------------------------------------------------------------- | -------------------------- |
| `fix`                                                               | patch                      |
| `feat`                                                              | minor                      |
| `feat!`, `fix!` or a `BREAKING CHANGE:` footer                      | major                      |
| `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `style`, `perf` | no release                 |

## Pull requests

- Target `master` (or `next` for changes that only belong to the next major).
- Pull requests are **squash merged**, so the PR title becomes the commit message. It must follow Conventional Commits; a check validates it.
- Describe breaking changes and how to migrate in the PR description.
- CI must pass: lint, type check, tests on Node 20/22/24 with NestJS 11, runtime checks with NestJS 12, and package validation.

## Releases

Releases are fully automated with [semantic-release](https://semantic-release.gitbook.io). After CI passes on `master`, `next` or an `N.x` branch, it computes the version from the commits, publishes to npm with provenance, creates the git tag (`vX.Y.Z`) and the GitHub release with the notes. Never create tags or bump `package.json` by hand.
