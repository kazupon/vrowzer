import type { rolldown as Rolldown, RolldownPlugin } from '@rolldown/browser'

// Types for rolldown binding with __volume
interface RolldownBinding {
  readonly __volume: {
    reset(): void
    fromJSON(fileMap: { [path: string]: string }): void
  }
}

/**
 * Dynamic import helper to avoid Vite's static analysis
 */
function dynamicImport<T = unknown>(url: string): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- NOTE: Dynamic import
  return new Function('url', 'return import(url)')(url) as Promise<T>
}

// Lazy-loaded modules
let _rolldown: typeof Rolldown | null = null
let _binding: RolldownBinding | null = null

/**
 * Load rolldown from proxy
 */
export async function loadRolldown(): Promise<[typeof Rolldown, RolldownBinding]> {
  if (_rolldown && _binding) {
    console.log('[Bundler] Rolldown already initialized')
    return [_rolldown, _binding]
  }

  console.log('[Bundler] Initializing rolldown...')

  // Load rolldown and binding from proxy
  const [rolldownModule, bindingModule] = await Promise.all([
    dynamicImport<{ rolldown: typeof Rolldown; VERSION: string }>(
      '/api/rolldown/dist/index.browser.mjs'
    ),
    dynamicImport<RolldownBinding>('/api/rolldown/dist/rolldown-binding.wasi-browser.js')
  ])

  _rolldown = rolldownModule.rolldown
  _binding = bindingModule

  console.log('[Bundler] Rolldown initialized: ', rolldownModule.VERSION)

  return [_rolldown, _binding]
}

/**
 * Prepare file map for __volume
 */
function prepareFileMap(binding: RolldownBinding, files: Record<string, string>): void {
  const fileMap: { [path: string]: string } = Object.create(null) as { [path: string]: string }
  for (const [path, content] of Object.entries(files)) {
    // Remove leading slash for __volume
    const volumePath = path.startsWith('/') ? path.slice(1) : path
    fileMap[volumePath] = content
  }

  console.log('[Bundler] Files in volume:', Object.keys(fileMap))

  // Reset and populate the virtual file system
  binding.__volume.reset()
  binding.__volume.fromJSON(fileMap)
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
export async function bundle(entry: string, files: Record<string, string>): Promise<string> {
  const [rolldown, binding] = await loadRolldown()

  // Prepare file system
  prepareFileMap(binding, files)

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
