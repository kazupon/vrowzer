import { rollup, type Plugin, type RollupBuild } from '@rollup/browser'

// Virtual file system
const files = new Map<string, string>()

/**
 * Resolve relative paths
 */
function resolvePath(id: string, importer?: string): string {
  if (!importer || id.startsWith('/')) {
    return id.startsWith('/') ? id : `/${id}`
  }

  const importerDir = importer.substring(0, importer.lastIndexOf('/'))
  const parts = `${importerDir}/${id}`.split('/')
  const resolved: string[] = []

  for (const part of parts) {
    if (part === '..') {
      resolved.pop()
    } else if (part !== '.' && part !== '') {
      resolved.push(part)
    }
  }

  return '/' + resolved.join('/')
}

/**
 * Virtual file system plugin
 */
function virtualFsPlugin(): Plugin {
  return {
    name: 'virtual-fs',

    resolveId(id: string, importer?: string) {
      console.log(`[Virtual FS] Resolving ${id} from ${importer}`)

      // Resolve relative paths
      let resolved = resolvePath(id, importer)

      // Add .js extension if missing
      if (!resolved.includes('.')) {
        if (files.has(resolved + '.js')) {
          resolved += '.js'
        } else if (files.has(resolved + '/index.js')) {
          resolved += '/index.js'
        }
      }

      return resolved
    },

    load(id: string) {
      console.log(`[Virtual FS] Loading ${id}`)
      const content = files.get(id)
      if (content !== undefined) {
        return content
      }
      return null
    },
  }
}

/**
 * HMR injection plugin
 * Injects import.meta.hot implementation
 */
function hmrPlugin(): Plugin {
  return {
    name: 'hmr',
    transform(code, id) {
      console.log(`[HMR] Transforming ${id}`)

      // Inject HMR context for each module
      const hmrPreamble = `
const __hmr_id__ = ${JSON.stringify(id)};
const __hmr_hot__ = window.__HMR_RUNTIME__?.createHot(__hmr_id__) ?? { accept: () => {}, dispose: () => {}, data: {} };
const import_meta_hot = __hmr_hot__;
`
      // Replace import.meta.hot with our implementation
      const transformed = code.replace(/import\.meta\.hot/g, 'import_meta_hot')

      return {
        code: hmrPreamble + transformed,
        map: null,
      }
    },
  }
}

/**
 * Bundle the code using rollup
 */
export async function bundle(entry: string): Promise<string> {
  let build: RollupBuild | null = null

  try {
    build = await rollup({
      input: entry,
      plugins: [
        virtualFsPlugin(),
        hmrPlugin(),
      ],
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'MISSING_EXPORT') {
          return
        }
        warn(warning)
      }
    })

    const { output } = await build.generate({
      format: 'es',
      sourcemap: false,
    })

    return output[0].code
  } finally {
    if (build) {
      await build.close()
    }
  }
}

/**
 * Update a file in the virtual file system
 */
export function updateFile(path: string, content: string): void {
  files.set(path, content)
}

/**
 * Get all files in the virtual file system
 */
export function getFiles(): Map<string, string> {
  return files
}

/**
 * Clear all files
 */
export function clearFiles(): void {
  files.clear()
}
