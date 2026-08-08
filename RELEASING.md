# Releasing Vrowzer

Vrowzer uses fixed versioning. All 12 workspace packages receive the same version, while `play-vrowzer` remains private and the other 11 packages are published to npm.

## Prerequisites

- Work from a clean `main` branch whose `HEAD` exactly matches `origin/main`.
- Use Node.js 24 and install dependencies with `vp install --frozen-lockfile`.
- Set `GH_TOKEN` or `GITHUB_TOKEN` with `Contents: write` access to `kazupon/vrowzer`.
- Configure the `npm-release` GitHub Environment and npm Trusted Publisher entries described below before pushing the first release tag.

Run the full local validation before selecting a version:

```sh
vp check
vp test
vpr --no-cache -v build
vp run release:pack
vp run release:publish --dry-run
```

## Release Scripts

The root `package.json` exposes the following scripts for creating and validating releases. Pass script-specific options after the script name, for example `vp run release:check --tag v0.1.0`.

### `release`

This is the maintainer-facing command that creates a release commit and tag. It first runs `scripts/check-release-preconditions.mjs`, which requires a GitHub token, a clean `main` branch, and a local `HEAD` that exactly matches `origin/main`. It then runs bumpp for every workspace manifest under `packages/*/package.json`.

The bumpp hook verifies that the selected tag does not already exist locally or on `origin`, generates the new `CHANGELOG.md` entry with gh-changelogen, commits the version and changelog changes as `release: v<version>`, creates `v<version>`, and pushes the commit and tag. This is the only release script that modifies Git history or pushes to GitHub.

```sh
GH_TOKEN="$(gh auth token)" vp run release
```

### `release:check`

This read-only validation requires an existing release tag through `--tag` or `TAG`. It verifies that the tag is canonical SemVer, points to the checked-out `HEAD`, and matches all 12 workspace versions. It also checks the 11 public packages and the private playground inventory, public package metadata, internal `workspace:*` dependency declarations, dependency ordering, and the latest `CHANGELOG.md` heading.

```sh
vp run release:check --tag v0.1.0
```

### `release:pack`

This builds and packs all 11 public packages in dependency order without publishing them. Every tarball is extracted and checked for its name, version, public access, resolved dependency specifiers, exact internal versions, exported files, undeclared runtime imports, sensitive files, and required Vite dev server WASM and Worker assets. All tarballs must pass before the command succeeds.

By default it preserves the generated tarballs in a temporary directory printed at the end. Use `--pack-destination` with an empty directory when another command needs a stable location.

```sh
vp run release:pack
vp run release:pack --pack-destination /tmp/vrowzer-release
```

### `release:publish`

In its default publish mode, this is the GitHub Actions publishing command and requires an existing release tag through `--tag` or `TAG`. It runs the release version check, packs and validates every public package, and only then publishes the verified tarballs to npm in dependency order. The npm dist-tag is derived from the version, such as `latest`, `beta`, or `rc`.

Before each publish it checks npm for the exact version. A package with matching integrity is skipped so the job can resume after a partial publish; an integrity mismatch or registry error stops the release. Use `--dry-run` locally to run the same pack and validation stages followed by `npm publish --dry-run` without changing the registry.

```sh
vp run release:publish --dry-run
vp run release:publish --tag v0.1.0
```

The non-dry-run form is intended for the OIDC-enabled `npm-release` GitHub Actions environment, not for routine execution from a maintainer workstation.

### `release:smoke`

This post-publish check requires `--tag` or `TAG`. It waits for all 11 exact package versions to become visible on npm, creates a temporary project outside the workspace, installs the published packages, verifies that every internal package resolved to the release version, and imports the main public runtime entries. The temporary project is removed afterward.

For local validation, `--tarball-directory` skips the registry wait and installs the 11 tarballs from the specified directory instead.

```sh
vp run release:smoke --tag v0.1.0
vp run release:smoke --tag v0.1.0 --tarball-directory /tmp/vrowzer-release
```

## Create A Release

Use the GitHub CLI credential for changelog generation:

```sh
GH_TOKEN="$(gh auth token)" vp run release
```

Select the explicit version requested by bumpp. The first prerelease is `0.1.0-beta.0`. The command performs these operations in order:

1. Revalidates the branch, worktree, and `origin/main` synchronization.
2. Updates all `packages/*/package.json` versions.
3. Verifies that the future tag does not exist locally or on `origin`.
4. Generates and prepends the release entry in `CHANGELOG.md` with gh-changelogen.
5. Commits all version and changelog changes as `release: v<version>`.
6. Tags that commit as `v<version>` and pushes the commit and tag.

The tag push starts `.github/workflows/release.yml`. It reruns full CI, publishes all verified tarballs in dependency order, waits for the exact versions on npm, runs package import smoke tests, and creates the GitHub Release.

## Failure Recovery

If changelog generation or another bumpp hook fails before the commit, inspect the modified package manifests and `CHANGELOG.md`, restore them to `HEAD`, fix the cause, and rerun the release command. No commit or tag should have been created.

If CI fails before any package is published, fix the source and create a new release version. If only some packages were published, rerun the `npm-publish` job for the same existing tag. The workflow compares npm integrity values, skips matching versions, and continues with missing packages. Never move or delete a tag after any package from that version has been published.

Use `workflow_dispatch` with an existing tag to rerun `npm-publish`, `published-smoke`, or `github-release` independently. A mismatched published integrity is not recoverable with the same version and requires investigation before creating a new version.

## npm Trusted Publishing

Create the GitHub Environment `npm-release`. For each of the 11 public npm packages, configure the following Trusted Publisher:

```text
GitHub owner: kazupon
Repository: vrowzer
Workflow filename: release.yml
Environment: npm-release
Allowed action: npm publish
```

`@vrowzer/oxlint-plugin-service-worker` and `@vrowzer/safe-port` must first be published manually as `0.0.0` with the `bootstrap` dist-tag so their npm package settings become available. After this release implementation is merged to `main`, use an npm-authenticated maintainer session and the validated release tarballs:

```sh
npm login
npm whoami # must print kazupon
```

Run the login only from the maintainer workstation. Do not add the resulting credential to GitHub Actions or repository configuration.

```sh
BOOTSTRAP_DIR="$(mktemp -d)"
vp run release:pack --pack-destination "$BOOTSTRAP_DIR"
npm publish "$BOOTSTRAP_DIR/vrowzer-oxlint-plugin-service-worker-0.0.0.tgz" --access public --tag bootstrap
npm publish "$BOOTSTRAP_DIR/vrowzer-safe-port-0.0.0.tgz" --access public --tag bootstrap
```

Configure their Trusted Publishers immediately after the bootstrap publish. Do not store `NPM_TOKEN` or `NODE_AUTH_TOKEN` in GitHub Secrets.

The GitHub repository remains private. npm Trusted Publishing works, but npm does not generate a provenance attestation for packages published from a private source repository. This limitation is accepted and is not a release failure.
