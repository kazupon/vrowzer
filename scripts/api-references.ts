import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateOxContentApiDocs } from 'vitepress-api-references'

interface PackageJson {
  name?: string
  repository?: {
    directory?: string
  }
}

interface EntryPoint {
  path: string
  name: string
}

const entryPointsByPackage: Record<string, EntryPoint[]> = {
  '@vrowzer/fs': [
    { path: 'src/index.ts', name: 'default' },
    { path: 'src/promises.ts', name: 'promises' },
    { path: 'src/watcher/index.ts', name: 'watcher' }
  ],
  '@vrowzer/safe-port': [{ path: 'src/index.ts', name: 'default' }],
  '@vrowzer/service-worker': [
    { path: 'src/admin.ts', name: 'admin' },
    { path: 'src/controller.ts', name: 'controller' },
    { path: 'src/protocols.ts', name: 'protocols' },
    { path: 'src/worker.ts', name: 'worker' }
  ],
  '@vrowzer/service-worker-server': [{ path: 'src/index.ts', name: 'default' }],
  vrowzer: [{ path: 'src/index.ts', name: 'default' }]
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const packageRoot = process.cwd()
const packageJsonPath = path.join(packageRoot, 'package.json')
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as PackageJson
const packageName = packageJson.name

if (!packageName) {
  throw new Error(`Package name is missing in ${packageJsonPath}`)
}

const entryPoints = entryPointsByPackage[packageName]

if (!entryPoints) {
  throw new Error(`API reference entry points are not configured for ${packageName}`)
}

const packageDirectory =
  packageJson.repository?.directory ?? toPosix(path.relative(repoRoot, packageRoot))
const outDir = path.join(packageDirectory, 'docs')

await fs.rm(path.resolve(repoRoot, outDir), { recursive: true, force: true })

const result = await generateOxContentApiDocs({
  root: repoRoot,
  tsconfig: 'tsconfig.json',
  entryPoints: entryPoints.map(entryPoint => ({
    path: path.join(packageDirectory, entryPoint.path),
    name: entryPoint.name
  })),
  outDir,
  basePath: `/${packageDirectory}/docs`,
  extraction: {
    private: false,
    internal: false,
    externalDocs: true,
    typeParameters: true
  },
  markdown: {
    groupBy: 'file',
    pathStrategy: 'typedoc',
    singleEntryRoot: 'flatten',
    renderStyle: 'markdown',
    linkStyle: 'markdown',
    indexFormat: 'table',
    parametersFormat: 'table',
    interfacePropertiesFormat: 'table',
    classPropertiesFormat: 'table',
    propertyMembersFormat: 'table',
    typeAliasPropertiesFormat: 'table',
    enumMembersFormat: 'table',
    typeDeclarationFormat: 'none',
    renderStats: false,
    renderGeneratedBy: false,
    groupOrder: ['Variables', 'Functions', 'Class'],
    sort: ['alphabetical'],
    sortEntryPoints: true
  },
  nav: { enabled: false },
  docsJson: false,
  escapeHeadingAngleBrackets: true
})

for (const diagnostic of result.diagnostics) {
  console.warn(`[${packageName}] ${diagnostic}`)
}

console.log(`Generated ${result.generatedFiles.length} API reference files for ${packageName}`)

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}
