import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vite-plus/test'
import { checkReleaseVersion } from './check-release-version.mjs'
import { releasePackageDefinitions } from './lib/release-packages.mjs'

const fixtureRoots: string[] = []

async function createReleaseFixture(version = '1.2.3') {
  const root = await mkdtemp(join(tmpdir(), 'vrowzer-release-check-'))
  fixtureRoots.push(root)

  for (const definition of releasePackageDefinitions) {
    const directory = resolve(root, definition.directory)
    await mkdir(directory, { recursive: true })
    const manifest = definition.publish
      ? {
          name: definition.name,
          description: `${definition.name} test fixture`,
          version,
          license: 'MIT',
          repository: {
            type: 'git',
            url: 'git+https://github.com/kazupon/vrowzer.git',
            directory: definition.directory
          },
          bugs: { url: 'https://github.com/kazupon/vrowzer/issues' },
          homepage: `https://github.com/kazupon/vrowzer/tree/main/${definition.directory}#readme`,
          publishConfig: { access: 'public' },
          scripts: { prepack: 'vp run build' }
        }
      : { name: definition.name, version, private: true }
    await writeFile(resolve(directory, 'package.json'), `${JSON.stringify(manifest)}\n`)
  }

  await writeFile(resolve(root, 'CHANGELOG.md'), `# v${version}\n`)
  return root
}

async function updateManifest(root: string, directory: string, update: (manifest: any) => void) {
  const path = resolve(root, directory, 'package.json')
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  update(manifest)
  await writeFile(path, `${JSON.stringify(manifest)}\n`)
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('release version checker', () => {
  test('accepts a lockstep release inventory', async () => {
    const root = await createReleaseFixture()
    const result = await checkReleaseVersion({ root, tag: 'v1.2.3', checkGit: false })

    expect(result.packages).toHaveLength(12)
    expect(result.publishOrder).toHaveLength(11)
  })

  test('rejects a package version mismatch', async () => {
    const root = await createReleaseFixture()
    await updateManifest(root, 'packages/fs', manifest => {
      manifest.version = '1.2.2'
    })

    await expect(checkReleaseVersion({ root, tag: 'v1.2.3', checkGit: false })).rejects.toThrow(
      '@vrowzer/fs version is 1.2.2'
    )
  })

  test('rejects a public package marked private', async () => {
    const root = await createReleaseFixture()
    await updateManifest(root, 'packages/fs', manifest => {
      manifest.private = true
    })

    await expect(checkReleaseVersion({ root, tag: 'v1.2.3', checkGit: false })).rejects.toThrow(
      '@vrowzer/fs must not be private'
    )
  })

  test('requires workspace specifiers for source internal dependencies', async () => {
    const root = await createReleaseFixture()
    await updateManifest(root, 'packages/vrowzer', manifest => {
      manifest.dependencies = { '@vrowzer/vite-dev-server': 'catalog:' }
    })

    await expect(checkReleaseVersion({ root, tag: 'v1.2.3', checkGit: false })).rejects.toThrow(
      'must use workspace:*'
    )
  })

  test('requires the latest changelog entry to contain the release tag', async () => {
    const root = await createReleaseFixture()

    await expect(
      checkReleaseVersion({
        root,
        tag: 'v1.2.3',
        checkGit: false,
        changelog: '# v1.2.2\n'
      })
    ).rejects.toThrow('latest release heading does not contain v1.2.3')
  })
})
