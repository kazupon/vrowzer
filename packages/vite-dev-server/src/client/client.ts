// TODO: fill in later ...

import type { ErrorPayload, HotPayload } from '#types/hmrPayload'
import type { ViteHotContext } from '#types/hot'
import type {
  DevRuntime as DevRuntimeType,
  Messenger,
} from 'rolldown/experimental/runtime-types'
import { HMRClient, HMRContext } from '../shared/hmr'
import { createHMRHandler } from '../shared/hmrHandler'
import {
  createMessageChannelModuleRunnerTransport,
  normalizeModuleRunnerTransport,
} from '../shared/moduleRunnerTransport'
import { ErrorOverlay, cspNonce, overlayId } from './overlay'

// TODO: fill in later ...

// NOTE(kazupon): disable because currently minimul implementation
// // injected by the hmr plugin when served
// declare const __BASE__: string
// declare const __SERVER_HOST__: string
// declare const __HMR_PROTOCOL__: string | null
// declare const __HMR_HOSTNAME__: string | null
// declare const __HMR_PORT__: number | null
// declare const __HMR_DIRECT_TARGET__: string
// declare const __HMR_BASE__: string
// declare const __HMR_TIMEOUT__: number
// declare const __HMR_ENABLE_OVERLAY__: boolean
// declare const __WS_TOKEN__: string
// declare const __BUNDLED_DEV__: boolean

const __BASE__: string = ''
const __SERVER_HOST__: string = ''
const __HMR_PROTOCOL__: string | null = null
const __HMR_HOSTNAME__: string | null = null
const __HMR_PORT__: number | null = null
const __HMR_DIRECT_TARGET__: string = ''
const __HMR_BASE__: string = ''
const __HMR_TIMEOUT__: number = 1000
const __HMR_ENABLE_OVERLAY__: boolean = false
const __WS_TOKEN__: string = ''
const __BUNDLED_DEV__: boolean = false


// NOTE(kazupon): for console debug for vite
// console.debug('[vite] connecting...')

const importMetaUrl = new URL(import.meta.url)
console.debug('[vrowser] connecting... ', importMetaUrl.href)

// use server configuration, then fallback to inference
const serverHost = __SERVER_HOST__
const socketProtocol =
  __HMR_PROTOCOL__ || (importMetaUrl.protocol === 'https:' ? 'wss' : 'ws')
const hmrPort = __HMR_PORT__
const socketHost = `${__HMR_HOSTNAME__ || importMetaUrl.hostname}:${hmrPort || importMetaUrl.port
  }${__HMR_BASE__}`
const directSocketHost = __HMR_DIRECT_TARGET__
const base = __BASE__ || '/'
const hmrTimeout = __HMR_TIMEOUT__
const wsToken = __WS_TOKEN__
const isBundleMode = __BUNDLED_DEV__

const transport = normalizeModuleRunnerTransport(
  (() => {
    if (navigator.serviceWorker.controller == null) {
      throw new Error('No active Service Worker controller found for HMR transport')
    }

    let transport = createMessageChannelModuleRunnerTransport(navigator.serviceWorker.controller.postMessage.bind(navigator.serviceWorker.controller), {
      pingInterval: hmrTimeout,
    })

    return {
      async connect(handlers) {
        try {
          await transport.connect(handlers)
        } catch (e) {
          const currentScriptHostURL = new URL(import.meta.url)
          const currentScriptHost =
            currentScriptHostURL.host +
            currentScriptHostURL.pathname.replace(/@vite\/client$/, '')
          console.error(
            '[vrowser] failed to connect to MessageChannel.\n' +
            'your current setup:\n' +
            `  (browser) ${currentScriptHost} <--[Message Channel]--> ${serverHost} (server: service worker)\n`,
          )
          throw e
        }
      },
      async disconnect() {
        await transport.disconnect()
      },
      send(data) {
        transport.send(data)
      },
    }
  })(),
)

//
// NOTE(kazupon):
// Disable orignal WebSocket server implementation,
// because commented out codes as a context hint for sync with the original code from the forked source using the AI agent.
//
// const transport = normalizeModuleRunnerTransport(
//   (() => {
//     let wsTransport = createWebSocketModuleRunnerTransport({
//       createConnection: () =>
//         new WebSocket(
//           `${socketProtocol}://${socketHost}?token=${wsToken}`,
//           'vite-hmr',
//         ),
//       pingInterval: hmrTimeout,
//     })
//
//     return {
//       async connect(handlers) {
//         try {
//           await wsTransport.connect(handlers)
//         } catch (e) {
//           // only use fallback when port is inferred and was not connected before to prevent confusion
//           if (!hmrPort) {
//             wsTransport = createWebSocketModuleRunnerTransport({
//               createConnection: () =>
//                 new WebSocket(
//                   `${socketProtocol}://${directSocketHost}?token=${wsToken}`,
//                   'vite-hmr',
//                 ),
//               pingInterval: hmrTimeout,
//             })
//             try {
//               await wsTransport.connect(handlers)
//               console.info(
//                 '[vite] Direct websocket connection fallback. Check out https://vite.dev/config/server-options.html#server-hmr to remove the previous connection error.',
//               )
//             } catch (e) {
//               if (
//                 e instanceof Error &&
//                 e.message.includes('WebSocket closed without opened.')
//               ) {
//                 const currentScriptHostURL = new URL(import.meta.url)
//                 const currentScriptHost =
//                   currentScriptHostURL.host +
//                   currentScriptHostURL.pathname.replace(/@vite\/client$/, '')
//                 console.error(
//                   '[vite] failed to connect to websocket.\n' +
//                   'your current setup:\n' +
//                   `  (browser) ${currentScriptHost} <--[HTTP]--> ${serverHost} (server)\n` +
//                   `  (browser) ${socketHost} <--[WebSocket (failing)]--> ${directSocketHost} (server)\n` +
//                   'Check out your Vite / network configuration and https://vite.dev/config/server-options.html#server-hmr .',
//                 )
//               }
//             }
//             return
//           }
//           console.error(`[vite] failed to connect to websocket (${e}). `)
//           throw e
//         }
//       },
//       async disconnect() {
//         await wsTransport.disconnect()
//       },
//       send(data) {
//         wsTransport.send(data)
//       },
//     }
//   })(),
// )

let willUnload = false
if (typeof window !== 'undefined') {
  // window can be misleadingly defined in a worker if using define (see #19307)
  window.addEventListener?.('beforeunload', () => {
    willUnload = true
  })
}

function cleanUrl(pathname: string): string {
  const url = new URL(pathname, 'http://vite.dev')
  url.searchParams.delete('direct')
  return url.pathname + url.search
}

let isFirstUpdate = true
const outdatedLinkTags = new WeakSet<HTMLLinkElement>()

const debounceReload = (time: number) => {
  let timer: ReturnType<typeof setTimeout> | null
  return () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    timer = setTimeout(() => {
      location.reload()
    }, time)
  }
}
const pageReload = debounceReload(20)

const hmrClient = new HMRClient(
  {
    error: (err) => console.error('[vrowser]', err),
    debug: (...msg) => console.debug('[vrowser]', ...msg),
    // NOTE(kazupon): for console debug for vrowser
    // error: (err) => console.error('[vite]', err),
    // debug: (...msg) => console.debug('[vite]', ...msg),
  },
  transport,
  isBundleMode
    ? async function importUpdatedModule({
      url,
      acceptedPath,
      isWithinCircularImport,
    }) {
      const importPromise = import(base + url!).then(() =>
        // @ts-expect-error globalThis.__rolldown_runtime__
        globalThis.__rolldown_runtime__.loadExports(acceptedPath),
      )
      if (isWithinCircularImport) {
        importPromise.catch(() => {
          console.info(
            `[hmr] ${acceptedPath} failed to apply HMR as it's within a circular import. Reloading page to reset the execution order. ` +
            `To debug and break the circular import, you can run \`vite --debug hmr\` to log the circular dependency path if a file change triggered it.`,
          )
          pageReload()
        })
      }
      return await importPromise
    }
    : async function importUpdatedModule({
      acceptedPath,
      timestamp,
      explicitImportRequired,
      isWithinCircularImport,
    }) {
      const [acceptedPathWithoutQuery, query] = acceptedPath.split(`?`)
      const importPromise = import(
        /* @vite-ignore */
        base +
        // NOTE(kazupon): fix type error
        // @ts-expect-error -- ignore
        acceptedPathWithoutQuery.slice(1) +
        `?${explicitImportRequired ? 'import&' : ''}t=${timestamp}${query ? `&${query}` : ''
        }`
      )
      if (isWithinCircularImport) {
        importPromise.catch(() => {
          console.info(
            `[hmr] ${acceptedPath} failed to apply HMR as it's within a circular import. Reloading page to reset the execution order. ` +
            `To debug and break the circular import, you can run \`vite --debug hmr\` to log the circular dependency path if a file change triggered it.`,
          )
          pageReload()
        })
      }
      return await importPromise
    },
)

console.log('[vrowser] connecting to HMR MessageChannel server...')
transport.connect!(createHMRHandler(handleMessage))

async function handleMessage(payload: HotPayload) {
  switch (payload.type) {
    case 'connected':
      console.debug(`[vrowser] ${payload.clientId} connected.`)
      // NOTE(kazupon): for console debug for vrowser
      // console.debug(`[vite] connected.`)
      break
    case 'update':
      await hmrClient.notifyListeners('vite:beforeUpdate', payload)
      if (hasDocument) {
        // if this is the first update and there's already an error overlay, it
        // means the page opened with existing server compile error and the whole
        // module script failed to load (since one of the nested imports is 500).
        // in this case a normal update won't work and a full reload is needed.
        if (isFirstUpdate && hasErrorOverlay()) {
          location.reload()
          return
        } else {
          if (enableOverlay) {
            clearErrorOverlay()
          }
          isFirstUpdate = false
        }
      }
      await Promise.all(
        payload.updates.map(async (update): Promise<void> => {
          if (update.type === 'js-update') {
            return hmrClient.queueUpdate(update)
          }

          // css-update
          // this is only sent when a css file referenced with <link> is updated
          const { path, timestamp } = update
          const searchUrl = cleanUrl(path)
          // can't use querySelector with `[href*=]` here since the link may be
          // using relative paths so we need to use link.href to grab the full
          // URL for the include check.
          const el = Array.from(
            document.querySelectorAll<HTMLLinkElement>('link'),
          ).find(
            (e) =>
              !outdatedLinkTags.has(e) && cleanUrl(e.href).includes(searchUrl),
          )

          if (!el) {
            return
          }

          const newPath = `${base}${searchUrl.slice(1)}${searchUrl.includes('?') ? '&' : '?'
            }t=${timestamp}`

          // rather than swapping the href on the existing tag, we will
          // create a new link tag. Once the new stylesheet has loaded we
          // will remove the existing link tag. This removes a Flash Of
          // Unstyled Content that can occur when swapping out the tag href
          // directly, as the new stylesheet has not yet been loaded.
          return new Promise((resolve) => {
            const newLinkTag = el.cloneNode() as HTMLLinkElement
            newLinkTag.href = new URL(newPath, el.href).href
            const removeOldEl = () => {
              el.remove()
              console.debug(`[vrowser] css hot updated: ${searchUrl}`)
              // NOTE(kazupon): for console debug for vrowser
              // console.debug(`[vite] css hot updated: ${searchUrl}`)
              resolve()
            }
            newLinkTag.addEventListener('load', removeOldEl)
            newLinkTag.addEventListener('error', removeOldEl)
            outdatedLinkTags.add(el)
            el.after(newLinkTag)
          })
        }),
      )
      await hmrClient.notifyListeners('vite:afterUpdate', payload)
      break
    case 'custom': {
      await hmrClient.notifyListeners(payload.event, payload.data)
      if (payload.event === 'vite:ws:disconnect') {
        if (hasDocument && !willUnload) {
          console.log(`[vrowser] server connection lost. Reloading...`)
          // NOTE(kazupon): for console log for vrowser
          // console.log(`[vite] server connection lost. Reloading...`)
          location.reload()
        }
      }
      break
    }
    case 'full-reload':
      await hmrClient.notifyListeners('vite:beforeFullReload', payload)
      if (hasDocument) {
        if (payload.path && payload.path.endsWith('.html')) {
          // if html file is edited, only reload the page if the browser is
          // currently on that page.
          const pagePath = decodeURI(location.pathname)
          const payloadPath = base + payload.path.slice(1)
          if (
            pagePath === payloadPath ||
            payload.path === '/index.html' ||
            (pagePath.endsWith('/') && pagePath + 'index.html' === payloadPath)
          ) {
            pageReload()
          }
          return
        } else {
          pageReload()
        }
      }
      break
    case 'prune':
      await hmrClient.notifyListeners('vite:beforePrune', payload)
      await hmrClient.prunePaths(payload.paths)
      break
    case 'error': {
      await hmrClient.notifyListeners('vite:error', payload)
      if (hasDocument) {
        const err = payload.err
        if (enableOverlay) {
          createErrorOverlay(err)
        } else {
          console.error(
            `[vrowser] Internal Server Error\n${err.message}\n${err.stack}`,
            // NOTE(kazupon): for console error for vrowser
            // `[vite] Internal Server Error\n${err.message}\n${err.stack}`,
          )
        }
      }
      break
    }
    case 'ping': // noop
      break
    default: {
      const check: never = payload
      return check
    }
  }
}

const enableOverlay = __HMR_ENABLE_OVERLAY__
const hasDocument = 'document' in globalThis

function createErrorOverlay(err: ErrorPayload['err']) {
  clearErrorOverlay()
  const { customElements } = globalThis
  if (customElements) {
    const ErrorOverlayConstructor = customElements.get(overlayId)!
    document.body.appendChild(new ErrorOverlayConstructor(err))
  }
}

function clearErrorOverlay() {
  document.querySelectorAll<ErrorOverlay>(overlayId).forEach((n) => n.close())
}

function hasErrorOverlay() {
  return document.querySelectorAll(overlayId).length
}

//
// NOTE(kazupon):
// Disable original WebSocket ping/reconnect implementation,
// because commented out codes as a context hint for sync with the original code from the forked source using the AI agent.
// MessageChannel transport delegates reconnection to the host (Service Worker).
//
// function waitForSuccessfulPing(socketUrl: string) {
//   if (typeof SharedWorker === 'undefined') {
//     const visibilityManager: VisibilityManager = {
//       currentState: document.visibilityState,
//       listeners: new Set(),
//     }
//     const onVisibilityChange = () => {
//       visibilityManager.currentState = document.visibilityState
//       for (const listener of visibilityManager.listeners) {
//         listener(visibilityManager.currentState)
//       }
//     }
//     document.addEventListener('visibilitychange', onVisibilityChange)
//     return waitForSuccessfulPingInternal(socketUrl, visibilityManager)
//   }
//
//   // needs to be inlined to
//   //   - load the worker after the server is closed
//   //   - make it work with backend integrations
//   const blob = new Blob(
//     [
//       '"use strict";',
//       `const waitForSuccessfulPingInternal = ${waitForSuccessfulPingInternal.toString()};`,
//       `const fn = ${pingWorkerContentMain.toString()};`,
//       `fn(${JSON.stringify(socketUrl)})`,
//     ],
//     { type: 'application/javascript' },
//   )
//   const objURL = URL.createObjectURL(blob)
//   const sharedWorker = new SharedWorker(objURL)
//   return new Promise<void>((resolve, reject) => {
//     const onVisibilityChange = () => {
//       sharedWorker.port.postMessage({ visibility: document.visibilityState })
//     }
//     document.addEventListener('visibilitychange', onVisibilityChange)
//
//     sharedWorker.port.addEventListener('message', (event) => {
//       document.removeEventListener('visibilitychange', onVisibilityChange)
//       sharedWorker.port.close()
//
//       const data: { type: 'success' } | { type: 'error'; error: unknown } =
//         event.data
//       if (data.type === 'error') {
//         reject(data.error)
//         return
//       }
//       resolve()
//     })
//
//     onVisibilityChange()
//     sharedWorker.port.start()
//   })
// }
//
// type VisibilityManager = {
//   currentState: DocumentVisibilityState
//   listeners: Set<(newVisibility: DocumentVisibilityState) => void>
// }
//
// function pingWorkerContentMain(socketUrl: string) {
//   self.addEventListener('connect', (_event) => {
//     const event = _event as MessageEvent
//     // NOTE(kazupon): port[0] is always exist in SharedWorker
//     const port = event.ports[0]!
//
//     if (!socketUrl) {
//       port.postMessage({
//         type: 'error',
//         error: new Error('socketUrl not found'),
//       })
//       return
//     }
//
//     const visibilityManager: VisibilityManager = {
//       currentState: 'visible',
//       listeners: new Set(),
//     }
//     port.addEventListener('message', (event) => {
//       const { visibility } = event.data
//       visibilityManager.currentState = visibility
//       console.debug('[vrowser] new window visibility', visibility)
//       // NOTE(kazupon): for console debug for vite
//       // console.debug('[vite] new window visibility', visibility)
//       for (const listener of visibilityManager.listeners) {
//         listener(visibility)
//       }
//     })
//     port.start()
//
//     console.debug('[vite] connected from window')
//     waitForSuccessfulPingInternal(socketUrl, visibilityManager).then(
//       () => {
//         console.debug('[vrowser] ping successful')
//         // NOTE(kazupon): for console debug for vite
//         // console.debug('[vite] ping successful')
//         try {
//           port.postMessage({ type: 'success' })
//         } catch (error) {
//           port.postMessage({ type: 'error', error })
//         }
//       },
//       (error) => {
//         console.debug('[vrowser] error happened', error)
//         // NOTE(kazupon): for console debug for vite
//         // console.debug('[vite] error happened', error)
//         try {
//           port.postMessage({ type: 'error', error })
//         } catch (error) {
//           port.postMessage({ type: 'error', error })
//         }
//       },
//     )
//   })
// }
//
// async function waitForSuccessfulPingInternal(
//   socketUrl: string,
//   visibilityManager: VisibilityManager,
//   ms = 1000,
// ) {
//   function wait(ms: number) {
//     return new Promise((resolve) => setTimeout(resolve, ms))
//   }
//
//   async function ping() {
//     try {
//       const socket = new WebSocket(socketUrl, 'vite-ping')
//       return new Promise<boolean>((resolve) => {
//         function onOpen() {
//           resolve(true)
//           close()
//         }
//         function onError() {
//           resolve(false)
//           close()
//         }
//         function close() {
//           socket.removeEventListener('open', onOpen)
//           socket.removeEventListener('error', onError)
//           socket.close()
//         }
//         socket.addEventListener('open', onOpen)
//         socket.addEventListener('error', onError)
//       })
//     } catch {
//       return false
//     }
//   }
//
//   function waitForWindowShow(visibilityManager: VisibilityManager) {
//     return new Promise<void>((resolve) => {
//       const onChange = (newVisibility: DocumentVisibilityState) => {
//         if (newVisibility === 'visible') {
//           resolve()
//           visibilityManager.listeners.delete(onChange)
//         }
//       }
//       visibilityManager.listeners.add(onChange)
//     })
//   }
//
//   if (await ping()) {
//     return
//   }
//   await wait(ms)
//
//   while (true) {
//     if (visibilityManager.currentState === 'visible') {
//       if (await ping()) {
//         break
//       }
//       await wait(ms)
//     } else {
//       await waitForWindowShow(visibilityManager)
//     }
//   }
// }

const sheetsMap = new Map<string, HTMLStyleElement>()
const linkSheetsMap = new Map<string, HTMLLinkElement>()

// collect existing style elements that may have been inserted during SSR
// to avoid FOUC or duplicate styles
if ('document' in globalThis) {
  document
    .querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]')
    .forEach((el) => {
      sheetsMap.set(el.getAttribute('data-vite-dev-id')!, el)
    })
  document
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"][data-vite-dev-id]',
    )
    .forEach((el) => {
      linkSheetsMap.set(el.getAttribute('data-vite-dev-id')!, el)
    })
}

// all css imports should be inserted at the same position
// because after build it will be a single css file
let lastInsertedStyle: HTMLStyleElement | undefined

export function updateStyle(id: string, content: string): void {
  if (linkSheetsMap.has(id)) { return }

  let style = sheetsMap.get(id)
  if (!style) {
    style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    style.setAttribute('data-vite-dev-id', id)
    style.textContent = content
    if (cspNonce) {
      style.setAttribute('nonce', cspNonce)
    }

    if (!lastInsertedStyle) {
      document.head.appendChild(style)

      // reset lastInsertedStyle after async
      // because dynamically imported css will be split into a different file
      setTimeout(() => {
        lastInsertedStyle = undefined
      }, 0)
    } else {
      lastInsertedStyle.insertAdjacentElement('afterend', style)
    }
    lastInsertedStyle = style
  } else {
    style.textContent = content
  }
  sheetsMap.set(id, style)
}

export function removeStyle(id: string): void {
  if (linkSheetsMap.has(id)) {
    // re-select elements since HMR can replace links
    document
      .querySelectorAll<HTMLLinkElement>(
        `link[rel="stylesheet"][data-vite-dev-id]`,
      )
      .forEach((el) => {
        if (el.getAttribute('data-vite-dev-id') === id) {
          el.remove()
        }
      })
    linkSheetsMap.delete(id)
  }
  const style = sheetsMap.get(id)
  if (style) {
    document.head.removeChild(style)
    sheetsMap.delete(id)
  }
}

export function createHotContext(ownerPath: string): ViteHotContext {
  return new HMRContext(hmrClient, ownerPath)
}

/**
 * urls here are dynamic import() urls that couldn't be statically analyzed
 */
export function injectQuery(url: string, queryToInject: string): string {
  // skip urls that won't be handled by vite
  if (url[0] !== '.' && url[0] !== '/') {
    return url
  }

  // can't use pathname from URL since it may be relative like ../
  const pathname = url.replace(/[?#].*$/, '')
  const { search, hash } = new URL(url, 'http://vite.dev')

  return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ''}${hash || ''
    }`
}

export { ErrorOverlay }

declare const DevRuntime: typeof DevRuntimeType

if (isBundleMode && typeof DevRuntime !== 'undefined') {
  class ViteDevRuntime extends DevRuntime {
    override createModuleHotContext(moduleId: string) {
      const ctx = createHotContext(moduleId)
      // @ts-expect-error TODO: support CSS properly
      ctx._internal = { updateStyle, removeStyle }
      return ctx
    }

    override applyUpdates(_boundaries: [string, string][]): void {
      // noop, handled in the HMR client
    }
  }

  const wrappedSocket: Messenger = {
    send(message) {
      switch (message.type) {
        case 'hmr:module-registered': {
          transport.send({
            type: 'custom',
            event: 'vite:module-loaded',
            // clone array as the runtime reuses the array instance
            data: { modules: message.modules.slice() },
          })
          break
        }
        default:
          throw new Error(`Unknown message type: ${JSON.stringify(message)}`)
      }
    },
  }
    ; (globalThis as any).__rolldown_runtime__ ??= new ViteDevRuntime(
      wrappedSocket,
    )
}

