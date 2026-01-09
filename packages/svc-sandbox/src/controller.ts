/**
 * Latest-SW-controlled execution helper (event-driven, AbortController-friendly)
 *
 * Features:
 *  - Defines "latest" as expectedVersion (build id) and verifies via SW messaging.
 *  - Handles any combination of registration.installing / waiting / active.
 *  - Optional policy:
 *      (1) If any waiting exists, always request skipWaiting (aggressive).
 *      (2) If controller does not switch (expected is active but not controller), suggest reload via callback.
 *
 * Behavior:
 *  - Returns immediately if expected SW is already the controller.
 *  - Returns when expected SW becomes active, even if not yet controlling the page.
 *    (For SWs that don't call clients.claim(), reload is needed to gain control.)
 *  - Calls onReloadSuggested when expected is active but not controller.
 *
 * SW requirements (sw.js):
 *  - Responds to {type:"GET_VERSION"} using MessageChannel port -> {version}
 *  - Accepts {type:"SKIP_WAITING"} -> self.skipWaiting()
 *  - (Optional) in activate: event.waitUntil(self.clients.claim()) - enables immediate control
 */

export type LatestSWOptions = {
  registration: ServiceWorkerRegistration
  expectedVersion: string
  signal?: AbortSignal

  /**
   * Policy for skipWaiting:
   *  - "expected-only": request skipWaiting only if waiting/installing matches expectedVersion
   *  - "always-when-waiting": if reg.waiting exists, ALWAYS request skipWaiting (even if version differs)
   */
  skipWaitingPolicy?: 'expected-only' | 'always-when-waiting'

  /**
   * Called once when we detect that expected SW is active/ready to take over,
   * but the page controller isn't switching (often due to missing clients.claim() or needing navigation).
   * You can show UI like: "Update ready. Reload to apply."
   */
  onReloadSuggested?: (info: {
    reason: 'expected-active-but-not-controller' | 'expected-waiting-promoted-but-not-controller'
    expectedVersion: string
  }) => void

  /**
   * Optional progress hook for UI/telemetry.
   */
  onProgress?: (phase: string) => void

  /**
   * Called when expected SW state changes.
   * Use this for UI updates during SW lifecycle (e.g., showing "Installing...", "Waiting...", etc.)
   *
   * Callback invocation timing:
   * - `'installing'`: When expected SW is detected in installing state
   * - `'waiting'`: When expected SW is detected in waiting state, or when installing → waiting transition occurs
   * - `'activating'`: When installing SW skips waiting and transitions directly to activating state
   * - `'activated'`: When any of the following occurs:
   *   - Fast-path: expected SW is already the controller
   *   - Expected SW becomes the controller after promotion
   *   - Installing SW skips waiting and transitions directly to activated state
   *   - Expected SW is active but not yet controlling the page (reload suggested)
   */
  onExpectedStateChange?: (info: {
    state: 'installing' | 'waiting' | 'activating' | 'activated'
    expectedVersion: string
    serviceWorker: ServiceWorker
  }) => void
}

export async function ensureLatestSWControlsThisPage(opts: LatestSWOptions): Promise<void> {
  const {
    registration: reg,
    expectedVersion,
    signal,
    skipWaitingPolicy = 'expected-only',
    onReloadSuggested,
    onProgress,
    onExpectedStateChange
  } = opts

  throwIfAborted(signal)

  // Fast-path: already controlled by expected
  if (await isExpectedController(expectedVersion, signal)) {
    const controller = navigator.serviceWorker.controller
    if (controller) {
      onExpectedStateChange?.({ state: 'activated', expectedVersion, serviceWorker: controller })
    }
    onProgress?.('already-expected-controller')
    return
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
      onProgress,
      onExpectedStateChange
    })

    // 2) If controller is now expected, done.
    if (await isExpectedController(expectedVersion, signal)) {
      const controller = navigator.serviceWorker.controller
      if (controller) {
        onExpectedStateChange?.({ state: 'activated', expectedVersion, serviceWorker: controller })
      }
      onProgress?.('controller-is-expected')
      return
    }

    // 3) Check where expected SW is now
    const expectedState = await inferExpectedPresence(reg, expectedVersion, signal)

    // 4) If expected is active (even if not controller), we've done all we can.
    //    For SWs that don't call clients.claim(), the page won't be controlled until reload.
    //    Suggest reload and return - caller decides what to do.
    if (expectedState === 'active') {
      if (!reloadSuggested) {
        reloadSuggested = true
        onReloadSuggested?.({
          reason: 'expected-active-but-not-controller',
          expectedVersion
        })
      }
      onProgress?.('expected-active-returning (reload suggested)')
      return
    }

    // 5) Handle promoted cases - wait briefly for activation to complete before re-checking
    if (
      promotedKind === 'promoted-waiting' ||
      promotedKind === 'promoted-any-waiting' ||
      promotedKind === 'promoted-installing->waiting' ||
      promotedKind === 'promoted-installing->active'
    ) {
      onProgress?.('promoted, waiting for activation')
      await new Promise(r => setTimeout(r, 100))
      continue
    }

    // 6) Expected is not yet active (installing, waiting, or none) - wait for events
    onProgress?.('registration.update()')
    await reg.update().catch(() => {})

    onProgress?.('waiting-next-event')
    await waitForNextMeaningfulEvent(reg, signal).catch(() => {})
  }
}

/**
 * Convenience wrapper: wait until expected controls, then run fn.
 */
export async function runWithLatestSWControl(
  opts: LatestSWOptions,
  fn: () => void | Promise<void>
): Promise<void> {
  await ensureLatestSWControlsThisPage(opts)
  await fn()
}

/* --------------------------- Abort + once helpers --------------------------- */

function abortError(signal?: AbortSignal): unknown {
  return signal?.reason ?? new DOMException('Aborted', 'AbortError')
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError(signal)
}

function once<T extends EventTarget>(target: T, type: string, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal)

  return new Promise((resolve, reject) => {
    const onEvt = () => {
      cleanup()
      resolve()
    }
    const onAb = () => {
      cleanup()
      reject(abortError(signal))
    }
    const cleanup = () => {
      target.removeEventListener(type, onEvt as any)
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

    target.addEventListener(type, onEvt as any, { once: true })
  })
}

/* --------------------------- SW messaging: version query --------------------------- */

function getSWVersion(sw: ServiceWorker | null, signal?: AbortSignal): Promise<string | null> {
  throwIfAborted(signal)
  if (!sw) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const ch = new MessageChannel()

    const onAb = () => {
      cleanup()
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
      resolve(e.data?.version ?? null)
    }

    sw.postMessage({ type: 'GET_VERSION' }, [ch.port2])
  })
}

async function isExpectedController(
  expectedVersion: string,
  signal?: AbortSignal
): Promise<boolean> {
  const v = await getSWVersion(navigator.serviceWorker.controller, signal).catch(() => null)
  return v === expectedVersion
}

/* --------------------------- Presence inference (installing/waiting/active) --------------------------- */

type ExpectedPresence = 'none' | 'installing' | 'waiting' | 'active'

async function inferExpectedPresence(
  reg: ServiceWorkerRegistration,
  expectedVersion: string,
  signal?: AbortSignal
): Promise<ExpectedPresence> {
  // Check waiting first (most actionable)
  if (reg.waiting) {
    const v = await getSWVersion(reg.waiting, signal).catch(() => null)
    if (v === expectedVersion) return 'waiting'
  }
  if (reg.installing) {
    const v = await getSWVersion(reg.installing, signal).catch(() => null)
    if (v === expectedVersion) return 'installing'
  }
  if (reg.active) {
    const v = await getSWVersion(reg.active, signal).catch(() => null)
    if (v === expectedVersion) return 'active'
  }
  return 'none'
}

/* --------------------------- Promotion logic (handles all combos) --------------------------- */

type PromotionResult =
  | 'none'
  | 'promoted-waiting'
  | 'promoted-installing->waiting'
  | 'promoted-installing->active' // when installing SW skips waiting and goes directly to active
  | 'promoted-any-waiting' // policy: always skipWaiting when waiting exists

async function promoteIfPossible(args: {
  reg: ServiceWorkerRegistration
  expectedVersion: string
  signal?: AbortSignal
  skipWaitingPolicy: 'expected-only' | 'always-when-waiting'
  onProgress?: (phase: string) => void
  onExpectedStateChange?: LatestSWOptions['onExpectedStateChange']
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
    waiting.postMessage({ type: 'SKIP_WAITING' })
    return 'promoted-any-waiting'
  }

  // 1) waiting: if expected, promote immediately
  if (waiting) {
    const wv = await getSWVersion(waiting, signal).catch(() => null)
    if (wv === expectedVersion) {
      onExpectedStateChange?.({ state: 'waiting', expectedVersion, serviceWorker: waiting })
      onProgress?.('found-expected-waiting -> SKIP_WAITING')
      waiting.postMessage({ type: 'SKIP_WAITING' })
      return 'promoted-waiting'
    }
  }

  // 2) installing: if expected, wait until no longer installing, then promote appropriately
  if (installing) {
    const iv = await getSWVersion(installing, signal).catch(() => null)
    if (iv === expectedVersion) {
      onExpectedStateChange?.({ state: 'installing', expectedVersion, serviceWorker: installing })
      onProgress?.('found-expected-installing -> wait until not installing')

      // Fix: Wait until the SW is no longer in 'installing' state
      // This handles all transitions: installing -> installed, installing -> activating -> activated, or installing -> redundant
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
          w.postMessage({ type: 'SKIP_WAITING' })
          return 'promoted-installing->waiting'
        }
      }

      // Case B: SW skipped waiting and went directly to active (no prior active, or self-called skipWaiting)
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

  // 3) active: if expected, we can't promote further from page; controllerchange depends on claim/navigation.
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

/* --------------------------- Event waiting (event-driven, no time polling) --------------------------- */

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
