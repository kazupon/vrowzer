import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { create } from 'tar'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import {
  collectModuleSpecifiers,
  getPublishArguments,
  publishReleasePackages,
  runPackageRelease,
  validatePackedPackage
} from './release-npm.mjs'

type CommandResult = { code: number; stdout: string; stderr: string }
type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>

const fixtureRoots: string[] = []

async function createTarball(manifest: Record<string, unknown>, files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'vrowzer-release-tarball-'))
  fixtureRoots.push(root)
  const packageRoot = resolve(root, 'package')
  await mkdir(packageRoot, { recursive: true })
  await writeFile(resolve(packageRoot, 'package.json'), `${JSON.stringify(manifest)}\n`)

  for (const [file, contents] of Object.entries(files)) {
    const path = resolve(packageRoot, file)
    await mkdir(resolve(path, '..'), { recursive: true })
    await writeFile(path, contents)
  }

  const tarball = resolve(root, 'package.tgz')
  await create({ cwd: root, file: tarball, gzip: true }, ['package'])
  return tarball
}

function packedManifest(overrides: Record<string, unknown> = {}) {
  return {
    name: '@vrowzer/example',
    version: '1.2.3',
    type: 'module',
    publishConfig: { access: 'public' },
    exports: './dist/index.js',
    ...overrides
  }
}

const packageInfo = {
  name: '@vrowzer/example',
  directory: 'packages/example',
  publish: true,
  manifest: { name: '@vrowzer/example' }
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('packed package validation', () => {
  test('uses a parser for static and dynamic module specifiers', async () => {
    const specifiers = await collectModuleSpecifiers(`
      // import '@vrowzer/ignored'
      import '@vrowzer/fs'
      await import('@vrowzer/safe-port')
    `)

    expect([...specifiers]).toEqual(['@vrowzer/fs', '@vrowzer/safe-port'])
  })

  test('accepts a complete package', async () => {
    const tarball = await createTarball(packedManifest(), {
      'dist/index.js': 'export const value = 1\n'
    })

    const result = await validatePackedPackage({
      packageInfo,
      tarball,
      version: '1.2.3',
      internalNames: new Set([packageInfo.name])
    })

    expect(result.files).toContain('dist/index.js')
  })

  test('rejects workspace and mismatched internal dependency versions', async () => {
    const tarball = await createTarball(
      packedManifest({ dependencies: { '@vrowzer/fs': 'workspace:*' } }),
      { 'dist/index.js': "import '@vrowzer/fs'\n" }
    )

    await expect(
      validatePackedPackage({
        packageInfo,
        tarball,
        version: '1.2.3',
        internalNames: new Set([packageInfo.name, '@vrowzer/fs'])
      })
    ).rejects.toThrow('retains source specifier workspace:*')
  })

  test('rejects a missing export target', async () => {
    const tarball = await createTarball(packedManifest({ exports: './dist/missing.js' }), {
      'dist/index.js': 'export const value = 1\n'
    })

    await expect(
      validatePackedPackage({
        packageInfo,
        tarball,
        version: '1.2.3',
        internalNames: new Set([packageInfo.name])
      })
    ).rejects.toThrow('packed manifest target is missing')
  })

  test('rejects an undeclared internal import', async () => {
    const tarball = await createTarball(packedManifest(), {
      'dist/index.js': "import '@vrowzer/fs'\n"
    })

    await expect(
      validatePackedPackage({
        packageInfo,
        tarball,
        version: '1.2.3',
        internalNames: new Set([packageInfo.name, '@vrowzer/fs'])
      })
    ).rejects.toThrow('@vrowzer/fs is imported')
  })
})

describe('npm publication', () => {
  const packedPackage = {
    packageInfo,
    tarball: '/tmp/vrowzer-example.tgz',
    integrity: 'sha512-local'
  }

  test('uses force only for an explicit npm dry-run', () => {
    expect(
      getPublishArguments({
        tarball: '/tmp/package.tgz',
        distTag: 'beta'
      })
    ).toEqual(['publish', '/tmp/package.tgz', '--access', 'public', '--tag', 'beta'])
    expect(
      getPublishArguments({
        tarball: '/tmp/package.tgz',
        distTag: 'beta',
        dryRun: true
      })
    ).toEqual([
      'publish',
      '/tmp/package.tgz',
      '--access',
      'public',
      '--tag',
      'beta',
      '--dry-run',
      '--force'
    ])
  })

  test('skips an existing package only when its integrity matches', async () => {
    const commandRunner = vi.fn<CommandRunner>(async () => ({
      code: 0,
      stdout: JSON.stringify({
        version: '1.2.3',
        'dist.integrity': 'sha512-local'
      }),
      stderr: ''
    }))

    const result = await publishReleasePackages({
      packages: [packedPackage],
      version: '1.2.3',
      distTag: 'latest',
      commandRunner
    })

    expect(result).toEqual({ published: [], skipped: ['@vrowzer/example'] })
    expect(commandRunner).toHaveBeenCalledTimes(1)
  })

  test('publishes a package after an explicit registry E404', async () => {
    const commands: string[] = []
    const commandRunner = vi.fn<CommandRunner>(async (command, args) => {
      commands.push(`${command} ${args[0]}`)
      if (args[0] === 'view') {
        return { code: 1, stdout: '', stderr: 'npm error E404' }
      }
      return { code: 0, stdout: '', stderr: '' }
    })

    const result = await publishReleasePackages({
      packages: [packedPackage],
      version: '1.2.3',
      distTag: 'latest',
      commandRunner
    })

    expect(result).toEqual({ published: ['@vrowzer/example'], skipped: [] })
    expect(commands).toEqual(['npm view', 'npm publish'])
  })

  test('stops on registry network or authentication errors', async () => {
    const commandRunner = vi.fn<CommandRunner>(async () => ({
      code: 1,
      stdout: '',
      stderr: 'npm error ECONNRESET'
    }))

    await expect(
      publishReleasePackages({
        packages: [packedPackage],
        version: '1.2.3',
        distTag: 'latest',
        commandRunner
      })
    ).rejects.toThrow('Failed to query')
    expect(commandRunner).toHaveBeenCalledTimes(1)
  })

  test('does not invoke npm when any package fails to pack', async () => {
    const destination = await mkdtemp(join(tmpdir(), 'vrowzer-pack-failure-'))
    fixtureRoots.push(destination)
    const packages = [
      { ...packageInfo, name: '@vrowzer/first' },
      { ...packageInfo, name: '@vrowzer/second' }
    ]
    const commands: string[] = []
    const commandRunner = vi.fn<CommandRunner>(async command => {
      commands.push(command)
      if (commands.length === 1) {
        await writeFile(resolve(destination, 'first.tgz'), 'fixture')
        return { code: 0, stdout: '', stderr: '' }
      }
      throw new Error('pack failed')
    })

    await expect(
      runPackageRelease({
        packages,
        destination,
        version: '1.2.3',
        commandRunner
      })
    ).rejects.toThrow('pack failed')
    expect(commands).toEqual(['vp', 'vp'])
  })

  test('does not invoke npm until every tarball passes validation', async () => {
    const destination = await mkdtemp(join(tmpdir(), 'vrowzer-validation-failure-'))
    fixtureRoots.push(destination)
    const packages = [
      { ...packageInfo, name: '@vrowzer/first' },
      { ...packageInfo, name: '@vrowzer/second' }
    ]
    const sourceTarballs = [
      await createTarball(packedManifest({ name: '@vrowzer/first' }), {
        'dist/index.js': 'export const value = 1\n'
      }),
      await createTarball(
        packedManifest({ name: '@vrowzer/second', exports: './dist/missing.js' }),
        { 'dist/index.js': 'export const value = 2\n' }
      )
    ]
    const commands: string[] = []
    let packed = 0
    const commandRunner = vi.fn<CommandRunner>(async command => {
      commands.push(command)
      if (command !== 'vp') {
        throw new Error(`Unexpected command: ${command}`)
      }
      await copyFile(sourceTarballs[packed], resolve(destination, `package-${packed}.tgz`))
      packed += 1
      return { code: 0, stdout: '', stderr: '' }
    })

    await expect(
      runPackageRelease({
        packages,
        destination,
        version: '1.2.3',
        commandRunner
      })
    ).rejects.toThrow('packed manifest target is missing')
    expect(commands).toEqual(['vp', 'vp'])
  })
})
