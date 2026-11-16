# Maintaining

Notes for maintainers: repository settings that cannot live in code, and how releases flow.

## One-time GitHub settings

**Settings → General**

- Pull requests: allow **squash merging** only, with "Default commit message" set to **Pull request title**. Disable merge commits and rebase merging.
- Enable **Automatically delete head branches**.
- Features: enable **Discussions** (the issue forms send questions there).

**Settings → Rules → Rulesets** (target `master`, `next` and `*.x`)

- Require a pull request before merging (1 approval for external contributors).
- Require status checks to pass: `Check (Node 22, NestJS 11)`, `Check (Node 24, NestJS 11)`, `Check (Node 26, NestJS 11)`, `Runtime compatibility (Node 22, NestJS 12)`, `Runtime compatibility (Node 24, NestJS 12)`, `Runtime compatibility (Node 26, NestJS 12)`, `Conventional Commits` and `Analyze` (CodeQL).
- Require linear history and block force pushes and deletions.

The release workflow only creates tags and GitHub releases, so it does not need to bypass these rules.

**Settings → Code security**

- Enable **Private vulnerability reporting** (used by SECURITY.md and the Code of Conduct).
- Enable **Dependabot alerts** and **Dependabot security updates**.

**Settings → Secrets and variables → Actions**

- `NPM_TOKEN`: only needed until trusted publishing is configured (below).

## npm trusted publishing

Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) with provenance, so no long-lived npm token is needed:

1. On npmjs.com, open the package → **Settings → Trusted Publisher** → GitHub Actions.
2. Organization or user: `pedrosodre`, repository: `nestjs-config-extended`, workflow filename: `release.yml`, environment: empty.
3. After the next successful release, set **Publishing access** to "Require two-factor authentication and disallow tokens", delete the `NPM_TOKEN` secret and revoke the token on npm.
4. The tracked `.npmrc` only exists for the token fallback and can then be removed.

## Branches

| Branch   | Releases                                       |
| -------- | ---------------------------------------------- |
| `master` | Stable versions on the `latest` npm dist-tag   |
| `next`   | Prereleases (`x.y.z-next.N`) on the `next` tag |
| `N.x`    | Maintenance releases of an older major         |

Keep `0.x` (NestJS 7). Merged work branches that can be deleted: `feature/add-get-proxy-of`, `feature/update-dependencies`, `feature/update-nestjs-10`, `feature/update-nestjs-11`.

## Releasing 2.0

1. Create the `1.x` maintenance branch from the last 1.x release before 2.0 reaches `master`: `git push origin v1.2.7:refs/heads/1.x` (or from `master` if 1.x fixes are released first).
2. Push `next`. Each push publishes a prerelease (`2.0.0-next.1`, `2.0.0-next.2`, ...) that users can try with `npm install nestjs-config-extended@next`.
3. When ready, merge `next` into `master` (fast-forward). semantic-release publishes `2.0.0` on `latest`, with release notes generated from the commits.

Releases are never made by hand: no manual tags, no version bumps in `package.json`.
