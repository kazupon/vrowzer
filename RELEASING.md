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

Use `workflow_dispatch` with an existing tag to rerun `npm-publish`, `published-smoke`, or `release-notes` independently. A mismatched published integrity is not recoverable with the same version and requires investigation before creating a new version.

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
BOOTSTRAP_DIR="$(mktemp -d)"
vp run release:pack --pack-destination "$BOOTSTRAP_DIR"
npm publish "$BOOTSTRAP_DIR/vrowzer-oxlint-plugin-service-worker-0.0.0.tgz" --access public --tag bootstrap
npm publish "$BOOTSTRAP_DIR/vrowzer-safe-port-0.0.0.tgz" --access public --tag bootstrap
```

Configure their Trusted Publishers immediately after the bootstrap publish. Do not store `NPM_TOKEN` or `NODE_AUTH_TOKEN` in GitHub Secrets.

The GitHub repository remains private. npm Trusted Publishing works, but npm does not generate a provenance attestation for packages published from a private source repository. This limitation is accepted and is not a release failure.
