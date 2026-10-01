/**
 * Keep the Service Worker's list of public files in sync with its virtual file system.
 *
 * Vite reads the public directory once when the dev server starts, and updates the list in the
 * watcher handlers of `_createServer()`. The Service Worker's dev server does not register those
 * handlers, and it receives the project files only after it has started, so without this the list
 * would stay as it was at startup.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { withTrailingSlash } from '../shared/utils'
import { normalizePath } from './utils'

import type { FSWatcher } from '#dep-types/chokidar'

/**
 * Keeps `publicFiles` up to date with the watcher's `add` and `unlink` events, as Vite does in
 * `onFileAddUnlink`. The list is updated synchronously, so it is current as soon as an event has
 * been emitted.
 *
 * Unlike Vite, the public directory is checked with a trailing slash, so that a sibling such as
 * `/publicity.js` is not taken for a public file. A module with the same path keeps its transform
 * result, because the Service Worker has no module graph.
 *
 * @param watcher - The watcher that reports the changes of the virtual file system
 * @param publicDir - The resolved public directory, e.g. `/public`
 * @param publicFiles - The list that `servePublicMiddleware` checks, with paths relative to `publicDir`
 */
export function syncPublicFiles(
  watcher: FSWatcher,
  publicDir: string,
  publicFiles: Set<string>,
): void {
  const publicDirPrefix = withTrailingSlash(publicDir)
  const update = (file: string, isUnlink: boolean) => {
    file = normalizePath(file)
    if (!file.startsWith(publicDirPrefix)) {
      return
    }
    publicFiles[isUnlink ? 'delete' : 'add'](file.slice(publicDir.length))
  }

  watcher.on('add', (file) => update(file, false))
  watcher.on('unlink', (file) => update(file, true))
}
