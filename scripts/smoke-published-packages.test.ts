import { describe, expect, test, vi } from 'vite-plus/test'
import { loadReleasePackages, sortPublishPackages } from './lib/release-packages.mjs'
import {
  partitionPublishedSmokePackages,
  waitForPublishedPackages
} from './smoke-published-packages.mjs'

type CommandResult = { code: number; stdout: string; stderr: string }
type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>
type Sleep = (milliseconds: number) => Promise<void>

const packages = [{ name: '@vrowzer/example' }]

describe('published package registry wait', () => {
  test('retries an E404 until the exact version is visible', async () => {
    let query = 0
    const commandRunner = vi.fn<CommandRunner>(async () => {
      query += 1
      return query === 1
        ? { code: 1, stdout: '', stderr: 'npm error E404' }
        : { code: 0, stdout: JSON.stringify('1.2.3'), stderr: '' }
    })
    const sleep = vi.fn<Sleep>(async () => {})

    await waitForPublishedPackages({
      packages,
      version: '1.2.3',
      attempts: 2,
      delayMilliseconds: 0,
      commandRunner,
      sleep
    })

    expect(commandRunner).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledOnce()
  })

  test('does not retry registry network or authentication errors', async () => {
    const commandRunner = vi.fn<CommandRunner>(async () => ({
      code: 1,
      stdout: '',
      stderr: 'npm error E401'
    }))
    const sleep = vi.fn<Sleep>(async () => {})

    await expect(
      waitForPublishedPackages({
        packages,
        version: '1.2.3',
        commandRunner,
        sleep
      })
    ).rejects.toThrow('Failed to query')
    expect(commandRunner).toHaveBeenCalledOnce()
    expect(sleep).not.toHaveBeenCalled()
  })
})

describe('published package installation graph', () => {
  test('installs public roots before packages outside their transitive graph', async () => {
    const packages = sortPublishPackages(await loadReleasePackages())
    const partition = partitionPublishedSmokePackages(packages)

    expect(partition.roots.map(packageInfo => packageInfo.name)).toEqual([
      'vrowzer',
      '@vrowzer/vite-plugin'
    ])
    expect(partition.transitive.map(packageInfo => packageInfo.name).sort()).toEqual(
      packages
        .filter(
          packageInfo =>
            packageInfo.name !== '@vrowzer/oxlint-plugin-service-worker' &&
            packageInfo.name !== '@vrowzer/safe-port'
        )
        .map(packageInfo => packageInfo.name)
        .sort()
    )
    expect(partition.standalone.map(packageInfo => packageInfo.name).sort()).toEqual([
      '@vrowzer/oxlint-plugin-service-worker',
      '@vrowzer/safe-port'
    ])
  })
})
