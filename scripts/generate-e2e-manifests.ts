/**
 * Generate framework manifests required by the E2E fixtures.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

import { generateManifest } from '../packages/vite-plugin/src/manifest-generate.ts'

import type { ManifestResult } from '../packages/vite-plugin/src/manifest-generate.ts'

interface Fixture {
  activeFile: string
  directory: string
  name: string
  targets: string[]
}

const rootDir = resolve(import.meta.dirname, '..')

const fixtures: Fixture[] = [
  {
    activeFile: '/main.ts',
    directory: 'vite-vanilla',
    name: 'Vrowzer Vanilla',
    targets: []
  },
  {
    activeFile: '/App.tsx',
    directory: 'vite-react',
    name: 'Vrowzer + React',
    targets: ['react', 'react-dom']
  },
  {
    activeFile: '/App.vue',
    directory: 'vite-vue',
    name: 'Vrowzer + Vue',
    targets: ['vue']
  },
  {
    activeFile: '/App.svelte',
    directory: 'vite-svelte',
    name: 'Vrowzer + Svelte',
    targets: ['svelte']
  }
]

function rebaseFiles(
  files: Record<string, string> | undefined,
  sourceDir: string,
  outputDir: string
): Record<string, string> | undefined {
  if (!files) {
    return
  }

  return Object.fromEntries(
    Object.entries(files).map(([virtualPath, filePath]) => {
      const rebasedPath = relative(outputDir, resolve(sourceDir, filePath)).replaceAll('\\', '/')
      return [virtualPath, rebasedPath.startsWith('.') ? rebasedPath : `./${rebasedPath}`]
    })
  )
}

for (const fixture of fixtures) {
  const packageDir = resolve(rootDir, 'e2e', fixture.directory)
  const sourceDir = resolve(rootDir, 'packages/play-vrowzer/fixtures', fixture.directory)
  const manifest = await generateManifest({
    activeFile: fixture.activeFile,
    name: fixture.name,
    pkgDir: packageDir,
    sourceDir,
    targets: fixture.targets
  })
  const rebasedManifest: ManifestResult = {
    ...manifest,
    files: rebaseFiles(manifest.files, sourceDir, packageDir)!,
    nodeModules: rebaseFiles(manifest.nodeModules, sourceDir, packageDir)
  }
  const outputPath = resolve(packageDir, 'vrowzer-manifest.json')

  await writeFile(outputPath, `${JSON.stringify(rebasedManifest, null, 2)}\n`)
  console.log(`Generated ${relative(rootDir, outputPath)}`)
}

process.exit(0)
