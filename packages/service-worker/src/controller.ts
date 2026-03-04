/**
 * Service Worker Controller
 *
 * This module provides a controller for managing Service Worker lifecycle on the page side.
 *
 * ## Features
 * - Version verification via service worker messaging
 * - Handles registration states: `installing`, `waiting`, `active`
 * - Singleton pattern: One controller instance per scriptURL + version combination
 * - Session management with MessagePort-based bidirectional communication
 * - Circuit breaker: suspend (soft kill) and resume capabilities
 *
 * ### Skip Waiting Policy
 * - `'strict'`: Request `skipWaiting` only if waiting/installing matches expected version
 * - `'force'`: If `registration.waiting` exists, always request `skipWaiting`
 *
 * ## Behavior
 * - Returns immediately if expected service worker is already the controller
 * - Returns when expected service worker becomes active, even if not yet controlling the page
 * - Emits {@link SvcWorkerControllerEventMap.reloadSuggested | reloadSuggested} when expected is active but not controller
 *
 * ## Service Worker Requirements
 * The service worker must handle the following message protocols:
 * - `V_SW_VERSION`: Respond with version via MessagePort
 * - `V_SW_SKIP_WAITING`: Call `self.skipWaiting()`
 * - `V_SW_SESSION_INIT`: Establish session (for circuit breaker support)
 * - (Optional) `clients.claim()` in activate event for immediate control
 *
 * These requirements are satisfied by using the `worker` module.
 *
 * @module controller
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { abortError, throwIfAborted } from '@kazupon/jts-utils/abort'
import { Emitter, waitOnce } from '@kazupon/jts-utils/event'
import {
  createSvcWorkerClaimClientsMessage,
  createSvcWorkerSkipWaitingMessage,
  createSvcWorkerVersionMessage,
  isSvcWrokerVersionMessageResponse,
  V_SW_SESSION_CIRCUIT_BREAKER,
  V_SW_SESSION_RESUME
} from './protocols.ts'
import * as registry from './registry.ts'
import { createSession } from './session.ts'
import { SESSION_SYMBOL } from './symbols.ts'
import { safePostMessage } from './utils.ts'

import type { Emittable } from '@kazupon/jts-utils/event/emitter'
import type {
  SvcWorkerSessionCircuitBreakerResult,
  SvcWorkerSessionResumeResult,
  SvcWorkerTerminatedReason
} from './protocols.ts'
import type { SvcWorkerSession } from './session.ts'

/**
 * Default timeout for circuit breaker operations (suspend/resume) in milliseconds.
 * Used when no AbortSignal is provided by the caller.
 */
const DEFAULT_CIRCUIT_BREAKER_TIMEOUT = 30000

/**
 * {@link SvcWorkerController | Service Worker Controller} instance creation options.
 *
 * Use in {@link createSvcWorkerController} function.
 */
export interface SvcWorkerControllerOptions extends RegistrationOptions {
  /**
   * The URL of the service worker script to register.
   * Must be a URL object for bundler static analysis compatibility.
   *
   * @example
   * ```ts
   * createSvcWorkerController({
   *   scriptURL: new URL('./sw.js', import.meta.url),
   *   version: 'v1'
   * })
   * ```
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
   */
  scriptURL: URL
  /**
   * The version tag string to identify the service worker.
   */
  version: string
  /**
   * debug logger function.
   */
  debug?: Console['debug']
}

/**
 * Service worker controller error.
 */
export class SvcWorkerControllerError extends Error {
  name = 'SvcWorkerControllerError'
  constructor(message: string, cause?: Error) {
    super(message, { cause })
  }
}

/**
 * Reload suggest reason.
 *
 * Reasons:
 * - 'unclaimed': Expected service worker is active but not controlling the page (no clients.claim())
 * - 'promoted': Expected service worker was in waiting, promoted to active, but not controlling the page
 */
export type ReloadSuggestReason = 'unclaimed' | 'promoted'

/**
 * Reload suggest information for service worker.
 */
export interface ReloadSuggestInfo {
  /**
   * The reason for suggesting reload.
   *
   * @see {@link ReloadSuggestReason}
   */
  reason: ReloadSuggestReason
  /**
   * The version of the service worker for suggesting reload.
   */
  version: string
}

/**
 * {@link SvcWorkerController | Service Worker Controller} state.
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
 * - `'suspended'`: Service worker functionality is temporarily disabled (soft kill / circuit breaker engaged)
 * - `'terminated'`: Service worker has been unregistered (hard kill / circuit breaker tripped)
 *
 * State transitions:
 * - `activated` → `suspended`: suspend() called (soft kill / circuit breaker engaged)
 * - `activated` → `terminated`: terminate() called (hard kill / circuit breaker tripped)
 * - `suspended` → `activated`: resume() called (circuit breaker disengaged)
 * - `suspended` → `terminated`: terminate() called (hard kill / circuit breaker tripped)
 */
export type SvcWorkerControllerState =
  | 'installing'
  | 'waiting'
  | 'activating'
  | 'activated'
  | 'suspended'
  | 'terminated'

/**
 * {@link SvcWorkerController | Service Worker Controller} state change information.
 */
export interface StateChangeInfo {
  /**
   * The current state of the {@link SvcWorkerController}.
   */
  state: SvcWorkerControllerState
  /**
   * The version of the service worker that triggered the state change.
   */
  version: string
  /**
   * The {@link ServiceWorker | service worker} instance that triggered the state change.
   */
  serviceWorker: ServiceWorker
}

/**
 * Event map for {@link SvcWorkerController}.
 *
 * This type defines the payload types for each event.
 * When subscribing to events via `on()`, you receive these payload types.
 */
export type SvcWorkerControllerEventMap = {
  /**
   * Service worker controller progress hook.
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
  /**
   * Fired when the service worker is suspended (soft kill / circuit breaker engaged).
   * The service worker remains registered but functionality is disabled.
   */
  suspended: void
  /**
   * Fired when the service worker is terminated (hard kill / circuit breaker tripped).
   * The service worker has been unregistered.
   * Payload is the reason for termination.
   */
  terminated: SvcWorkerTerminatedReason
  /**
   * Fired when the service worker is resumed after suspension.
   * Functionality has been restored.
   */
  resumed: void
}

/**
 * Skip waiting policy.
 *
 * Policies:
 * - 'strict': request `skipWaiting` only if `waiting` / `installing` matches expected service worker version
 * - 'force': if `registration.waiting` exists, ALWAYS request `skipWaiting` (even if version differs)
 */
export type SkipWaitingPolicy = 'strict' | 'force'

/**
 * An options for {@link SvcWorkerController.re | Service Worker Controller}.
 */
export interface SvcWorkerControllerReadyOptions {
  /**
   * Policy for `skipWaiting`.
   *
   * @default 'strict'
   */
  skipWaitingPolicy?: SkipWaitingPolicy
  /**
   * Timeout in milliseconds to wait for expected service worker to become active.
   *
   * @default 3000
   */
  timeout?: number
  /**
   * Wait for the service worker to become the page controller.
   *
   * When `true`, `ready()` will send a `V_SW_CLAIM_CLIENTS` message to the
   * active SW and wait for `navigator.serviceWorker.controller` to become
   * non-null before returning `true`.
   *
   * When `false` (default), `ready()` returns `true` as soon as the SW is
   * active, even if it's not yet the controller. A `reloadSuggested` event
   * is emitted in this case.
   *
   * @default false
   */
  waitForController?: boolean
}

/**
 * Service worker controller.
 */
export interface SvcWorkerController extends Emittable<SvcWorkerControllerEventMap>, Disposable {
  /**
   * The script URL of the service worker.
   */
  readonly scriptURL: string
  /**
   * The version tag of the service worker.
   */
  readonly version: string
  /**
   * The current state of the {@link SvcWorkerController}.
   */
  readonly state: SvcWorkerControllerState
  /**
   * The {@link ServiceWorker | service worker} instance that is managed by service worker controller.
   */
  readonly serviceWorker: ServiceWorker | null
  /**
   * The {@link ServiceWorkerContainer | service worker container} used by this controller.
   */
  readonly container: ServiceWorkerContainer
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
   * Suspend the service worker (soft kill / circuit breaker).
   *
   * This engages the circuit breaker, disabling service worker functionality
   * without unregistering it. The service worker remains active but should
   * bypass its fetch handlers.
   *
   * @param options - Suspend options
   * @returns Result of the suspend operation
   */
  suspend: (options?: {
    clearCaches?: boolean
    signal?: AbortSignal
  }) => Promise<SvcWorkerSessionCircuitBreakerResult>
  /**
   * Resume the service worker after suspension.
   *
   * This disengages the circuit breaker, restoring normal service worker
   * functionality.
   *
   * @param options - Resume options
   * @returns Result of the resume operation
   */
  resume: (options?: { signal?: AbortSignal }) => Promise<SvcWorkerSessionResumeResult>
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

/**
 * Internal interface extending SvcWorkerController with Symbol-based hidden properties.
 * Used by `admin.ts` to access session.
 *
 * @internal
 */
export interface SvcWorkerControllerInternal extends SvcWorkerController {
  readonly [SESSION_SYMBOL]: SvcWorkerSession | null
}

// Singleton instance cache
const instanceCache = new Map<string, SvcWorkerController>()
const optionsCache = new Map<string, SvcWorkerControllerOptions>()

function getInstanceKey(scriptURL: URL, version: string): string {
  return `${scriptURL.href}::${version}`
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

  const _emitter = Emitter<SvcWorkerControllerEventMap>()
  let _serviceWorker: ServiceWorker | null = null
  let _session: SvcWorkerSession | null = null
  let _state: SvcWorkerControllerState = 'installing'
  let _controllerChangeHandler: (() => void) | null = null

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

  /**
   * Update controller state based on session suspended status.
   * Must be called after establishSession() to get accurate suspended state.
   */
  function updateStateFromSession(serviceWorker: ServiceWorker): void {
    if (_session?.suspended) {
      // Service worker was suspended before page reload
      _state = 'suspended'
      _serviceWorker = serviceWorker
      _emitter.emit('changeState', { state: 'suspended', version, serviceWorker })
      _debug?.('createSvcWorkerController: detected suspended state from session')
    } else {
      emitStateChange('activated', serviceWorker)
    }
  }

  function setupControllerChangeHandler(timeout: number): void {
    if (_controllerChangeHandler) {
      return
    }

    _controllerChangeHandler = () => {
      const controller = navigator.serviceWorker.controller
      if (controller) {
        _debug?.('createSvcWorkerController: controllerchange, re-establishing session')
        // Create abort controller with timeout for session re-establishment
        const abortController = new AbortController()
        // Use bind() instead of arrow function to avoid capturing the entire scope in closure,
        // which can cause memory leaks in long-running sessions.
        // See: https://x.com/jarredsumner/status/2017825694731145388
        const timeoutId = setTimeout(abortController.abort.bind(abortController), timeout)
        // Re-establish session with new controller
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Intentional
        establishSession(controller, abortController.signal).finally(() => clearTimeout(timeoutId))
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', _controllerChangeHandler)
  }

  function resetSession() {
    if (_session) {
      _session.close()
      _session = null
    }
  }

  function resetController(state: SvcWorkerControllerState = 'installing') {
    _serviceWorker = null
    _state = state
  }

  function reset() {
    // Close existing session
    resetSession()
    // Remove controller change handler
    if (_controllerChangeHandler) {
      navigator.serviceWorker.removeEventListener('controllerchange', _controllerChangeHandler)
      _controllerChangeHandler = null
    }
    // Reset controller info
    resetController()
  }

  async function establishSession(
    serviceWorker: ServiceWorker,
    signal?: AbortSignal
  ): Promise<void> {
    // Close existing session if any
    resetSession()

    try {
      _session = await createSession(serviceWorker, {
        ...(signal ? { signal } : {}),
        ...(_debug ? { debug: _debug } : {})
      })
      _debug?.('createSvcWorkerController: session established, version:', _session.version)

      // Register terminated callback to update state when service worker unregisters
      _session.onTerminated(reason => {
        _debug?.('createSvcWorkerController: received terminated notification, reason:', reason)
        _state = 'terminated'
        _emitter.emit('terminated', reason)
      })
    } catch (error) {
      _debug?.('createSvcWorkerController: failed to establish session', error)
      // Session is optional - controller still works without it
    }
  }

  /**
   * Ready for the expected service worker to become active.
   */
  async function ready(options?: SvcWorkerControllerReadyOptions): Promise<boolean> {
    const timeout = options?.timeout ?? 3000
    const waitForController = options?.waitForController ?? false
    const skipWaitingPolicy = options?.skipWaitingPolicy ?? 'strict'

    const abortController = new AbortController()
    // Use bind() instead of arrow function to avoid capturing the entire scope in closure,
    // which can cause memory leaks in long-running sessions.
    // See: https://x.com/jarredsumner/status/2017825694731145388
    const timeoutId = setTimeout(abortController.abort.bind(abortController), timeout)
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
          // Establish session first to get suspended status
          await establishSession(controller, signal)
          // Set state based on session suspended status (handles page reload case)
          updateStateFromSession(controller)
          setupControllerChangeHandler(timeout)
        }
        emitProgress('already-expected-controller')
        registry.register(instance)
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

        // If waitForController is requested and SW is active but not controller,
        // send claim-clients before checking isExpectedController.
        // This must happen before isExpectedController check because
        // promoteIfPossible may have confirmed the SW is active and expected
        // version but not controller (returns 'none' with the active path log).
        if (waitForController && !navigator.serviceWorker.controller && registration.active) {
          safePostMessage(registration.active, createSvcWorkerClaimClientsMessage(), {
            context: 'claim-clients request'
          })
          // Wait briefly for claim to take effect
          await new Promise<void>(resolve => {
            const onControllerChange = () => {
              clearInterval(pollId)
              resolve()
            }
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, {
              once: true
            })
            const pollId = setInterval(() => {
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                clearInterval(pollId)
                resolve()
              }
            }, 100)
            // Don't wait forever — let the outer loop handle retries
            setTimeout(() => {
              navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
              clearInterval(pollId)
              resolve()
            }, 3000)
          })
          emitProgress('controller-claimed')
        }

        // If controller is now expected service worker, done.
        if (await isExpectedController(version, signal)) {
          const controller = (_serviceWorker = navigator.serviceWorker.controller)
          if (controller) {
            // Establish session first to get suspended status
            await establishSession(controller, signal)
            // Set state based on session suspended status (handles page reload case)
            updateStateFromSession(controller)
            setupControllerChangeHandler(timeout)
          }
          emitProgress('controller-is-expected')
          registry.register(instance)
          return true
        }

        // Check where expected service worker is now
        const expectedState = await inferExpectedPresence(registration, version, signal)
        _debug?.('inferExpectedPresence ->', expectedState)

        // If expected is active (even if not controller), we've done all we can.
        // For service workers that don't call `clients.claim()`, the page won't be controlled until reload.
        // Suggest reload and return - caller decides what to do.
        if (expectedState === 'active') {
          const activeServiceWorker = registration.active
          if (activeServiceWorker) {
            // Establish session first to get suspended status
            await establishSession(activeServiceWorker, signal)
            // Set state based on session suspended status (handles page reload case)
            // Only update if not already in correct state
            const targetState = _session?.suspended ? 'suspended' : 'activated'
            if (_state !== targetState) {
              if (_session?.suspended) {
                _state = 'suspended'
                _serviceWorker = activeServiceWorker
                _emitter.emit('changeState', {
                  state: 'suspended',
                  version,
                  serviceWorker: activeServiceWorker
                })
                _debug?.(
                  'createSvcWorkerController: detected suspended state from session (active path)'
                )
              } else {
                emitStateChange('activated', activeServiceWorker)
              }
            }
            setupControllerChangeHandler(timeout)
          }

          // If waitForController is requested and SW is not yet the controller,
          // send V_SW_CLAIM_CLIENTS to the SW and wait for it to become controller.
          if (waitForController && !navigator.serviceWorker.controller) {
            if (activeServiceWorker) {
              safePostMessage(activeServiceWorker, createSvcWorkerClaimClientsMessage(), {
                context: 'claim-clients request'
              })
            }
            // Wait for controller to become available (with AbortSignal timeout)
            await new Promise<void>((resolve, reject) => {
              const onAbort = () => {
                navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
                clearInterval(pollId)
                reject(abortError() as Error)
              }
              const onControllerChange = () => {
                signal.removeEventListener('abort', onAbort)
                clearInterval(pollId)
                resolve()
              }
              navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, {
                once: true
              })
              // Poll as fallback — controllerchange may not fire in some edge cases
              const pollId = setInterval(() => {
                if (navigator.serviceWorker.controller) {
                  signal.removeEventListener('abort', onAbort)
                  navigator.serviceWorker.removeEventListener(
                    'controllerchange',
                    onControllerChange
                  )
                  clearInterval(pollId)
                  resolve()
                }
              }, 100)
              signal.addEventListener('abort', onAbort, { once: true })
            })
            emitProgress('controller-claimed')
            registry.register(instance)
            return true
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
          registry.register(instance)
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

  async function withDefaultTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    providedSignal?: AbortSignal
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let signal = providedSignal

    if (!signal) {
      const abortController = new AbortController()
      // Use bind() instead of arrow function to avoid capturing the entire scope in closure,
      // which can cause memory leaks in long-running sessions.
      // See: https://x.com/jarredsumner/status/2017825694731145388
      timeoutId = setTimeout(
        abortController.abort.bind(abortController),
        DEFAULT_CIRCUIT_BREAKER_TIMEOUT
      )
      signal = abortController.signal
    }

    try {
      return await fn(signal)
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }

  async function suspend(
    suspendOptions: { clearCaches?: boolean; signal?: AbortSignal } = {}
  ): Promise<SvcWorkerSessionCircuitBreakerResult> {
    if (!_session) {
      throw new SvcWorkerControllerError('Session not established. Call ready() first.')
    }
    if (_state !== 'activated' && _state !== 'suspended') {
      throw new SvcWorkerControllerError(`Cannot suspend in state: ${_state}`)
    }

    _debug?.('createSvcWorkerController: suspending service worker')

    try {
      const result = await withDefaultTimeout(
        signal =>
          _session!.send<SvcWorkerSessionCircuitBreakerResult>(
            {
              type: V_SW_SESSION_CIRCUIT_BREAKER,
              mode: 'suspend',
              clearCaches: suspendOptions.clearCaches
            },
            { signal }
          ),
        suspendOptions.signal
      )

      _state = 'suspended'
      _emitter.emit('suspended')
      _debug?.('createSvcWorkerController: suspended')

      return result
    } catch (error) {
      throw new SvcWorkerControllerError(
        'Failed to suspend service worker',
        error instanceof Error ? error : undefined
      )
    }
  }

  async function resume(
    resumeOptions: { signal?: AbortSignal } = {}
  ): Promise<SvcWorkerSessionResumeResult> {
    if (!_session) {
      throw new SvcWorkerControllerError('Session not established. Call ready() first.')
    }
    if (_state !== 'suspended') {
      throw new SvcWorkerControllerError(`Cannot resume in state: ${_state}`)
    }

    _debug?.('createSvcWorkerController: resuming service worker')

    try {
      const result = await withDefaultTimeout(
        signal =>
          _session!.send<SvcWorkerSessionResumeResult>({ type: V_SW_SESSION_RESUME }, { signal }),
        resumeOptions.signal
      )

      _state = 'activated'
      _emitter.emit('resumed')
      _debug?.('createSvcWorkerController: resumed')

      return result
    } catch (error) {
      throw new SvcWorkerControllerError(
        'Failed to resume service worker',
        error instanceof Error ? error : undefined
      )
    }
  }

  function dispose(): void {
    registry.unregister(instance)
    instanceCache.delete(key)
    optionsCache.delete(key)
    reset()
  }

  // Use URL.href for consistent string access
  const _scriptURL = scriptURL.href

  const instance: SvcWorkerControllerInternal = Object.freeze({
    ..._emitter,
    get scriptURL() {
      return _scriptURL
    },
    get version() {
      return version
    },
    get state() {
      return _state
    },
    get serviceWorker() {
      return _serviceWorker
    },
    get container() {
      return navigator.serviceWorker
    },
    get [SESSION_SYMBOL]() {
      return _session
    },
    ready,
    suspend,
    resume,
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

    ch.port1.addEventListener(
      'message',
      (e: MessageEvent) => {
        if (isSvcWrokerVersionMessageResponse(e.data)) {
          cleanup()
          resolve(e.data.version)
        }
      },
      signal ? { signal } : undefined
    )
    ch.port1.start()

    const sent = safePostMessage(serviceWorker, createSvcWorkerVersionMessage(), {
      transfer: [ch.port2],
      context: 'version request',
      onError: error => {
        cleanup()
        reject(error as Error)
      }
    })

    if (!sent) {
      // onError already called cleanup and reject
      return
    }
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
    const sent = safePostMessage(waiting, createSvcWorkerSkipWaitingMessage(), {
      context: 'force skipWaiting'
    })
    if (!sent) {
      // skipWaiting send failed, log already printed, continue with 'none'
      return 'none'
    }
    return 'promoted-any-waiting'
  }

  // Case waiting: if expected service worker, promote immediately
  if (waiting) {
    const waitingVersion = await getServiceWorkerVersion(waiting, signal).catch(() => null)
    if (waitingVersion === version) {
      onStateChange?.({ state: 'waiting', version, serviceWorker: waiting })
      onProgress?.('found-expected-waiting -> SKIP_WAITING')
      const sent = safePostMessage(waiting, createSvcWorkerSkipWaitingMessage(), {
        context: 'expected waiting skipWaiting'
      })
      if (!sent) {
        return 'none'
      }
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
          const sent = safePostMessage(waiting, createSvcWorkerSkipWaitingMessage(), {
            context: 'installing->waiting skipWaiting'
          })
          if (!sent) {
            return 'none'
          }
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
