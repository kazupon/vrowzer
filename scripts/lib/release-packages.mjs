/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const releasePackageDefinitions = Object.freeze(
  [
    ['@vrowzer/fs', 'packages/fs', true],
    ['@vrowzer/node-polyfill', 'packages/node-polyfill', true],
    ['@vrowzer/oxlint-plugin-service-worker', 'packages/oxlint-plugin-service-worker', true],
    ['play-vrowzer', 'packages/play-vrowzer', false],
    ['@vrowzer/rolldown', 'packages/rolldown', true],
    ['@vrowzer/safe-port', 'packages/safe-port', true],
    ['@vrowzer/service-worker-server', 'packages/service-worker-server', true],
    ['@vrowzer/service-worker', 'packages/service-worker', true],
    ['@vrowzer/unplugin-service-worker', 'packages/unplugin-service-worker', true],
    ['@vrowzer/vite-dev-server', 'packages/vite-dev-server', true],
    ['@vrowzer/vite-plugin', 'packages/vite-plugin', true],
    ['vrowzer', 'packages/vrowzer', true]
  ].map(([name, directory, publish]) => Object.freeze({ name, directory, publish }))
)

export const releaseDependencyFields = Object.freeze([
  'dependencies',
  'optionalDependencies',
  'peerDependencies'
])

async function readPackageManifest(packageDirectory) {
  const path = resolve(packageDirectory, 'package.json')
  const source = await readFile(path, 'utf8')
  return JSON.parse(source)
}

async function discoverPackageDirectories(root) {
  const packagesDirectory = resolve(root, 'packages')
  const entries = await readdir(packagesDirectory, { withFileTypes: true })
  const directories = []

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const directory = `packages/${entry.name}`
    try {
      await readPackageManifest(resolve(root, directory))
      directories.push(directory)
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error
      }
    }
  }

  return directories.sort()
}

export async function loadReleasePackages({
  root = repositoryRoot,
  definitions = releasePackageDefinitions
} = {}) {
  const discoveredDirectories = await discoverPackageDirectories(root)
  const definedDirectories = definitions.map(({ directory }) => directory).sort()
  const errors = []

  for (const directory of discoveredDirectories) {
    if (!definedDirectories.includes(directory)) {
      errors.push(`release package definition is missing for ${directory}`)
    }
  }

  for (const directory of definedDirectories) {
    if (!discoveredDirectories.includes(directory)) {
      errors.push(`release package directory does not exist: ${directory}`)
    }
  }

  const packages = []
  for (const definition of definitions) {
    if (!discoveredDirectories.includes(definition.directory)) {
      continue
    }

    const directoryPath = resolve(root, definition.directory)
    const manifest = await readPackageManifest(directoryPath)
    if (manifest.name !== definition.name) {
      errors.push(
        `${definition.directory}/package.json has name ${JSON.stringify(manifest.name)}, expected ${JSON.stringify(definition.name)}`
      )
    }

    packages.push({ ...definition, directoryPath, manifest })
  }

  if (errors.length > 0) {
    throw new Error(`Invalid release package inventory:\n- ${errors.join('\n- ')}`)
  }

  return packages
}

function getInternalDependencies(packageInfo, packageNames) {
  const dependencies = new Set()

  for (const field of releaseDependencyFields) {
    for (const dependencyName of Object.keys(packageInfo.manifest[field] ?? {})) {
      if (packageNames.has(dependencyName)) {
        dependencies.add(dependencyName)
      } else if (dependencyName === 'vrowzer' || dependencyName.startsWith('@vrowzer/')) {
        throw new Error(
          `${packageInfo.name} declares unknown internal package ${dependencyName} in ${field}`
        )
      }
    }
  }

  return dependencies
}

export function sortPublishPackages(packages) {
  const allNames = new Set(packages.map(({ name }) => name))
  const publishedPackages = packages.filter(({ publish }) => publish)
  const publishedNames = new Set(publishedPackages.map(({ name }) => name))
  const order = new Map(publishedPackages.map(({ name }, index) => [name, index]))
  const dependenciesByName = new Map()

  for (const packageInfo of publishedPackages) {
    const dependencies = getInternalDependencies(packageInfo, allNames)
    for (const dependencyName of dependencies) {
      if (!publishedNames.has(dependencyName)) {
        throw new Error(
          `${packageInfo.name} cannot be published because it depends on private package ${dependencyName}`
        )
      }
    }
    dependenciesByName.set(packageInfo.name, dependencies)
  }

  const remaining = new Map(
    [...dependenciesByName].map(([name, dependencies]) => [name, new Set(dependencies)])
  )
  const sorted = []

  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter(([, dependencies]) => dependencies.size === 0)
      .map(([name]) => name)
      .sort((left, right) => order.get(left) - order.get(right))

    if (ready.length === 0) {
      const cycle = [...remaining.keys()].join(', ')
      throw new Error(`Internal release dependency cycle detected: ${cycle}`)
    }

    for (const name of ready) {
      sorted.push(publishedPackages.find(packageInfo => packageInfo.name === name))
      remaining.delete(name)
      for (const dependencies of remaining.values()) {
        dependencies.delete(name)
      }
    }
  }

  return sorted
}
