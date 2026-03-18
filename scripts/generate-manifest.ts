/**
 * Generate a vrowser-manifest.json from a target project's package.json.
 *
 * CLI wrapper around the shared manifest generation logic in
 * `@vrowser/vite-plugin/manifest-generate`.
 *
 * Usage:
 *   tsx scripts/generate-manifest.ts [package.json path] [options]
 *
 * Options:
 *   --output, -o    Output path (default: vrowser-manifest.json in project dir)
 *   --name          Manifest name (default: package.json name)
 *   --active-file   Default file to open in editor
 *   --target, -t    Package name(s) to include in nodeModules (can be specified multiple times)
 *                   When specified, only these packages (+ their transitive deps) are included.
 *                   When omitted, all dependencies are included.
 *   --project, -p   Directory to scan for source files (files field).
 *                   When omitted, uses the package.json directory.
 *                   Paths in the manifest are relative to this directory.
 *   --inspect       Show cached or generated manifest summary (does not write file)
 *   --inspect --json Output full manifest as JSON
 *
 * Examples:
 *   tsx scripts/generate-manifest.ts                           # use ./package.json
 *   tsx scripts/generate-manifest.ts packages/my-app/package.json
 *   tsx scripts/generate-manifest.ts packages/my-app/package.json -o manifest.json
 *   tsx scripts/generate-manifest.ts --inspect                 # show manifest summary
 *   tsx scripts/generate-manifest.ts --inspect --json           # output full manifest JSON
 */

import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { generateManifest } from '../packages/vite-plugin/src/manifest-generate.ts'

import type { ManifestResult } from '../packages/vite-plugin/src/manifest-generate.ts'

// --- CLI args ---

function parseArgs(argv: string[]) {
  const args = argv.slice(2)
  let input: string | undefined
  let outputPath: string | undefined
  let manifestName: string | undefined
  let activeFile: string | undefined
  let projectPath: string | undefined
  let inspect = false
  let json = false
  const targets: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--output' || arg === '-o') {
      outputPath = args[++i]
    } else if (arg === '--name') {
      manifestName = args[++i]
    } else if (arg === '--active-file') {
      activeFile = args[++i]
    } else if (arg === '--target' || arg === '-t') {
      targets.push(args[++i]!)
    } else if (arg === '--project' || arg === '-p') {
      projectPath = args[++i]
    } else if (arg === '--inspect') {
      inspect = true
    } else if (arg === '--json') {
      json = true
    } else if (!arg.startsWith('-')) {
      input = arg
    }
  }

  return { input, outputPath, manifestName, activeFile, targets, projectPath, inspect, json }
}

// --- Inspect ---

function readCachedManifest(root: string): ManifestResult | null {
  const manifestPath = join(root, 'node_modules', '.vrowser-manifest', 'manifest.json')
  if (existsSync(manifestPath)) {
    try {
      return JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
}

function readManifestFile(dir: string): ManifestResult | null {
  const manifestPath = join(dir, 'vrowser-manifest.json')
  if (existsSync(manifestPath)) {
    try {
      return JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
}

function printManifestSummary(manifest: ManifestResult, source: string): void {
  const files = manifest.files || {}
  const nodeModules = manifest.nodeModules || {}

  console.log(`\nVrowser Manifest (${source})`)
  console.log('─'.repeat(50))
  console.log(`  Name:        ${manifest.name}`)
  console.log(`  Active file: ${manifest.activeFile || '(none)'}`)
  console.log(`  Files:       ${Object.keys(files).length}`)
  console.log(`  NodeModules: ${Object.keys(nodeModules).length}`)

  // Show file list
  const fileKeys = Object.keys(files)
  if (fileKeys.length > 0) {
    console.log('\n  Files:')
    for (const key of fileKeys) {
      console.log(`    ${key}`)
    }
  }

  // Show nodeModules package summary (group by package name)
  const nodeModuleKeys = Object.keys(nodeModules)
  if (nodeModuleKeys.length > 0) {
    const packages = new Map<string, number>()
    for (const key of nodeModuleKeys) {
      // Extract package name: /node_modules/@scope/pkg/... or /node_modules/pkg/...
      const match = key.match(/^\/node_modules\/((?:@[^/]+\/)?[^/]+)/)
      if (match) {
        const pkgName = match[1]!
        packages.set(pkgName, (packages.get(pkgName) || 0) + 1)
      }
    }
    console.log(`\n  NodeModules packages (${packages.size}):`)
    for (const [pkg, count] of [...packages.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`    ${pkg} (${count} files)`)
    }
  }
}

// --- Main ---

async function main() {
  const { input, outputPath, manifestName, activeFile, targets, projectPath, inspect, json } =
    parseArgs(process.argv)

  // Resolve package directory
  let pkgDir: string
  if (input) {
    const inputPath = resolve(input)
    try {
      const s = await stat(inputPath)
      pkgDir = s.isFile() ? dirname(inputPath) : inputPath
    } catch {
      console.error(`Error: "${input}" does not exist.`)
      process.exit(1)
    }
  } else {
    pkgDir = process.cwd()
  }

  const sourceDir = projectPath ? resolve(projectPath) : pkgDir

  // Inspect mode: show existing manifest
  if (inspect) {
    // Try cached manifest first, then vrowser-manifest.json
    let manifest = readCachedManifest(sourceDir)
    let source = 'node_modules/.vrowser-manifest/'
    if (!manifest) {
      manifest = readManifestFile(sourceDir)
      source = 'vrowser-manifest.json'
    }

    if (!manifest) {
      console.error('No manifest found. Run gen:manifest first or enable auto mode in Vrowser().')
      process.exit(1)
    }

    if (json) {
      console.log(JSON.stringify(manifest, null, 2))
    } else {
      printManifestSummary(manifest, source)
    }
    return
  }

  // Generate manifest using shared logic
  const manifest = await generateManifest({
    pkgDir,
    sourceDir,
    targets,
    includeDevDependencies: true,
    name: manifestName,
    activeFile
  })

  // Write output
  const output = outputPath ? resolve(outputPath) : resolve(sourceDir, 'vrowser-manifest.json')
  await writeFile(output, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nDone: ${relative(process.cwd(), output)}`)
}

await main()
process.exit(0)
