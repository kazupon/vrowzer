/**
 * Shared E2E test utilities for vrowzer.
 *
 * Re-exports setup state (page, browserLogs, etc.) and provides
 * iframe-aware DOM helpers, file operation helpers, and HMR verification.
 */

// Re-export setup state and flags
export {
  browser,
  browserErrors,
  browserLogs,
  browserRequests,
  browserResponses,
  isBuild,
  isServe,
  page,
  viteTestUrl
} from './vitestSetup.ts'

import { page } from './vitestSetup.ts'

// ---------------------------------------------------------------------------
// Iframe DOM helpers
// ---------------------------------------------------------------------------

/**
 * Evaluate a function inside the preview iframe context.
 * All iframe DOM queries should go through this to avoid repetitive boilerplate.
 */
export async function iframeEvaluate<T>(fn: (doc: Document) => T): Promise<T> {
  return page.evaluate(fn => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    if (!iframe?.contentDocument) {
      throw new Error('Preview iframe not found')
    }
    return fn(iframe.contentDocument)
  }, fn)
}

/**
 * Get text content of an element inside the preview iframe.
 */
export async function iframeTextContent(selector: string): Promise<string | null> {
  return page.evaluate(sel => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    return iframe?.contentDocument?.querySelector(sel)?.textContent ?? null
  }, selector)
}

/**
 * Get the full inner text of the preview iframe body.
 */
export async function iframeInnerText(): Promise<string> {
  return page.evaluate(() => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    return iframe?.contentDocument?.body?.innerText ?? ''
  })
}

/**
 * Wait for a selector to appear inside the preview iframe.
 */
export async function waitForIframeSelector(
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000
  await page.waitForFunction(
    sel => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return !!iframe?.contentDocument?.querySelector(sel)
    },
    selector,
    { timeout }
  )
}

/**
 * Wait for text content to appear inside the preview iframe.
 */
export async function waitForIframeText(
  text: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000
  await page.waitForFunction(
    t => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.innerText?.includes(t) ?? false
    },
    text,
    { timeout }
  )
}

/**
 * Wait for an element's text content to match inside the preview iframe.
 * Useful for HMR tests where content changes after a file update.
 */
export async function waitForIframeTextContent(
  selector: string,
  match: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 10000
  await page.waitForFunction(
    ([sel, m, isRegex]) => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      const text = iframe?.contentDocument?.querySelector(sel)?.textContent ?? ''
      return isRegex ? new RegExp(m).test(text) : text.includes(m)
    },
    [selector, typeof match === 'string' ? match : match.source, match instanceof RegExp] as const,
    { timeout }
  )
}

/**
 * Get the computed color of an element inside the preview iframe.
 * Returns a CSS color string (e.g. 'rgb(255, 0, 0)').
 */
export async function getColor(selector: string): Promise<string> {
  return page.evaluate(sel => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    const el = iframe?.contentDocument?.querySelector(sel)
    return el ? getComputedStyle(el).color : ''
  }, selector)
}

/**
 * Get the computed background-color of an element inside the preview iframe.
 */
export async function getBgColor(selector: string): Promise<string> {
  return page.evaluate(sel => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    const el = iframe?.contentDocument?.querySelector(sel)
    return el ? getComputedStyle(el).backgroundColor : ''
  }, selector)
}

// ---------------------------------------------------------------------------
// File operation helpers
// ---------------------------------------------------------------------------

/**
 * Update a file in the vrowzer virtual filesystem via the browser API.
 * Triggers HMR in serve mode.
 *
 * @param filename - Virtual path (e.g. '/App.vue', '/main.ts')
 * @param content - Full new file content
 */
export async function updateFile(filename: string, content: string): Promise<void> {
  await page.evaluate(
    ([path, code]) => {
      ;(window as any).__vrowzer__.updateFile(path, code)
    },
    [filename, content] as const
  )
}

/**
 * Add a new file to the vrowzer virtual filesystem.
 */
export async function addFile(filename: string, content: string): Promise<void> {
  await page.evaluate(
    ([path, code]) => {
      ;(window as any).__vrowzer__.addFile(path, code)
    },
    [filename, content] as const
  )
}

/**
 * Delete a file from the vrowzer virtual filesystem.
 */
export async function removeFile(filename: string): Promise<void> {
  await page.evaluate(path => {
    ;(window as any).__vrowzer__.deleteFile(path)
  }, filename)
}

// ---------------------------------------------------------------------------
// HMR verification helpers
// ---------------------------------------------------------------------------

/**
 * Execute an operation and wait for specific browser console log messages.
 *
 * Useful for verifying HMR update sequences:
 * ```ts
 * await untilBrowserLogAfter(
 *   () => updateFile('/App.vue', newContent),
 *   ['[vite] hot updated: /App.vue'],
 * )
 * ```
 *
 * @param operation - Async function to execute (typically a file update)
 * @param target - Log message(s) to wait for
 * @param expectOrder - If true, messages must appear in the specified order
 * @returns New log entries captured during the operation
 */
export async function untilBrowserLogAfter(
  operation: () => any,
  target: string | RegExp | Array<string | RegExp>,
  expectOrder?: boolean
): Promise<string[]> {
  const { browserLogs } = await import('./vitestSetup.ts')
  const targets = Array.isArray(target) ? target : [target]
  const startIndex = browserLogs.length

  await operation()

  // Poll for matching log entries
  const timeout = 10000
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const newLogs = browserLogs.slice(startIndex)
    const allFound = targets.every(t =>
      newLogs.some(log => (typeof t === 'string' ? log.includes(t) : t.test(log)))
    )
    if (allFound) {
      if (expectOrder) {
        let lastIndex = -1
        for (const t of targets) {
          const idx = newLogs.findIndex(
            (log, i) => i > lastIndex && (typeof t === 'string' ? log.includes(t) : t.test(log))
          )
          if (idx === -1 || idx <= lastIndex) {
            throw new Error(
              `Log messages found but not in expected order.\nExpected: ${targets}\nGot: ${newLogs}`
            )
          }
          lastIndex = idx
        }
      }
      return newLogs
    }
    await new Promise(r => setTimeout(r, 50))
  }

  const newLogs = browserLogs.slice(startIndex)
  throw new Error(`Timed out waiting for browser logs.\nExpected: ${targets}\nGot: ${newLogs}`)
}
