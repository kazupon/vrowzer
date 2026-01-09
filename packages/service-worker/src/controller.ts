/**
 * Service Worker Controller
 *
 * Features:
 * - Defines service worker version tag and verifies via service worker messaging.
 * - Handles the below combination service worker on registration:
 *   - `registration.installing`
 *   - `registration.waiting`
 *   - `registration.active`
 * - Optional policy:
 *   1. If any waiting exists, always request `skipWaiting` (aggressive).
 *   2. If controller does not switch (expected is active but not controller), suggest reload via callback.
 *
 * Behavior:
 *  - Returns immediately if expected service worker is already the controller.
 *  - Returns when expected service worker becomes active, even if not yet controlling the page.
 *    (For service workers that don't call `clients.claim()`, reload is needed to gain control)
 *  - Calls {@link SvcWorkerControllerEventMap.reloadSuggested | reloadSuggested} when expected is active but not controller.
 *
 * Service worker requirements:
 *  - Responds to `{ type: 'VROWSER_SW_GET_VERSION' }` using `MessageChannel` port -> {version}
 *  - Accepts `{ type: "VROWSER_SW_SKIP_WAITING" }` -> `self.skipWaiting()`
 *  - (Optional) in activate: `event.waitUntil(self.clients.claim())` - enables immediate control
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
import { createEmitter } from '@kazupon/jts-utils/event'

import type { Emittable } from '@kazupon/jts-utils'
import type { AbortableOptions } from './types.ts'

/**
 * {@link SvcWorkerController | Service Worker Controller} instance creation options.
 *
 * Use in {@link createSvcWorkerController} function.
 */
export interface SvcWorkerControllerOptions extends RegistrationOptions, AbortableOptions {
  /**
   * The URL of the service worker script to register
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register}
   */
  scriptURL: string | URL
  /**
   * The version string to identify the service worker
   */
  version: string
  /**
   * Policy for `skipWaiting`
   *
   * @default 'expected-only'
   */
  skipWaitingPolicy?: SkipWaitingPolicy
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
 * Skip waiting policy type
 *
 * Policies:
 * - 'expected-only': request `skipWaiting` only if `waiting` / `installing` matches expected service worker version
 * - 'always-when-waiting': if `registration.waiting` exists, ALWAYS request `skipWaiting` (even if version differs)
 */
export type SkipWaitingPolicy = 'expected-only' | 'always-when-waiting'

/**
 * Reload suggest reason type
 */
export type ReloadSuggestReason =
  | 'expected-active-but-not-controller'
  | 'expected-waiting-promoted-but-not-controller'

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
   * The version of the service worker suggesting reload
   */
  version: string
}

/**
 * {@link SvcWorkerController | Service Worker Controller} state type
 *
 * Note that while it is similar to the state provided by {@link ServiceWorkerState | service worker state}, it is not identical.
 * It has been adjusted to be easier for the Service worker controller to handle.
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
   * This callback is useful to debug or UI/telemetry.
   *
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
 * Service worker controller
 */
export interface SvcWorkerController extends Emittable<SvcWorkerControllerEventMap> {
  /**
   * The current state of the {@link SvcWorkerController}
   */
  readonly state: SvcWorkerControllerState
  /**
   * The {@link ServiceWorker | service worker} instance that is managed by service worker controller
   */
  readonly serviceWorker: ServiceWorker
}

/**
 * Create a {@link SvcWorkerController | Service worker controller} instance.
 *
 * This function initializes the service worker controller with the specified options.
 * During initialization, it checks the service worker's state while respecting the specified options, emit events such as `reloadSuggested` and `changeState`.
 * After instance initialization, you can control your application's logic via the {@link SvcWorkerController.state | state} and {@link SvcWorkerController.serviceWorker | serviceWorker} properties.
 *
 * @param options {@link SvcWorkerControllerOptions | Service worker controller options}
 * @returns - {@link SvcWorkerController | Service worker controller instance}
 */
export async function createSvcWorkerController(
  options: SvcWorkerControllerOptions
): Promise<Readonly<SvcWorkerController>> {
  const {
    scriptURL,
    version: expectedVersion,
    signal,
    skipWaitingPolicy = 'expected-only',
    debug: _debug,
    ...registrationOptions
  } = options

  _debug?.('createSvcWorkerController: options', options)

  const _emitter =
    createEmitter<{
      [K in keyof SvcWorkerControllerEventMap]: SvcWorkerControllerEventMap[K]
    }>()
  let _serviceWorker: ServiceWorker | null = null
  let _state: SvcWorkerControllerState = 'installing'

  // Helper to emit events and update state
  const emitStateChange = (state: SvcWorkerControllerState, sw: ServiceWorker) => {
    _state = state
    _serviceWorker = sw
    _emitter.emit('changeState', { state, version: expectedVersion, serviceWorker: sw })
  }

  const emitProgress = (phase: string) => {
    _debug?.('createSvcWorkerController: progress', phase)
    _emitter.emit('progress', phase)
  }

  // Abort check
  throwIfAborted(signal)

  // Register the service worker
  emitProgress('registering')
  const reg = await navigator.serviceWorker.register(scriptURL, registrationOptions)
  emitProgress('registered')

  // Fast-path: already controlled by expected
  if (await isExpectedController(expectedVersion, signal)) {
    const controller = navigator.serviceWorker.controller
    if (controller) {
      emitStateChange('activated', controller)
    }
    emitProgress('already-expected-controller')
    return createController(
      _emitter,
      () => _state,
      () => _serviceWorker!
    )
  }

  let reloadSuggested = false

  for (;;) {
    throwIfAborted(signal)

    // 1) Try to promote expected (and optionally any waiting) to become active ASAP.
    const promotedKind = await promoteIfPossible({
      reg,
      expectedVersion,
      signal,
      skipWaitingPolicy,
      onProgress: emitProgress,
      onExpectedStateChange: info => emitStateChange(info.state, info.serviceWorker)
    })

    // 2) If controller is now expected, done.
    if (await isExpectedController(expectedVersion, signal)) {
      const controller = navigator.serviceWorker.controller
      if (controller) {
        emitStateChange('activated', controller)
      }
      emitProgress('controller-is-expected')
      return createController(
        _emitter,
        () => _state,
        () => _serviceWorker!
      )
    }

    // 3) Check where expected SW is now
    const expectedState = await inferExpectedPresence(reg, expectedVersion, signal)

    // 4) If expected is active (even if not controller), we've done all we can.
    //    For SWs that don't call clients.claim(), the page won't be controlled until reload.
    //    Suggest reload and return - caller decides what to do.
    if (expectedState === 'active') {
      // Ensure state is updated to 'activated' since SW is active
      const activeSW = reg.active
      // Note: _state may have been updated by emitStateChange callback, so check current value
      const currentState = _state as SvcWorkerControllerState
      if (activeSW && currentState !== 'activated') {
        emitStateChange('activated', activeSW)
      }
      if (!reloadSuggested) {
        reloadSuggested = true
        _emitter.emit('reloadSuggested', {
          reason: 'expected-active-but-not-controller',
          version: expectedVersion
        })
      }
      emitProgress('expected-active-returning (reload suggested)')
      return createController(
        _emitter,
        () => _state,
        () => _serviceWorker!
      )
    }

    // 5) Handle promoted cases - wait briefly for activation to complete before re-checking
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

    // 6) Expected is not yet active (installing, waiting, or none) - wait for events
    emitProgress('registration.update()')
    await reg.update().catch(() => {})

    emitProgress('waiting-next-event')
    await waitForNextMeaningfulEvent(reg, signal).catch(() => {})
  }
}

function createController(
  emitter: Readonly<Emittable<SvcWorkerControllerEventMap>>,
  getState: () => SvcWorkerControllerState,
  getServiceWorker: () => ServiceWorker
): Readonly<SvcWorkerController> {
  return Object.freeze({
    ...emitter,
    get state() {
      return getState()
    },
    get serviceWorker() {
      return getServiceWorker()
    }
  } as SvcWorkerController)
}

const SW_MESSAGE_TYPE = {
  GET_VERSION: 'VROWSER_SW_GET_VERSION',
  SKIP_WAITING: 'VROWSER_SW_SKIP_WAITING'
} as const

function once<T extends EventTarget>(target: T, type: string, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal)

  return new Promise((resolve, reject) => {
    const onEvt = () => {
      cleanup()
      resolve()
    }
    const onAb = () => {
      cleanup()
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- FIXME
      reject(abortError(signal))
    }
    const cleanup = () => {
      target.removeEventListener(type, onEvt as EventListener)
      signal?.removeEventListener('abort', onAb)
    }

    // Add abort listener first, then check abort status to avoid race condition
    if (signal) {
      signal.addEventListener('abort', onAb, { once: true })
      if (signal.aborted) {
        onAb()
        return
      }
    }

    target.addEventListener(type, onEvt as EventListener, { once: true })
  })
}

function getSWVersion(sw: ServiceWorker | null, signal?: AbortSignal): Promise<string | null> {
  throwIfAborted(signal)
  if (!sw) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const ch = new MessageChannel()

    const onAb = () => {
      cleanup()
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- FIXME
      reject(abortError(signal))
    }
    const cleanup = () => {
      signal?.removeEventListener('abort', onAb)
      ch.port1.onmessage = null
      ch.port1.close()
      ch.port2.close()
    }

    // Add abort listener first, then check abort status to avoid race condition
    if (signal) {
      signal.addEventListener('abort', onAb, { once: true })
      if (signal.aborted) {
        onAb()
        return
      }
    }

    ch.port1.onmessage = e => {
      cleanup()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- FIXME
      resolve(e.data?.version ?? null)
    }

    sw.postMessage({ type: SW_MESSAGE_TYPE.GET_VERSION }, [ch.port2])
  })
}

async function isExpectedController(version: string, signal?: AbortSignal): Promise<boolean> {
  const v = await getSWVersion(navigator.serviceWorker.controller, signal).catch(() => null)
  return v === version
}

type ExpectedPresence = 'none' | 'installing' | 'waiting' | 'active'

async function inferExpectedPresence(
  reg: ServiceWorkerRegistration,
  expectedVersion: string,
  signal?: AbortSignal
): Promise<ExpectedPresence> {
  // Check waiting first (most actionable)
  if (reg.waiting) {
    const v = await getSWVersion(reg.waiting, signal).catch(() => null)
    if (v === expectedVersion) {
      return 'waiting'
    }
  }

  if (reg.installing) {
    const v = await getSWVersion(reg.installing, signal).catch(() => null)
    if (v === expectedVersion) {
      return 'installing'
    }
  }

  if (reg.active) {
    const v = await getSWVersion(reg.active, signal).catch(() => null)
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
  reg: ServiceWorkerRegistration
  expectedVersion: string
  signal: AbortSignal | undefined
  skipWaitingPolicy: SkipWaitingPolicy
  onProgress?: (phase: string) => void
  onExpectedStateChange?: (info: {
    state: SvcWorkerControllerState
    expectedVersion: string
    serviceWorker: ServiceWorker
  }) => void
}): Promise<PromotionResult> {
  const { reg, expectedVersion, signal, skipWaitingPolicy, onProgress, onExpectedStateChange } =
    args
  throwIfAborted(signal)

  // Snapshot current slots (any combo may exist)
  const waiting = reg.waiting
  const installing = reg.installing
  const active = reg.active

  // Policy: if any waiting exists, always request skipWaiting (aggressive).
  if (skipWaitingPolicy === 'always-when-waiting' && waiting) {
    onProgress?.('skipWaitingPolicy: always-when-waiting -> SKIP_WAITING')
    waiting.postMessage({ type: SW_MESSAGE_TYPE.SKIP_WAITING })
    return 'promoted-any-waiting'
  }

  // 1) waiting: if expected, promote immediately
  if (waiting) {
    const wv = await getSWVersion(waiting, signal).catch(() => null)
    if (wv === expectedVersion) {
      onExpectedStateChange?.({ state: 'waiting', expectedVersion, serviceWorker: waiting })
      onProgress?.('found-expected-waiting -> SKIP_WAITING')
      waiting.postMessage({ type: SW_MESSAGE_TYPE.SKIP_WAITING })
      return 'promoted-waiting'
    }
  }

  // 2) installing: if expected, wait until no longer installing, then promote appropriately
  if (installing) {
    const iv = await getSWVersion(installing, signal).catch(() => null)
    if (iv === expectedVersion) {
      onExpectedStateChange?.({ state: 'installing', expectedVersion, serviceWorker: installing })
      onProgress?.('found-expected-installing -> wait until not installing')

      // Wait until the SW is no longer in 'installing' state
      while (installing.state === 'installing') {
        await once(installing, 'statechange', signal)
        throwIfAborted(signal)
      }

      if (installing.state === 'redundant') {
        onProgress?.('expected-installing became redundant')
        return 'none'
      }

      // Case A: SW moved to waiting (installed state) - there was an existing active SW
      const w = reg.waiting
      if (w) {
        const wv2 = await getSWVersion(w, signal).catch(() => null)
        if (wv2 === expectedVersion) {
          onExpectedStateChange?.({ state: 'waiting', expectedVersion, serviceWorker: w })
          onProgress?.('installing->installed; expected in waiting -> SKIP_WAITING')
          w.postMessage({ type: SW_MESSAGE_TYPE.SKIP_WAITING })
          return 'promoted-installing->waiting'
        }
      }

      // Case B: SW skipped waiting and went directly to active
      if (installing.state === 'activating' || installing.state === 'activated') {
        const a = reg.active
        if (a) {
          const av = await getSWVersion(a, signal).catch(() => null)
          if (av === expectedVersion) {
            const state = installing.state === 'activating' ? 'activating' : 'activated'
            onExpectedStateChange?.({ state, expectedVersion, serviceWorker: a })
            onProgress?.('installing->active (skipped waiting)')
            return 'promoted-installing->active'
          }
        }
      }

      return 'none'
    }
  }

  // 3) active: if expected, we can't promote further from page
  if (active) {
    const av = await getSWVersion(active, signal).catch(() => null)
    if (av === expectedVersion) {
      onExpectedStateChange?.({ state: 'activated', expectedVersion, serviceWorker: active })
      onProgress?.('expected is active but not controller (yet)')
      return 'none'
    }
  }

  return 'none'
}

function waitForNextMeaningfulEvent(
  reg: ServiceWorkerRegistration,
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
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- FIXME
      reject(abortError(signal))
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
    addListener(reg, 'updatefound')

    // Watch for controller change
    addListener(navigator.serviceWorker, 'controllerchange')

    // Watch installing SW state changes
    if (reg.installing) {
      addListener(reg.installing, 'statechange')
    }

    // Also watch waiting SW state changes
    if (reg.waiting) {
      addListener(reg.waiting, 'statechange')
    }
  })
}
