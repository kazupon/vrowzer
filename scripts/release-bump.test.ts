import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vite-plus/test'
import { runCommand } from './lib/release-utils.mjs'

const fixtureRoots: string[] = []

async function git(root: string, args: string[]) {
  return runCommand('git', args, { cwd: root, capture: true })
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('bumpp release transaction', () => {
  test('tags the commit containing the bumped manifests and changelog', async () => {
    const root = await mkdtemp(join(tmpdir(), 'vrowzer-bumpp-success-'))
    fixtureRoots.push(root)
    const packageDirectories = ['packages/public', 'packages/playground']
    const runnerPath = resolve(root, 'run-release.mjs')

    await writeFile(
      resolve(root, 'package.json'),
      `${JSON.stringify({ name: 'release-fixture', private: true })}\n`
    )
    for (const directory of packageDirectories) {
      await mkdir(resolve(root, directory), { recursive: true })
      await writeFile(
        resolve(root, directory, 'package.json'),
        `${JSON.stringify({ name: directory, version: '1.0.0' })}\n`
      )
    }
    await writeFile(resolve(root, 'CHANGELOG.md'), '# Changelog\n')
    await writeFile(
      runnerPath,
      `
        import { writeFile } from 'node:fs/promises'
        import { versionBump } from ${JSON.stringify(import.meta.resolve('bumpp'))}
        import { getBumppReleaseTag } from ${JSON.stringify(import.meta.resolve('./lib/release-utils.mjs'))}

        await versionBump({
          cwd: process.cwd(),
          files: ['packages/*/package.json'],
          release: '1.1.0',
          all: true,
          commit: 'release: {tag}',
          tag: 'v{version}',
          push: false,
          confirm: false,
          interface: false,
          execute: async operation => {
            await writeFile('CHANGELOG.md', '# ' + getBumppReleaseTag(operation) + '\\n')
          }
        })
      `
    )
    await git(root, ['init', '--initial-branch=main'])
    await git(root, ['config', 'user.name', 'Vrowzer Release Test'])
    await git(root, ['config', 'user.email', 'release-test@example.com'])
    await git(root, ['add', '.'])
    await git(root, ['commit', '-m', 'test: initialize release fixture'])
    await git(root, ['tag', '--annotate', 'v1.0.0', '--message', 'v1.0.0'])
    const originalHead = (await git(root, ['rev-parse', 'HEAD'])).stdout.trim()

    const release = await runCommand(process.execPath, [runnerPath], {
      cwd: root,
      capture: true,
      allowFailure: true
    })

    expect(release.code).toBe(0)
    const releaseHead = (await git(root, ['rev-parse', 'HEAD'])).stdout.trim()
    expect(releaseHead).not.toBe(originalHead)
    expect((await git(root, ['rev-parse', 'v1.1.0^{commit}'])).stdout.trim()).toBe(releaseHead)
    expect((await git(root, ['log', '-1', '--format=%s'])).stdout.trim()).toBe('release: v1.1.0')
    expect((await git(root, ['show', 'v1.1.0:CHANGELOG.md'])).stdout).toBe('# v1.1.0\n')

    for (const directory of packageDirectories) {
      const manifest = JSON.parse(
        (await git(root, ['show', `v1.1.0:${directory}/package.json`])).stdout
      )
      expect(manifest.version).toBe('1.1.0')
    }
    expect((await git(root, ['status', '--porcelain'])).stdout.trim()).toBe('')
  }, 15_000)

  test('does not commit or tag when changelog generation rejects', async () => {
    const root = await mkdtemp(join(tmpdir(), 'vrowzer-bumpp-failure-'))
    fixtureRoots.push(root)
    const manifestPath = resolve(root, 'package.json')
    const runnerPath = resolve(root, 'run-release.mjs')
    await writeFile(manifestPath, '{"name":"fixture","version":"1.0.0"}\n')
    await writeFile(
      runnerPath,
      `
        import { versionBump } from ${JSON.stringify(import.meta.resolve('bumpp'))}

        try {
          await versionBump({
            cwd: process.cwd(),
            files: ['package.json'],
            release: '1.0.1',
            commit: 'release: {tag}',
            tag: 'v{version}',
            push: false,
            confirm: false,
            interface: false,
            execute: async () => {
              throw new Error('GitHub token is invalid')
            }
          })
          process.exitCode = 2
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error))
          process.exitCode = 1
        }
      `
    )
    await git(root, ['init', '--initial-branch=main'])
    await git(root, ['config', 'user.name', 'Vrowzer Release Test'])
    await git(root, ['config', 'user.email', 'release-test@example.com'])
    await git(root, ['add', 'package.json', 'run-release.mjs'])
    await git(root, ['commit', '-m', 'test: initialize release fixture'])
    await git(root, ['tag', '--annotate', 'v1.0.0', '--message', 'v1.0.0'])
    const originalHead = (await git(root, ['rev-parse', 'HEAD'])).stdout.trim()

    const release = await runCommand(process.execPath, [runnerPath], {
      cwd: root,
      capture: true,
      allowFailure: true
    })

    expect(release.code).toBe(1)
    expect(release.stderr).toContain('GitHub token is invalid')
    expect((await git(root, ['rev-parse', 'HEAD'])).stdout.trim()).toBe(originalHead)
    expect((await git(root, ['tag', '--list'])).stdout.trim()).toBe('v1.0.0')
    expect(JSON.parse(await readFile(manifestPath, 'utf8')).version).toBe('1.0.1')
    expect((await git(root, ['status', '--porcelain'])).stdout.trim()).toBe('M package.json')
  }, 15_000)
})
