import { describe, expect, test } from 'vite-plus/test'
import {
  loadReleasePackages,
  releasePackageDefinitions,
  sortPublishPackages
} from './lib/release-packages.mjs'

function packageInfo(name: string, dependencies: Record<string, string> = {}, publish = true) {
  return {
    name,
    directory: `packages/${name.replaceAll('/', '-')}`,
    publish,
    manifest: { name, dependencies }
  }
}

describe('release package inventory', () => {
  test('contains all 12 workspace packages and publishes 11', async () => {
    const packages = await loadReleasePackages()

    expect(packages).toHaveLength(12)
    expect(packages.filter(packageInfo => packageInfo.publish)).toHaveLength(11)
    expect(packages.find(packageInfo => !packageInfo.publish)?.name).toBe('play-vrowzer')
  })

  test('detects a package missing from the frozen release definition', async () => {
    await expect(
      loadReleasePackages({ definitions: releasePackageDefinitions.slice(1) })
    ).rejects.toThrow('release package definition is missing')
  })
})

describe('release package dependency graph', () => {
  test('sorts internal dependencies before their consumers', () => {
    const packages = [
      packageInfo('app', { core: 'workspace:*' }),
      packageInfo('core'),
      packageInfo('adapter', { core: 'workspace:*' })
    ]

    expect(sortPublishPackages(packages).map(packageInfo => packageInfo.name)).toEqual([
      'core',
      'app',
      'adapter'
    ])
  })

  test('rejects internal dependency cycles', () => {
    const packages = [
      packageInfo('@vrowzer/a', { '@vrowzer/b': 'workspace:*' }),
      packageInfo('@vrowzer/b', { '@vrowzer/a': 'workspace:*' })
    ]

    expect(() => sortPublishPackages(packages)).toThrow('dependency cycle')
  })

  test('rejects unknown internal packages', () => {
    const packages = [packageInfo('@vrowzer/a', { '@vrowzer/missing': 'workspace:*' })]

    expect(() => sortPublishPackages(packages)).toThrow('unknown internal package')
  })

  test('rejects a public package depending on a private package', () => {
    const packages = [
      packageInfo('@vrowzer/a', { 'play-vrowzer': 'workspace:*' }),
      packageInfo('play-vrowzer', {}, false)
    ]

    expect(() => sortPublishPackages(packages)).toThrow('depends on private package')
  })
})
