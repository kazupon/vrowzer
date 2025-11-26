import type { RolldownPlugin, rolldown as Rolldown } from '@rolldown/browser'

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
  return new Function('url', 'return import(url)')(url)
}

// Lazy-loaded modules
let _rolldown: typeof Rolldown | null = null
let _binding: RolldownBinding | null = null

/**
 * Load rolldown by loading from proxy
 */
async function loadRolldown(files: Map<string, string>): Promise<[typeof Rolldown, RolldownBinding]> {
  if (_rolldown && _binding) {
    console.log('[Bundler] Rolldown already initialized')
    prepareFileMap(_binding, files)
    return [_rolldown, _binding]
  }

  console.log('[Bundler] Initializing rolldown...')

  // Load rolldown and binding from proxy
  // Using dynamicImport to avoid Vite's static analysis
  const [rolldownModule, bindingModule] = await Promise.all([
    dynamicImport<{ rolldown: typeof Rolldown }>('/api/rolldown/dist/index.browser.mjs'),
    dynamicImport<RolldownBinding>('/api/rolldown/dist/rolldown-binding.wasi-browser.js'),
  ])
  _rolldown = rolldownModule.rolldown
  _binding = bindingModule

  prepareFileMap(_binding, files)

  console.log('[Bundler] Rolldown initialized')

  return [_rolldown, _binding]
}

function prepareFileMap(binding: RolldownBinding, files: Map<string, string>): void {
  // Prepare file map for __volume
  const fileMap: { [path: string]: string } = Object.create(null)
  for (const [path, content] of files) {
    // Remove leading slash for __volume
    const volumePath = path.startsWith('/') ? path.slice(1) : path
    fileMap[volumePath] = content
  }
  console.log('[Bundler] Files in volume:', fileMap)

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
        map: null,
      }
    },
  }
}

// Virtual file system (in-memory)
const _files = new Map<string, string>()

/**
 * Bundle the code using rolldown
 */
export async function bundle(entry: string): Promise<string> {
  // Load rolldown
  const [rolldown, binding] = await loadRolldown(_files)
  if (!rolldown || !binding) {
    throw new Error('Rolldown load failed')
  }

  const bundlStart = performance.now()

  // Bundle
  const build = await rolldown({
    input: entry.startsWith('/') ? entry.slice(1) : entry,
    cwd: '/',
    plugins: [hmrPlugin()],
    onLog(level, log) {
      if (level === 'warn') {
        console.warn('[Rolldown]', log.message)
      }
    },
  })

  const bundlEnd = performance.now()
  console.log(`[Bundler] Bundling completed in ${(bundlEnd - bundlStart).toFixed(2)} ms`)

  try {
    const generateStart = performance.now()

    const result = await build.generate({ format: 'esm' })

    const generateEnd = performance.now()
    console.log(`[Bundler] Code generation completed in ${(generateEnd - generateStart).toFixed(2)} ms`)

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

/**
 * Update a file in the virtual file system
 */
export function updateFile(path: string, content: string): void {
  _files.set(path, content)
}

/**
 * Get all files in the virtual file system
 */
export function getFiles(): Map<string, string> {
  return _files
}

/**
 * Clear all files
 */
export function clearFiles(): void {
  _files.clear()
}
