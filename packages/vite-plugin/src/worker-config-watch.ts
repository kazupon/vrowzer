/**
 * Watch dedicated Worker config inputs through the host Vite server.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { statSync } from 'node:fs'
import { AsyncLocalStorage } from 'node:async_hooks'
import { isDeepStrictEqual } from 'node:util'
import { createDebug } from 'obug'

import type { InlineConfig, ResolvedConfig, ViteDevServer } from 'vite'

type Binding = {
  server: ViteDevServer
  watcher: ViteDevServer['watcher']
  files: Set<string>
}

type WatchState = {
  inputs: Map<string, string>
  bindings: Set<Binding>
  active: Binding | undefined
  revision: number
  processed: number
  attempts: number
  running: boolean
}

const states = new WeakMap<InlineConfig, WatchState>()
const forcedRestarts = new AsyncLocalStorage<{ state: WatchState; inlineConfig: InlineConfig }>()
const disposers = new WeakMap<ResolvedConfig, () => void>()
const debug = createDebug('vite-plugin-vrowzer:watch')

function fingerprint(filename: string): string {
  try {
    const stat = statSync(filename, { bigint: true })
    return `${stat.mtimeNs}:${stat.ctimeNs}:${stat.size}`
  } catch {
    return 'missing'
  }
}

function observe(state: WatchState, filename: string): boolean {
  const previous = state.inputs.get(filename)
  const current = fingerprint(filename)
  state.inputs.set(filename, current)
  if (previous !== undefined && previous !== current) {
    state.revision++
    debug('changed', filename, state.revision)
    return true
  }
  return false
}

function reconcile(state: WatchState): void {
  for (const filename of state.inputs.keys()) {
    observe(state, filename)
  }
}

function watch(binding: Binding, filename: string): void {
  if (!binding.files.has(filename)) {
    binding.files.add(filename)
    binding.watcher.add(filename)
  }
}

async function restart(state: WatchState): Promise<void> {
  if (state.running || !state.active || state.revision <= state.processed) {
    return
  }
  state.running = true
  let previousAttempt = -1
  try {
    while (state.active && state.revision > state.processed) {
      const revision = state.revision
      debug('restart', state.active.server.config.root, revision, state.processed, state.attempts)
      await state.active.server.restart()
      debug('restart finished', revision, state.processed, state.attempts, !!state.active)
      reconcile(state)
      // A host-config error can prevent our hook from running. Wait for another edit,
      // but allow one retry when we joined a restart that had already prebundled.
      if (state.attempts === previousAttempt && state.revision === revision) {
        break
      }
      previousAttempt = state.attempts
    }
  } catch (error) {
    state.active?.server.config.logger.error(`[vrowzer] Worker config restart failed: ${error}`)
  } finally {
    state.running = false
  }
}

function schedule(state: WatchState): void {
  queueMicrotask(() => void restart(state))
}

export function beginWorkerConfigWatch(config: ResolvedConfig) {
  const forcedRestart = forcedRestarts.getStore()
  let state = states.get(config.inlineConfig)
  if (
    !state &&
    forcedRestart &&
    isDeepStrictEqual(config.inlineConfig, {
      ...forcedRestart.inlineConfig,
      forceOptimizeDeps: true
    })
  ) {
    state = forcedRestart.state
  }
  if (!state) {
    state = {
      inputs: new Map(),
      bindings: new Set(),
      active: undefined,
      revision: 0,
      processed: 0,
      attempts: 0,
      running: false
    }
  }
  states.set(config.inlineConfig, state)
  const session = state
  const revision = session.revision
  const dependencies = new Set<string>()
  session.attempts++
  debug('begin', config.root, revision, session.attempts, !!session.active)

  return {
    onDependency(filename: string) {
      dependencies.add(filename)
      observe(session, filename)
      for (const binding of session.bindings) {
        watch(binding, filename)
      }
    },
    finish() {
      session.processed = revision
      debug('finish', config.root, revision, dependencies.size)
      reconcile(session)
      schedule(session)
    },
    connect(server: ViteDevServer) {
      if (server.config.server.watch === null) {
        return
      }
      const binding: Binding = { server, watcher: server.watcher, files: new Set() }
      session.bindings.add(binding)
      session.active = binding
      // restart(true) copies inlineConfig. Scope the handoff to that call and its inputs,
      // without changing readonly config or leaking state to unrelated server creation.
      const restartServer = server.restart
      const restartWithState: ViteDevServer['restart'] = force =>
        force
          ? forcedRestarts.run({ state: session, inlineConfig: config.inlineConfig }, () =>
              restartServer.call(server, force)
            )
          : restartServer.call(server, force)
      server.restart = restartWithState
      debug('connect', config.root, revision, session.bindings.size)
      // Only a successful new server replaces the dependency set. Failed attempts
      // keep both the last working dependencies and the newly discovered files.
      for (const filename of session.inputs.keys()) {
        if (!dependencies.has(filename)) {
          session.inputs.delete(filename)
        }
      }
      const onChange = (filename: string) => {
        if (session.inputs.has(filename) && observe(session, filename)) {
          schedule(session)
        }
      }
      const onReady = () => {
        reconcile(session)
        schedule(session)
      }
      for (const event of ['add', 'change', 'unlink'] as const) {
        binding.watcher.on(event, onChange)
      }
      binding.watcher.on('ready', onReady)
      for (const filename of session.inputs.keys()) {
        watch(binding, filename)
      }
      onReady()
      disposers.set(config, () => {
        debug('dispose', config.root, revision, session.active === binding)
        for (const event of ['add', 'change', 'unlink'] as const) {
          binding.watcher.off(event, onChange)
        }
        binding.watcher.off('ready', onReady)
        if (server.restart === restartWithState) {
          server.restart = restartServer
        }
        session.bindings.delete(binding)
        if (session.active === binding) {
          session.active = undefined
        }
      })
    }
  }
}

export function closeWorkerConfigWatch(config: ResolvedConfig): void {
  disposers.get(config)?.()
  disposers.delete(config)
}
