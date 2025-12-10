import type { ViteDevServer } from 'vite'
import type { DevEnvironment } from './environment.ts'

export function warmupFiles(server: ViteDevServer, environment: DevEnvironment): void {
  const { root } = server.config
  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- NOTE(kazupon): disable
  mapFiles(environment.config.dev.warmup, root).then(files => {
    for (const file of files) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- NOTE(kazupon): disable
      warmupFile(server, environment, file)
    }
  })
}

async function warmupFile(server: ViteDevServer, environment: DevEnvironment, file: string) {
  // TODO(kazupon):
}

// eslint-disable-next-line @typescript-eslint/require-await -- NOTE(kazupon): disable
async function mapFiles(files: string[], root: string) {
  if (!files.length) return []

  const result: string[] = []
  const globs: string[] = []
  for (const file of files) {
    // TODO(kazupon):
    // if (isDynamicPattern(file)) {
    //   globs.push(file)
    // } else {
    //   if (path.isAbsolute(file)) {
    //     result.push(file)
    //   } else {
    //     result.push(path.resolve(root, file))
    //   }
    // }
  }
  if (globs.length) {
    // TODO(kazupon):
    // result.push(
    //   ...(await glob(globs, {
    //     absolute: true,
    //     cwd: root,
    //     expandDirectories: false,
    //     ignore: ['**/.git/**', '**/node_modules/**'],
    //   })),
    // )
  }
  return result
}
