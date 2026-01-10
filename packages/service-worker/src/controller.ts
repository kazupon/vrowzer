/**
 * Service Worker Controller
 *
 * ## Features
 * - Defines service worker version tag and verifies via service worker messaging.
 * - Handles the below status combination service worker on registration:
 *   - `registration.installing`
 *   - `registration.waiting`
 *   - `registration.active`
 *
 * ### Optional policy:
 * 1. If any waiting exists, always request `skipWaiting` (aggressive).
 * 2. If controller does not switch (expected is active but not controller), suggest reload via callback.
 *
 * ## Behavior
 * - Returns immediately if expected service worker is already the controller.
 * - Returns when expected service worker becomes active, even if not yet controlling the page.
 *   (For service workers that don't call `clients.claim()`, reload is needed to gain control)
 * - Calls {@link SvcWorkerControllerEventMap.reloadSuggested | reloadSuggested} when expected is active but not controller.
 *
 * ## Service worker requirements
 * - Responds to `{ type: 'VROWSER_SW_GET_VERSION' }` using `MessageChannel` port -> {version}
 * - Accepts `{ type: "VROWSER_SW_SKIP_WAITING" }` -> `self.skipWaiting()`
 * - (Optional) in activate: `event.waitUntil(self.clients.claim())` - enables immediate control
 *
 * The above requirements can be met by using a separately provided module within your service worker.
 *
 * @module service-worker-controller
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { abortError, throwIfAborted } from '@kazupon/jts-utils/abort'
import { createEmitter, waitOnce } from '@kazupon/jts-utils/event'
import { VROWSER_SW_GET_VERSION, VROWSER_SW_SKIP_WAITING } from './constants.ts'

import type { Emittable } from '@kazupon/jts-utils'

/**
 * {@link SvcWorkerController | Service Worker Controller} instance creation options
 *
 * Use in {@link createSvcWorkerController} function.
 */
export interface SvcWorkerControllerOptions extends RegistrationOptions {
  /**
   * The URL of the service worker script to register
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register}
   */
  scriptURL: string | URL
  /**
   * The version tag string to identify the service worker
   */
  version: string
  /**
   * debug logger function
   */
  debug?: Console['debug']
}

/**
 * Service worker controller error
 */
export class SvcWorkerControllerError extends Error {
  name = 'SvcWorkerControllerError'
  constructor(message: string, cause?: Error) {
    super(message, { cause })
  }
}

/**
 * Reload suggest reason
 *
 * Reasons:
 * - 'unclaimed': Expected service worker is active but not controlling the page (no clients.claim())
 * - 'promoted': Expected service worker was in waiting, promoted to active, but not controlling the page
 */
export type ReloadSuggestReason = 'unclaimed' | 'promoted'

/**
 * Reload suggest information for service worker
 */
export interface ReloadSuggestInfo {
  /**
   * The reason for suggesting reload
   *
   * @see {@link ReloadSuggestReason}
   */
  reason: ReloadSuggestReason
  /**
   * The version of the service worker for suggesting reload
   */
  version: string
}

/**
 * {@link SvcWorkerController | Service Worker Controller} state type
 *
 * Note that while it's similar to the state provided by {@link ServiceWorkerState | service worker state}, it's not identical.
 * It has been adjusted to be easier for the Service worker controller to handle the expected service worker.
 *
 * State changes timings:
 * - `'installing'`: When expected service worker is detected in installing state
 * - `'waiting'`: When expected service worker is detected in waiting state, or when installing → waiting transition occurs
 * - `'activating'`: When installing service worker skips waiting and transitions directly to activating state
 * - `'activated'`: When any of the following occurs:
 *   - Fast path, expected service worker is already the controller
 *   - Expected service worker becomes the controller after promotion
 *   - Installing service worker skips waiting and transitions directly to activated state
 *   - Expected service worker is active but not yet controlling the page (reload suggested)
 */
export type SvcWorkerControllerState = 'installing' | 'waiting' | 'activating' | 'activated'

/**
 * {@link SvcWorkerController | Service Worker Controller} state change information
 */
export interface StateChangeInfo {
  /**
   * The current state of the {@link SvcWorkerController}
   */
  state: SvcWorkerControllerState
  /**
   * The version of the service worker that triggered the state change
   */
  version: string
  /**
   * The {@link ServiceWorker | service worker} instance that triggered the state change
   */
  serviceWorker: ServiceWorker
}

/**
 * Event map for {@link SvcWorkerController}
 *
 * This type defines the payload types for each event.
 * When subscribing to events via `on()`, you receive these payload types.
 */
export type SvcWorkerControllerEventMap = {
  /**
   * Service worker controller progress hook
   *
   * This callback is useful to debug or UI/telemetry.
   * Payload is the current phase description string.
   */
  progress: string
  /**
   * Called once when we detect that expected service worker is active/ready to take over,
   * but the page controller isn't switching (often due to missing `clients.claim()` or needing navigation).
   * You can show UI like: "Update ready. Reload to apply."
   *
   * Payload is {@link ReloadSuggestInfo}
   */
  reloadSuggested: ReloadSuggestInfo
  /**
   * Called when {@link SvcWorkerController} state changes.
   * Use this for UI updates during service worker lifecycle (e.g., showing "Installing...", "Waiting...", etc.)
   *
   * Payload is {@link StateChangeInfo}
   */
  changeState: StateChangeInfo
}

/**
 * Skip waiting policy type
 *
 * Policies:
 * - 'strict': request `skipWaiting` only if `waiting` / `installing` matches expected service worker version
 * - 'force': if `registration.waiting` exists, ALWAYS request `skipWaiting` (even if version differs)
 */
export type SkipWaitingPolicy = 'strict' | 'force'

/**
 * An options for {@link SvcWorkerController.re | Service Worker Controller}
 */
export interface SvcWorkerControllerReadyOptions {
  /**
   * Policy for `skipWaiting`
   *
   * @default 'strict'
   */
  skipWaitingPolicy?: SkipWaitingPolicy
  /**
   * Timeout in milliseconds to wait for expected service worker to become active
   *
   * @default 3000
   */
  timeout?: number
}

/**
 * Service worker controller
 */
export interface SvcWorkerController extends Emittable<SvcWorkerControllerEventMap>, Disposable {
  /**
   * The current state of the {@link SvcWorkerController}
   */
  readonly state: SvcWorkerControllerState
  /**
   * The {@link ServiceWorker | service worker} instance that is managed by service worker controller
   */
  readonly serviceWorker: ServiceWorker | null
  /**
   * Ready for the expected service worker to become active.
   *
   * Calling this method internally checks the service worker's state using the API provided by `navigator.serviceWorker`.
   *
   * Based on that state, it triggers events like `reloadSuggested` or `changeState` and internally initializes until the expected service worker version becomes active.
   *
   * After initialization completes, the application logic can be controlled via the {@link SvcWorkerController.state | state} and {@link createSvcWorkerController.serviceWorker | serviceWorker} properties.
   *
   * @returns
   * - If the expected service worker will be already active, this promise resolves immediately as `true`.
   * - If the expected service worker will not be achieved to activate, this promise resolves as `false`.
   */
  ready: (options?: SvcWorkerControllerReadyOptions) => Promise<boolean>
  /**
   * Dispose the controller instance and remove from cache.
   * After disposal, a new instance can be created with the same options.
   */
  dispose: () => void
  /**
   * Symbol.dispose for `using` syntax support (TypeScript 5.2+)
   */
  [Symbol.dispose]: () => void
}

// Singleton instance cache
const instanceCache = new Map<string, SvcWorkerController>()
const optionsCache = new Map<string, SvcWorkerControllerOptions>()

function getInstanceKey(scriptURL: string | URL, version: string): string {
  return `${scriptURL.toString()}::${version}`
}

function areOptionsEqual(a: SvcWorkerControllerOptions, b: SvcWorkerControllerOptions): boolean {
  // Compare options excluding scriptURL, version, and debug (function can't be compared)
  return a.scope === b.scope && a.type === b.type && a.updateViaCache === b.updateViaCache
}

/**
 * Create a {@link SvcWorkerController | Service worker controller} instance.
 *
 * This function implements a singleton pattern based on `scriptURL` and `version`.
 * If an instance already exists for the same scriptURL and version, it returns the existing instance.
 * If the options differ (excluding debug), it throws an error.
 *
 * @param options {@link SvcWorkerControllerOptions | Service worker controller options}
 * @returns {@link SvcWorkerController | Service worker controller instance}
 * @throws {SvcWorkerControllerError} If an instance exists with different options
 */
export function createSvcWorkerController(
  options: SvcWorkerControllerOptions
): Readonly<SvcWorkerController> {
  const { scriptURL, version } = options
  const key = getInstanceKey(scriptURL, version)

  // Check for existing instance
  const existing = instanceCache.get(key)
  if (existing) {
    const cachedOptions = optionsCache.get(key)!
    if (!areOptionsEqual(options, cachedOptions)) {
      throw new SvcWorkerControllerError(
        `already exists with different options: scriptURL=${cachedOptions.scriptURL}, version=${cachedOptions.version}, scope=${cachedOptions.scope}`
      )
    }
    return existing
  }

  const { debug: _debug, ...registrationOptions } = options

  _debug?.('createSvcWorkerController: options', options)

  const _emitter = createEmitter<SvcWorkerControllerEventMap>()
  let _serviceWorker: ServiceWorker | null = null
  let _state: SvcWorkerControllerState = 'installing'

  function emitStateChange(state: SvcWorkerControllerState, serviceWorker: ServiceWorker) {
    _state = state
    _serviceWorker = serviceWorker
    _emitter.emit('changeState', { state, version, serviceWorker })
  }

  function emitProgress(phase: string) {
    _debug?.('createSvcWorkerController: progress', phase)
    _emitter.emit('progress', phase)
  }

  function emitReloadSuggested(info: ReloadSuggestInfo) {
    _debug?.('createSvcWorkerController: reloadSuggested', info)
    _emitter.emit('reloadSuggested', info)
  }

  function reset() {
    _serviceWorker = null
    _state = 'installing'
  }

  /**
   * Ready for the expected service worker to become active.
   */
  async function ready(options?: SvcWorkerControllerReadyOptions): Promise<boolean> {
    const timeout = options?.timeout ?? 3000
    const skipWaitingPolicy = options?.skipWaitingPolicy ?? 'strict'

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), timeout)
    const signal = abortController.signal

    try {
      throwIfAborted(signal)

      // Register the service worker
      emitProgress('registering')
      const registration = await navigator.serviceWorker.register(scriptURL, registrationOptions)
      emitProgress('registered')

      // Fast-path, already controlled by expected service worker
      if (await isExpectedController(version, signal)) {
        const controller = (_serviceWorker = navigator.serviceWorker.controller)
        if (controller) {
          emitStateChange('activated', controller)
        }
        emitProgress('already-expected-controller')
        return true
      }

      let reloadSuggested = false

      for (;;) {
        throwIfAborted(signal)

        // Try to promote expected service worker (and optionally any waiting) to become active ASAP.
        const promotedKind = await promoteIfPossible({
          registration,
          version,
          signal,
          skipWaitingPolicy,
          onProgress: emitProgress,
          onStateChange: info => emitStateChange(info.state, info.serviceWorker)
        })

        // If controller is now expected service worker, done.
        if (await isExpectedController(version, signal)) {
          const controller = (_serviceWorker = navigator.serviceWorker.controller)
          if (controller) {
            emitStateChange('activated', controller)
          }
          emitProgress('controller-is-expected')
          return true
        }

        // Check where expected service worker is now
        const expectedState = await inferExpectedPresence(registration, version, signal)
        _debug?.('inferExpectedPresence ->', expectedState)

        // If expected is active (even if not controller), we've done all we can.
        // For service workers that don't call `clients.claim()`, the page won't be controlled until reload.
        // Suggest reload and return - caller decides what to do.
        if (expectedState === 'active') {
          // Ensure state is updated to 'activated' since service worker is active
          const activeServiceWorker = registration.active
          // NOTE: _state may have been updated by `emitStateChange` callback, so check current value
          const currentState = _state
          _debug?.('service worker contoller state ->', currentState)
          if (activeServiceWorker && currentState !== 'activated') {
            emitStateChange('activated', activeServiceWorker)
          }
          _debug?.('reload suggested ?', reloadSuggested)
          if (!reloadSuggested) {
            reloadSuggested = true
            emitReloadSuggested({
              reason: 'unclaimed',
              version
            })
          }
          emitProgress('expected-active-returning (reload suggested)')
          return true
        }

        // Handle promoted cases - wait briefly for activation to complete before re-checking
        if (
          promotedKind === 'promoted-waiting' ||
          promotedKind === 'promoted-any-waiting' ||
          promotedKind === 'promoted-installing->waiting' ||
          promotedKind === 'promoted-installing->active'
        ) {
          emitProgress('promoted, waiting for activation')
          await new Promise(r => setTimeout(r, 100))
          continue
        }

        // Expected is not yet active (installing, waiting, or none) - wait for events
        emitProgress('registration.update()')
        await registration.update().catch(() => {})

        emitProgress('waiting-next-event')
        await waitForNextMeaningfulEvent(registration, signal).catch(() => {})
      }
    } catch (err) {
      reset()
      if (err instanceof Error && err.name === 'AbortError') {
        _debug?.('createSvcWorkerController: ready aborted')
        return false
      } else {
        throw new SvcWorkerControllerError('SvcWorkerController ready failed', err as Error)
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  function dispose(): void {
    instanceCache.delete(key)
    optionsCache.delete(key)
    reset()
  }

  const instance = Object.freeze({
    ..._emitter,
    get state() {
      return _state
    },
    get serviceWorker() {
      return _serviceWorker
    },
    ready,
    dispose,
    [Symbol.dispose]: dispose
  })

  // Cache the instance
  instanceCache.set(key, instance)
  optionsCache.set(key, options)

  return instance
}

function getServiceWorkerVersion(
  serviceWorker: ServiceWorker | null,
  signal?: AbortSignal
): Promise<string | null> {
  throwIfAborted(signal)

  if (!serviceWorker) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const ch = new MessageChannel()

    const onAbort = () => {
      cleanup()
      reject(abortError(signal) as Error)
    }
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort)
      ch.port1.onmessage = null
      ch.port1.close()
      ch.port2.close()
    }

    // Add abort listener first, then check abort status to avoid race condition
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) {
        onAbort()
        return
      }
    }

    ch.port1.onmessage = e => {
      cleanup()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- FIXME
      resolve(e.data?.version ?? null)
    }

    serviceWorker.postMessage({ type: VROWSER_SW_GET_VERSION }, [ch.port2])
  })
}

async function isExpectedController(version: string, signal?: AbortSignal): Promise<boolean> {
  const v = await getServiceWorkerVersion(navigator.serviceWorker.controller, signal).catch(
    () => null
  )
  return v === version
}

type ExpectedPresence = 'none' | 'installing' | 'waiting' | 'active'

async function inferExpectedPresence(
  registration: ServiceWorkerRegistration,
  expectedVersion: string,
  signal?: AbortSignal
): Promise<ExpectedPresence> {
  // Check waiting first (most actionable)
  if (registration.waiting) {
    const v = await getServiceWorkerVersion(registration.waiting, signal).catch(() => null)
    if (v === expectedVersion) {
      return 'waiting'
    }
  }

  if (registration.installing) {
    const v = await getServiceWorkerVersion(registration.installing, signal).catch(() => null)
    if (v === expectedVersion) {
      return 'installing'
    }
  }

  if (registration.active) {
    const v = await getServiceWorkerVersion(registration.active, signal).catch(() => null)
    if (v === expectedVersion) {
      return 'active'
    }
  }

  return 'none'
}

type PromotionResult =
  | 'none'
  | 'promoted-waiting'
  | 'promoted-installing->waiting'
  | 'promoted-installing->active'
  | 'promoted-any-waiting'

async function promoteIfPossible(args: {
  registration: ServiceWorkerRegistration
  version: string
  signal: AbortSignal | undefined
  skipWaitingPolicy: SkipWaitingPolicy
  onProgress?: (phase: string) => void
  onStateChange?: (info: {
    state: SvcWorkerControllerState
    version: string
    serviceWorker: ServiceWorker
  }) => void
}): Promise<PromotionResult> {
  const { registration, version, signal, skipWaitingPolicy, onProgress, onStateChange } = args
  throwIfAborted(signal)

  // Snapshot current slots (any combo may exist)
  const waiting = registration.waiting
  const installing = registration.installing
  const active = registration.active

  // Policy: if any waiting exists, always request skipWaiting (aggressive).
  if (skipWaitingPolicy === 'force' && waiting) {
    onProgress?.('skipWaitingPolicy: force -> SKIP_WAITING')
    waiting.postMessage({ type: VROWSER_SW_SKIP_WAITING })
    return 'promoted-any-waiting'
  }

  // Case waiting: if expected service worker, promote immediately
  if (waiting) {
    const waitingVersion = await getServiceWorkerVersion(waiting, signal).catch(() => null)
    if (waitingVersion === version) {
      onStateChange?.({ state: 'waiting', version, serviceWorker: waiting })
      onProgress?.('found-expected-waiting -> SKIP_WAITING')
      waiting.postMessage({ type: VROWSER_SW_SKIP_WAITING })
      return 'promoted-waiting'
    }
  }

  // Case installing: if expected, wait until no longer installing, then promote appropriately
  if (installing) {
    const installingVersion = await getServiceWorkerVersion(installing, signal).catch(() => null)
    if (installingVersion === version) {
      onStateChange?.({ state: 'installing', version, serviceWorker: installing })
      onProgress?.('found-expected-installing -> wait until not installing')

      // Wait until the service worker is no longer in 'installing' state
      while (installing.state === 'installing') {
        await waitOnce(installing, 'statechange', signal)
        throwIfAborted(signal)
      }

      if (installing.state === 'redundant') {
        onProgress?.('expected-installing became redundant')
        return 'none'
      }

      // Case A: service worker moved to waiting (installed state) - there was an existing active service worker
      const waiting = registration.waiting
      if (waiting) {
        const waitingVersion = await getServiceWorkerVersion(waiting, signal).catch(() => null)
        if (waitingVersion === version) {
          onStateChange?.({ state: 'waiting', version, serviceWorker: waiting })
          onProgress?.('installing->installed; expected in waiting -> SKIP_WAITING')
          waiting.postMessage({ type: VROWSER_SW_SKIP_WAITING })
          return 'promoted-installing->waiting'
        }
      }

      // Case B: service worker skipped waiting and went directly to active
      if (installing.state === 'activating' || installing.state === 'activated') {
        const active = registration.active
        if (active) {
          const activeVersion = await getServiceWorkerVersion(active, signal).catch(() => null)
          if (activeVersion === version) {
            const state = installing.state === 'activating' ? 'activating' : 'activated'
            onStateChange?.({ state, version, serviceWorker: active })
            onProgress?.('installing->active (skipped waiting)')
            return 'promoted-installing->active'
          }
        }
      }

      return 'none'
    }
  }

  // Case active: if expected service worker, we can't promote further from page
  if (active) {
    const activeVersion = await getServiceWorkerVersion(active, signal).catch(() => null)
    if (activeVersion === version) {
      onStateChange?.({ state: 'activated', version, serviceWorker: active })
      onProgress?.('expected is active but not controller (yet)')
      return 'none'
    }
  }

  return 'none'
}

function waitForNextMeaningfulEvent(
  registration: ServiceWorkerRegistration,
  signal?: AbortSignal
): Promise<void> {
  throwIfAborted(signal)

  return new Promise((resolve, reject) => {
    type ListenerEntry = { target: EventTarget; type: string; handler: EventListener }
    const listeners: ListenerEntry[] = []

    const cleanup = () => {
      for (const { target, type, handler } of listeners) {
        target.removeEventListener(type, handler)
      }
      signal?.removeEventListener('abort', onAbort)
    }

    const onEvent = () => {
      cleanup()
      resolve()
    }

    const onAbort = () => {
      cleanup()
      reject(abortError(signal) as Error)
    }

    const addListener = (target: EventTarget, type: string) => {
      const handler = onEvent as EventListener
      listeners.push({ target, type, handler })
      target.addEventListener(type, handler, { once: true })
    }

    // Add abort listener first to avoid race condition
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) {
        onAbort()
        return
      }
    }

    // Watch for update found
    addListener(registration, 'updatefound')

    // Watch for controller change
    addListener(navigator.serviceWorker, 'controllerchange')

    // Watch installing service worker state changes
    if (registration.installing) {
      addListener(registration.installing, 'statechange')
    }

    // Also watch waiting service worker state changes
    if (registration.waiting) {
      addListener(registration.waiting, 'statechange')
    }
  })
}
