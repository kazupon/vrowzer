import type { rolldown as _Rolldown, RolldownPlugin } from '@rolldown/browser'

// Types for rolldown binding with __volume
export interface RolldownBinding {
  readonly __fs: typeof import('node:fs')
  readonly __volume: {
    reset(): void
    fromJSON(fileMap: { [path: string]: string }): void
  }
}

export type Rolldown = typeof _Rolldown

/**
 * Dynamic import helper to avoid Vite's static analysis
 */
function dynamicImport<T = unknown>(url: string): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- NOTE: Dynamic import
  return new Function('url', 'return import(url)')(url) as Promise<T>
}

// Lazy-loaded modules
let _rolldown: Rolldown | null = null
let _binding: RolldownBinding | null = null

/**
 * Load rolldown from proxy
 */
export async function loadRolldown(): Promise<[Rolldown, RolldownBinding]> {
  console.log('[Bundler] Initializing rolldown...')

  // Load rolldown and binding from proxy
  const [rolldownModule, bindingModule] = await Promise.all([
    dynamicImport<{ rolldown: Rolldown; VERSION: string }>('/api/rolldown/dist/index.browser.mjs'),
    dynamicImport<RolldownBinding>('/api/rolldown/dist/rolldown-binding.wasi-browser.js')
  ])

  _rolldown = rolldownModule.rolldown
  _binding = bindingModule

  console.log('[Bundler] Rolldown initialized: ', rolldownModule.VERSION)
  console.log('[Bundler] Rolldown module:', rolldownModule)
  console.log('[Bundler] Binding module:', bindingModule)

  const s = bindingModule.transformSync('test.ts', 'const a: number = 1;')
  console.log('[Bundler] Binding transformSync test:', s)

  return [_rolldown, _binding]
}

/**
 * Prepare file map for __volume
 */
export function prepareFileMap(binding: RolldownBinding, files: Record<string, string>): void {
  const fileMap: { [path: string]: string } = Object.create(null) as { [path: string]: string }
  for (const [path, content] of Object.entries(files)) {
    // Remove leading slash for __volume
    const volumePath = path.startsWith('/') ? path.slice(1) : path
    fileMap[volumePath] = content
  }

  // Reset and populate the virtual file system
  console.log('[Bundler] Resetting volume...', binding.__volume.reset)
  binding.__volume.reset()
  console.log('[Bundler] Volume set', fileMap)
  binding.__volume.fromJSON(fileMap)

  // read test with node fs API
  // console.log(binding.__fs.readFileSync('main.js', 'utf8'))
}

/**
 * HMR injection plugin
 * Injects `import.meta.hot` implementation
 */
function hmrPlugin(): RolldownPlugin {
  return {
    name: 'hmr',
    transform(code: string, id: string) {
      // Inject HMR context for each module
      const hmrPreamble = `
const __hmr_id__ = ${JSON.stringify(id)};
const __hmr_hot__ = window.__HMR_RUNTIME__?.createHot(__hmr_id__) ?? { accept: () => {}, dispose: () => {}, data: {} };
const import_meta_hot = __hmr_hot__;
`
      // Replace `import.meta.hot` with our implementation
      const transformed = code.replace(/import\.meta\.hot/g, 'import_meta_hot')

      return {
        code: hmrPreamble + transformed,
        map: null
      }
    }
  }
}

function debugPlugin(): RolldownPlugin {
  return {
    name: 'debug',
    resolveId(id: string, importer: string | undefined) {
      console.log('[Bundler] DEBUG plugin:', id, importer)
    }
  }
}

/**
 * Bundle the code using rolldown
 */
export async function bundle(rolldown: Rolldown, entry: string): Promise<string> {
  const bundleStart = performance.now()

  // Bundle
  const build = await rolldown({
    input: entry.startsWith('/') ? entry.slice(1) : entry,
    cwd: '/',
    plugins: [hmrPlugin()],
    onLog(level, log) {
      if (level === 'warn') {
        console.warn('[Bundler]', log.message)
      }
    }
  })

  const bundleEnd = performance.now()
  console.log(`[Bundler] Bundling completed in ${(bundleEnd - bundleStart).toFixed(2)} ms`)

  try {
    const generateStart = performance.now()
    const result = await build.generate({ format: 'esm' })
    const generateEnd = performance.now()
    console.log(
      `[Bundler] Code generation completed in ${(generateEnd - generateStart).toFixed(2)} ms`
    )

    // Find the main chunk
    for (const chunk of result.output) {
      if (chunk.type === 'chunk' && chunk.code) {
        return chunk.code
      }
    }

    throw new Error('No output chunk generated')
  } finally {
    await build.close()
  }
}
