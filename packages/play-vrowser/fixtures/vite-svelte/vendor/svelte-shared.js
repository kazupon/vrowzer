//#region node_modules/.pnpm/esm-env@1.2.2/node_modules/esm-env/true.js
var true_default = true

//#endregion
//#region node_modules/.pnpm/esm-env@1.2.2/node_modules/esm-env/dev-fallback.js
const node_env = globalThis.process?.env?.NODE_ENV
var dev_fallback_default = node_env && !node_env.toLowerCase().startsWith('prod')

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/shared/utils.js
var is_array = Array.isArray
var index_of = Array.prototype.indexOf
var includes = Array.prototype.includes
var array_from = Array.from
var object_keys = Object.keys
var define_property = Object.defineProperty
var get_descriptor = Object.getOwnPropertyDescriptor
var get_descriptors = Object.getOwnPropertyDescriptors
var object_prototype = Object.prototype
var array_prototype = Array.prototype
var get_prototype_of = Object.getPrototypeOf
var is_extensible = Object.isExtensible
var has_own_property = Object.prototype.hasOwnProperty
/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
  return typeof thing === 'function'
}
const noop = () => {}
/**
 * @template [T=any]
 * @param {any} value
 * @returns {value is PromiseLike<T>}
 */
function is_promise(value) {
  return typeof value?.then === 'function'
}
/** @param {Function} fn */
function run$1(fn) {
  return fn()
}
/** @param {Array<() => void>} arr */
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) arr[i]()
}
/**
 * TODO replace with Promise.withResolvers once supported widely enough
 * @template [T=void]
 */
function deferred() {
  /** @type {(value: T) => void} */
  var resolve
  /** @type {(reason: any) => void} */
  var reject
  return {
    promise: new Promise((res, rej) => {
      resolve = res
      reject = rej
    }),
    resolve,
    reject
  }
}
/**
 * @template V
 * @param {V} value
 * @param {V | (() => V)} fallback
 * @param {boolean} [lazy]
 * @returns {V}
 */
function fallback(value, fallback, lazy = false) {
  return value === void 0 ? (lazy ? fallback() : fallback) : value
}
/**
 * When encountering a situation like `let [a, b, c] = $derived(blah())`,
 * we need to stash an intermediate value that `a`, `b`, and `c` derive
 * from, in case it's an iterable
 * @template T
 * @param {ArrayLike<T> | Iterable<T>} value
 * @param {number} [n]
 * @returns {Array<T>}
 */
function to_array(value, n) {
  if (Array.isArray(value)) return value
  if (n === void 0 || !(Symbol.iterator in value)) return Array.from(value)
  /** @type {T[]} */
  const array = []
  for (const element of value) {
    array.push(element)
    if (array.length === n) break
  }
  return array
}
/**
 * @param {Record<string | symbol, unknown>} obj
 * @param {Array<string | symbol>} keys
 * @returns {Record<string | symbol, unknown>}
 */
function exclude_from_object(obj, keys) {
  /** @type {Record<string | symbol, unknown>} */
  var result = {}
  for (var key in obj) if (!keys.includes(key)) result[key] = obj[key]
  for (var symbol of Object.getOwnPropertySymbols(obj))
    if (Object.propertyIsEnumerable.call(obj, symbol) && !keys.includes(symbol))
      result[symbol] = obj[symbol]
  return result
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/constants.js
const DERIVED = 2
const EFFECT = 4
const RENDER_EFFECT = 8
/**
 * An effect that does not destroy its child effects when it reruns.
 * Runs as part of render effects, i.e. not eagerly as part of tree traversal or effect flushing.
 */
const MANAGED_EFFECT = 1 << 24
/**
 * An effect that does not destroy its child effects when it reruns (like MANAGED_EFFECT).
 * Runs eagerly as part of tree traversal or effect flushing.
 */
const BLOCK_EFFECT = 16
const BRANCH_EFFECT = 32
const ROOT_EFFECT = 64
const BOUNDARY_EFFECT = 128
/**
 * Indicates that a reaction is connected to an effect root — either it is an effect,
 * or it is a derived that is depended on by at least one effect. If a derived has
 * no dependents, we can disconnect it from the graph, allowing it to either be
 * GC'd or reconnected later if an effect comes to depend on it again
 */
const CONNECTED = 512
const CLEAN = 1024
const DIRTY = 2048
const MAYBE_DIRTY = 4096
const INERT = 8192
const DESTROYED = 16384
/** Set once a reaction has run for the first time */
const REACTION_RAN = 32768
/**
 * 'Transparent' effects do not create a transition boundary.
 * This is on a block effect 99% of the time but may also be on a branch effect if its parent block effect was pruned
 */
const EFFECT_TRANSPARENT = 65536
const EAGER_EFFECT = 1 << 17
const HEAD_EFFECT = 1 << 18
const EFFECT_PRESERVED = 1 << 19
const USER_EFFECT = 1 << 20
const EFFECT_OFFSCREEN = 1 << 25
/**
 * Tells that we marked this derived and its reactions as visited during the "mark as (maybe) dirty"-phase.
 * Will be lifted during execution of the derived and during checking its dirty state (both are necessary
 * because a derived might be checked but not executed).
 */
const WAS_MARKED = 65536
const REACTION_IS_UPDATING = 1 << 21
const ASYNC = 1 << 22
const ERROR_VALUE = 1 << 23
const STATE_SYMBOL = Symbol('$state')
const LEGACY_PROPS = Symbol('legacy props')
const LOADING_ATTR_SYMBOL = Symbol('')
const PROXY_PATH_SYMBOL = Symbol('proxy path')
/** allow users to ignore aborted signal errors if `reason.name === 'StaleReactionError` */
const STALE_REACTION = new (class StaleReactionError extends Error {
  name = 'StaleReactionError'
  message = 'The reaction that called `getAbortSignal()` was re-run or destroyed'
})()
const IS_XHTML =
  !!globalThis.document?.contentType &&
  /* @__PURE__ */ globalThis.document.contentType.includes('xml')
const ELEMENT_NODE = 1
const TEXT_NODE = 3
const COMMENT_NODE = 8
const DOCUMENT_FRAGMENT_NODE = 11

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/shared/errors.js
/**
 * Cannot use `%name%(...)` unless the `experimental.async` compiler option is `true`
 * @param {string} name
 * @returns {never}
 */
function experimental_async_required(name) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `experimental_async_required\nCannot use \`${name}(...)\` unless the \`experimental.async\` compiler option is \`true\`\nhttps://svelte.dev/e/experimental_async_required`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/experimental_async_required`)
}
/**
 * Cannot use `{@render children(...)}` if the parent component uses `let:` directives. Consider using a named snippet instead
 * @returns {never}
 */
function invalid_default_snippet() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `invalid_default_snippet\nCannot use \`{@render children(...)}\` if the parent component uses \`let:\` directives. Consider using a named snippet instead\nhttps://svelte.dev/e/invalid_default_snippet`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/invalid_default_snippet`)
}
/**
 * A snippet function was passed invalid arguments. Snippets should only be instantiated via `{@render ...}`
 * @returns {never}
 */
function invalid_snippet_arguments() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `invalid_snippet_arguments\nA snippet function was passed invalid arguments. Snippets should only be instantiated via \`{@render ...}\`\nhttps://svelte.dev/e/invalid_snippet_arguments`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/invalid_snippet_arguments`)
}
/**
 * `%name%(...)` can only be used during component initialisation
 * @param {string} name
 * @returns {never}
 */
function lifecycle_outside_component(name) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `lifecycle_outside_component\n\`${name}(...)\` can only be used during component initialisation\nhttps://svelte.dev/e/lifecycle_outside_component`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/lifecycle_outside_component`)
}
/**
 * Context was not set in a parent component
 * @returns {never}
 */
function missing_context() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `missing_context\nContext was not set in a parent component\nhttps://svelte.dev/e/missing_context`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/missing_context`)
}
/**
 * Attempted to render a snippet without a `{@render}` block. This would cause the snippet code to be stringified instead of its content being rendered to the DOM. To fix this, change `{snippet}` to `{@render snippet()}`.
 * @returns {never}
 */
function snippet_without_render_tag() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `snippet_without_render_tag\nAttempted to render a snippet without a \`{@render}\` block. This would cause the snippet code to be stringified instead of its content being rendered to the DOM. To fix this, change \`{snippet}\` to \`{@render snippet()}\`.\nhttps://svelte.dev/e/snippet_without_render_tag`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/snippet_without_render_tag`)
}
/**
 * `%name%` is not a store with a `subscribe` method
 * @param {string} name
 * @returns {never}
 */
function store_invalid_shape(name) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `store_invalid_shape\n\`${name}\` is not a store with a \`subscribe\` method\nhttps://svelte.dev/e/store_invalid_shape`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/store_invalid_shape`)
}
/**
 * The `this` prop on `<svelte:element>` must be a string, if defined
 * @returns {never}
 */
function svelte_element_invalid_this_value() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `svelte_element_invalid_this_value\nThe \`this\` prop on \`<svelte:element>\` must be a string, if defined\nhttps://svelte.dev/e/svelte_element_invalid_this_value`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/svelte_element_invalid_this_value`)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/errors.js
/**
 * Cannot create a `$derived(...)` with an `await` expression outside of an effect tree
 * @returns {never}
 */
function async_derived_orphan() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `async_derived_orphan\nCannot create a \`$derived(...)\` with an \`await\` expression outside of an effect tree\nhttps://svelte.dev/e/async_derived_orphan`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/async_derived_orphan`)
}
/**
 * Using `bind:value` together with a checkbox input is not allowed. Use `bind:checked` instead
 * @returns {never}
 */
function bind_invalid_checkbox_value() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `bind_invalid_checkbox_value\nUsing \`bind:value\` together with a checkbox input is not allowed. Use \`bind:checked\` instead\nhttps://svelte.dev/e/bind_invalid_checkbox_value`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/bind_invalid_checkbox_value`)
}
/**
 * Calling `%method%` on a component instance (of %component%) is no longer valid in Svelte 5
 * @param {string} method
 * @param {string} component
 * @returns {never}
 */
function component_api_changed(method, component) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `component_api_changed\nCalling \`${method}\` on a component instance (of ${component}) is no longer valid in Svelte 5\nhttps://svelte.dev/e/component_api_changed`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/component_api_changed`)
}
/**
 * Attempted to instantiate %component% with `new %name%`, which is no longer valid in Svelte 5. If this component is not under your control, set the `compatibility.componentApi` compiler option to `4` to keep it working.
 * @param {string} component
 * @param {string} name
 * @returns {never}
 */
function component_api_invalid_new(component, name) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `component_api_invalid_new\nAttempted to instantiate ${component} with \`new ${name}\`, which is no longer valid in Svelte 5. If this component is not under your control, set the \`compatibility.componentApi\` compiler option to \`4\` to keep it working.\nhttps://svelte.dev/e/component_api_invalid_new`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/component_api_invalid_new`)
}
/**
 * A derived value cannot reference itself recursively
 * @returns {never}
 */
function derived_references_self() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `derived_references_self\nA derived value cannot reference itself recursively\nhttps://svelte.dev/e/derived_references_self`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/derived_references_self`)
}
/**
 * Keyed each block has duplicate key `%value%` at indexes %a% and %b%
 * @param {string} a
 * @param {string} b
 * @param {string | undefined | null} [value]
 * @returns {never}
 */
function each_key_duplicate(a, b, value) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `each_key_duplicate\n${value ? `Keyed each block has duplicate key \`${value}\` at indexes ${a} and ${b}` : `Keyed each block has duplicate key at indexes ${a} and ${b}`}\nhttps://svelte.dev/e/each_key_duplicate`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/each_key_duplicate`)
}
/**
 * Keyed each block has key that is not idempotent — the key for item at index %index% was `%a%` but is now `%b%`. Keys must be the same each time for a given item
 * @param {string} index
 * @param {string} a
 * @param {string} b
 * @returns {never}
 */
function each_key_volatile(index, a, b) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `each_key_volatile\nKeyed each block has key that is not idempotent — the key for item at index ${index} was \`${a}\` but is now \`${b}\`. Keys must be the same each time for a given item\nhttps://svelte.dev/e/each_key_volatile`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/each_key_volatile`)
}
/**
 * `%rune%` cannot be used inside an effect cleanup function
 * @param {string} rune
 * @returns {never}
 */
function effect_in_teardown(rune) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `effect_in_teardown\n\`${rune}\` cannot be used inside an effect cleanup function\nhttps://svelte.dev/e/effect_in_teardown`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/effect_in_teardown`)
}
/**
 * Effect cannot be created inside a `$derived` value that was not itself created inside an effect
 * @returns {never}
 */
function effect_in_unowned_derived() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `effect_in_unowned_derived\nEffect cannot be created inside a \`$derived\` value that was not itself created inside an effect\nhttps://svelte.dev/e/effect_in_unowned_derived`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`)
}
/**
 * `%rune%` can only be used inside an effect (e.g. during component initialisation)
 * @param {string} rune
 * @returns {never}
 */
function effect_orphan(rune) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `effect_orphan\n\`${rune}\` can only be used inside an effect (e.g. during component initialisation)\nhttps://svelte.dev/e/effect_orphan`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/effect_orphan`)
}
/**
 * `$effect.pending()` can only be called inside an effect or derived
 * @returns {never}
 */
function effect_pending_outside_reaction() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `effect_pending_outside_reaction\n\`$effect.pending()\` can only be called inside an effect or derived\nhttps://svelte.dev/e/effect_pending_outside_reaction`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/effect_pending_outside_reaction`)
}
/**
 * Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
 * @returns {never}
 */
function effect_update_depth_exceeded() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `effect_update_depth_exceeded\nMaximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state\nhttps://svelte.dev/e/effect_update_depth_exceeded`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`)
}
/**
 * Cannot commit a fork that was already discarded
 * @returns {never}
 */
function fork_discarded() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `fork_discarded\nCannot commit a fork that was already discarded\nhttps://svelte.dev/e/fork_discarded`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/fork_discarded`)
}
/**
 * Cannot create a fork inside an effect or when state changes are pending
 * @returns {never}
 */
function fork_timing() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `fork_timing\nCannot create a fork inside an effect or when state changes are pending\nhttps://svelte.dev/e/fork_timing`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/fork_timing`)
}
/**
 * `getAbortSignal()` can only be called inside an effect or derived
 * @returns {never}
 */
function get_abort_signal_outside_reaction() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `get_abort_signal_outside_reaction\n\`getAbortSignal()\` can only be called inside an effect or derived\nhttps://svelte.dev/e/get_abort_signal_outside_reaction`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/get_abort_signal_outside_reaction`)
}
/**
 * Expected to find a hydratable with key `%key%` during hydration, but did not.
 * @param {string} key
 * @returns {never}
 */
function hydratable_missing_but_required(key) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `hydratable_missing_but_required\nExpected to find a hydratable with key \`${key}\` during hydration, but did not.\nhttps://svelte.dev/e/hydratable_missing_but_required`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/hydratable_missing_but_required`)
}
/**
 * Failed to hydrate the application
 * @returns {never}
 */
function hydration_failed() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `hydration_failed\nFailed to hydrate the application\nhttps://svelte.dev/e/hydration_failed`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/hydration_failed`)
}
/**
 * Could not `{@render}` snippet due to the expression being `null` or `undefined`. Consider using optional chaining `{@render snippet?.()}`
 * @returns {never}
 */
function invalid_snippet() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `invalid_snippet\nCould not \`{@render}\` snippet due to the expression being \`null\` or \`undefined\`. Consider using optional chaining \`{@render snippet?.()}\`\nhttps://svelte.dev/e/invalid_snippet`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/invalid_snippet`)
}
/**
 * `%name%(...)` cannot be used in runes mode
 * @param {string} name
 * @returns {never}
 */
function lifecycle_legacy_only(name) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `lifecycle_legacy_only\n\`${name}(...)\` cannot be used in runes mode\nhttps://svelte.dev/e/lifecycle_legacy_only`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/lifecycle_legacy_only`)
}
/**
 * Cannot do `bind:%key%={undefined}` when `%key%` has a fallback value
 * @param {string} key
 * @returns {never}
 */
function props_invalid_value(key) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `props_invalid_value\nCannot do \`bind:${key}={undefined}\` when \`${key}\` has a fallback value\nhttps://svelte.dev/e/props_invalid_value`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/props_invalid_value`)
}
/**
 * Rest element properties of `$props()` such as `%property%` are readonly
 * @param {string} property
 * @returns {never}
 */
function props_rest_readonly(property) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `props_rest_readonly\nRest element properties of \`$props()\` such as \`${property}\` are readonly\nhttps://svelte.dev/e/props_rest_readonly`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/props_rest_readonly`)
}
/**
 * The `%rune%` rune is only available inside `.svelte` and `.svelte.js/ts` files
 * @param {string} rune
 * @returns {never}
 */
function rune_outside_svelte(rune) {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `rune_outside_svelte\nThe \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files\nhttps://svelte.dev/e/rune_outside_svelte`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/rune_outside_svelte`)
}
/**
 * `setContext` must be called when a component first initializes, not in a subsequent effect or after an `await` expression
 * @returns {never}
 */
function set_context_after_init() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `set_context_after_init\n\`setContext\` must be called when a component first initializes, not in a subsequent effect or after an \`await\` expression\nhttps://svelte.dev/e/set_context_after_init`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/set_context_after_init`)
}
/**
 * Property descriptors defined on `$state` objects must contain `value` and always be `enumerable`, `configurable` and `writable`.
 * @returns {never}
 */
function state_descriptors_fixed() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `state_descriptors_fixed\nProperty descriptors defined on \`$state\` objects must contain \`value\` and always be \`enumerable\`, \`configurable\` and \`writable\`.\nhttps://svelte.dev/e/state_descriptors_fixed`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/state_descriptors_fixed`)
}
/**
 * Cannot set prototype of `$state` object
 * @returns {never}
 */
function state_prototype_fixed() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `state_prototype_fixed\nCannot set prototype of \`$state\` object\nhttps://svelte.dev/e/state_prototype_fixed`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/state_prototype_fixed`)
}
/**
 * Updating state inside `$derived(...)`, `$inspect(...)` or a template expression is forbidden. If the value should not be reactive, declare it without `$state`
 * @returns {never}
 */
function state_unsafe_mutation() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `state_unsafe_mutation\nUpdating state inside \`$derived(...)\`, \`$inspect(...)\` or a template expression is forbidden. If the value should not be reactive, declare it without \`$state\`\nhttps://svelte.dev/e/state_unsafe_mutation`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/state_unsafe_mutation`)
}
/**
 * A `<svelte:boundary>` `reset` function cannot be called while an error is still being handled
 * @returns {never}
 */
function svelte_boundary_reset_onerror() {
  if (dev_fallback_default) {
    const error = /* @__PURE__ */ new Error(
      `svelte_boundary_reset_onerror\nA \`<svelte:boundary>\` \`reset\` function cannot be called while an error is still being handled\nhttps://svelte.dev/e/svelte_boundary_reset_onerror`
    )
    error.name = 'Svelte error'
    throw error
  } else throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/constants.js
const EACH_ITEM_REACTIVE = 1
const EACH_INDEX_REACTIVE = 2
/** See EachBlock interface metadata.is_controlled for an explanation what this is */
const EACH_IS_CONTROLLED = 4
const EACH_IS_ANIMATED = 8
const EACH_ITEM_IMMUTABLE = 16
const PROPS_IS_IMMUTABLE = 1
const PROPS_IS_RUNES = 2
const PROPS_IS_UPDATED = 4
const PROPS_IS_BINDABLE = 8
const PROPS_IS_LAZY_INITIAL = 16
const TRANSITION_IN = 1
const TRANSITION_OUT = 2
const TRANSITION_GLOBAL = 4
const TEMPLATE_FRAGMENT = 1
const TEMPLATE_USE_IMPORT_NODE = 2
const TEMPLATE_USE_SVG = 4
const TEMPLATE_USE_MATHML = 8
const HYDRATION_START = '['
/** used to indicate that an `{:else}...` block was rendered */
const HYDRATION_START_ELSE = '[!'
/** used to indicate that a boundary's `failed` snippet was rendered on the server */
const HYDRATION_START_FAILED = '[?'
const HYDRATION_END = ']'
const HYDRATION_ERROR = {}
const UNINITIALIZED = Symbol()
const FILENAME = Symbol('filename')
const HMR = Symbol('hmr')
const NAMESPACE_HTML = 'http://www.w3.org/1999/xhtml'
const NAMESPACE_SVG = 'http://www.w3.org/2000/svg'
const NAMESPACE_MATHML = 'http://www.w3.org/1998/Math/MathML'
const ATTACHMENT_KEY = '@attach'

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/warnings.js
var bold$1 = 'font-weight: bold'
var normal$1 = 'font-weight: normal'
/**
 * Assignment to `%property%` property (%location%) will evaluate to the right-hand side, not the value of `%property%` following the assignment. This may result in unexpected behaviour.
 * @param {string} property
 * @param {string} location
 */
function assignment_value_stale(property, location) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] assignment_value_stale\n%cAssignment to \`${property}\` property (${location}) will evaluate to the right-hand side, not the value of \`${property}\` following the assignment. This may result in unexpected behaviour.\nhttps://svelte.dev/e/assignment_value_stale`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/assignment_value_stale`)
}
/**
 * An async derived, `%name%` (%location%) was not read immediately after it resolved. This often indicates an unnecessary waterfall, which can slow down your app
 * @param {string} name
 * @param {string} location
 */
function await_waterfall(name, location) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] await_waterfall\n%cAn async derived, \`${name}\` (${location}) was not read immediately after it resolved. This often indicates an unnecessary waterfall, which can slow down your app\nhttps://svelte.dev/e/await_waterfall`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/await_waterfall`)
}
/**
 * `%binding%` (%location%) is binding to a non-reactive property
 * @param {string} binding
 * @param {string | undefined | null} [location]
 */
function binding_property_non_reactive(binding, location) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] binding_property_non_reactive\n%c${location ? `\`${binding}\` (${location}) is binding to a non-reactive property` : `\`${binding}\` is binding to a non-reactive property`}\nhttps://svelte.dev/e/binding_property_non_reactive`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/binding_property_non_reactive`)
}
/**
 * Your `console.%method%` contained `$state` proxies. Consider using `$inspect(...)` or `$state.snapshot(...)` instead
 * @param {string} method
 */
function console_log_state(method) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] console_log_state\n%cYour \`console.${method}\` contained \`$state\` proxies. Consider using \`$inspect(...)\` or \`$state.snapshot(...)\` instead\nhttps://svelte.dev/e/console_log_state`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/console_log_state`)
}
/**
 * %handler% should be a function. Did you mean to %suggestion%?
 * @param {string} handler
 * @param {string} suggestion
 */
function event_handler_invalid(handler, suggestion) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] event_handler_invalid\n%c${handler} should be a function. Did you mean to ${suggestion}?\nhttps://svelte.dev/e/event_handler_invalid`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/event_handler_invalid`)
}
/**
 * Expected to find a hydratable with key `%key%` during hydration, but did not.
 * @param {string} key
 */
function hydratable_missing_but_expected(key) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] hydratable_missing_but_expected\n%cExpected to find a hydratable with key \`${key}\` during hydration, but did not.\nhttps://svelte.dev/e/hydratable_missing_but_expected`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/hydratable_missing_but_expected`)
}
/**
 * The `%attribute%` attribute on `%html%` changed its value between server and client renders. The client value, `%value%`, will be ignored in favour of the server value
 * @param {string} attribute
 * @param {string} html
 * @param {string} value
 */
function hydration_attribute_changed(attribute, html, value) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] hydration_attribute_changed\n%cThe \`${attribute}\` attribute on \`${html}\` changed its value between server and client renders. The client value, \`${value}\`, will be ignored in favour of the server value\nhttps://svelte.dev/e/hydration_attribute_changed`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/hydration_attribute_changed`)
}
/**
 * The value of an `{@html ...}` block %location% changed between server and client renders. The client value will be ignored in favour of the server value
 * @param {string | undefined | null} [location]
 */
function hydration_html_changed(location) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] hydration_html_changed\n%c${location ? `The value of an \`{@html ...}\` block ${location} changed between server and client renders. The client value will be ignored in favour of the server value` : 'The value of an `{@html ...}` block changed between server and client renders. The client value will be ignored in favour of the server value'}\nhttps://svelte.dev/e/hydration_html_changed`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/hydration_html_changed`)
}
/**
 * Hydration failed because the initial UI does not match what was rendered on the server. The error occurred near %location%
 * @param {string | undefined | null} [location]
 */
function hydration_mismatch(location) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] hydration_mismatch\n%c${location ? `Hydration failed because the initial UI does not match what was rendered on the server. The error occurred near ${location}` : 'Hydration failed because the initial UI does not match what was rendered on the server'}\nhttps://svelte.dev/e/hydration_mismatch`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/hydration_mismatch`)
}
/**
 * The `render` function passed to `createRawSnippet` should return HTML for a single element
 */
function invalid_raw_snippet_render() {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] invalid_raw_snippet_render\n%cThe \`render\` function passed to \`createRawSnippet\` should return HTML for a single element\nhttps://svelte.dev/e/invalid_raw_snippet_render`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/invalid_raw_snippet_render`)
}
/**
 * Tried to unmount a component that was not mounted
 */
function lifecycle_double_unmount() {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] lifecycle_double_unmount\n%cTried to unmount a component that was not mounted\nhttps://svelte.dev/e/lifecycle_double_unmount`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/lifecycle_double_unmount`)
}
/**
 * %parent% passed property `%prop%` to %child% with `bind:`, but its parent component %owner% did not declare `%prop%` as a binding. Consider creating a binding between %owner% and %parent% (e.g. `bind:%prop%={...}` instead of `%prop%={...}`)
 * @param {string} parent
 * @param {string} prop
 * @param {string} child
 * @param {string} owner
 */
function ownership_invalid_binding(parent, prop, child, owner) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] ownership_invalid_binding\n%c${parent} passed property \`${prop}\` to ${child} with \`bind:\`, but its parent component ${owner} did not declare \`${prop}\` as a binding. Consider creating a binding between ${owner} and ${parent} (e.g. \`bind:${prop}={...}\` instead of \`${prop}={...}\`)\nhttps://svelte.dev/e/ownership_invalid_binding`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/ownership_invalid_binding`)
}
/**
 * Mutating unbound props (`%name%`, at %location%) is strongly discouraged. Consider using `bind:%prop%={...}` in %parent% (or using a callback) instead
 * @param {string} name
 * @param {string} location
 * @param {string} prop
 * @param {string} parent
 */
function ownership_invalid_mutation(name, location, prop, parent) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] ownership_invalid_mutation\n%cMutating unbound props (\`${name}\`, at ${location}) is strongly discouraged. Consider using \`bind:${prop}={...}\` in ${parent} (or using a callback) instead\nhttps://svelte.dev/e/ownership_invalid_mutation`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/ownership_invalid_mutation`)
}
/**
 * The `value` property of a `<select multiple>` element should be an array, but it received a non-array value. The selection will be kept as is.
 */
function select_multiple_invalid_value() {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] select_multiple_invalid_value\n%cThe \`value\` property of a \`<select multiple>\` element should be an array, but it received a non-array value. The selection will be kept as is.\nhttps://svelte.dev/e/select_multiple_invalid_value`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/select_multiple_invalid_value`)
}
/**
 * Reactive `$state(...)` proxies and the values they proxy have different identities. Because of this, comparisons with `%operator%` will produce unexpected results
 * @param {string} operator
 */
function state_proxy_equality_mismatch(operator) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] state_proxy_equality_mismatch\n%cReactive \`$state(...)\` proxies and the values they proxy have different identities. Because of this, comparisons with \`${operator}\` will produce unexpected results\nhttps://svelte.dev/e/state_proxy_equality_mismatch`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/state_proxy_equality_mismatch`)
}
/**
 * Tried to unmount a state proxy, rather than a component
 */
function state_proxy_unmount() {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] state_proxy_unmount\n%cTried to unmount a state proxy, rather than a component\nhttps://svelte.dev/e/state_proxy_unmount`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/state_proxy_unmount`)
}
/**
 * A `<svelte:boundary>` `reset` function only resets the boundary the first time it is called
 */
function svelte_boundary_reset_noop() {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] svelte_boundary_reset_noop\n%cA \`<svelte:boundary>\` \`reset\` function only resets the boundary the first time it is called\nhttps://svelte.dev/e/svelte_boundary_reset_noop`,
      bold$1,
      normal$1
    )
  else console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/hydration.js
/** @import { TemplateNode } from '#client' */
/**
 * Use this variable to guard everything related to hydration code so it can be treeshaken out
 * if the user doesn't use the `hydrate` method and these code paths are therefore not needed.
 */
let hydrating = false
/** @param {boolean} value */
function set_hydrating(value) {
  hydrating = value
}
/**
 * The node that is currently being hydrated. This starts out as the first node inside the opening
 * <!--[--> comment, and updates each time a component calls `$.child(...)` or `$.sibling(...)`.
 * When entering a block (e.g. `{#if ...}`), `hydrate_node` is the block opening comment; by the
 * time we leave the block it is the closing comment, which serves as the block's anchor.
 * @type {TemplateNode}
 */
let hydrate_node
/** @param {TemplateNode | null} node */
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch()
    throw HYDRATION_ERROR
  }
  return (hydrate_node = node)
}
function hydrate_next() {
  return set_hydrate_node(/* @__PURE__ */ get_next_sibling(hydrate_node))
}
/** @param {TemplateNode} node */
function reset(node) {
  if (!hydrating) return
  if (/* @__PURE__ */ get_next_sibling(hydrate_node) !== null) {
    hydration_mismatch()
    throw HYDRATION_ERROR
  }
  hydrate_node = node
}
/**
 * @param {HTMLTemplateElement} template
 */
function hydrate_template(template) {
  if (hydrating) hydrate_node = template.content
}
function next(count = 1) {
  if (hydrating) {
    var i = count
    var node = hydrate_node
    while (i--) node = /* @__PURE__ */ get_next_sibling(node)
    hydrate_node = node
  }
}
/**
 * Skips or removes (depending on {@link remove}) all nodes starting at `hydrate_node` up until the next hydration end comment
 * @param {boolean} remove
 */
function skip_nodes(remove = true) {
  var depth = 0
  var node = hydrate_node
  while (true) {
    if (node.nodeType === COMMENT_NODE) {
      var data = node.data
      if (data === HYDRATION_END) {
        if (depth === 0) return node
        depth -= 1
      } else if (
        data === HYDRATION_START ||
        data === HYDRATION_START_ELSE ||
        (data[0] === '[' && !isNaN(Number(data.slice(1))))
      )
        depth += 1
    }
    var next = /* @__PURE__ */ get_next_sibling(node)
    if (remove) node.remove()
    node = next
  }
}
/**
 *
 * @param {TemplateNode} node
 */
function read_hydration_instruction(node) {
  if (!node || node.nodeType !== COMMENT_NODE) {
    hydration_mismatch()
    throw HYDRATION_ERROR
  }
  return node.data
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/equality.js
/** @import { Equals } from '#client' */
/** @type {Equals} */
function equals$1(value) {
  return value === this.v
}
/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function safe_not_equal(a, b) {
  return a != a
    ? b == b
    : a !== b || (a !== null && typeof a === 'object') || typeof a === 'function'
}
/** @type {Equals} */
function safe_equals(value) {
  return !safe_not_equal(value, this.v)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/flags/index.js
/** True if experimental.async=true */
let async_mode_flag = false
/** True if we're not certain that we only have Svelte 5 code in the compilation */
let legacy_mode_flag = false
/** True if $inspect.trace is used */
let tracing_mode_flag = false

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/shared/warnings.js
var bold = 'font-weight: bold'
var normal = 'font-weight: normal'
/**
 * `<svelte:element this="%tag%">` is a void element — it cannot have content
 * @param {string} tag
 */
function dynamic_void_element_content(tag) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] dynamic_void_element_content\n%c\`<svelte:element this="${tag}">\` is a void element — it cannot have content\nhttps://svelte.dev/e/dynamic_void_element_content`,
      bold,
      normal
    )
  else console.warn(`https://svelte.dev/e/dynamic_void_element_content`)
}
/**
 * The following properties cannot be cloned with `$state.snapshot` — the return value contains the originals:
 *
 * %properties%
 * @param {string | undefined | null} [properties]
 */
function state_snapshot_uncloneable(properties) {
  if (dev_fallback_default)
    console.warn(
      `%c[svelte] state_snapshot_uncloneable\n%c${
        properties
          ? `The following properties cannot be cloned with \`$state.snapshot\` — the return value contains the originals:

${properties}`
          : 'Value cannot be cloned with `$state.snapshot` — the original value was returned'
      }\nhttps://svelte.dev/e/state_snapshot_uncloneable`,
      bold,
      normal
    )
  else console.warn(`https://svelte.dev/e/state_snapshot_uncloneable`)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/shared/clone.js
/** @import { Snapshot } from './types' */
/**
 * In dev, we keep track of which properties could not be cloned. In prod
 * we don't bother, but we keep a dummy array around so that the
 * signature stays the same
 * @type {string[]}
 */
const empty = []
/**
 * @template T
 * @param {T} value
 * @param {boolean} [skip_warning]
 * @param {boolean} [no_tojson]
 * @returns {Snapshot<T>}
 */
function snapshot(value, skip_warning = false, no_tojson = false) {
  if (dev_fallback_default && !skip_warning) {
    /** @type {string[]} */
    const paths = []
    const copy = clone(value, /* @__PURE__ */ new Map(), '', paths, null, no_tojson)
    if (paths.length === 1 && paths[0] === '') state_snapshot_uncloneable()
    else if (paths.length > 0) {
      const slice = paths.length > 10 ? paths.slice(0, 7) : paths.slice(0, 10)
      const excess = paths.length - slice.length
      let uncloned = slice.map(path => `- <value>${path}`).join('\n')
      if (excess > 0) uncloned += `\n- ...and ${excess} more`
      state_snapshot_uncloneable(uncloned)
    }
    return copy
  }
  return clone(value, /* @__PURE__ */ new Map(), '', empty, null, no_tojson)
}
/**
 * @template T
 * @param {T} value
 * @param {Map<T, Snapshot<T>>} cloned
 * @param {string} path
 * @param {string[]} paths
 * @param {null | T} [original] The original value, if `value` was produced from a `toJSON` call
 * @param {boolean} [no_tojson]
 * @returns {Snapshot<T>}
 */
function clone(value, cloned, path, paths, original = null, no_tojson = false) {
  if (typeof value === 'object' && value !== null) {
    var unwrapped = cloned.get(value)
    if (unwrapped !== void 0) return unwrapped
    if (value instanceof Map) return new Map(value)
    if (value instanceof Set) return new Set(value)
    if (is_array(value)) {
      var copy = Array(value.length)
      cloned.set(value, copy)
      if (original !== null) cloned.set(original, copy)
      for (var i = 0; i < value.length; i += 1) {
        var element = value[i]
        if (i in value)
          copy[i] = clone(
            element,
            cloned,
            dev_fallback_default ? `${path}[${i}]` : path,
            paths,
            null,
            no_tojson
          )
      }
      return copy
    }
    if (get_prototype_of(value) === object_prototype) {
      /** @type {Snapshot<any>} */
      copy = {}
      cloned.set(value, copy)
      if (original !== null) cloned.set(original, copy)
      for (var key of Object.keys(value))
        copy[key] = clone(
          value[key],
          cloned,
          dev_fallback_default ? `${path}.${key}` : path,
          paths,
          null,
          no_tojson
        )
      return copy
    }
    if (value instanceof Date) return structuredClone(value)
    if (typeof value.toJSON === 'function' && !no_tojson)
      return clone(
        /** @type {T & { toJSON(): any } } */
        value.toJSON(),
        cloned,
        dev_fallback_default ? `${path}.toJSON()` : path,
        paths,
        value
      )
  }
  if (value instanceof EventTarget) return value
  try {
    return structuredClone(value)
  } catch (e) {
    if (dev_fallback_default) paths.push(path)
    return value
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/tracing.js
/** @import { Derived, Reaction, Value } from '#client' */
/**
 * @typedef {{
 *   traces: Error[];
 * }} TraceEntry
 */
/** @type {{ reaction: Reaction | null, entries: Map<Value, TraceEntry> } | null} */
let tracing_expressions = null
/**
 * @param {Value} signal
 * @param {TraceEntry} [entry]
 */
function log_entry(signal, entry) {
  const value = signal.v
  if (value === UNINITIALIZED) return
  const type = get_type(signal)
  const current_reaction = active_reaction
  const dirty = signal.wv > current_reaction.wv || current_reaction.wv === 0
  const style = dirty
    ? 'color: CornflowerBlue; font-weight: bold'
    : 'color: grey; font-weight: normal'
  console.groupCollapsed(
    signal.label ? `%c${type}%c ${signal.label}` : `%c${type}%c`,
    style,
    dirty ? 'font-weight: normal' : style,
    typeof value === 'object' && value !== null && STATE_SYMBOL in value
      ? snapshot(value, true)
      : value
  )
  if (type === '$derived') {
    const deps = new Set(
      /** @type {Derived} */
      signal.deps
    )
    for (const dep of deps) log_entry(dep)
  }
  if (signal.created) console.log(signal.created)
  if (dirty && signal.updated) {
    for (const updated of signal.updated.values()) if (updated.error) console.log(updated.error)
  }
  if (entry) for (var trace of entry.traces) console.log(trace)
  console.groupEnd()
}
/**
 * @param {Value} signal
 * @returns {'$state' | '$derived' | 'store'}
 */
function get_type(signal) {
  if ((signal.f & (DERIVED | ASYNC)) !== 0) return '$derived'
  return signal.label?.startsWith('$') ? 'store' : '$state'
}
/**
 * @template T
 * @param {() => string} label
 * @param {() => T} fn
 */
function trace(label, fn) {
  var previously_tracing_expressions = tracing_expressions
  try {
    tracing_expressions = {
      entries: /* @__PURE__ */ new Map(),
      reaction: active_reaction
    }
    var start = performance.now()
    var value = fn()
    var time = (performance.now() - start).toFixed(2)
    var prefix = untrack(label)
    if (!effect_tracking())
      console.log(`${prefix} %cran outside of an effect (${time}ms)`, 'color: grey')
    else if (tracing_expressions.entries.size === 0)
      console.log(`${prefix} %cno reactive dependencies (${time}ms)`, 'color: grey')
    else {
      console.group(`${prefix} %c(${time}ms)`, 'color: grey')
      var entries = tracing_expressions.entries
      untrack(() => {
        for (const [signal, traces] of entries) log_entry(signal, traces)
      })
      tracing_expressions = null
      console.groupEnd()
    }
    return value
  } finally {
    tracing_expressions = previously_tracing_expressions
  }
}
/**
 * @param {Value} source
 * @param {string} label
 */
function tag(source, label) {
  source.label = label
  tag_proxy(source.v, label)
  return source
}
/**
 * @param {unknown} value
 * @param {string} label
 */
function tag_proxy(value, label) {
  value?.[PROXY_PATH_SYMBOL]?.(label)
  return value
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/shared/dev.js
/**
 * @param {string} label
 * @returns {Error & { stack: string } | null}
 */
function get_error(label) {
  const error = /* @__PURE__ */ new Error()
  const stack = get_stack()
  if (stack.length === 0) return null
  stack.unshift('\n')
  define_property(error, 'stack', { value: stack.join('\n') })
  define_property(error, 'name', { value: label })
  return error
}
/**
 * @returns {string[]}
 */
function get_stack() {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = Infinity
  const stack = /* @__PURE__ */ new Error().stack
  Error.stackTraceLimit = limit
  if (!stack) return []
  const lines = stack.split('\n')
  const new_lines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const posixified = line.replaceAll('\\', '/')
    if (line.trim() === 'Error') continue
    if (line.includes('validate_each_keys')) return []
    if (posixified.includes('svelte/src/internal') || posixified.includes('node_modules/.vite'))
      continue
    new_lines.push(line)
  }
  return new_lines
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/context.js
/** @import { ComponentContext, DevStackEntry, Effect } from '#client' */
/** @type {ComponentContext | null} */
let component_context = null
/** @param {ComponentContext | null} context */
function set_component_context(context) {
  component_context = context
}
/** @type {DevStackEntry | null} */
let dev_stack = null
/** @param {DevStackEntry | null} stack */
function set_dev_stack(stack) {
  dev_stack = stack
}
/**
 * Execute a callback with a new dev stack entry
 * @param {() => any} callback - Function to execute
 * @param {DevStackEntry['type']} type - Type of block/component
 * @param {any} component - Component function
 * @param {number} line - Line number
 * @param {number} column - Column number
 * @param {Record<string, any>} [additional] - Any additional properties to add to the dev stack entry
 * @returns {any}
 */
function add_svelte_meta(callback, type, component, line, column, additional) {
  const parent = dev_stack
  dev_stack = {
    type,
    file: component[FILENAME],
    line,
    column,
    parent,
    ...additional
  }
  try {
    return callback()
  } finally {
    dev_stack = parent
  }
}
/**
 * The current component function. Different from current component context:
 * ```html
 * <!-- App.svelte -->
 * <Foo>
 *   <Bar /> <!-- context == Foo.svelte, function == App.svelte -->
 * </Foo>
 * ```
 * @type {ComponentContext['function']}
 */
let dev_current_component_function = null
/** @param {ComponentContext['function']} fn */
function set_dev_current_component_function(fn) {
  dev_current_component_function = fn
}
/**
 * Returns a `[get, set]` pair of functions for working with context in a type-safe way.
 *
 * `get` will throw an error if no parent component called `set`.
 *
 * @template T
 * @returns {[() => T, (context: T) => T]}
 * @since 5.40.0
 */
function createContext() {
  const key = {}
  return [
    () => {
      if (!hasContext(key)) missing_context()
      return getContext(key)
    },
    context => setContext(key, context)
  ]
}
/**
 * Retrieves the context that belongs to the closest parent component with the specified `key`.
 * Must be called during component initialisation.
 *
 * [`createContext`](https://svelte.dev/docs/svelte/svelte#createContext) is a type-safe alternative.
 *
 * @template T
 * @param {any} key
 * @returns {T}
 */
function getContext(key) {
  return get_or_init_context_map('getContext').get(key)
}
/**
 * Associates an arbitrary `context` object with the current component and the specified `key`
 * and returns that object. The context is then available to children of the component
 * (including slotted content) with `getContext`.
 *
 * Like lifecycle functions, this must be called during component initialisation.
 *
 * [`createContext`](https://svelte.dev/docs/svelte/svelte#createContext) is a type-safe alternative.
 *
 * @template T
 * @param {any} key
 * @param {T} context
 * @returns {T}
 */
function setContext(key, context) {
  const context_map = get_or_init_context_map('setContext')
  if (async_mode_flag) {
    var flags = active_effect.f
    if (!(!active_reaction && (flags & BRANCH_EFFECT) !== 0 && !component_context.i))
      set_context_after_init()
  }
  context_map.set(key, context)
  return context
}
/**
 * Checks whether a given `key` has been set in the context of a parent component.
 * Must be called during component initialisation.
 *
 * @param {any} key
 * @returns {boolean}
 */
function hasContext(key) {
  return get_or_init_context_map('hasContext').has(key)
}
/**
 * Retrieves the whole context map that belongs to the closest parent component.
 * Must be called during component initialisation. Useful, for example, if you
 * programmatically create a component and want to pass the existing context to it.
 *
 * @template {Map<any, any>} [T=Map<any, any>]
 * @returns {T}
 */
function getAllContexts() {
  return get_or_init_context_map('getAllContexts')
}
/**
 * @param {Record<string, unknown>} props
 * @param {any} runes
 * @param {Function} [fn]
 * @returns {void}
 */
function push(props, runes = false, fn) {
  component_context = {
    p: component_context,
    i: false,
    c: null,
    e: null,
    s: props,
    x: null,
    l:
      legacy_mode_flag && !runes
        ? {
            s: null,
            u: null,
            $: []
          }
        : null
  }
  if (dev_fallback_default) {
    component_context.function = fn
    dev_current_component_function = fn
  }
}
/**
 * @template {Record<string, any>} T
 * @param {T} [component]
 * @returns {T}
 */
function pop(component) {
  var context = component_context
  var effects = context.e
  if (effects !== null) {
    context.e = null
    for (var fn of effects) create_user_effect(fn)
  }
  if (component !== void 0) context.x = component
  context.i = true
  component_context = context.p
  if (dev_fallback_default) dev_current_component_function = component_context?.function ?? null
  return component ?? {}
}
/** @returns {boolean} */
function is_runes() {
  return !legacy_mode_flag || (component_context !== null && component_context.l === null)
}
/**
 * @param {string} name
 * @returns {Map<unknown, unknown>}
 */
function get_or_init_context_map(name) {
  if (component_context === null) lifecycle_outside_component(name)
  return (component_context.c ??= new Map(get_parent_context(component_context) || void 0))
}
/**
 * @param {ComponentContext} component_context
 * @returns {Map<unknown, unknown> | null}
 */
function get_parent_context(component_context) {
  let parent = component_context.p
  while (parent !== null) {
    const context_map = parent.c
    if (context_map !== null) return context_map
    parent = parent.p
  }
  return null
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/task.js
/** @type {Array<() => void>} */
let micro_tasks = []
function run_micro_tasks() {
  var tasks = micro_tasks
  micro_tasks = []
  run_all(tasks)
}
/**
 * @param {() => void} fn
 */
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks()
    })
  }
  micro_tasks.push(fn)
}
/**
 * Synchronously run any queued tasks.
 */
function flush_tasks() {
  while (micro_tasks.length > 0) run_micro_tasks()
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/error-handling.js
/** @import { Derived, Effect } from '#client' */
/** @import { Boundary } from './dom/blocks/boundary.js' */
const adjustments = /* @__PURE__ */ new WeakMap()
/**
 * @param {unknown} error
 */
function handle_error(error) {
  var effect = active_effect
  if (effect === null) {
    /** @type {Derived} */ active_reaction.f |= ERROR_VALUE
    return error
  }
  if (dev_fallback_default && error instanceof Error && !adjustments.has(error))
    adjustments.set(error, get_adjustments(error, effect))
  if ((effect.f & REACTION_RAN) === 0 && (effect.f & EFFECT) === 0) {
    if (dev_fallback_default && !effect.parent && error instanceof Error) apply_adjustments(error)
    throw error
  }
  invoke_error_boundary(error, effect)
}
/**
 * @param {unknown} error
 * @param {Effect | null} effect
 */
function invoke_error_boundary(error, effect) {
  while (effect !== null) {
    if ((effect.f & BOUNDARY_EFFECT) !== 0) {
      if ((effect.f & REACTION_RAN) === 0) throw error
      try {
        /** @type {Boundary} */ effect.b.error(error)
        return
      } catch (e) {
        error = e
      }
    }
    effect = effect.parent
  }
  if (dev_fallback_default && error instanceof Error) apply_adjustments(error)
  throw error
}
/**
 * Add useful information to the error message/stack in development
 * @param {Error} error
 * @param {Effect} effect
 */
function get_adjustments(error, effect) {
  const message_descriptor = get_descriptor(error, 'message')
  if (message_descriptor && !message_descriptor.configurable) return
  var indent = is_firefox ? '  ' : '	'
  var component_stack = `\n${indent}in ${effect.fn?.name || '<unknown>'}`
  var context = effect.ctx
  while (context !== null) {
    component_stack += `\n${indent}in ${context.function?.[FILENAME].split('/').pop()}`
    context = context.p
  }
  return {
    message: error.message + `\n${component_stack}\n`,
    stack: error.stack
      ?.split('\n')
      .filter(line => !line.includes('svelte/src/internal'))
      .join('\n')
  }
}
/**
 * @param {Error} error
 */
function apply_adjustments(error) {
  const adjusted = adjustments.get(error)
  if (adjusted) {
    define_property(error, 'message', { value: adjusted.message })
    define_property(error, 'stack', { value: adjusted.stack })
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/status.js
/** @import { Derived, Signal } from '#client' */
const STATUS_MASK = ~(DIRTY | MAYBE_DIRTY | CLEAN)
/**
 * @param {Signal} signal
 * @param {number} status
 */
function set_signal_status(signal, status) {
  signal.f = (signal.f & STATUS_MASK) | status
}
/**
 * Set a derived's status to CLEAN or MAYBE_DIRTY based on its connection state.
 * @param {Derived} derived
 */
function update_derived_status(derived) {
  if ((derived.f & CONNECTED) !== 0 || derived.deps === null) set_signal_status(derived, CLEAN)
  else set_signal_status(derived, MAYBE_DIRTY)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/utils.js
/** @import { Derived, Effect, Value } from '#client' */
/**
 * @param {Value[] | null} deps
 */
function clear_marked(deps) {
  if (deps === null) return
  for (const dep of deps) {
    if ((dep.f & DERIVED) === 0 || (dep.f & WAS_MARKED) === 0) continue
    dep.f ^= WAS_MARKED
    clear_marked(
      /** @type {Derived} */
      dep.deps
    )
  }
}
/**
 * @param {Effect} effect
 * @param {Set<Effect>} dirty_effects
 * @param {Set<Effect>} maybe_dirty_effects
 */
function defer_effect(effect, dirty_effects, maybe_dirty_effects) {
  if ((effect.f & DIRTY) !== 0) dirty_effects.add(effect)
  else if ((effect.f & MAYBE_DIRTY) !== 0) maybe_dirty_effects.add(effect)
  clear_marked(effect.deps)
  set_signal_status(effect, CLEAN)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/batch.js
/** @import { Fork } from 'svelte' */
/** @import { Derived, Effect, Reaction, Source, Value } from '#client' */
/** @type {Set<Batch>} */
const batches = /* @__PURE__ */ new Set()
/** @type {Batch | null} */
let current_batch = null
/**
 * This is needed to avoid overwriting inputs in non-async mode
 * TODO 6.0 remove this, as non-async mode will go away
 * @type {Batch | null}
 */
let previous_batch = null
/**
 * When time travelling (i.e. working in one batch, while other batches
 * still have ongoing work), we ignore the real values of affected
 * signals in favour of their values within the batch
 * @type {Map<Value, any> | null}
 */
let batch_values = null
/** @type {Effect[]} */
let queued_root_effects = []
/** @type {Effect | null} */
let last_scheduled_effect = null
let is_flushing_sync = false
/**
 * During traversal, this is an array. Newly created effects are (if not immediately
 * executed) pushed to this array, rather than going through the scheduling
 * rigamarole that would cause another turn of the flush loop.
 * @type {Effect[] | null}
 */
let collected_effects = null
let uid = 1
var Batch = class Batch {
  id = uid++
  /**
   * The current values of any sources that are updated in this batch
   * They keys of this map are identical to `this.#previous`
   * @type {Map<Source, any>}
   */
  current = /* @__PURE__ */ new Map()
  /**
   * The values of any sources that are updated in this batch _before_ those updates took place.
   * They keys of this map are identical to `this.#current`
   * @type {Map<Source, any>}
   */
  previous = /* @__PURE__ */ new Map()
  /**
   * When the batch is committed (and the DOM is updated), we need to remove old branches
   * and append new ones by calling the functions added inside (if/each/key/etc) blocks
   * @type {Set<(batch: Batch) => void>}
   */
  #commit_callbacks = /* @__PURE__ */ new Set()
  /**
   * If a fork is discarded, we need to destroy any effects that are no longer needed
   * @type {Set<(batch: Batch) => void>}
   */
  #discard_callbacks = /* @__PURE__ */ new Set()
  /**
   * The number of async effects that are currently in flight
   */
  #pending = 0
  /**
   * The number of async effects that are currently in flight, _not_ inside a pending boundary
   */
  #blocking_pending = 0
  /**
   * A deferred that resolves when the batch is committed, used with `settled()`
   * TODO replace with Promise.withResolvers once supported widely enough
   * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
   */
  #deferred = null
  /**
   * Deferred effects (which run after async work has completed) that are DIRTY
   * @type {Set<Effect>}
   */
  #dirty_effects = /* @__PURE__ */ new Set()
  /**
   * Deferred effects that are MAYBE_DIRTY
   * @type {Set<Effect>}
   */
  #maybe_dirty_effects = /* @__PURE__ */ new Set()
  /**
   * A map of branches that still exist, but will be destroyed when this batch
   * is committed — we skip over these during `process`.
   * The value contains child effects that were dirty/maybe_dirty before being reset,
   * so they can be rescheduled if the branch survives.
   * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
   */
  #skipped_branches = /* @__PURE__ */ new Map()
  is_fork = false
  #decrement_queued = false
  #is_deferred() {
    return this.is_fork || this.#blocking_pending > 0
  }
  /**
   * Add an effect to the #skipped_branches map and reset its children
   * @param {Effect} effect
   */
  skip_effect(effect) {
    if (!this.#skipped_branches.has(effect))
      this.#skipped_branches.set(effect, {
        d: [],
        m: []
      })
  }
  /**
   * Remove an effect from the #skipped_branches map and reschedule
   * any tracked dirty/maybe_dirty child effects
   * @param {Effect} effect
   */
  unskip_effect(effect) {
    var tracked = this.#skipped_branches.get(effect)
    if (tracked) {
      this.#skipped_branches.delete(effect)
      for (var e of tracked.d) {
        set_signal_status(e, DIRTY)
        schedule_effect(e)
      }
      for (e of tracked.m) {
        set_signal_status(e, MAYBE_DIRTY)
        schedule_effect(e)
      }
    }
  }
  /**
   *
   * @param {Effect[]} root_effects
   */
  process(root_effects) {
    queued_root_effects = []
    this.apply()
    /** @type {Effect[]} */
    var effects = (collected_effects = [])
    /** @type {Effect[]} */
    var render_effects = []
    for (const root of root_effects) this.#traverse_effect_tree(root, effects, render_effects)
    collected_effects = null
    if (this.#is_deferred()) {
      this.#defer_effects(render_effects)
      this.#defer_effects(effects)
      for (const [e, t] of this.#skipped_branches) reset_branch(e, t)
    } else {
      previous_batch = this
      current_batch = null
      for (const fn of this.#commit_callbacks) fn(this)
      this.#commit_callbacks.clear()
      if (this.#pending === 0) this.#commit()
      flush_queued_effects(render_effects)
      flush_queued_effects(effects)
      this.#dirty_effects.clear()
      this.#maybe_dirty_effects.clear()
      previous_batch = null
      this.#deferred?.resolve()
    }
    batch_values = null
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  #traverse_effect_tree(root, effects, render_effects) {
    root.f ^= CLEAN
    var effect = root.first
    while (effect !== null) {
      var flags = effect.f
      var is_branch = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0
      var is_skippable_branch = is_branch && (flags & CLEAN) !== 0
      var inert = (flags & INERT) !== 0
      if (!(is_skippable_branch || this.#skipped_branches.has(effect)) && effect.fn !== null) {
        if (is_branch) {
          if (!inert) effect.f ^= CLEAN
        } else if ((flags & EFFECT) !== 0) effects.push(effect)
        else if ((flags & (RENDER_EFFECT | MANAGED_EFFECT)) !== 0 && (async_mode_flag || inert))
          render_effects.push(effect)
        else if (is_dirty(effect)) {
          update_effect(effect)
          if ((flags & BLOCK_EFFECT) !== 0) {
            this.#maybe_dirty_effects.add(effect)
            if (inert) set_signal_status(effect, DIRTY)
          }
        }
        var child = effect.first
        if (child !== null) {
          effect = child
          continue
        }
      }
      while (effect !== null) {
        var next = effect.next
        if (next !== null) {
          effect = next
          break
        }
        effect = effect.parent
      }
    }
  }
  /**
   * @param {Effect[]} effects
   */
  #defer_effects(effects) {
    for (var i = 0; i < effects.length; i += 1)
      defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects)
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Source} source
   * @param {any} value
   */
  capture(source, value) {
    if (value !== UNINITIALIZED && !this.previous.has(source)) this.previous.set(source, value)
    if ((source.f & ERROR_VALUE) === 0) {
      this.current.set(source, source.v)
      batch_values?.set(source, source.v)
    }
  }
  activate() {
    current_batch = this
    this.apply()
  }
  deactivate() {
    if (current_batch !== this) return
    current_batch = null
    batch_values = null
  }
  flush() {
    if (queued_root_effects.length > 0) {
      current_batch = this
      flush_effects()
    } else if (this.#pending === 0 && !this.is_fork) {
      for (const fn of this.#commit_callbacks) fn(this)
      this.#commit_callbacks.clear()
      this.#commit()
      this.#deferred?.resolve()
    }
    this.deactivate()
  }
  discard() {
    for (const fn of this.#discard_callbacks) fn(this)
    this.#discard_callbacks.clear()
  }
  #commit() {
    if (batches.size > 1) {
      this.previous.clear()
      var previous_batch = current_batch
      var previous_batch_values = batch_values
      var is_earlier = true
      for (const batch of batches) {
        if (batch === this) {
          is_earlier = false
          continue
        }
        /** @type {Source[]} */
        const sources = []
        for (const [source, value] of this.current) {
          if (batch.current.has(source))
            if (is_earlier && value !== batch.current.get(source)) batch.current.set(source, value)
            else continue
          sources.push(source)
        }
        if (sources.length === 0) continue
        const others = [...batch.current.keys()].filter(s => !this.current.has(s))
        if (others.length > 0) {
          var prev_queued_root_effects = queued_root_effects
          queued_root_effects = []
          /** @type {Set<Value>} */
          const marked = /* @__PURE__ */ new Set()
          /** @type {Map<Reaction, boolean>} */
          const checked = /* @__PURE__ */ new Map()
          for (const source of sources) mark_effects(source, others, marked, checked)
          if (queued_root_effects.length > 0) {
            current_batch = batch
            batch.apply()
            for (const root of queued_root_effects) batch.#traverse_effect_tree(root, [], [])
            batch.deactivate()
          }
          queued_root_effects = prev_queued_root_effects
        }
      }
      current_batch = previous_batch
      batch_values = previous_batch_values
    }
    this.#skipped_branches.clear()
    batches.delete(this)
  }
  /**
   *
   * @param {boolean} blocking
   */
  increment(blocking) {
    this.#pending += 1
    if (blocking) this.#blocking_pending += 1
  }
  /**
   *
   * @param {boolean} blocking
   */
  decrement(blocking) {
    this.#pending -= 1
    if (blocking) this.#blocking_pending -= 1
    if (this.#decrement_queued) return
    this.#decrement_queued = true
    queue_micro_task(() => {
      this.#decrement_queued = false
      if (!this.#is_deferred()) this.revive()
      else if (queued_root_effects.length > 0) this.flush()
    })
  }
  revive() {
    for (const e of this.#dirty_effects) {
      this.#maybe_dirty_effects.delete(e)
      set_signal_status(e, DIRTY)
      schedule_effect(e)
    }
    for (const e of this.#maybe_dirty_effects) {
      set_signal_status(e, MAYBE_DIRTY)
      schedule_effect(e)
    }
    this.flush()
  }
  /** @param {(batch: Batch) => void} fn */
  oncommit(fn) {
    this.#commit_callbacks.add(fn)
  }
  /** @param {(batch: Batch) => void} fn */
  ondiscard(fn) {
    this.#discard_callbacks.add(fn)
  }
  settled() {
    return (this.#deferred ??= deferred()).promise
  }
  static ensure() {
    if (current_batch === null) {
      const batch = (current_batch = new Batch())
      batches.add(current_batch)
      if (!is_flushing_sync)
        queue_micro_task(() => {
          if (current_batch !== batch) return
          batch.flush()
        })
    }
    return current_batch
  }
  apply() {
    if (!async_mode_flag || (!this.is_fork && batches.size === 1)) return
    batch_values = new Map(this.current)
    for (const batch of batches) {
      if (batch === this) continue
      for (const [source, previous] of batch.previous)
        if (!batch_values.has(source)) batch_values.set(source, previous)
    }
  }
}
/**
 * Synchronously flush any pending updates.
 * Returns void if no callback is provided, otherwise returns the result of calling the callback.
 * @template [T=void]
 * @param {(() => T) | undefined} [fn]
 * @returns {T}
 */
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync
  is_flushing_sync = true
  try {
    var result
    if (fn) {
      if (current_batch !== null) flush_effects()
      result = fn()
    }
    while (true) {
      flush_tasks()
      if (queued_root_effects.length === 0) {
        current_batch?.flush()
        if (queued_root_effects.length === 0) {
          last_scheduled_effect = null
          return result
        }
      }
      flush_effects()
    }
  } finally {
    is_flushing_sync = was_flushing_sync
  }
}
function flush_effects() {
  var source_stacks = dev_fallback_default ? /* @__PURE__ */ new Set() : null
  try {
    var flush_count = 0
    while (queued_root_effects.length > 0) {
      var batch = Batch.ensure()
      if (flush_count++ > 1e3) {
        if (dev_fallback_default) {
          var updates = /* @__PURE__ */ new Map()
          for (const source of batch.current.keys())
            for (const [stack, update] of source.updated ?? []) {
              var entry = updates.get(stack)
              if (!entry) {
                entry = {
                  error: update.error,
                  count: 0
                }
                updates.set(stack, entry)
              }
              entry.count += update.count
            }
          for (const update of updates.values()) if (update.error) console.error(update.error)
        }
        infinite_loop_guard()
      }
      batch.process(queued_root_effects)
      old_values.clear()
      if (dev_fallback_default)
        for (const source of batch.current.keys())
          /** @type {Set<Source>} */ source_stacks.add(source)
    }
  } finally {
    queued_root_effects = []
    last_scheduled_effect = null
    collected_effects = null
    if (dev_fallback_default) for (const source of source_stacks) source.updated = null
  }
}
function infinite_loop_guard() {
  try {
    effect_update_depth_exceeded()
  } catch (error) {
    if (dev_fallback_default) define_property(error, 'stack', { value: '' })
    invoke_error_boundary(error, last_scheduled_effect)
  }
}
/** @type {Set<Effect> | null} */
let eager_block_effects = null
/**
 * @param {Array<Effect>} effects
 * @returns {void}
 */
function flush_queued_effects(effects) {
  var length = effects.length
  if (length === 0) return
  var i = 0
  while (i < length) {
    var effect = effects[i++]
    if ((effect.f & (DESTROYED | INERT)) === 0 && is_dirty(effect)) {
      eager_block_effects = /* @__PURE__ */ new Set()
      update_effect(effect)
      if (
        effect.deps === null &&
        effect.first === null &&
        effect.nodes === null &&
        effect.teardown === null &&
        effect.ac === null
      )
        unlink_effect(effect)
      if (eager_block_effects?.size > 0) {
        old_values.clear()
        for (const e of eager_block_effects) {
          if ((e.f & (DESTROYED | INERT)) !== 0) continue
          /** @type {Effect[]} */
          const ordered_effects = [e]
          let ancestor = e.parent
          while (ancestor !== null) {
            if (eager_block_effects.has(ancestor)) {
              eager_block_effects.delete(ancestor)
              ordered_effects.push(ancestor)
            }
            ancestor = ancestor.parent
          }
          for (let j = ordered_effects.length - 1; j >= 0; j--) {
            const e = ordered_effects[j]
            if ((e.f & (DESTROYED | INERT)) !== 0) continue
            update_effect(e)
          }
        }
        eager_block_effects.clear()
      }
    }
  }
  eager_block_effects = null
}
/**
 * This is similar to `mark_reactions`, but it only marks async/block effects
 * depending on `value` and at least one of the other `sources`, so that
 * these effects can re-run after another batch has been committed
 * @param {Value} value
 * @param {Source[]} sources
 * @param {Set<Value>} marked
 * @param {Map<Reaction, boolean>} checked
 */
function mark_effects(value, sources, marked, checked) {
  if (marked.has(value)) return
  marked.add(value)
  if (value.reactions !== null)
    for (const reaction of value.reactions) {
      const flags = reaction.f
      if ((flags & DERIVED) !== 0) mark_effects(reaction, sources, marked, checked)
      else if (
        (flags & (ASYNC | BLOCK_EFFECT)) !== 0 &&
        (flags & DIRTY) === 0 &&
        depends_on(reaction, sources, checked)
      ) {
        set_signal_status(reaction, DIRTY)
        schedule_effect(reaction)
      }
    }
}
/**
 * When committing a fork, we need to trigger eager effects so that
 * any `$state.eager(...)` expressions update immediately. This
 * function allows us to discover them
 * @param {Value} value
 * @param {Set<Effect>} effects
 */
function mark_eager_effects(value, effects) {
  if (value.reactions === null) return
  for (const reaction of value.reactions) {
    const flags = reaction.f
    if ((flags & DERIVED) !== 0) mark_eager_effects(reaction, effects)
    else if ((flags & EAGER_EFFECT) !== 0) {
      set_signal_status(reaction, DIRTY)
      effects.add(reaction)
    }
  }
}
/**
 * @param {Reaction} reaction
 * @param {Source[]} sources
 * @param {Map<Reaction, boolean>} checked
 */
function depends_on(reaction, sources, checked) {
  const depends = checked.get(reaction)
  if (depends !== void 0) return depends
  if (reaction.deps !== null)
    for (const dep of reaction.deps) {
      if (includes.call(sources, dep)) return true
      if ((dep.f & DERIVED) !== 0 && depends_on(dep, sources, checked)) {
        checked.set(dep, true)
        return true
      }
    }
  checked.set(reaction, false)
  return false
}
/**
 * @param {Effect} signal
 * @returns {void}
 */
function schedule_effect(signal) {
  var effect = (last_scheduled_effect = signal)
  var boundary = effect.b
  if (
    boundary?.is_pending &&
    (signal.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 &&
    (signal.f & REACTION_RAN) === 0
  ) {
    boundary.defer_effect(signal)
    return
  }
  while (effect.parent !== null) {
    effect = effect.parent
    var flags = effect.f
    if (collected_effects !== null && effect === active_effect) {
      if (async_mode_flag || (signal.f & RENDER_EFFECT) === 0) return
    }
    if ((flags & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
      if ((flags & CLEAN) === 0) return
      effect.f ^= CLEAN
    }
  }
  queued_root_effects.push(effect)
}
/** @type {Source<number>[]} */
let eager_versions = []
function eager_flush() {
  try {
    flushSync(() => {
      for (const version of eager_versions) update(version)
    })
  } finally {
    eager_versions = []
  }
}
/**
 * Implementation of `$state.eager(fn())`
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function eager(fn) {
  var version = source(0)
  var initial = true
  var value = void 0
  get$1(version)
  eager_effect(() => {
    if (initial) {
      var previous_batch_values = batch_values
      try {
        batch_values = null
        value = fn()
      } finally {
        batch_values = previous_batch_values
      }
      return
    }
    if (eager_versions.length === 0) queue_micro_task(eager_flush)
    eager_versions.push(version)
  })
  initial = false
  return value
}
/**
 * Mark all the effects inside a skipped branch CLEAN, so that
 * they can be correctly rescheduled later. Tracks dirty and maybe_dirty
 * effects so they can be rescheduled if the branch survives.
 * @param {Effect} effect
 * @param {{ d: Effect[], m: Effect[] }} tracked
 */
function reset_branch(effect, tracked) {
  if ((effect.f & BRANCH_EFFECT) !== 0 && (effect.f & CLEAN) !== 0) return
  if ((effect.f & DIRTY) !== 0) tracked.d.push(effect)
  else if ((effect.f & MAYBE_DIRTY) !== 0) tracked.m.push(effect)
  set_signal_status(effect, CLEAN)
  var e = effect.first
  while (e !== null) {
    reset_branch(e, tracked)
    e = e.next
  }
}
/**
 * Creates a 'fork', in which state changes are evaluated but not applied to the DOM.
 * This is useful for speculatively loading data (for example) when you suspect that
 * the user is about to take some action.
 *
 * Frameworks like SvelteKit can use this to preload data when the user touches or
 * hovers over a link, making any subsequent navigation feel instantaneous.
 *
 * The `fn` parameter is a synchronous function that modifies some state. The
 * state changes will be reverted after the fork is initialised, then reapplied
 * if and when the fork is eventually committed.
 *
 * When it becomes clear that a fork will _not_ be committed (e.g. because the
 * user navigated elsewhere), it must be discarded to avoid leaking memory.
 *
 * @param {() => void} fn
 * @returns {Fork}
 * @since 5.42
 */
function fork(fn) {
  if (!async_mode_flag) experimental_async_required('fork')
  if (current_batch !== null) fork_timing()
  var batch = Batch.ensure()
  batch.is_fork = true
  batch_values = /* @__PURE__ */ new Map()
  var committed = false
  var settled = batch.settled()
  flushSync(fn)
  for (var [source, value] of batch.previous) source.v = value
  for (source of batch.current.keys())
    if ((source.f & DERIVED) !== 0) set_signal_status(source, DIRTY)
  return {
    commit: async () => {
      if (committed) {
        await settled
        return
      }
      if (!batches.has(batch)) fork_discarded()
      committed = true
      batch.is_fork = false
      for (var [source, value] of batch.current) {
        source.v = value
        source.wv = increment_write_version()
      }
      flushSync(() => {
        /** @type {Set<Effect>} */
        var eager_effects = /* @__PURE__ */ new Set()
        for (var source of batch.current.keys()) mark_eager_effects(source, eager_effects)
        set_eager_effects(eager_effects)
        flush_eager_effects()
      })
      batch.revive()
      await settled
    },
    discard: () => {
      for (var source of batch.current.keys()) source.wv = increment_write_version()
      if (!committed && batches.has(batch)) {
        batches.delete(batch)
        batch.discard()
      }
    }
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/reactivity/create-subscriber.js
/**
 * Returns a `subscribe` function that integrates external event-based systems with Svelte's reactivity.
 * It's particularly useful for integrating with web APIs like `MediaQuery`, `IntersectionObserver`, or `WebSocket`.
 *
 * If `subscribe` is called inside an effect (including indirectly, for example inside a getter),
 * the `start` callback will be called with an `update` function. Whenever `update` is called, the effect re-runs.
 *
 * If `start` returns a cleanup function, it will be called when the effect is destroyed.
 *
 * If `subscribe` is called in multiple effects, `start` will only be called once as long as the effects
 * are active, and the returned teardown function will only be called when all effects are destroyed.
 *
 * It's best understood with an example. Here's an implementation of [`MediaQuery`](https://svelte.dev/docs/svelte/svelte-reactivity#MediaQuery):
 *
 * ```js
 * import { createSubscriber } from 'svelte/reactivity';
 * import { on } from 'svelte/events';
 *
 * export class MediaQuery {
 * 	#query;
 * 	#subscribe;
 *
 * 	constructor(query) {
 * 		this.#query = window.matchMedia(`(${query})`);
 *
 * 		this.#subscribe = createSubscriber((update) => {
 * 			// when the `change` event occurs, re-run any effects that read `this.current`
 * 			const off = on(this.#query, 'change', update);
 *
 * 			// stop listening when all the effects are destroyed
 * 			return () => off();
 * 		});
 * 	}
 *
 * 	get current() {
 * 		// This makes the getter reactive, if read in an effect
 * 		this.#subscribe();
 *
 * 		// Return the current state of the query, whether or not we're in an effect
 * 		return this.#query.matches;
 * 	}
 * }
 * ```
 * @param {(update: () => void) => (() => void) | void} start
 * @since 5.7.0
 */
function createSubscriber(start) {
  let subscribers = 0
  let version = source(0)
  /** @type {(() => void) | void} */
  let stop
  if (dev_fallback_default) tag(version, 'createSubscriber version')
  return () => {
    if (effect_tracking()) {
      get$1(version)
      render_effect(() => {
        if (subscribers === 0) stop = untrack(() => start(() => increment(version)))
        subscribers += 1
        return () => {
          queue_micro_task(() => {
            subscribers -= 1
            if (subscribers === 0) {
              stop?.()
              stop = void 0
              increment(version)
            }
          })
        }
      })
    }
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
/** @import { Effect, Source, TemplateNode, } from '#client' */
/**
 * @typedef {{
 * 	 onerror?: (error: unknown, reset: () => void) => void;
 *   failed?: (anchor: Node, error: () => unknown, reset: () => () => void) => void;
 *   pending?: (anchor: Node) => void;
 * }} BoundaryProps
 */
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED
/**
 * @param {TemplateNode} node
 * @param {BoundaryProps} props
 * @param {((anchor: Node) => void)} children
 * @param {((error: unknown) => unknown) | undefined} [transform_error]
 * @returns {void}
 */
function boundary(node, props, children, transform_error) {
  new Boundary(node, props, children, transform_error)
}
var Boundary = class {
  /** @type {Boundary | null} */
  parent
  is_pending = false
  /**
   * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
   * Inherited from parent boundary, or defaults to identity.
   * @type {(error: unknown) => unknown}
   */
  transform_error
  /** @type {TemplateNode} */
  #anchor
  /** @type {TemplateNode | null} */
  #hydrate_open = hydrating ? hydrate_node : null
  /** @type {BoundaryProps} */
  #props
  /** @type {((anchor: Node) => void)} */
  #children
  /** @type {Effect} */
  #effect
  /** @type {Effect | null} */
  #main_effect = null
  /** @type {Effect | null} */
  #pending_effect = null
  /** @type {Effect | null} */
  #failed_effect = null
  /** @type {DocumentFragment | null} */
  #offscreen_fragment = null
  #local_pending_count = 0
  #pending_count = 0
  #pending_count_update_queued = false
  /** @type {Set<Effect>} */
  #dirty_effects = /* @__PURE__ */ new Set()
  /** @type {Set<Effect>} */
  #maybe_dirty_effects = /* @__PURE__ */ new Set()
  /**
   * A source containing the number of pending async deriveds/expressions.
   * Only created if `$effect.pending()` is used inside the boundary,
   * otherwise updating the source results in needless `Batch.ensure()`
   * calls followed by no-op flushes
   * @type {Source<number> | null}
   */
  #effect_pending = null
  #effect_pending_subscriber = createSubscriber(() => {
    this.#effect_pending = source(this.#local_pending_count)
    if (dev_fallback_default) tag(this.#effect_pending, '$effect.pending()')
    return () => {
      this.#effect_pending = null
    }
  })
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   * @param {((error: unknown) => unknown) | undefined} [transform_error]
   */
  constructor(node, props, children, transform_error) {
    this.#anchor = node
    this.#props = props
    this.#children = anchor => {
      var effect = active_effect
      effect.b = this
      effect.f |= BOUNDARY_EFFECT
      children(anchor)
    }
    this.parent = active_effect.b
    this.transform_error = transform_error ?? this.parent?.transform_error ?? (e => e)
    this.#effect = block(() => {
      if (hydrating) {
        const comment = this.#hydrate_open
        hydrate_next()
        const server_rendered_pending = comment.data === HYDRATION_START_ELSE
        if (comment.data.startsWith(HYDRATION_START_FAILED)) {
          const serialized_error = JSON.parse(comment.data.slice(HYDRATION_START_FAILED.length))
          this.#hydrate_failed_content(serialized_error)
        } else if (server_rendered_pending) this.#hydrate_pending_content()
        else this.#hydrate_resolved_content()
      } else this.#render()
    }, flags)
    if (hydrating) this.#anchor = hydrate_node
  }
  #hydrate_resolved_content() {
    try {
      this.#main_effect = branch(() => this.#children(this.#anchor))
    } catch (error) {
      this.error(error)
    }
  }
  /**
   * @param {unknown} error The deserialized error from the server's hydration comment
   */
  #hydrate_failed_content(error) {
    const failed = this.#props.failed
    if (!failed) return
    this.#failed_effect = branch(() => {
      failed(
        this.#anchor,
        () => error,
        () => () => {}
      )
    })
  }
  #hydrate_pending_content() {
    const pending = this.#props.pending
    if (!pending) return
    this.is_pending = true
    this.#pending_effect = branch(() => pending(this.#anchor))
    queue_micro_task(() => {
      var fragment = (this.#offscreen_fragment = document.createDocumentFragment())
      var anchor = create_text()
      fragment.append(anchor)
      this.#main_effect = this.#run(() => {
        Batch.ensure()
        return branch(() => this.#children(anchor))
      })
      if (this.#pending_count === 0) {
        this.#anchor.before(fragment)
        this.#offscreen_fragment = null
        pause_effect(this.#pending_effect, () => {
          this.#pending_effect = null
        })
        this.#resolve()
      }
    })
  }
  #render() {
    try {
      this.is_pending = this.has_pending_snippet()
      this.#pending_count = 0
      this.#local_pending_count = 0
      this.#main_effect = branch(() => {
        this.#children(this.#anchor)
      })
      if (this.#pending_count > 0) {
        var fragment = (this.#offscreen_fragment = document.createDocumentFragment())
        move_effect(this.#main_effect, fragment)
        const pending = this.#props.pending
        this.#pending_effect = branch(() => pending(this.#anchor))
      } else this.#resolve()
    } catch (error) {
      this.error(error)
    }
  }
  #resolve() {
    this.is_pending = false
    for (const e of this.#dirty_effects) {
      set_signal_status(e, DIRTY)
      schedule_effect(e)
    }
    for (const e of this.#maybe_dirty_effects) {
      set_signal_status(e, MAYBE_DIRTY)
      schedule_effect(e)
    }
    this.#dirty_effects.clear()
    this.#maybe_dirty_effects.clear()
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(effect) {
    defer_effect(effect, this.#dirty_effects, this.#maybe_dirty_effects)
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered())
  }
  has_pending_snippet() {
    return !!this.#props.pending
  }
  /**
   * @template T
   * @param {() => T} fn
   */
  #run(fn) {
    var previous_effect = active_effect
    var previous_reaction = active_reaction
    var previous_ctx = component_context
    set_active_effect(this.#effect)
    set_active_reaction(this.#effect)
    set_component_context(this.#effect.ctx)
    try {
      return fn()
    } catch (e) {
      handle_error(e)
      return null
    } finally {
      set_active_effect(previous_effect)
      set_active_reaction(previous_reaction)
      set_component_context(previous_ctx)
    }
  }
  /**
   * Updates the pending count associated with the currently visible pending snippet,
   * if any, such that we can replace the snippet with content once work is done
   * @param {1 | -1} d
   */
  #update_pending_count(d) {
    if (!this.has_pending_snippet()) {
      if (this.parent) this.parent.#update_pending_count(d)
      return
    }
    this.#pending_count += d
    if (this.#pending_count === 0) {
      this.#resolve()
      if (this.#pending_effect)
        pause_effect(this.#pending_effect, () => {
          this.#pending_effect = null
        })
      if (this.#offscreen_fragment) {
        this.#anchor.before(this.#offscreen_fragment)
        this.#offscreen_fragment = null
      }
    }
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   */
  update_pending_count(d) {
    this.#update_pending_count(d)
    this.#local_pending_count += d
    if (!this.#effect_pending || this.#pending_count_update_queued) return
    this.#pending_count_update_queued = true
    queue_micro_task(() => {
      this.#pending_count_update_queued = false
      if (this.#effect_pending) internal_set(this.#effect_pending, this.#local_pending_count)
    })
  }
  get_effect_pending() {
    this.#effect_pending_subscriber()
    return get$1(this.#effect_pending)
  }
  /** @param {unknown} error */
  error(error) {
    var onerror = this.#props.onerror
    let failed = this.#props.failed
    if (!onerror && !failed) throw error
    if (this.#main_effect) {
      destroy_effect(this.#main_effect)
      this.#main_effect = null
    }
    if (this.#pending_effect) {
      destroy_effect(this.#pending_effect)
      this.#pending_effect = null
    }
    if (this.#failed_effect) {
      destroy_effect(this.#failed_effect)
      this.#failed_effect = null
    }
    if (hydrating) {
      set_hydrate_node(this.#hydrate_open)
      next()
      set_hydrate_node(skip_nodes())
    }
    var did_reset = false
    var calling_on_error = false
    const reset = () => {
      if (did_reset) {
        svelte_boundary_reset_noop()
        return
      }
      did_reset = true
      if (calling_on_error) svelte_boundary_reset_onerror()
      if (this.#failed_effect !== null)
        pause_effect(this.#failed_effect, () => {
          this.#failed_effect = null
        })
      this.#run(() => {
        Batch.ensure()
        this.#render()
      })
    }
    /** @param {unknown} transformed_error */
    const handle_error_result = transformed_error => {
      try {
        calling_on_error = true
        onerror?.(transformed_error, reset)
        calling_on_error = false
      } catch (error) {
        invoke_error_boundary(error, this.#effect && this.#effect.parent)
      }
      if (failed)
        this.#failed_effect = this.#run(() => {
          Batch.ensure()
          try {
            return branch(() => {
              var effect = active_effect
              effect.b = this
              effect.f |= BOUNDARY_EFFECT
              failed(
                this.#anchor,
                () => transformed_error,
                () => reset
              )
            })
          } catch (error) {
            invoke_error_boundary(error, this.#effect.parent)
            return null
          }
        })
    }
    queue_micro_task(() => {
      /** @type {unknown} */
      var result
      try {
        result = this.transform_error(error)
      } catch (e) {
        invoke_error_boundary(e, this.#effect && this.#effect.parent)
        return
      }
      if (result !== null && typeof result === 'object' && typeof result.then === 'function')
        /** @type {any} */ result.then(
          handle_error_result,
          /** @param {unknown} e */
          e => invoke_error_boundary(e, this.#effect && this.#effect.parent)
        )
      else handle_error_result(result)
    })
  }
}
function pending$1() {
  if (active_effect === null) effect_pending_outside_reaction()
  var boundary = active_effect.b
  if (boundary === null) return 0
  return boundary.get_effect_pending()
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/async.js
/** @import { Blocker, Effect, Value } from '#client' */
/**
 * @param {Blocker[]} blockers
 * @param {Array<() => any>} sync
 * @param {Array<() => Promise<any>>} async
 * @param {(values: Value[]) => any} fn
 */
function flatten(blockers, sync, async, fn) {
  const d = is_runes() ? derived : derived_safe_equal
  var pending = blockers.filter(b => !b.settled)
  if (async.length === 0 && pending.length === 0) {
    fn(sync.map(d))
    return
  }
  var parent = active_effect
  var restore = capture()
  var blocker_promise =
    pending.length === 1
      ? pending[0].promise
      : pending.length > 1
        ? Promise.all(pending.map(b => b.promise))
        : null
  /** @param {Value[]} values */
  function finish(values) {
    restore()
    try {
      fn(values)
    } catch (error) {
      if ((parent.f & DESTROYED) === 0) invoke_error_boundary(error, parent)
    }
    unset_context()
  }
  if (async.length === 0) {
    /** @type {Promise<any>} */ blocker_promise.then(() => finish(sync.map(d)))
    return
  }
  function run() {
    restore()
    Promise.all(async.map(expression => /* @__PURE__ */ async_derived(expression)))
      .then(result => finish([...sync.map(d), ...result]))
      .catch(error => invoke_error_boundary(error, parent))
  }
  if (blocker_promise) blocker_promise.then(run)
  else run()
}
/**
 * @param {Blocker[]} blockers
 * @param {(values: Value[]) => any} fn
 */
function run_after_blockers(blockers, fn) {
  flatten(blockers, [], [], fn)
}
/**
 * Captures the current effect context so that we can restore it after
 * some asynchronous work has happened (so that e.g. `await a + b`
 * causes `b` to be registered as a dependency).
 */
function capture() {
  var previous_effect = active_effect
  var previous_reaction = active_reaction
  var previous_component_context = component_context
  var previous_batch = current_batch
  if (dev_fallback_default) var previous_dev_stack = dev_stack
  return function restore(activate_batch = true) {
    set_active_effect(previous_effect)
    set_active_reaction(previous_reaction)
    set_component_context(previous_component_context)
    if (activate_batch) previous_batch?.activate()
    if (dev_fallback_default) {
      set_from_async_derived(null)
      set_dev_stack(previous_dev_stack)
    }
  }
}
/**
 * Wraps an `await` expression in such a way that the effect context that was
 * active before the expression evaluated can be reapplied afterwards —
 * `await a + b` becomes `(await $.save(a))() + b`
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<() => T>}
 */
async function save(promise) {
  var restore = capture()
  var value = await promise
  return () => {
    restore()
    return value
  }
}
/**
 * Reset `current_async_effect` after the `promise` resolves, so
 * that we can emit `await_reactivity_loss` warnings
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<() => T>}
 */
async function track_reactivity_loss(promise) {
  var previous_async_effect = current_async_effect
  var value = await promise
  return () => {
    set_from_async_derived(previous_async_effect)
    return value
  }
}
/**
 * Used in `for await` loops in DEV, so
 * that we can emit `await_reactivity_loss` warnings
 * after each `async_iterator` result resolves and
 * after the `async_iterator` return resolves (if it runs)
 * @template T
 * @template TReturn
 * @param {Iterable<T> | AsyncIterable<T>} iterable
 * @returns {AsyncGenerator<T, TReturn | undefined>}
 */
async function* for_await_track_reactivity_loss(iterable) {
  /** @type {AsyncIterator<T, TReturn>} */
  const iterator = iterable[Symbol.asyncIterator]?.() ?? iterable[Symbol.iterator]?.()
  if (iterator === void 0) throw new TypeError('value is not async iterable')
  /** Whether the completion of the iterator was "normal", meaning it wasn't ended via `break` or a similar method */
  let normal_completion = false
  try {
    while (true) {
      const { done, value } = (await track_reactivity_loss(iterator.next()))()
      if (done) {
        normal_completion = true
        break
      }
      yield value
    }
  } finally {
    if (normal_completion && iterator.return !== void 0)
      return (await track_reactivity_loss(iterator.return()))().value
  }
}
function unset_context(deactivate_batch = true) {
  set_active_effect(null)
  set_active_reaction(null)
  set_component_context(null)
  if (deactivate_batch) current_batch?.deactivate()
  if (dev_fallback_default) {
    set_from_async_derived(null)
    set_dev_stack(null)
  }
}
/**
 * @param {Array<() => void | Promise<void>>} thunks
 */
function run(thunks) {
  const restore = capture()
  const decrement_pending = increment_pending()
  var active = active_effect
  /** @type {null | { error: any }} */
  var errored = null
  /** @param {any} error */
  const handle_error = error => {
    errored = { error }
    if (!aborted(active)) invoke_error_boundary(error, active)
  }
  var promise = Promise.resolve(thunks[0]()).catch(handle_error)
  /** @type {Blocker} */
  var blocker = {
    promise,
    settled: false
  }
  var blockers = [blocker]
  promise.finally(() => {
    blocker.settled = true
    unset_context()
  })
  for (const fn of thunks.slice(1)) {
    promise = promise
      .then(() => {
        if (errored) throw errored.error
        if (aborted(active)) throw STALE_REACTION
        restore()
        return fn()
      })
      .catch(handle_error)
    const blocker = {
      promise,
      settled: false
    }
    blockers.push(blocker)
    promise.finally(() => {
      blocker.settled = true
      unset_context()
    })
  }
  promise.then(() => Promise.resolve()).finally(decrement_pending)
  return blockers
}
/**
 * @param {Blocker[]} blockers
 */
function wait(blockers) {
  return Promise.all(blockers.map(b => b.promise))
}
function increment_pending() {
  var boundary = active_effect.b
  var batch = current_batch
  var blocking = boundary.is_rendered()
  boundary.update_pending_count(1)
  batch.increment(blocking)
  return () => {
    boundary.update_pending_count(-1)
    batch.decrement(blocking)
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/deriveds.js
/** @import { Derived, Effect, Source } from '#client' */
/** @import { Batch } from './batch.js'; */
/** @type {Effect | null} */
let current_async_effect = null
/** @param {Effect | null} v */
function set_from_async_derived(v) {
  current_async_effect = v
}
const recent_async_deriveds = /* @__PURE__ */ new Set()
/**
 * @template V
 * @param {() => V} fn
 * @returns {Derived<V>}
 */
/* @__NO_SIDE_EFFECTS__ */
function derived(fn) {
  var flags = DERIVED | DIRTY
  var parent_derived =
    active_reaction !== null && (active_reaction.f & DERIVED) !== 0 ? active_reaction : null
  if (active_effect !== null) active_effect.f |= EFFECT_PRESERVED
  /** @type {Derived<V>} */
  const signal = {
    ctx: component_context,
    deps: null,
    effects: null,
    equals: equals$1,
    f: flags,
    fn,
    reactions: null,
    rv: 0,
    v: UNINITIALIZED,
    wv: 0,
    parent: parent_derived ?? active_effect,
    ac: null
  }
  if (dev_fallback_default && tracing_mode_flag) signal.created = get_error('created at')
  return signal
}
/**
 * @template V
 * @param {() => V | Promise<V>} fn
 * @param {string} [label]
 * @param {string} [location] If provided, print a warning if the value is not read immediately after update
 * @returns {Promise<Source<V>>}
 */
/* @__NO_SIDE_EFFECTS__ */
function async_derived(fn, label, location) {
  if (active_effect === null) async_derived_orphan()
  var promise = void 0
  var signal = source(UNINITIALIZED)
  if (dev_fallback_default) signal.label = label
  var should_suspend = !active_reaction
  /** @type {Map<Batch, ReturnType<typeof deferred<V>>>} */
  var deferreds = /* @__PURE__ */ new Map()
  async_effect(() => {
    if (dev_fallback_default) current_async_effect = active_effect
    /** @type {ReturnType<typeof deferred<V>>} */
    var d = deferred()
    promise = d.promise
    try {
      Promise.resolve(fn()).then(d.resolve, d.reject).finally(unset_context)
    } catch (error) {
      d.reject(error)
      unset_context()
    }
    if (dev_fallback_default) current_async_effect = null
    var batch = current_batch
    if (should_suspend) {
      var decrement_pending = increment_pending()
      deferreds.get(batch)?.reject(STALE_REACTION)
      deferreds.delete(batch)
      deferreds.set(batch, d)
    }
    /**
     * @param {any} value
     * @param {unknown} error
     */
    const handler = (value, error = void 0) => {
      current_async_effect = null
      batch.activate()
      if (error) {
        if (error !== STALE_REACTION) {
          signal.f |= ERROR_VALUE
          internal_set(signal, error)
        }
      } else {
        if ((signal.f & ERROR_VALUE) !== 0) signal.f ^= ERROR_VALUE
        internal_set(signal, value)
        for (const [b, d] of deferreds) {
          deferreds.delete(b)
          if (b === batch) break
          d.reject(STALE_REACTION)
        }
        if (dev_fallback_default && location !== void 0) {
          recent_async_deriveds.add(signal)
          setTimeout(() => {
            if (recent_async_deriveds.has(signal)) {
              await_waterfall(signal.label, location)
              recent_async_deriveds.delete(signal)
            }
          })
        }
      }
      if (decrement_pending) decrement_pending()
    }
    d.promise.then(handler, e => handler(null, e || 'unknown'))
  })
  teardown(() => {
    for (const d of deferreds.values()) d.reject(STALE_REACTION)
  })
  if (dev_fallback_default) signal.f |= ASYNC
  return new Promise(fulfil => {
    /** @param {Promise<V>} p */
    function next(p) {
      function go() {
        if (p === promise) fulfil(signal)
        else next(promise)
      }
      p.then(go, go)
    }
    next(promise)
  })
}
/**
 * @template V
 * @param {() => V} fn
 * @returns {Derived<V>}
 */
/* @__NO_SIDE_EFFECTS__ */
function user_derived(fn) {
  const d = /* @__PURE__ */ derived(fn)
  if (!async_mode_flag) push_reaction_value(d)
  return d
}
/**
 * @template V
 * @param {() => V} fn
 * @returns {Derived<V>}
 */
/* @__NO_SIDE_EFFECTS__ */
function derived_safe_equal(fn) {
  const signal = /* @__PURE__ */ derived(fn)
  signal.equals = safe_equals
  return signal
}
/**
 * @param {Derived} derived
 * @returns {void}
 */
function destroy_derived_effects(derived) {
  var effects = derived.effects
  if (effects !== null) {
    derived.effects = null
    for (var i = 0; i < effects.length; i += 1) destroy_effect(effects[i])
  }
}
/**
 * The currently updating deriveds, used to detect infinite recursion
 * in dev mode and provide a nicer error than 'too much recursion'
 * @type {Derived[]}
 */
let stack = []
/**
 * @param {Derived} derived
 * @returns {Effect | null}
 */
function get_derived_parent_effect(derived) {
  var parent = derived.parent
  while (parent !== null) {
    if ((parent.f & DERIVED) === 0) return (parent.f & DESTROYED) === 0 ? parent : null
    parent = parent.parent
  }
  return null
}
/**
 * @template T
 * @param {Derived} derived
 * @returns {T}
 */
function execute_derived(derived) {
  var value
  var prev_active_effect = active_effect
  set_active_effect(get_derived_parent_effect(derived))
  if (dev_fallback_default) {
    let prev_eager_effects = eager_effects
    set_eager_effects(/* @__PURE__ */ new Set())
    try {
      if (includes.call(stack, derived)) derived_references_self()
      stack.push(derived)
      derived.f &= ~WAS_MARKED
      destroy_derived_effects(derived)
      value = update_reaction(derived)
    } finally {
      set_active_effect(prev_active_effect)
      set_eager_effects(prev_eager_effects)
      stack.pop()
    }
  } else
    try {
      derived.f &= ~WAS_MARKED
      destroy_derived_effects(derived)
      value = update_reaction(derived)
    } finally {
      set_active_effect(prev_active_effect)
    }
  return value
}
/**
 * @param {Derived} derived
 * @returns {void}
 */
function update_derived(derived) {
  var value = execute_derived(derived)
  if (!derived.equals(value)) {
    derived.wv = increment_write_version()
    if (!current_batch?.is_fork || derived.deps === null) {
      derived.v = value
      if (derived.deps === null) {
        set_signal_status(derived, CLEAN)
        return
      }
    }
  }
  if (is_destroying_effect) return
  if (batch_values !== null) {
    if (effect_tracking() || current_batch?.is_fork) batch_values.set(derived, value)
  } else update_derived_status(derived)
}
/**
 * @param {Derived} derived
 */
function freeze_derived_effects(derived) {
  if (derived.effects === null) return
  for (const e of derived.effects)
    if (e.teardown || e.ac) {
      e.teardown?.()
      e.ac?.abort(STALE_REACTION)
      e.teardown = noop
      e.ac = null
      remove_reactions(e, 0)
      destroy_effect_children(e)
    }
}
/**
 * @param {Derived} derived
 */
function unfreeze_derived_effects(derived) {
  if (derived.effects === null) return
  for (const e of derived.effects) if (e.teardown) update_effect(e)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/sources.js
/** @import { Derived, Effect, Source, Value } from '#client' */
/** @type {Set<any>} */
let eager_effects = /* @__PURE__ */ new Set()
/** @type {Map<Source, any>} */
const old_values = /* @__PURE__ */ new Map()
/**
 * @param {Set<any>} v
 */
function set_eager_effects(v) {
  eager_effects = v
}
let eager_effects_deferred = false
function set_eager_effects_deferred() {
  eager_effects_deferred = true
}
/**
 * @template V
 * @param {V} v
 * @param {Error | null} [stack]
 * @returns {Source<V>}
 */
function source(v, stack) {
  /** @type {Value} */
  var signal = {
    f: 0,
    v,
    reactions: null,
    equals: equals$1,
    rv: 0,
    wv: 0
  }
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = stack ?? get_error('created at')
    signal.updated = null
    signal.set_during_effect = false
    signal.trace = null
  }
  return signal
}
/**
 * @template V
 * @param {V} v
 * @param {Error | null} [stack]
 */
/* @__NO_SIDE_EFFECTS__ */
function state(v, stack) {
  const s = source(v, stack)
  push_reaction_value(s)
  return s
}
/**
 * @template V
 * @param {V} initial_value
 * @param {boolean} [immutable]
 * @returns {Source<V>}
 */
/* @__NO_SIDE_EFFECTS__ */
function mutable_source(initial_value, immutable = false, trackable = true) {
  const s = source(initial_value)
  if (!immutable) s.equals = safe_equals
  if (legacy_mode_flag && trackable && component_context !== null && component_context.l !== null)
    (component_context.l.s ??= []).push(s)
  return s
}
/**
 * @template V
 * @param {Value<V>} source
 * @param {V} value
 */
function mutate(source, value) {
  set(
    source,
    untrack(() => get$1(source))
  )
  return value
}
/**
 * @template V
 * @param {Source<V>} source
 * @param {V} value
 * @param {boolean} [should_proxy]
 * @returns {V}
 */
function set(source, value, should_proxy = false) {
  if (
    active_reaction !== null &&
    (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) &&
    is_runes() &&
    (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 &&
    (current_sources === null || !includes.call(current_sources, source))
  )
    state_unsafe_mutation()
  let new_value = should_proxy ? proxy(value) : value
  if (dev_fallback_default) tag_proxy(new_value, source.label)
  return internal_set(source, new_value)
}
/**
 * @template V
 * @param {Source<V>} source
 * @param {V} value
 * @returns {V}
 */
function internal_set(source, value) {
  if (!source.equals(value)) {
    var old_value = source.v
    if (is_destroying_effect) old_values.set(source, value)
    else old_values.set(source, old_value)
    source.v = value
    var batch = Batch.ensure()
    batch.capture(source, old_value)
    if (dev_fallback_default) {
      if (tracing_mode_flag || active_effect !== null) {
        source.updated ??= /* @__PURE__ */ new Map()
        const count = (source.updated.get('')?.count ?? 0) + 1
        source.updated.set('', {
          error: null,
          count
        })
        if (tracing_mode_flag || count > 5) {
          const error = get_error('updated at')
          if (error !== null) {
            let entry = source.updated.get(error.stack)
            if (!entry) {
              entry = {
                error,
                count: 0
              }
              source.updated.set(error.stack, entry)
            }
            entry.count++
          }
        }
      }
      if (active_effect !== null) source.set_during_effect = true
    }
    if ((source.f & DERIVED) !== 0) {
      const derived = source
      if ((source.f & DIRTY) !== 0) execute_derived(derived)
      update_derived_status(derived)
    }
    source.wv = increment_write_version()
    mark_reactions(source, DIRTY)
    if (
      is_runes() &&
      active_effect !== null &&
      (active_effect.f & CLEAN) !== 0 &&
      (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0
    )
      if (untracked_writes === null) set_untracked_writes([source])
      else untracked_writes.push(source)
    if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) flush_eager_effects()
  }
  return value
}
function flush_eager_effects() {
  eager_effects_deferred = false
  for (const effect of eager_effects) {
    if ((effect.f & CLEAN) !== 0) set_signal_status(effect, MAYBE_DIRTY)
    if (is_dirty(effect)) update_effect(effect)
  }
  eager_effects.clear()
}
/**
 * @template {number | bigint} T
 * @param {Source<T>} source
 * @param {1 | -1} [d]
 * @returns {T}
 */
function update(source, d = 1) {
  var value = get$1(source)
  var result = d === 1 ? value++ : value--
  set(source, value)
  return result
}
/**
 * @template {number | bigint} T
 * @param {Source<T>} source
 * @param {1 | -1} [d]
 * @returns {T}
 */
function update_pre(source, d = 1) {
  var value = get$1(source)
  return set(source, d === 1 ? ++value : --value)
}
/**
 * Silently (without using `get`) increment a source
 * @param {Source<number>} source
 */
function increment(source) {
  set(source, source.v + 1)
}
/**
 * @param {Value} signal
 * @param {number} status should be DIRTY or MAYBE_DIRTY
 * @returns {void}
 */
function mark_reactions(signal, status) {
  var reactions = signal.reactions
  if (reactions === null) return
  var runes = is_runes()
  var length = reactions.length
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i]
    var flags = reaction.f
    if (!runes && reaction === active_effect) continue
    if (dev_fallback_default && (flags & EAGER_EFFECT) !== 0) {
      eager_effects.add(reaction)
      continue
    }
    var not_dirty = (flags & DIRTY) === 0
    if (not_dirty) set_signal_status(reaction, status)
    if ((flags & DERIVED) !== 0) {
      var derived = reaction
      batch_values?.delete(derived)
      if ((flags & WAS_MARKED) === 0) {
        if (flags & CONNECTED) reaction.f |= WAS_MARKED
        mark_reactions(derived, MAYBE_DIRTY)
      }
    } else if (not_dirty) {
      if ((flags & BLOCK_EFFECT) !== 0 && eager_block_effects !== null)
        eager_block_effects.add(reaction)
      schedule_effect(reaction)
    }
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/proxy.js
/** @import { Source } from '#client' */
const regex_is_valid_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/
/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function proxy(value) {
  if (typeof value !== 'object' || value === null || STATE_SYMBOL in value) return value
  const prototype = get_prototype_of(value)
  if (prototype !== object_prototype && prototype !== array_prototype) return value
  /** @type {Map<any, Source<any>>} */
  var sources = /* @__PURE__ */ new Map()
  var is_proxied_array = is_array(value)
  var version = /* @__PURE__ */ state(0)
  var stack = dev_fallback_default && tracing_mode_flag ? get_error('created at') : null
  var parent_version = update_version
  /**
   * Executes the proxy in the context of the reaction it was originally created in, if any
   * @template T
   * @param {() => T} fn
   */
  var with_parent = fn => {
    if (update_version === parent_version) return fn()
    var reaction = active_reaction
    var version = update_version
    set_active_reaction(null)
    set_update_version(parent_version)
    var result = fn()
    set_active_reaction(reaction)
    set_update_version(version)
    return result
  }
  if (is_proxied_array) {
    sources.set(
      'length',
      /* @__PURE__ */ state(
        /** @type {any[]} */
        value.length,
        stack
      )
    )
    if (dev_fallback_default) value = inspectable_array(value)
  }
  /** Used in dev for $inspect.trace() */
  var path = ''
  let updating = false
  /** @param {string} new_path */
  function update_path(new_path) {
    if (updating) return
    updating = true
    path = new_path
    tag(version, `${path} version`)
    for (const [prop, source] of sources) tag(source, get_label(path, prop))
    updating = false
  }
  return new Proxy(value, {
    defineProperty(_, prop, descriptor) {
      if (
        !('value' in descriptor) ||
        descriptor.configurable === false ||
        descriptor.enumerable === false ||
        descriptor.writable === false
      )
        state_descriptors_fixed()
      var s = sources.get(prop)
      if (s === void 0)
        with_parent(() => {
          var s = /* @__PURE__ */ state(descriptor.value, stack)
          sources.set(prop, s)
          if (dev_fallback_default && typeof prop === 'string') tag(s, get_label(path, prop))
          return s
        })
      else set(s, descriptor.value, true)
      return true
    },
    deleteProperty(target, prop) {
      var s = sources.get(prop)
      if (s === void 0) {
        if (prop in target) {
          const s = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED, stack))
          sources.set(prop, s)
          increment(version)
          if (dev_fallback_default) tag(s, get_label(path, prop))
        }
      } else {
        set(s, UNINITIALIZED)
        increment(version)
      }
      return true
    },
    get(target, prop, receiver) {
      if (prop === STATE_SYMBOL) return value
      if (dev_fallback_default && prop === PROXY_PATH_SYMBOL) return update_path
      var s = sources.get(prop)
      var exists = prop in target
      if (s === void 0 && (!exists || get_descriptor(target, prop)?.writable)) {
        s = with_parent(() => {
          var s = /* @__PURE__ */ state(proxy(exists ? target[prop] : UNINITIALIZED), stack)
          if (dev_fallback_default) tag(s, get_label(path, prop))
          return s
        })
        sources.set(prop, s)
      }
      if (s !== void 0) {
        var v = get$1(s)
        return v === UNINITIALIZED ? void 0 : v
      }
      return Reflect.get(target, prop, receiver)
    },
    getOwnPropertyDescriptor(target, prop) {
      var descriptor = Reflect.getOwnPropertyDescriptor(target, prop)
      if (descriptor && 'value' in descriptor) {
        var s = sources.get(prop)
        if (s) descriptor.value = get$1(s)
      } else if (descriptor === void 0) {
        var source = sources.get(prop)
        var value = source?.v
        if (source !== void 0 && value !== UNINITIALIZED)
          return {
            enumerable: true,
            configurable: true,
            value,
            writable: true
          }
      }
      return descriptor
    },
    has(target, prop) {
      if (prop === STATE_SYMBOL) return true
      var s = sources.get(prop)
      var has = (s !== void 0 && s.v !== UNINITIALIZED) || Reflect.has(target, prop)
      if (
        s !== void 0 ||
        (active_effect !== null && (!has || get_descriptor(target, prop)?.writable))
      ) {
        if (s === void 0) {
          s = with_parent(() => {
            var s = /* @__PURE__ */ state(has ? proxy(target[prop]) : UNINITIALIZED, stack)
            if (dev_fallback_default) tag(s, get_label(path, prop))
            return s
          })
          sources.set(prop, s)
        }
        if (get$1(s) === UNINITIALIZED) return false
      }
      return has
    },
    set(target, prop, value, receiver) {
      var s = sources.get(prop)
      var has = prop in target
      if (is_proxied_array && prop === 'length')
        for (var i = value; i < s.v; i += 1) {
          var other_s = sources.get(i + '')
          if (other_s !== void 0) set(other_s, UNINITIALIZED)
          else if (i in target) {
            other_s = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED, stack))
            sources.set(i + '', other_s)
            if (dev_fallback_default) tag(other_s, get_label(path, i))
          }
        }
      if (s === void 0) {
        if (!has || get_descriptor(target, prop)?.writable) {
          s = with_parent(() => /* @__PURE__ */ state(void 0, stack))
          if (dev_fallback_default) tag(s, get_label(path, prop))
          set(s, proxy(value))
          sources.set(prop, s)
        }
      } else {
        has = s.v !== UNINITIALIZED
        var p = with_parent(() => proxy(value))
        set(s, p)
      }
      var descriptor = Reflect.getOwnPropertyDescriptor(target, prop)
      if (descriptor?.set) descriptor.set.call(receiver, value)
      if (!has) {
        if (is_proxied_array && typeof prop === 'string') {
          var ls = sources.get('length')
          var n = Number(prop)
          if (Number.isInteger(n) && n >= ls.v) set(ls, n + 1)
        }
        increment(version)
      }
      return true
    },
    ownKeys(target) {
      get$1(version)
      var own_keys = Reflect.ownKeys(target).filter(key => {
        var source = sources.get(key)
        return source === void 0 || source.v !== UNINITIALIZED
      })
      for (var [key, source] of sources)
        if (source.v !== UNINITIALIZED && !(key in target)) own_keys.push(key)
      return own_keys
    },
    setPrototypeOf() {
      state_prototype_fixed()
    }
  })
}
/**
 * @param {string} path
 * @param {string | symbol} prop
 */
function get_label(path, prop) {
  if (typeof prop === 'symbol') return `${path}[Symbol(${prop.description ?? ''})]`
  if (regex_is_valid_identifier.test(prop)) return `${path}.${prop}`
  return /^\d+$/.test(prop) ? `${path}[${prop}]` : `${path}['${prop}']`
}
/**
 * @param {any} value
 */
function get_proxied_value(value) {
  try {
    if (value !== null && typeof value === 'object' && STATE_SYMBOL in value)
      return value[STATE_SYMBOL]
  } catch {}
  return value
}
/**
 * @param {any} a
 * @param {any} b
 */
function is(a, b) {
  return Object.is(get_proxied_value(a), get_proxied_value(b))
}
const ARRAY_MUTATING_METHODS = new Set([
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'shift',
  'sort',
  'splice',
  'unshift'
])
/**
 * Wrap array mutating methods so $inspect is triggered only once and
 * to prevent logging an array in intermediate state (e.g. with an empty slot)
 * @param {any[]} array
 */
function inspectable_array(array) {
  return new Proxy(array, {
    get(target, prop, receiver) {
      var value = Reflect.get(target, prop, receiver)
      if (!ARRAY_MUTATING_METHODS.has(prop)) return value
      /**
       * @this {any[]}
       * @param {any[]} args
       */
      return function (...args) {
        set_eager_effects_deferred()
        var result = value.apply(this, args)
        flush_eager_effects()
        return result
      }
    }
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/equality.js
function init_array_prototype_warnings() {
  const array_prototype = Array.prototype
  const cleanup = Array.__svelte_cleanup
  if (cleanup) cleanup()
  const { indexOf, lastIndexOf, includes } = array_prototype
  array_prototype.indexOf = function (item, from_index) {
    const index = indexOf.call(this, item, from_index)
    if (index === -1) {
      for (let i = from_index ?? 0; i < this.length; i += 1)
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch('array.indexOf(...)')
          break
        }
    }
    return index
  }
  array_prototype.lastIndexOf = function (item, from_index) {
    const index = lastIndexOf.call(this, item, from_index ?? this.length - 1)
    if (index === -1) {
      for (let i = 0; i <= (from_index ?? this.length - 1); i += 1)
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch('array.lastIndexOf(...)')
          break
        }
    }
    return index
  }
  array_prototype.includes = function (item, from_index) {
    const has = includes.call(this, item, from_index)
    if (!has) {
      for (let i = 0; i < this.length; i += 1)
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch('array.includes(...)')
          break
        }
    }
    return has
  }
  Array.__svelte_cleanup = () => {
    array_prototype.indexOf = indexOf
    array_prototype.lastIndexOf = lastIndexOf
    array_prototype.includes = includes
  }
}
/**
 * @param {any} a
 * @param {any} b
 * @param {boolean} equal
 * @returns {boolean}
 */
function strict_equals(a, b, equal = true) {
  try {
    if ((a === b) !== (get_proxied_value(a) === get_proxied_value(b)))
      state_proxy_equality_mismatch(equal ? '===' : '!==')
  } catch {}
  return (a === b) === equal
}
/**
 * @param {any} a
 * @param {any} b
 * @param {boolean} equal
 * @returns {boolean}
 */
function equals(a, b, equal = true) {
  if ((a == b) !== (get_proxied_value(a) == get_proxied_value(b)))
    state_proxy_equality_mismatch(equal ? '==' : '!=')
  return (a == b) === equal
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/operations.js
/** @import { Effect, TemplateNode } from '#client' */
/** @type {Window} */
var $window
/** @type {Document} */
var $document
/** @type {boolean} */
var is_firefox
/** @type {() => Node | null} */
var first_child_getter
/** @type {() => Node | null} */
var next_sibling_getter
/**
 * Initialize these lazily to avoid issues when using the runtime in a server context
 * where these globals are not available while avoiding a separate server entry point
 */
function init_operations() {
  if ($window !== void 0) return
  $window = window
  $document = document
  is_firefox = /Firefox/.test(navigator.userAgent)
  var element_prototype = Element.prototype
  var node_prototype = Node.prototype
  var text_prototype = Text.prototype
  first_child_getter = get_descriptor(node_prototype, 'firstChild').get
  next_sibling_getter = get_descriptor(node_prototype, 'nextSibling').get
  if (is_extensible(element_prototype)) {
    element_prototype.__click = void 0
    element_prototype.__className = void 0
    element_prototype.__attributes = null
    element_prototype.__style = void 0
    element_prototype.__e = void 0
  }
  if (is_extensible(text_prototype)) text_prototype.__t = void 0
  if (dev_fallback_default) {
    element_prototype.__svelte_meta = null
    init_array_prototype_warnings()
  }
}
/**
 * @param {string} value
 * @returns {Text}
 */
function create_text(value = '') {
  return document.createTextNode(value)
}
/**
 * @template {Node} N
 * @param {N} node
 */
/* @__NO_SIDE_EFFECTS__ */
function get_first_child(node) {
  return first_child_getter.call(node)
}
/**
 * @template {Node} N
 * @param {N} node
 */
/* @__NO_SIDE_EFFECTS__ */
function get_next_sibling(node) {
  return next_sibling_getter.call(node)
}
/**
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @template {Node} N
 * @param {N} node
 * @param {boolean} is_text
 * @returns {TemplateNode | null}
 */
function child(node, is_text) {
  if (!hydrating) return /* @__PURE__ */ get_first_child(node)
  var child = /* @__PURE__ */ get_first_child(hydrate_node)
  if (child === null) child = hydrate_node.appendChild(create_text())
  else if (is_text && child.nodeType !== TEXT_NODE) {
    var text = create_text()
    child?.before(text)
    set_hydrate_node(text)
    return text
  }
  if (is_text) merge_text_nodes(child)
  set_hydrate_node(child)
  return child
}
/**
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @param {TemplateNode} node
 * @param {boolean} [is_text]
 * @returns {TemplateNode | null}
 */
function first_child(node, is_text = false) {
  if (!hydrating) {
    var first = /* @__PURE__ */ get_first_child(node)
    if (first instanceof Comment && first.data === '')
      return /* @__PURE__ */ get_next_sibling(first)
    return first
  }
  if (is_text) {
    if (hydrate_node?.nodeType !== TEXT_NODE) {
      var text = create_text()
      hydrate_node?.before(text)
      set_hydrate_node(text)
      return text
    }
    merge_text_nodes(hydrate_node)
  }
  return hydrate_node
}
/**
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @param {TemplateNode} node
 * @param {number} count
 * @param {boolean} is_text
 * @returns {TemplateNode | null}
 */
function sibling(node, count = 1, is_text = false) {
  let next_sibling = hydrating ? hydrate_node : node
  var last_sibling
  while (count--) {
    last_sibling = next_sibling
    next_sibling = /* @__PURE__ */ get_next_sibling(next_sibling)
  }
  if (!hydrating) return next_sibling
  if (is_text) {
    if (next_sibling?.nodeType !== TEXT_NODE) {
      var text = create_text()
      if (next_sibling === null) last_sibling?.after(text)
      else next_sibling.before(text)
      set_hydrate_node(text)
      return text
    }
    merge_text_nodes(next_sibling)
  }
  set_hydrate_node(next_sibling)
  return next_sibling
}
/**
 * @template {Node} N
 * @param {N} node
 * @returns {void}
 */
function clear_text_content(node) {
  node.textContent = ''
}
/**
 * Returns `true` if we're updating the current block, for example `condition` in
 * an `{#if condition}` block just changed. In this case, the branch should be
 * appended (or removed) at the same time as other updates within the
 * current `<svelte:boundary>`
 */
function should_defer_append() {
  if (!async_mode_flag) return false
  if (eager_block_effects !== null) return false
  return (active_effect.f & REACTION_RAN) !== 0
}
/**
 * @template {keyof HTMLElementTagNameMap | string} T
 * @param {T} tag
 * @param {string} [namespace]
 * @param {string} [is]
 * @returns {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element}
 */
function create_element(tag, namespace, is) {
  let options = is ? { is } : void 0
  return document.createElementNS(namespace ?? NAMESPACE_HTML, tag, options)
}
function create_fragment() {
  return document.createDocumentFragment()
}
/**
 * @param {string} data
 * @returns
 */
function create_comment(data = '') {
  return document.createComment(data)
}
/**
 * @param {Element} element
 * @param {string} key
 * @param {string} value
 * @returns
 */
function set_attribute$1(element, key, value = '') {
  if (key.startsWith('xlink:')) {
    element.setAttributeNS('http://www.w3.org/1999/xlink', key, value)
    return
  }
  return element.setAttribute(key, value)
}
/**
 * Browsers split text nodes larger than 65536 bytes when parsing.
 * For hydration to succeed, we need to stitch them back together
 * @param {Text} text
 */
function merge_text_nodes(text) {
  if (text.nodeValue.length < 65536) return
  let next = text.nextSibling
  while (next !== null && next.nodeType === TEXT_NODE) {
    next.remove()
    /** @type {string} */ text.nodeValue += next.nodeValue
    next = text.nextSibling
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/misc.js
/**
 * @param {HTMLElement} dom
 * @param {boolean} value
 * @returns {void}
 */
function autofocus(dom, value) {
  if (value) {
    const body = document.body
    dom.autofocus = true
    queue_micro_task(() => {
      if (document.activeElement === body) dom.focus()
    })
  }
}
/**
 * The child of a textarea actually corresponds to the defaultValue property, so we need
 * to remove it upon hydration to avoid a bug when someone resets the form value.
 * @param {HTMLTextAreaElement} dom
 * @returns {void}
 */
function remove_textarea_child(dom) {
  if (hydrating && /* @__PURE__ */ get_first_child(dom) !== null) clear_text_content(dom)
}
let listening_to_form_reset = false
function add_form_reset_listener() {
  if (!listening_to_form_reset) {
    listening_to_form_reset = true
    document.addEventListener(
      'reset',
      evt => {
        Promise.resolve().then(() => {
          if (!evt.defaultPrevented) for (const e of evt.target.elements) e.__on_r?.()
        })
      },
      { capture: true }
    )
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
/**
 * Fires the handler once immediately (unless corresponding arg is set to `false`),
 * then listens to the given events until the render effect context is destroyed
 * @param {EventTarget} target
 * @param {Array<string>} events
 * @param {(event?: Event) => void} handler
 * @param {any} call_handler_immediately
 */
function listen(target, events, handler, call_handler_immediately = true) {
  if (call_handler_immediately) handler()
  for (var name of events) target.addEventListener(name, handler)
  teardown(() => {
    for (var name of events) target.removeEventListener(name, handler)
  })
}
/**
 * @template T
 * @param {() => T} fn
 */
function without_reactive_context(fn) {
  var previous_reaction = active_reaction
  var previous_effect = active_effect
  set_active_reaction(null)
  set_active_effect(null)
  try {
    return fn()
  } finally {
    set_active_reaction(previous_reaction)
    set_active_effect(previous_effect)
  }
}
/**
 * Listen to the given event, and then instantiate a global form reset listener if not already done,
 * to notify all bindings when the form is reset
 * @param {HTMLElement} element
 * @param {string} event
 * @param {(is_reset?: true) => void} handler
 * @param {(is_reset?: true) => void} [on_reset]
 */
function listen_to_event_and_reset_event(element, event, handler, on_reset = handler) {
  element.addEventListener(event, () => without_reactive_context(handler))
  const prev = element.__on_r
  if (prev)
    element.__on_r = () => {
      prev()
      on_reset(true)
    }
  else element.__on_r = () => on_reset(true)
  add_form_reset_listener()
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/effects.js
/** @import { Blocker, ComponentContext, ComponentContextLegacy, Derived, Effect, TemplateNode, TransitionManager } from '#client' */
/**
 * @param {'$effect' | '$effect.pre' | '$inspect'} rune
 */
function validate_effect(rune) {
  if (active_effect === null) {
    if (active_reaction === null) effect_orphan(rune)
    effect_in_unowned_derived()
  }
  if (is_destroying_effect) effect_in_teardown(rune)
}
/**
 * @param {Effect} effect
 * @param {Effect} parent_effect
 */
function push_effect(effect, parent_effect) {
  var parent_last = parent_effect.last
  if (parent_last === null) parent_effect.last = parent_effect.first = effect
  else {
    parent_last.next = effect
    effect.prev = parent_last
    parent_effect.last = effect
  }
}
/**
 * @param {number} type
 * @param {null | (() => void | (() => void))} fn
 * @returns {Effect}
 */
function create_effect(type, fn) {
  var parent = active_effect
  if (dev_fallback_default)
    while (parent !== null && (parent.f & EAGER_EFFECT) !== 0) parent = parent.parent
  if (parent !== null && (parent.f & INERT) !== 0) type |= INERT
  /** @type {Effect} */
  var effect = {
    ctx: component_context,
    deps: null,
    nodes: null,
    f: type | DIRTY | CONNECTED,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  }
  if (dev_fallback_default) effect.component_function = dev_current_component_function
  /** @type {Effect | null} */
  var e = effect
  if ((type & EFFECT) !== 0)
    if (collected_effects !== null) collected_effects.push(effect)
    else schedule_effect(effect)
  else if (fn !== null) {
    try {
      update_effect(effect)
    } catch (e) {
      destroy_effect(effect)
      throw e
    }
    if (
      e.deps === null &&
      e.teardown === null &&
      e.nodes === null &&
      e.first === e.last &&
      (e.f & EFFECT_PRESERVED) === 0
    ) {
      e = e.first
      if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e !== null)
        e.f |= EFFECT_TRANSPARENT
    }
  }
  if (e !== null) {
    e.parent = parent
    if (parent !== null) push_effect(e, parent)
    if (
      active_reaction !== null &&
      (active_reaction.f & DERIVED) !== 0 &&
      (type & ROOT_EFFECT) === 0
    ) {
      var derived = active_reaction
      ;(derived.effects ??= []).push(e)
    }
  }
  return effect
}
/**
 * Internal representation of `$effect.tracking()`
 * @returns {boolean}
 */
function effect_tracking() {
  return active_reaction !== null && !untracking
}
/**
 * @param {() => void} fn
 */
function teardown(fn) {
  const effect = create_effect(RENDER_EFFECT, null)
  set_signal_status(effect, CLEAN)
  effect.teardown = fn
  return effect
}
/**
 * Internal representation of `$effect(...)`
 * @param {() => void | (() => void)} fn
 */
function user_effect(fn) {
  validate_effect('$effect')
  if (dev_fallback_default) define_property(fn, 'name', { value: '$effect' })
  var flags = active_effect.f
  if (!active_reaction && (flags & BRANCH_EFFECT) !== 0 && (flags & REACTION_RAN) === 0) {
    var context = component_context
    ;(context.e ??= []).push(fn)
  } else return create_user_effect(fn)
}
/**
 * @param {() => void | (() => void)} fn
 */
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn)
}
/**
 * Internal representation of `$effect.pre(...)`
 * @param {() => void | (() => void)} fn
 * @returns {Effect}
 */
function user_pre_effect(fn) {
  validate_effect('$effect.pre')
  if (dev_fallback_default) define_property(fn, 'name', { value: '$effect.pre' })
  return create_effect(RENDER_EFFECT | USER_EFFECT, fn)
}
/** @param {() => void | (() => void)} fn */
function eager_effect(fn) {
  return create_effect(EAGER_EFFECT, fn)
}
/**
 * Internal representation of `$effect.root(...)`
 * @param {() => void | (() => void)} fn
 * @returns {() => void}
 */
function effect_root(fn) {
  Batch.ensure()
  const effect = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn)
  return () => {
    destroy_effect(effect)
  }
}
/**
 * An effect root whose children can transition out
 * @param {() => void} fn
 * @returns {(options?: { outro?: boolean }) => Promise<void>}
 */
function component_root(fn) {
  Batch.ensure()
  const effect = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn)
  return (options = {}) => {
    return new Promise(fulfil => {
      if (options.outro)
        pause_effect(effect, () => {
          destroy_effect(effect)
          fulfil(void 0)
        })
      else {
        destroy_effect(effect)
        fulfil(void 0)
      }
    })
  }
}
/**
 * @param {() => void | (() => void)} fn
 * @returns {Effect}
 */
function effect(fn) {
  return create_effect(EFFECT, fn)
}
/**
 * Internal representation of `$: ..`
 * @param {() => any} deps
 * @param {() => void | (() => void)} fn
 */
function legacy_pre_effect(deps, fn) {
  var context = component_context
  /** @type {{ effect: null | Effect, ran: boolean, deps: () => any }} */
  var token = {
    effect: null,
    ran: false,
    deps
  }
  context.l.$.push(token)
  token.effect = render_effect(() => {
    deps()
    if (token.ran) return
    token.ran = true
    untrack(fn)
  })
}
function legacy_pre_effect_reset() {
  var context = component_context
  render_effect(() => {
    for (var token of context.l.$) {
      token.deps()
      var effect = token.effect
      if ((effect.f & CLEAN) !== 0 && effect.deps !== null) set_signal_status(effect, MAYBE_DIRTY)
      if (is_dirty(effect)) update_effect(effect)
      token.ran = false
    }
  })
}
/**
 * @param {() => void | (() => void)} fn
 * @returns {Effect}
 */
function async_effect(fn) {
  return create_effect(ASYNC | EFFECT_PRESERVED, fn)
}
/**
 * @param {() => void | (() => void)} fn
 * @returns {Effect}
 */
function render_effect(fn, flags = 0) {
  return create_effect(RENDER_EFFECT | flags, fn)
}
/**
 * @param {(...expressions: any) => void | (() => void)} fn
 * @param {Array<() => any>} sync
 * @param {Array<() => Promise<any>>} async
 * @param {Blocker[]} blockers
 */
function template_effect(fn, sync = [], async = [], blockers = []) {
  flatten(blockers, sync, async, values => {
    create_effect(RENDER_EFFECT, () => fn(...values.map(get$1)))
  })
}
/**
 * Like `template_effect`, but with an effect which is deferred until the batch commits
 * @param {(...expressions: any) => void | (() => void)} fn
 * @param {Array<() => any>} sync
 * @param {Array<() => Promise<any>>} async
 * @param {Blocker[]} blockers
 */
function deferred_template_effect(fn, sync = [], async = [], blockers = []) {
  if (async.length > 0 || blockers.length > 0) var decrement_pending = increment_pending()
  flatten(blockers, sync, async, values => {
    create_effect(EFFECT, () => fn(...values.map(get$1)))
    if (decrement_pending) decrement_pending()
  })
}
/**
 * @param {(() => void)} fn
 * @param {number} flags
 */
function block(fn, flags = 0) {
  var effect = create_effect(BLOCK_EFFECT | flags, fn)
  if (dev_fallback_default) effect.dev_stack = dev_stack
  return effect
}
/**
 * @param {(() => void)} fn
 * @param {number} flags
 */
function managed(fn, flags = 0) {
  var effect = create_effect(MANAGED_EFFECT | flags, fn)
  if (dev_fallback_default) effect.dev_stack = dev_stack
  return effect
}
/**
 * @param {(() => void)} fn
 */
function branch(fn) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn)
}
/**
 * @param {Effect} effect
 */
function execute_effect_teardown(effect) {
  var teardown = effect.teardown
  if (teardown !== null) {
    const previously_destroying_effect = is_destroying_effect
    const previous_reaction = active_reaction
    set_is_destroying_effect(true)
    set_active_reaction(null)
    try {
      teardown.call(null)
    } finally {
      set_is_destroying_effect(previously_destroying_effect)
      set_active_reaction(previous_reaction)
    }
  }
}
/**
 * @param {Effect} signal
 * @param {boolean} remove_dom
 * @returns {void}
 */
function destroy_effect_children(signal, remove_dom = false) {
  var effect = signal.first
  signal.first = signal.last = null
  while (effect !== null) {
    const controller = effect.ac
    if (controller !== null)
      without_reactive_context(() => {
        controller.abort(STALE_REACTION)
      })
    var next = effect.next
    if ((effect.f & ROOT_EFFECT) !== 0) effect.parent = null
    else destroy_effect(effect, remove_dom)
    effect = next
  }
}
/**
 * @param {Effect} signal
 * @returns {void}
 */
function destroy_block_effect_children(signal) {
  var effect = signal.first
  while (effect !== null) {
    var next = effect.next
    if ((effect.f & BRANCH_EFFECT) === 0) destroy_effect(effect)
    effect = next
  }
}
/**
 * @param {Effect} effect
 * @param {boolean} [remove_dom]
 * @returns {void}
 */
function destroy_effect(effect, remove_dom = true) {
  var removed = false
  if (
    (remove_dom || (effect.f & HEAD_EFFECT) !== 0) &&
    effect.nodes !== null &&
    effect.nodes.end !== null
  ) {
    remove_effect_dom(effect.nodes.start, effect.nodes.end)
    removed = true
  }
  destroy_effect_children(effect, remove_dom && !removed)
  remove_reactions(effect, 0)
  set_signal_status(effect, DESTROYED)
  var transitions = effect.nodes && effect.nodes.t
  if (transitions !== null) for (const transition of transitions) transition.stop()
  execute_effect_teardown(effect)
  var parent = effect.parent
  if (parent !== null && parent.first !== null) unlink_effect(effect)
  if (dev_fallback_default) effect.component_function = null
  effect.next =
    effect.prev =
    effect.teardown =
    effect.ctx =
    effect.deps =
    effect.fn =
    effect.nodes =
    effect.ac =
      null
}
/**
 *
 * @param {TemplateNode | null} node
 * @param {TemplateNode} end
 */
function remove_effect_dom(node, end) {
  while (node !== null) {
    /** @type {TemplateNode | null} */
    var next = node === end ? null : /* @__PURE__ */ get_next_sibling(node)
    node.remove()
    node = next
  }
}
/**
 * Detach an effect from the effect tree, freeing up memory and
 * reducing the amount of work that happens on subsequent traversals
 * @param {Effect} effect
 */
function unlink_effect(effect) {
  var parent = effect.parent
  var prev = effect.prev
  var next = effect.next
  if (prev !== null) prev.next = next
  if (next !== null) next.prev = prev
  if (parent !== null) {
    if (parent.first === effect) parent.first = next
    if (parent.last === effect) parent.last = prev
  }
}
/**
 * When a block effect is removed, we don't immediately destroy it or yank it
 * out of the DOM, because it might have transitions. Instead, we 'pause' it.
 * It stays around (in memory, and in the DOM) until outro transitions have
 * completed, and if the state change is reversed then we _resume_ it.
 * A paused effect does not update, and the DOM subtree becomes inert.
 * @param {Effect} effect
 * @param {() => void} [callback]
 * @param {boolean} [destroy]
 */
function pause_effect(effect, callback, destroy = true) {
  /** @type {TransitionManager[]} */
  var transitions = []
  pause_children(effect, transitions, true)
  var fn = () => {
    if (destroy) destroy_effect(effect)
    if (callback) callback()
  }
  var remaining = transitions.length
  if (remaining > 0) {
    var check = () => --remaining || fn()
    for (var transition of transitions) transition.out(check)
  } else fn()
}
/**
 * @param {Effect} effect
 * @param {TransitionManager[]} transitions
 * @param {boolean} local
 */
function pause_children(effect, transitions, local) {
  if ((effect.f & INERT) !== 0) return
  effect.f ^= INERT
  var t = effect.nodes && effect.nodes.t
  if (t !== null) {
    for (const transition of t) if (transition.is_global || local) transitions.push(transition)
  }
  var child = effect.first
  while (child !== null) {
    var sibling = child.next
    var transparent =
      (child.f & EFFECT_TRANSPARENT) !== 0 ||
      ((child.f & BRANCH_EFFECT) !== 0 && (effect.f & BLOCK_EFFECT) !== 0)
    pause_children(child, transitions, transparent ? local : false)
    child = sibling
  }
}
/**
 * The opposite of `pause_effect`. We call this if (for example)
 * `x` becomes falsy then truthy: `{#if x}...{/if}`
 * @param {Effect} effect
 */
function resume_effect(effect) {
  resume_children(effect, true)
}
/**
 * @param {Effect} effect
 * @param {boolean} local
 */
function resume_children(effect, local) {
  if ((effect.f & INERT) === 0) return
  effect.f ^= INERT
  if (async_mode_flag && (effect.f & BRANCH_EFFECT) !== 0 && (effect.f & CLEAN) === 0)
    effect.f ^= CLEAN
  var child = effect.first
  while (child !== null) {
    var sibling = child.next
    var transparent = (child.f & EFFECT_TRANSPARENT) !== 0 || (child.f & BRANCH_EFFECT) !== 0
    resume_children(child, transparent ? local : false)
    child = sibling
  }
  var t = effect.nodes && effect.nodes.t
  if (t !== null) {
    for (const transition of t) if (transition.is_global || local) transition.in()
  }
}
function aborted(effect = active_effect) {
  return (effect.f & DESTROYED) !== 0
}
/**
 * @param {Effect} effect
 * @param {DocumentFragment} fragment
 */
function move_effect(effect, fragment) {
  if (!effect.nodes) return
  /** @type {TemplateNode | null} */
  var node = effect.nodes.start
  var end = effect.nodes.end
  while (node !== null) {
    /** @type {TemplateNode | null} */
    var next = node === end ? null : /* @__PURE__ */ get_next_sibling(node)
    fragment.append(node)
    node = next
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/legacy.js
/** @import { Value } from '#client' */
/**
 * @type {Set<Value> | null}
 * @deprecated
 */
let captured_signals = null
/**
 * Capture an array of all the signals that are read when `fn` is called
 * @template T
 * @param {() => T} fn
 */
function capture_signals(fn) {
  var previous_captured_signals = captured_signals
  try {
    captured_signals = /* @__PURE__ */ new Set()
    untrack(fn)
    if (previous_captured_signals !== null)
      for (var signal of captured_signals) previous_captured_signals.add(signal)
    return captured_signals
  } finally {
    captured_signals = previous_captured_signals
  }
}
/**
 * Invokes a function and captures all signals that are read during the invocation,
 * then invalidates them.
 * @param {() => any} fn
 * @deprecated
 */
function invalidate_inner_signals(fn) {
  for (var signal of capture_signals(fn)) internal_set(signal, signal.v)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/runtime.js
/** @import { Derived, Effect, Reaction, Source, Value } from '#client' */
let is_updating_effect = false
let is_destroying_effect = false
/** @param {boolean} value */
function set_is_destroying_effect(value) {
  is_destroying_effect = value
}
/** @type {null | Reaction} */
let active_reaction = null
let untracking = false
/** @param {null | Reaction} reaction */
function set_active_reaction(reaction) {
  active_reaction = reaction
}
/** @type {null | Effect} */
let active_effect = null
/** @param {null | Effect} effect */
function set_active_effect(effect) {
  active_effect = effect
}
/**
 * When sources are created within a reaction, reading and writing
 * them within that reaction should not cause a re-run
 * @type {null | Source[]}
 */
let current_sources = null
/** @param {Value} value */
function push_reaction_value(value) {
  if (active_reaction !== null && (!async_mode_flag || (active_reaction.f & DERIVED) !== 0))
    if (current_sources === null) current_sources = [value]
    else current_sources.push(value)
}
/**
 * The dependencies of the reaction that is currently being executed. In many cases,
 * the dependencies are unchanged between runs, and so this will be `null` unless
 * and until a new dependency is accessed — we track this via `skipped_deps`
 * @type {null | Value[]}
 */
let new_deps = null
let skipped_deps = 0
/**
 * Tracks writes that the effect it's executed in doesn't listen to yet,
 * so that the dependency can be added to the effect later on if it then reads it
 * @type {null | Source[]}
 */
let untracked_writes = null
/** @param {null | Source[]} value */
function set_untracked_writes(value) {
  untracked_writes = value
}
/**
 * @type {number} Used by sources and deriveds for handling updates.
 * Version starts from 1 so that unowned deriveds differentiate between a created effect and a run one for tracing
 **/
let write_version = 1
/** @type {number} Used to version each read of a source of derived to avoid duplicating depedencies inside a reaction */
let read_version = 0
let update_version = read_version
/** @param {number} value */
function set_update_version(value) {
  update_version = value
}
function increment_write_version() {
  return ++write_version
}
/**
 * Determines whether a derived or effect is dirty.
 * If it is MAYBE_DIRTY, will set the status to CLEAN
 * @param {Reaction} reaction
 * @returns {boolean}
 */
function is_dirty(reaction) {
  var flags = reaction.f
  if ((flags & DIRTY) !== 0) return true
  if (flags & DERIVED) reaction.f &= ~WAS_MARKED
  if ((flags & MAYBE_DIRTY) !== 0) {
    var dependencies = reaction.deps
    var length = dependencies.length
    for (var i = 0; i < length; i++) {
      var dependency = dependencies[i]
      if (is_dirty(dependency)) update_derived(dependency)
      if (dependency.wv > reaction.wv) return true
    }
    if ((flags & CONNECTED) !== 0 && batch_values === null) set_signal_status(reaction, CLEAN)
  }
  return false
}
/**
 * @param {Value} signal
 * @param {Effect} effect
 * @param {boolean} [root]
 */
function schedule_possible_effect_self_invalidation(signal, effect, root = true) {
  var reactions = signal.reactions
  if (reactions === null) return
  if (!async_mode_flag && current_sources !== null && includes.call(current_sources, signal)) return
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i]
    if ((reaction.f & DERIVED) !== 0)
      schedule_possible_effect_self_invalidation(reaction, effect, false)
    else if (effect === reaction) {
      if (root) set_signal_status(reaction, DIRTY)
      else if ((reaction.f & CLEAN) !== 0) set_signal_status(reaction, MAYBE_DIRTY)
      schedule_effect(reaction)
    }
  }
}
/** @param {Reaction} reaction */
function update_reaction(reaction) {
  var previous_deps = new_deps
  var previous_skipped_deps = skipped_deps
  var previous_untracked_writes = untracked_writes
  var previous_reaction = active_reaction
  var previous_sources = current_sources
  var previous_component_context = component_context
  var previous_untracking = untracking
  var previous_update_version = update_version
  var flags = reaction.f
  new_deps = null
  skipped_deps = 0
  untracked_writes = null
  active_reaction = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null
  current_sources = null
  set_component_context(reaction.ctx)
  untracking = false
  update_version = ++read_version
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      /** @type {AbortController} */ reaction.ac.abort(STALE_REACTION)
    })
    reaction.ac = null
  }
  try {
    reaction.f |= REACTION_IS_UPDATING
    var fn = reaction.fn
    var result = fn()
    reaction.f |= REACTION_RAN
    var deps = reaction.deps
    var is_fork = current_batch?.is_fork
    if (new_deps !== null) {
      var i
      if (!is_fork) remove_reactions(reaction, skipped_deps)
      if (deps !== null && skipped_deps > 0) {
        deps.length = skipped_deps + new_deps.length
        for (i = 0; i < new_deps.length; i++) deps[skipped_deps + i] = new_deps[i]
      } else reaction.deps = deps = new_deps
      if (effect_tracking() && (reaction.f & CONNECTED) !== 0)
        for (i = skipped_deps; i < deps.length; i++) (deps[i].reactions ??= []).push(reaction)
    } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
      remove_reactions(reaction, skipped_deps)
      deps.length = skipped_deps
    }
    if (
      is_runes() &&
      untracked_writes !== null &&
      !untracking &&
      deps !== null &&
      (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0
    )
      for (i = 0; i < untracked_writes.length; i++)
        schedule_possible_effect_self_invalidation(untracked_writes[i], reaction)
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++
      if (previous_reaction.deps !== null)
        for (let i = 0; i < previous_skipped_deps; i += 1)
          previous_reaction.deps[i].rv = read_version
      if (previous_deps !== null) for (const dep of previous_deps) dep.rv = read_version
      if (untracked_writes !== null)
        if (previous_untracked_writes === null) previous_untracked_writes = untracked_writes
        else previous_untracked_writes.push(...untracked_writes)
    }
    if ((reaction.f & ERROR_VALUE) !== 0) reaction.f ^= ERROR_VALUE
    return result
  } catch (error) {
    return handle_error(error)
  } finally {
    reaction.f ^= REACTION_IS_UPDATING
    new_deps = previous_deps
    skipped_deps = previous_skipped_deps
    untracked_writes = previous_untracked_writes
    active_reaction = previous_reaction
    current_sources = previous_sources
    set_component_context(previous_component_context)
    untracking = previous_untracking
    update_version = previous_update_version
  }
}
/**
 * @template V
 * @param {Reaction} signal
 * @param {Value<V>} dependency
 * @returns {void}
 */
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions
  if (reactions !== null) {
    var index = index_of.call(reactions, signal)
    if (index !== -1) {
      var new_length = reactions.length - 1
      if (new_length === 0) reactions = dependency.reactions = null
      else {
        reactions[index] = reactions[new_length]
        reactions.pop()
      }
    }
  }
  if (
    reactions === null &&
    (dependency.f & DERIVED) !== 0 &&
    (new_deps === null || !includes.call(new_deps, dependency))
  ) {
    var derived = dependency
    if ((derived.f & CONNECTED) !== 0) {
      derived.f ^= CONNECTED
      derived.f &= ~WAS_MARKED
    }
    update_derived_status(derived)
    freeze_derived_effects(derived)
    remove_reactions(derived, 0)
  }
}
/**
 * @param {Reaction} signal
 * @param {number} start_index
 * @returns {void}
 */
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps
  if (dependencies === null) return
  for (var i = start_index; i < dependencies.length; i++) remove_reaction(signal, dependencies[i])
}
/**
 * @param {Effect} effect
 * @returns {void}
 */
function update_effect(effect) {
  var flags = effect.f
  if ((flags & DESTROYED) !== 0) return
  set_signal_status(effect, CLEAN)
  var previous_effect = active_effect
  var was_updating_effect = is_updating_effect
  active_effect = effect
  is_updating_effect = true
  if (dev_fallback_default) {
    var previous_component_fn = dev_current_component_function
    set_dev_current_component_function(effect.component_function)
    var previous_stack = dev_stack
    set_dev_stack(effect.dev_stack ?? dev_stack)
  }
  try {
    if ((flags & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) destroy_block_effect_children(effect)
    else destroy_effect_children(effect)
    execute_effect_teardown(effect)
    var teardown = update_reaction(effect)
    effect.teardown = typeof teardown === 'function' ? teardown : null
    effect.wv = write_version
    if (
      dev_fallback_default &&
      tracing_mode_flag &&
      (effect.f & DIRTY) !== 0 &&
      effect.deps !== null
    ) {
      for (var dep of effect.deps)
        if (dep.set_during_effect) {
          dep.wv = increment_write_version()
          dep.set_during_effect = false
        }
    }
  } finally {
    is_updating_effect = was_updating_effect
    active_effect = previous_effect
    if (dev_fallback_default) {
      set_dev_current_component_function(previous_component_fn)
      set_dev_stack(previous_stack)
    }
  }
}
/**
 * Returns a promise that resolves once any pending state changes have been applied.
 * @returns {Promise<void>}
 */
async function tick() {
  if (async_mode_flag)
    return new Promise(f => {
      requestAnimationFrame(() => f())
      setTimeout(() => f())
    })
  await Promise.resolve()
  flushSync()
}
/**
 * Returns a promise that resolves once any state changes, and asynchronous work resulting from them,
 * have resolved and the DOM has been updated
 * @returns {Promise<void>}
 * @since 5.36
 */
function settled() {
  return Batch.ensure().settled()
}
/**
 * @template V
 * @param {Value<V>} signal
 * @returns {V}
 */
function get$1(signal) {
  var is_derived = (signal.f & DERIVED) !== 0
  captured_signals?.add(signal)
  if (active_reaction !== null && !untracking) {
    if (
      !(active_effect !== null && (active_effect.f & DESTROYED) !== 0) &&
      (current_sources === null || !includes.call(current_sources, signal))
    ) {
      var deps = active_reaction.deps
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version
          if (new_deps === null && deps !== null && deps[skipped_deps] === signal) skipped_deps++
          else if (new_deps === null) new_deps = [signal]
          else new_deps.push(signal)
        }
      } else {
        ;(active_reaction.deps ??= []).push(signal)
        var reactions = signal.reactions
        if (reactions === null) signal.reactions = [active_reaction]
        else if (!includes.call(reactions, active_reaction)) reactions.push(active_reaction)
      }
    }
  }
  if (dev_fallback_default) {
    recent_async_deriveds.delete(signal)
    if (
      tracing_mode_flag &&
      !untracking &&
      tracing_expressions !== null &&
      active_reaction !== null &&
      tracing_expressions.reaction === active_reaction
    )
      if (signal.trace) signal.trace()
      else {
        var trace = get_error('traced at')
        if (trace) {
          var entry = tracing_expressions.entries.get(signal)
          if (entry === void 0) {
            entry = { traces: [] }
            tracing_expressions.entries.set(signal, entry)
          }
          var last = entry.traces[entry.traces.length - 1]
          if (trace.stack !== last?.stack) entry.traces.push(trace)
        }
      }
  }
  if (is_destroying_effect && old_values.has(signal)) return old_values.get(signal)
  if (is_derived) {
    var derived = signal
    if (is_destroying_effect) {
      var value = derived.v
      if (
        ((derived.f & CLEAN) === 0 && derived.reactions !== null) ||
        depends_on_old_values(derived)
      )
        value = execute_derived(derived)
      old_values.set(derived, value)
      return value
    }
    var should_connect =
      (derived.f & CONNECTED) === 0 &&
      !untracking &&
      active_reaction !== null &&
      (is_updating_effect || (active_reaction.f & CONNECTED) !== 0)
    var is_new = (derived.f & REACTION_RAN) === 0
    if (is_dirty(derived)) {
      if (should_connect) derived.f |= CONNECTED
      update_derived(derived)
    }
    if (should_connect && !is_new) {
      unfreeze_derived_effects(derived)
      reconnect(derived)
    }
  }
  if (batch_values?.has(signal)) return batch_values.get(signal)
  if ((signal.f & ERROR_VALUE) !== 0) throw signal.v
  return signal.v
}
/**
 * (Re)connect a disconnected derived, so that it is notified
 * of changes in `mark_reactions`
 * @param {Derived} derived
 */
function reconnect(derived) {
  derived.f |= CONNECTED
  if (derived.deps === null) return
  for (const dep of derived.deps) {
    ;(dep.reactions ??= []).push(derived)
    if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
      unfreeze_derived_effects(dep)
      reconnect(dep)
    }
  }
}
/** @param {Derived} derived */
function depends_on_old_values(derived) {
  if (derived.v === UNINITIALIZED) return true
  if (derived.deps === null) return false
  for (const dep of derived.deps) {
    if (old_values.has(dep)) return true
    if ((dep.f & DERIVED) !== 0 && depends_on_old_values(dep)) return true
  }
  return false
}
/**
 * Like `get`, but checks for `undefined`. Used for `var` declarations because they can be accessed before being declared
 * @template V
 * @param {Value<V> | undefined} signal
 * @returns {V | undefined}
 */
function safe_get(signal) {
  return signal && get$1(signal)
}
/**
 * When used inside a [`$derived`](https://svelte.dev/docs/svelte/$derived) or [`$effect`](https://svelte.dev/docs/svelte/$effect),
 * any state read inside `fn` will not be treated as a dependency.
 *
 * ```ts
 * $effect(() => {
 *   // this will run when `data` changes, but not when `time` changes
 *   save(data, {
 *     timestamp: untrack(() => time)
 *   });
 * });
 * ```
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function untrack(fn) {
  var previous_untracking = untracking
  try {
    untracking = true
    return fn()
  } finally {
    untracking = previous_untracking
  }
}
/**
 * Possibly traverse an object and read all its properties so that they're all reactive in case this is `$state`.
 * Does only check first level of an object for performance reasons (heuristic should be good for 99% of all cases).
 * @param {any} value
 * @returns {void}
 */
function deep_read_state(value) {
  if (typeof value !== 'object' || !value || value instanceof EventTarget) return
  if (STATE_SYMBOL in value) deep_read(value)
  else if (!Array.isArray(value))
    for (let key in value) {
      const prop = value[key]
      if (typeof prop === 'object' && prop && STATE_SYMBOL in prop) deep_read(prop)
    }
}
/**
 * Deeply traverse an object and read all its properties
 * so that they're all reactive in case this is `$state`
 * @param {any} value
 * @param {Set<any>} visited
 * @returns {void}
 */
function deep_read(value, visited = /* @__PURE__ */ new Set()) {
  if (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof EventTarget) &&
    !visited.has(value)
  ) {
    visited.add(value)
    if (value instanceof Date) value.getTime()
    for (let key in value)
      try {
        deep_read(value[key], visited)
      } catch (e) {}
    const proto = get_prototype_of(value)
    if (
      proto !== Object.prototype &&
      proto !== Array.prototype &&
      proto !== Map.prototype &&
      proto !== Set.prototype &&
      proto !== Date.prototype
    ) {
      const descriptors = get_descriptors(proto)
      for (let key in descriptors) {
        const get = descriptors[key].get
        if (get)
          try {
            get.call(value)
          } catch (e) {}
      }
    }
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/attachments/index.js
/**
 * Creates an object key that will be recognised as an attachment when the object is spread onto an element,
 * as a programmatic alternative to using `{@attach ...}`. This can be useful for library authors, though
 * is generally not needed when building an app.
 *
 * ```svelte
 * <script>
 * 	import { createAttachmentKey } from 'svelte/attachments';
 *
 * 	const props = {
 * 		class: 'cool',
 * 		onclick: () => alert('clicked'),
 * 		[createAttachmentKey()]: (node) => {
 * 			node.textContent = 'attached!';
 * 		}
 * 	};
 * <\/script>
 *
 * <button {...props}>click me</button>
 * ```
 * @since 5.29
 */
function createAttachmentKey() {
  return Symbol(ATTACHMENT_KEY)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/utils.js
const regex_return_characters = /\r/g
/**
 * @param {string} str
 * @returns {string}
 */
function hash(str) {
  str = str.replace(regex_return_characters, '')
  let hash = 5381
  let i = str.length
  while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i)
  return (hash >>> 0).toString(36)
}
const VOID_ELEMENT_NAMES = [
  'area',
  'base',
  'br',
  'col',
  'command',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]
/**
 * Returns `true` if `name` is of a void element
 * @param {string} name
 */
function is_void(name) {
  return VOID_ELEMENT_NAMES.includes(name) || name.toLowerCase() === '!doctype'
}
/**
 * @param {string} name
 */
function is_capture_event(name) {
  return name.endsWith('capture') && name !== 'gotpointercapture' && name !== 'lostpointercapture'
}
/** List of Element events that will be delegated */
const DELEGATED_EVENTS = [
  'beforeinput',
  'click',
  'change',
  'dblclick',
  'contextmenu',
  'focusin',
  'focusout',
  'input',
  'keydown',
  'keyup',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'pointerdown',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerup',
  'touchend',
  'touchmove',
  'touchstart'
]
/**
 * Returns `true` if `event_name` is a delegated event
 * @param {string} event_name
 */
function can_delegate_event(event_name) {
  return DELEGATED_EVENTS.includes(event_name)
}
/**
 * Attributes that are boolean, i.e. they are present or not present.
 */
const DOM_BOOLEAN_ATTRIBUTES = [
  'allowfullscreen',
  'async',
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'default',
  'disabled',
  'formnovalidate',
  'indeterminate',
  'inert',
  'ismap',
  'loop',
  'multiple',
  'muted',
  'nomodule',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'seamless',
  'selected',
  'webkitdirectory',
  'defer',
  'disablepictureinpicture',
  'disableremoteplayback'
]
/**
 * @type {Record<string, string>}
 * List of attribute names that should be aliased to their property names
 * because they behave differently between setting them as an attribute and
 * setting them as a property.
 */
const ATTRIBUTE_ALIASES = {
  formnovalidate: 'formNoValidate',
  ismap: 'isMap',
  nomodule: 'noModule',
  playsinline: 'playsInline',
  readonly: 'readOnly',
  defaultvalue: 'defaultValue',
  defaultchecked: 'defaultChecked',
  srcobject: 'srcObject',
  novalidate: 'noValidate',
  allowfullscreen: 'allowFullscreen',
  disablepictureinpicture: 'disablePictureInPicture',
  disableremoteplayback: 'disableRemotePlayback'
}
/**
 * @param {string} name
 */
function normalize_attribute(name) {
  name = name.toLowerCase()
  return ATTRIBUTE_ALIASES[name] ?? name
}
const DOM_PROPERTIES = [
  ...DOM_BOOLEAN_ATTRIBUTES,
  'formNoValidate',
  'isMap',
  'noModule',
  'playsInline',
  'readOnly',
  'value',
  'volume',
  'defaultValue',
  'defaultChecked',
  'srcObject',
  'noValidate',
  'allowFullscreen',
  'disablePictureInPicture',
  'disableRemotePlayback'
]
/**
 * Subset of delegated events which should be passive by default.
 * These two are already passive via browser defaults on window, document and body.
 * But since
 * - we're delegating them
 * - they happen often
 * - they apply to mobile which is generally less performant
 * we're marking them as passive by default for other elements, too.
 */
const PASSIVE_EVENTS = ['touchstart', 'touchmove']
/**
 * Returns `true` if `name` is a passive event
 * @param {string} name
 */
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name)
}
const STATE_CREATION_RUNES = ['$state', '$state.raw', '$derived', '$derived.by']
const RUNES = [
  ...STATE_CREATION_RUNES,
  '$state.eager',
  '$state.snapshot',
  '$props',
  '$props.id',
  '$bindable',
  '$effect',
  '$effect.pre',
  '$effect.tracking',
  '$effect.root',
  '$effect.pending',
  '$inspect',
  '$inspect().with',
  '$inspect.trace',
  '$host'
]
/** List of elements that require raw contents and should not have SSR comments put in them */
const RAW_TEXT_ELEMENTS = ['textarea', 'script', 'style', 'title']
/** @param {string} name */
function is_raw_text_element(name) {
  return RAW_TEXT_ELEMENTS.includes(name)
}
/**
 * Prevent devtools trying to make `location` a clickable link by inserting a zero-width space
 * @template {string | undefined} T
 * @param {T} location
 * @returns {T};
 */
function sanitize_location(location) {
  return location?.replace(/\//g, '/​')
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/assign.js
/**
 *
 * @param {any} a
 * @param {any} b
 * @param {string} property
 * @param {string} location
 */
function compare(a, b, property, location) {
  if (a !== b && typeof b === 'object' && STATE_SYMBOL in b)
    assignment_value_stale(property, sanitize_location(location))
  return a
}
/**
 * @param {any} object
 * @param {string} property
 * @param {any} value
 * @param {string} location
 */
function assign(object, property, value, location) {
  return compare(
    (object[property] = value),
    untrack(() => object[property]),
    property,
    location
  )
}
/**
 * @param {any} object
 * @param {string} property
 * @param {any} value
 * @param {string} location
 */
function assign_and(object, property, value, location) {
  return compare(
    (object[property] &&= value),
    untrack(() => object[property]),
    property,
    location
  )
}
/**
 * @param {any} object
 * @param {string} property
 * @param {any} value
 * @param {string} location
 */
function assign_or(object, property, value, location) {
  return compare(
    (object[property] ||= value),
    untrack(() => object[property]),
    property,
    location
  )
}
/**
 * @param {any} object
 * @param {string} property
 * @param {any} value
 * @param {string} location
 */
function assign_nullish(object, property, value, location) {
  return compare(
    (object[property] ??= value),
    untrack(() => object[property]),
    property,
    location
  )
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/css.js
/** @type {Map<String, Set<HTMLStyleElement>>} */
var all_styles = /* @__PURE__ */ new Map()
/**
 * @param {String} hash
 * @param {HTMLStyleElement} style
 */
function register_style(hash, style) {
  var styles = all_styles.get(hash)
  if (!styles) {
    styles = /* @__PURE__ */ new Set()
    all_styles.set(hash, styles)
  }
  styles.add(style)
}
/**
 * @param {String} hash
 */
function cleanup_styles(hash) {
  var styles = all_styles.get(hash)
  if (!styles) return
  for (const style of styles) style.remove()
  all_styles.delete(hash)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/elements.js
/** @import { SourceLocation } from '#client' */
/**
 * @param {any} fn
 * @param {string} filename
 * @param {SourceLocation[]} locations
 * @returns {any}
 */
function add_locations(fn, filename, locations) {
  return (...args) => {
    const dom = fn(...args)
    assign_locations(
      hydrating ? dom : dom.nodeType === DOCUMENT_FRAGMENT_NODE ? dom.firstChild : dom,
      filename,
      locations
    )
    return dom
  }
}
/**
 * @param {Element} element
 * @param {string} filename
 * @param {SourceLocation} location
 */
function assign_location(element, filename, location) {
  element.__svelte_meta = {
    parent: dev_stack,
    loc: {
      file: filename,
      line: location[0],
      column: location[1]
    }
  }
  if (location[2]) assign_locations(element.firstChild, filename, location[2])
}
/**
 * @param {Node | null} node
 * @param {string} filename
 * @param {SourceLocation[]} locations
 */
function assign_locations(node, filename, locations) {
  var i = 0
  var depth = 0
  while (node && i < locations.length) {
    if (hydrating && node.nodeType === COMMENT_NODE) {
      var comment = node
      if (comment.data[0] === HYDRATION_START) depth += 1
      else if (comment.data[0] === HYDRATION_END) depth -= 1
    }
    if (depth === 0 && node.nodeType === ELEMENT_NODE)
      assign_location(node, filename, locations[i++])
    node = node.nextSibling
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/events.js
/**
 * Used on elements, as a map of event type -> event handler,
 * and on events themselves to track which element handled an event
 */
const event_symbol = Symbol('events')
/** @type {Set<string>} */
const all_registered_events = /* @__PURE__ */ new Set()
/** @type {Set<(events: Array<string>) => void>} */
const root_event_handles = /* @__PURE__ */ new Set()
/**
 * SSR adds onload and onerror attributes to catch those events before the hydration.
 * This function detects those cases, removes the attributes and replays the events.
 * @param {HTMLElement} dom
 */
function replay_events(dom) {
  if (!hydrating) return
  dom.removeAttribute('onload')
  dom.removeAttribute('onerror')
  const event = dom.__e
  if (event !== void 0) {
    dom.__e = void 0
    queueMicrotask(() => {
      if (dom.isConnected) dom.dispatchEvent(event)
    })
  }
}
/**
 * @param {string} event_name
 * @param {EventTarget} dom
 * @param {EventListener} [handler]
 * @param {AddEventListenerOptions} [options]
 */
function create_event(event_name, dom, handler, options = {}) {
  /**
   * @this {EventTarget}
   */
  function target_handler(event) {
    if (!options.capture) handle_event_propagation.call(dom, event)
    if (!event.cancelBubble)
      return without_reactive_context(() => {
        return handler?.call(this, event)
      })
  }
  if (event_name.startsWith('pointer') || event_name.startsWith('touch') || event_name === 'wheel')
    queue_micro_task(() => {
      dom.addEventListener(event_name, target_handler, options)
    })
  else dom.addEventListener(event_name, target_handler, options)
  return target_handler
}
/**
 * @param {string} event_name
 * @param {Element} dom
 * @param {EventListener} [handler]
 * @param {boolean} [capture]
 * @param {boolean} [passive]
 * @returns {void}
 */
function event(event_name, dom, handler, capture, passive) {
  var options = {
    capture,
    passive
  }
  var target_handler = create_event(event_name, dom, handler, options)
  if (
    dom === document.body ||
    dom === window ||
    dom === document ||
    dom instanceof HTMLMediaElement
  )
    teardown(() => {
      dom.removeEventListener(event_name, target_handler, options)
    })
}
/**
 * @param {string} event_name
 * @param {Element} element
 * @param {EventListener} [handler]
 * @returns {void}
 */
function delegated(event_name, element, handler) {
  ;(element[event_symbol] ??= {})[event_name] = handler
}
/**
 * @param {Array<string>} events
 * @returns {void}
 */
function delegate(events) {
  for (var i = 0; i < events.length; i++) all_registered_events.add(events[i])
  for (var fn of root_event_handles) fn(events)
}
let last_propagated_event = null
/**
 * @this {EventTarget}
 * @param {Event} event
 * @returns {void}
 */
function handle_event_propagation(event) {
  var handler_element = this
  var owner_document = handler_element.ownerDocument
  var event_name = event.type
  var path = event.composedPath?.() || []
  var current_target = path[0] || event.target
  last_propagated_event = event
  var path_idx = 0
  var handled_at = last_propagated_event === event && event[event_symbol]
  if (handled_at) {
    var at_idx = path.indexOf(handled_at)
    if (at_idx !== -1 && (handler_element === document || handler_element === window)) {
      event[event_symbol] = handler_element
      return
    }
    var handler_idx = path.indexOf(handler_element)
    if (handler_idx === -1) return
    if (at_idx <= handler_idx) path_idx = at_idx
  }
  current_target = path[path_idx] || event.target
  if (current_target === handler_element) return
  define_property(event, 'currentTarget', {
    configurable: true,
    get() {
      return current_target || owner_document
    }
  })
  var previous_reaction = active_reaction
  var previous_effect = active_effect
  set_active_reaction(null)
  set_active_effect(null)
  try {
    /**
     * @type {unknown}
     */
    var throw_error
    /**
     * @type {unknown[]}
     */
    var other_errors = []
    while (current_target !== null) {
      /** @type {null | Element} */
      var parent_element =
        current_target.assignedSlot || current_target.parentNode || current_target.host || null
      try {
        var delegated = current_target[event_symbol]?.[event_name]
        if (delegated != null && (!current_target.disabled || event.target === current_target))
          delegated.call(current_target, event)
      } catch (error) {
        if (throw_error) other_errors.push(error)
        else throw_error = error
      }
      if (event.cancelBubble || parent_element === handler_element || parent_element === null) break
      current_target = parent_element
    }
    if (throw_error) {
      for (let error of other_errors)
        queueMicrotask(() => {
          throw error
        })
      throw throw_error
    }
  } finally {
    event[event_symbol] = handler_element
    delete event.currentTarget
    set_active_reaction(previous_reaction)
    set_active_effect(previous_effect)
  }
}
/**
 * In dev, warn if an event handler is not a function, as it means the
 * user probably called the handler or forgot to add a `() =>`
 * @param {() => (event: Event, ...args: any) => void} thunk
 * @param {EventTarget} element
 * @param {[Event, ...any]} args
 * @param {any} component
 * @param {[number, number]} [loc]
 * @param {boolean} [remove_parens]
 */
function apply(
  thunk,
  element,
  args,
  component,
  loc,
  has_side_effects = false,
  remove_parens = false
) {
  let handler
  let error
  try {
    handler = thunk()
  } catch (e) {
    error = e
  }
  if (typeof handler !== 'function' && (has_side_effects || handler != null || error)) {
    const filename = component?.[FILENAME]
    const location = loc ? ` at ${filename}:${loc[0]}:${loc[1]}` : ` in ${filename}`
    const phase = args[0]?.eventPhase < Event.BUBBLING_PHASE ? 'capture' : ''
    const description = `\`${args[0]?.type + phase}\` handler${location}`
    const suggestion = remove_parens ? 'remove the trailing `()`' : 'add a leading `() =>`'
    event_handler_invalid(description, suggestion)
    if (error) throw error
  }
  handler?.apply(element, args)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/reconciler.js
const policy =
  globalThis?.window?.trustedTypes &&
  /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy('svelte-trusted-html', {
    createHTML: html => {
      return html
    }
  })
/** @param {string} html */
function create_trusted_html(html) {
  return policy?.createHTML(html) ?? html
}
/**
 * @param {string} html
 */
function create_fragment_from_html(html) {
  var elem = create_element('template')
  elem.innerHTML = create_trusted_html(html.replaceAll('<!>', '<!---->'))
  return elem.content
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/template.js
/** @import { Effect, EffectNodes, TemplateNode } from '#client' */
/** @import { TemplateStructure } from './types' */
const TEMPLATE_TAG = IS_XHTML ? 'template' : 'TEMPLATE'
const SCRIPT_TAG = IS_XHTML ? 'script' : 'SCRIPT'
/**
 * @param {TemplateNode} start
 * @param {TemplateNode | null} end
 */
function assign_nodes(start, end) {
  var effect = active_effect
  if (effect.nodes === null)
    effect.nodes = {
      start,
      end,
      a: null,
      t: null
    }
}
/**
 * @param {string} content
 * @param {number} flags
 * @returns {() => Node | Node[]}
 */
/* @__NO_SIDE_EFFECTS__ */
function from_html(content, flags) {
  var is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0
  var use_import_node = (flags & TEMPLATE_USE_IMPORT_NODE) !== 0
  /** @type {Node} */
  var node
  /**
   * Whether or not the first item is a text/element node. If not, we need to
   * create an additional comment node to act as `effect.nodes.start`
   */
  var has_start = !content.startsWith('<!>')
  return () => {
    if (hydrating) {
      assign_nodes(hydrate_node, null)
      return hydrate_node
    }
    if (node === void 0) {
      node = create_fragment_from_html(has_start ? content : '<!>' + content)
      if (!is_fragment) node = /* @__PURE__ */ get_first_child(node)
    }
    var clone =
      use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
    if (is_fragment) {
      var start = /* @__PURE__ */ get_first_child(clone)
      var end = clone.lastChild
      assign_nodes(start, end)
    } else assign_nodes(clone, clone)
    return clone
  }
}
/**
 * @param {string} content
 * @param {number} flags
 * @param {'svg' | 'math'} ns
 * @returns {() => Node | Node[]}
 */
/* @__NO_SIDE_EFFECTS__ */
function from_namespace(content, flags, ns = 'svg') {
  /**
   * Whether or not the first item is a text/element node. If not, we need to
   * create an additional comment node to act as `effect.nodes.start`
   */
  var has_start = !content.startsWith('<!>')
  var is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0
  var wrapped = `<${ns}>${has_start ? content : '<!>' + content}</${ns}>`
  /** @type {Element | DocumentFragment} */
  var node
  return () => {
    if (hydrating) {
      assign_nodes(hydrate_node, null)
      return hydrate_node
    }
    if (!node) {
      var root = /* @__PURE__ */ get_first_child(create_fragment_from_html(wrapped))
      if (is_fragment) {
        node = document.createDocumentFragment()
        while (/* @__PURE__ */ get_first_child(root))
          node.appendChild(/* @__PURE__ */ get_first_child(root))
      } else node = /* @__PURE__ */ get_first_child(root)
    }
    var clone = node.cloneNode(true)
    if (is_fragment) {
      var start = /* @__PURE__ */ get_first_child(clone)
      var end = clone.lastChild
      assign_nodes(start, end)
    } else assign_nodes(clone, clone)
    return clone
  }
}
/**
 * @param {string} content
 * @param {number} flags
 */
/* @__NO_SIDE_EFFECTS__ */
function from_svg(content, flags) {
  return /* @__PURE__ */ from_namespace(content, flags, 'svg')
}
/**
 * @param {string} content
 * @param {number} flags
 */
/* @__NO_SIDE_EFFECTS__ */
function from_mathml(content, flags) {
  return /* @__PURE__ */ from_namespace(content, flags, 'math')
}
/**
 * @param {TemplateStructure[]} structure
 * @param {typeof NAMESPACE_SVG | typeof NAMESPACE_MATHML | undefined} [ns]
 */
function fragment_from_tree(structure, ns) {
  var fragment = create_fragment()
  for (var item of structure) {
    if (typeof item === 'string') {
      fragment.append(create_text(item))
      continue
    }
    if (item === void 0 || item[0][0] === '/') {
      fragment.append(create_comment(item ? item[0].slice(3) : ''))
      continue
    }
    const [name, attributes, ...children] = item
    const namespace = name === 'svg' ? NAMESPACE_SVG : name === 'math' ? NAMESPACE_MATHML : ns
    var element = create_element(name, namespace, attributes?.is)
    for (var key in attributes) set_attribute$1(element, key, attributes[key])
    if (children.length > 0)
      (element.nodeName === TEMPLATE_TAG ? element.content : element).append(
        fragment_from_tree(children, element.nodeName === 'foreignObject' ? void 0 : namespace)
      )
    fragment.append(element)
  }
  return fragment
}
/**
 * @param {TemplateStructure[]} structure
 * @param {number} flags
 * @returns {() => Node | Node[]}
 */
/* @__NO_SIDE_EFFECTS__ */
function from_tree(structure, flags) {
  var is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0
  var use_import_node = (flags & TEMPLATE_USE_IMPORT_NODE) !== 0
  /** @type {Node} */
  var node
  return () => {
    if (hydrating) {
      assign_nodes(hydrate_node, null)
      return hydrate_node
    }
    if (node === void 0) {
      node = fragment_from_tree(
        structure,
        (flags & TEMPLATE_USE_SVG) !== 0
          ? NAMESPACE_SVG
          : (flags & TEMPLATE_USE_MATHML) !== 0
            ? NAMESPACE_MATHML
            : void 0
      )
      if (!is_fragment) node = /* @__PURE__ */ get_first_child(node)
    }
    var clone =
      use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
    if (is_fragment) {
      var start = /* @__PURE__ */ get_first_child(clone)
      var end = clone.lastChild
      assign_nodes(start, end)
    } else assign_nodes(clone, clone)
    return clone
  }
}
/**
 * @param {() => Element | DocumentFragment} fn
 */
function with_script(fn) {
  return () => run_scripts(fn())
}
/**
 * Creating a document fragment from HTML that contains script tags will not execute
 * the scripts. We need to replace the script tags with new ones so that they are executed.
 * @param {Element | DocumentFragment} node
 * @returns {Node | Node[]}
 */
function run_scripts(node) {
  if (hydrating) return node
  const is_fragment = node.nodeType === DOCUMENT_FRAGMENT_NODE
  const scripts = node.nodeName === SCRIPT_TAG ? [node] : node.querySelectorAll('script')
  const effect = active_effect
  for (const script of scripts) {
    const clone = create_element('script')
    for (var attribute of script.attributes) clone.setAttribute(attribute.name, attribute.value)
    clone.textContent = script.textContent
    if (is_fragment ? node.firstChild === script : node === script) effect.nodes.start = clone
    if (is_fragment ? node.lastChild === script : node === script) effect.nodes.end = clone
    script.replaceWith(clone)
  }
  return node
}
/**
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @param {any} value
 */
function text(value = '') {
  if (!hydrating) {
    var t = create_text(value + '')
    assign_nodes(t, t)
    return t
  }
  var node = hydrate_node
  if (node.nodeType !== TEXT_NODE) {
    node.before((node = create_text()))
    set_hydrate_node(node)
  } else merge_text_nodes(node)
  assign_nodes(node, node)
  return node
}
/**
 * @returns {TemplateNode | DocumentFragment}
 */
function comment() {
  if (hydrating) {
    assign_nodes(hydrate_node, null)
    return hydrate_node
  }
  var frag = document.createDocumentFragment()
  var start = document.createComment('')
  var anchor = create_text()
  frag.append(start, anchor)
  assign_nodes(start, anchor)
  return frag
}
/**
 * Assign the created (or in hydration mode, traversed) dom elements to the current block
 * and insert the elements into the dom (in client mode).
 * @param {Text | Comment | Element} anchor
 * @param {DocumentFragment | Element} dom
 */
function append(anchor, dom) {
  if (hydrating) {
    var effect = active_effect
    if ((effect.f & REACTION_RAN) === 0 || effect.nodes.end === null)
      effect.nodes.end = hydrate_node
    hydrate_next()
    return
  }
  if (anchor === null) return
  anchor.before(dom)
}
/**
 * Create (or hydrate) an unique UID for the component instance.
 */
function props_id() {
  if (
    hydrating &&
    hydrate_node &&
    hydrate_node.nodeType === COMMENT_NODE &&
    hydrate_node.textContent?.startsWith(`$`)
  ) {
    const id = hydrate_node.textContent.substring(1)
    hydrate_next()
    return id
  }
  ;(window.__svelte ??= {}).uid ??= 1
  return `c${window.__svelte.uid++}`
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/render.js
/** @import { ComponentContext, Effect, EffectNodes, TemplateNode } from '#client' */
/** @import { Component, ComponentType, SvelteComponent, MountOptions } from '../../index.js' */
/**
 * This is normally true — block effects should run their intro transitions —
 * but is false during hydration (unless `options.intro` is `true`) and
 * when creating the children of a `<svelte:element>` that just changed tag
 */
let should_intro = true
/** @param {boolean} value */
function set_should_intro(value) {
  should_intro = value
}
/**
 * @param {Element} text
 * @param {string} value
 * @returns {void}
 */
function set_text(text, value) {
  var str = value == null ? '' : typeof value === 'object' ? `${value}` : value
  if (str !== (text.__t ??= text.nodeValue)) {
    text.__t = str
    text.nodeValue = `${str}`
  }
}
/**
 * Mounts a component to the given target and returns the exports and potentially the props (if compiled with `accessors: true`) of the component.
 * Transitions will play during the initial render unless the `intro` option is set to `false`.
 *
 * @template {Record<string, any>} Props
 * @template {Record<string, any>} Exports
 * @param {ComponentType<SvelteComponent<Props>> | Component<Props, Exports, any>} component
 * @param {MountOptions<Props>} options
 * @returns {Exports}
 */
function mount(component, options) {
  return _mount(component, options)
}
/**
 * Hydrates a component on the given target and returns the exports and potentially the props (if compiled with `accessors: true`) of the component
 *
 * @template {Record<string, any>} Props
 * @template {Record<string, any>} Exports
 * @param {ComponentType<SvelteComponent<Props>> | Component<Props, Exports, any>} component
 * @param {{} extends Props ? {
 * 		target: Document | Element | ShadowRoot;
 * 		props?: Props;
 * 		events?: Record<string, (e: any) => any>;
 *  	context?: Map<any, any>;
 * 		intro?: boolean;
 * 		recover?: boolean;
 *		transformError?: (error: unknown) => unknown;
 * 	} : {
 * 		target: Document | Element | ShadowRoot;
 * 		props: Props;
 * 		events?: Record<string, (e: any) => any>;
 *  	context?: Map<any, any>;
 * 		intro?: boolean;
 * 		recover?: boolean;
 *		transformError?: (error: unknown) => unknown;
 * 	}} options
 * @returns {Exports}
 */
function hydrate(component, options) {
  init_operations()
  options.intro = options.intro ?? false
  const target = options.target
  const was_hydrating = hydrating
  const previous_hydrate_node = hydrate_node
  try {
    var anchor = /* @__PURE__ */ get_first_child(target)
    while (anchor && (anchor.nodeType !== COMMENT_NODE || anchor.data !== HYDRATION_START))
      anchor = /* @__PURE__ */ get_next_sibling(anchor)
    if (!anchor) throw HYDRATION_ERROR
    set_hydrating(true)
    set_hydrate_node(anchor)
    const instance = _mount(component, {
      ...options,
      anchor
    })
    set_hydrating(false)
    return instance
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.split('\n').some(line => line.startsWith('https://svelte.dev/e/'))
    )
      throw error
    if (error !== HYDRATION_ERROR) console.warn('Failed to hydrate: ', error)
    if (options.recover === false) hydration_failed()
    init_operations()
    clear_text_content(target)
    set_hydrating(false)
    return mount(component, options)
  } finally {
    set_hydrating(was_hydrating)
    set_hydrate_node(previous_hydrate_node)
  }
}
/** @type {Map<EventTarget, Map<string, number>>} */
const listeners = /* @__PURE__ */ new Map()
/**
 * @template {Record<string, any>} Exports
 * @param {ComponentType<SvelteComponent<any>> | Component<any>} Component
 * @param {MountOptions} options
 * @returns {Exports}
 */
function _mount(
  Component,
  { target, anchor, props = {}, events, context, intro = true, transformError }
) {
  init_operations()
  /** @type {Exports} */
  var component = void 0
  var unmount = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text())
    boundary(
      anchor_node,
      { pending: () => {} },
      anchor_node => {
        push({})
        var ctx = component_context
        if (context) ctx.c = context
        if (events) /** @type {any} */ props.$$events = events
        if (hydrating) assign_nodes(anchor_node, null)
        should_intro = intro
        component = Component(anchor_node, props) || {}
        should_intro = true
        if (hydrating) {
          /** @type {Effect & { nodes: EffectNodes }} */ active_effect.nodes.end = hydrate_node
          if (
            hydrate_node === null ||
            hydrate_node.nodeType !== COMMENT_NODE ||
            hydrate_node.data !== HYDRATION_END
          ) {
            hydration_mismatch()
            throw HYDRATION_ERROR
          }
        }
        pop()
      },
      transformError
    )
    /** @type {Set<string>} */
    var registered_events = /* @__PURE__ */ new Set()
    /** @param {Array<string>} events */
    var event_handle = events => {
      for (var i = 0; i < events.length; i++) {
        var event_name = events[i]
        if (registered_events.has(event_name)) continue
        registered_events.add(event_name)
        var passive = is_passive_event(event_name)
        for (const node of [target, document]) {
          var counts = listeners.get(node)
          if (counts === void 0) {
            counts = /* @__PURE__ */ new Map()
            listeners.set(node, counts)
          }
          var count = counts.get(event_name)
          if (count === void 0) {
            node.addEventListener(event_name, handle_event_propagation, { passive })
            counts.set(event_name, 1)
          } else counts.set(event_name, count + 1)
        }
      }
    }
    event_handle(array_from(all_registered_events))
    root_event_handles.add(event_handle)
    return () => {
      for (var event_name of registered_events)
        for (const node of [target, document]) {
          var counts = listeners.get(node)
          var count = counts.get(event_name)
          if (--count == 0) {
            node.removeEventListener(event_name, handle_event_propagation)
            counts.delete(event_name)
            if (counts.size === 0) listeners.delete(node)
          } else counts.set(event_name, count)
        }
      root_event_handles.delete(event_handle)
      if (anchor_node !== anchor) anchor_node.parentNode?.removeChild(anchor_node)
    }
  })
  mounted_components.set(component, unmount)
  return component
}
/**
 * References of the components that were mounted or hydrated.
 * Uses a `WeakMap` to avoid memory leaks.
 */
let mounted_components = /* @__PURE__ */ new WeakMap()
/**
 * Unmounts a component that was previously mounted using `mount` or `hydrate`.
 *
 * Since 5.13.0, if `options.outro` is `true`, [transitions](https://svelte.dev/docs/svelte/transition) will play before the component is removed from the DOM.
 *
 * Returns a `Promise` that resolves after transitions have completed if `options.outro` is true, or immediately otherwise (prior to 5.13.0, returns `void`).
 *
 * ```js
 * import { mount, unmount } from 'svelte';
 * import App from './App.svelte';
 *
 * const app = mount(App, { target: document.body });
 *
 * // later...
 * unmount(app, { outro: true });
 * ```
 * @param {Record<string, any>} component
 * @param {{ outro?: boolean }} [options]
 * @returns {Promise<void>}
 */
function unmount(component, options) {
  const fn = mounted_components.get(component)
  if (fn) {
    mounted_components.delete(component)
    return fn(options)
  }
  if (dev_fallback_default)
    if (STATE_SYMBOL in component) state_proxy_unmount()
    else lifecycle_double_unmount()
  return Promise.resolve()
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/hmr.js
/** @import { Effect, TemplateNode } from '#client' */
/**
 * @template {(anchor: Comment, props: any) => any} Component
 * @param {Component} fn
 */
function hmr(fn) {
  const current = source(fn)
  /**
   * @param {TemplateNode} anchor
   * @param {any} props
   */
  function wrapper(anchor, props) {
    let component = {}
    let instance = {}
    /** @type {Effect} */
    let effect
    let ran = false
    block(() => {
      if (component === (component = get$1(current))) return
      if (effect) {
        for (var k in instance) delete instance[k]
        destroy_effect(effect)
      }
      effect = branch(() => {
        if (ran) set_should_intro(false)
        Object.defineProperties(
          instance,
          Object.getOwnPropertyDescriptors(
            new.target ? new component(anchor, props) : component(anchor, props)
          )
        )
        if (ran) set_should_intro(true)
      })
    }, EFFECT_TRANSPARENT)
    ran = true
    if (hydrating) anchor = hydrate_node
    return instance
  }
  wrapper[FILENAME] = fn[FILENAME]
  wrapper[HMR] = {
    fn,
    current,
    update: incoming => {
      set(wrapper[HMR].current, incoming[HMR].fn)
      incoming[HMR].current = wrapper[HMR].current
    }
  }
  return wrapper
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/ownership.js
/** @typedef {{ file: string, line: number, column: number }} Location */
/**
 * Sets up a validator that
 * - traverses the path of a prop to find out if it is allowed to be mutated
 * - checks that the binding chain is not interrupted
 * @param {Record<string, any>} props
 */
function create_ownership_validator(props) {
  const component = component_context?.function
  const parent = component_context?.p?.function
  return {
    mutation: (prop, path, result, line, column) => {
      const name = path[0]
      if (is_bound_or_unset(props, name) || !parent) return result
      /** @type {any} */
      let value = props
      for (let i = 0; i < path.length - 1; i++) {
        value = value[path[i]]
        if (!value?.[STATE_SYMBOL]) return result
      }
      const location = sanitize_location(`${component[FILENAME]}:${line}:${column}`)
      ownership_invalid_mutation(name, location, prop, parent[FILENAME])
      return result
    },
    binding: (key, child_component, value) => {
      if (!is_bound_or_unset(props, key) && parent && value()?.[STATE_SYMBOL])
        ownership_invalid_binding(
          component[FILENAME],
          key,
          child_component[FILENAME],
          parent[FILENAME]
        )
    }
  }
}
/**
 * @param {Record<string, any>} props
 * @param {string} prop_name
 */
function is_bound_or_unset(props, prop_name) {
  const is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props
  return (
    !!get_descriptor(props, prop_name)?.set ||
    (is_entry_props && prop_name in props) ||
    !(prop_name in props)
  )
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/legacy.js
/** @param {Function & { [FILENAME]: string }} target */
function check_target(target) {
  if (target) component_api_invalid_new(target[FILENAME] ?? 'a component', target.name)
}
function legacy_api() {
  const component = component_context?.function
  /** @param {string} method */
  function error(method) {
    component_api_changed(method, component[FILENAME])
  }
  return {
    $destroy: () => error('$destroy()'),
    $on: () => error('$on(...)'),
    $set: () => error('$set(...)')
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/inspect.js
/**
 * @param {() => any[]} get_value
 * @param {Function} inspector
 * @param {boolean} show_stack
 */
function inspect(get_value, inspector, show_stack = false) {
  validate_effect('$inspect')
  let initial = true
  let error = UNINITIALIZED
  eager_effect(() => {
    try {
      var value = get_value()
    } catch (e) {
      error = e
      return
    }
    var snap = snapshot(value, true, true)
    untrack(() => {
      if (show_stack) {
        inspector(...snap)
        if (!initial) {
          const stack = get_error('$inspect(...)')
          if (stack) {
            console.groupCollapsed('stack trace')
            console.log(stack)
            console.groupEnd()
          }
        }
      } else inspector(initial ? 'init' : 'update', ...snap)
    })
    initial = false
  })
  render_effect(() => {
    try {
      get_value()
    } catch {}
    if (error !== UNINITIALIZED) {
      console.error(error)
      error = UNINITIALIZED
    }
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/async.js
/** @import { Blocker, TemplateNode, Value } from '#client' */
/**
 * @param {TemplateNode} node
 * @param {Blocker[]} blockers
 * @param {Array<() => Promise<any>>} expressions
 * @param {(anchor: TemplateNode, ...deriveds: Value[]) => void} fn
 */
function async(node, blockers = [], expressions = [], fn) {
  var was_hydrating = hydrating
  var end = null
  if (was_hydrating) {
    hydrate_next()
    end = skip_nodes(false)
  }
  if (expressions.length === 0 && blockers.every(b => b.settled)) {
    fn(node)
    if (was_hydrating) set_hydrate_node(end)
    return
  }
  const decrement_pending = increment_pending()
  if (was_hydrating) {
    var previous_hydrate_node = hydrate_node
    set_hydrate_node(end)
  }
  flatten(blockers, [], expressions, values => {
    if (was_hydrating) {
      set_hydrating(true)
      set_hydrate_node(previous_hydrate_node)
    }
    try {
      for (const d of values) get$1(d)
      fn(node, ...values)
    } finally {
      if (was_hydrating) set_hydrating(false)
      decrement_pending()
    }
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/validation.js
/**
 * @param {Node} anchor
 * @param {...(()=>any)[]} args
 */
function validate_snippet_args(anchor, ...args) {
  if (typeof anchor !== 'object' || !(anchor instanceof Node)) invalid_snippet_arguments()
  for (let arg of args) if (typeof arg !== 'function') invalid_snippet_arguments()
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/branches.js
/** @import { Effect, TemplateNode } from '#client' */
/**
 * @typedef {{ effect: Effect, fragment: DocumentFragment }} Branch
 */
/**
 * @template Key
 */
var BranchManager = class {
  /** @type {TemplateNode} */
  anchor
  /** @type {Map<Batch, Key>} */
  #batches = /* @__PURE__ */ new Map()
  /**
   * Map of keys to effects that are currently rendered in the DOM.
   * These effects are visible and actively part of the document tree.
   * Example:
   * ```
   * {#if condition}
   * 	foo
   * {:else}
   * 	bar
   * {/if}
   * ```
   * Can result in the entries `true->Effect` and `false->Effect`
   * @type {Map<Key, Effect>}
   */
  #onscreen = /* @__PURE__ */ new Map()
  /**
   * Similar to #onscreen with respect to the keys, but contains branches that are not yet
   * in the DOM, because their insertion is deferred.
   * @type {Map<Key, Branch>}
   */
  #offscreen = /* @__PURE__ */ new Map()
  /**
   * Keys of effects that are currently outroing
   * @type {Set<Key>}
   */
  #outroing = /* @__PURE__ */ new Set()
  /**
   * Whether to pause (i.e. outro) on change, or destroy immediately.
   * This is necessary for `<svelte:element>`
   */
  #transition = true
  /**
   * @param {TemplateNode} anchor
   * @param {boolean} transition
   */
  constructor(anchor, transition = true) {
    this.anchor = anchor
    this.#transition = transition
  }
  /**
   * @param {Batch} batch
   */
  #commit = batch => {
    if (!this.#batches.has(batch)) return
    var key = this.#batches.get(batch)
    var onscreen = this.#onscreen.get(key)
    if (onscreen) {
      resume_effect(onscreen)
      this.#outroing.delete(key)
    } else {
      var offscreen = this.#offscreen.get(key)
      if (offscreen && (offscreen.effect.f & INERT) === 0) {
        this.#onscreen.set(key, offscreen.effect)
        this.#offscreen.delete(key)
        /** @type {TemplateNode} */ offscreen.fragment.lastChild.remove()
        this.anchor.before(offscreen.fragment)
        onscreen = offscreen.effect
      }
    }
    for (const [b, k] of this.#batches) {
      this.#batches.delete(b)
      if (b === batch) break
      const offscreen = this.#offscreen.get(k)
      if (offscreen) {
        destroy_effect(offscreen.effect)
        this.#offscreen.delete(k)
      }
    }
    for (const [k, effect] of this.#onscreen) {
      if (k === key || this.#outroing.has(k)) continue
      if ((effect.f & INERT) !== 0) continue
      const on_destroy = () => {
        if (Array.from(this.#batches.values()).includes(k)) {
          var fragment = document.createDocumentFragment()
          move_effect(effect, fragment)
          fragment.append(create_text())
          this.#offscreen.set(k, {
            effect,
            fragment
          })
        } else destroy_effect(effect)
        this.#outroing.delete(k)
        this.#onscreen.delete(k)
      }
      if (this.#transition || !onscreen) {
        this.#outroing.add(k)
        pause_effect(effect, on_destroy, false)
      } else on_destroy()
    }
  }
  /**
   * @param {Batch} batch
   */
  #discard = batch => {
    this.#batches.delete(batch)
    const keys = Array.from(this.#batches.values())
    for (const [k, branch] of this.#offscreen)
      if (!keys.includes(k)) {
        destroy_effect(branch.effect)
        this.#offscreen.delete(k)
      }
  }
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(key, fn) {
    var batch = current_batch
    var defer = should_defer_append()
    if (fn && !this.#onscreen.has(key) && !this.#offscreen.has(key))
      if (defer) {
        var fragment = document.createDocumentFragment()
        var target = create_text()
        fragment.append(target)
        this.#offscreen.set(key, {
          effect: branch(() => fn(target)),
          fragment
        })
      } else
        this.#onscreen.set(
          key,
          branch(() => fn(this.anchor))
        )
    this.#batches.set(batch, key)
    if (defer) {
      for (const [k, effect] of this.#onscreen)
        if (k === key) batch.unskip_effect(effect)
        else batch.skip_effect(effect)
      for (const [k, branch] of this.#offscreen)
        if (k === key) batch.unskip_effect(branch.effect)
        else batch.skip_effect(branch.effect)
      batch.oncommit(this.#commit)
      batch.ondiscard(this.#discard)
    } else {
      if (hydrating) this.anchor = hydrate_node
      this.#commit(batch)
    }
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/await.js
/** @import { Source, TemplateNode } from '#client' */
const PENDING = 0
const THEN = 1
const CATCH = 2
/** @typedef {typeof PENDING | typeof THEN | typeof CATCH} AwaitState */
/**
 * @template V
 * @param {TemplateNode} node
 * @param {(() => any)} get_input
 * @param {null | ((anchor: Node) => void)} pending_fn
 * @param {null | ((anchor: Node, value: Source<V>) => void)} then_fn
 * @param {null | ((anchor: Node, error: unknown) => void)} catch_fn
 * @returns {void}
 */
function await_block(node, get_input, pending_fn, then_fn, catch_fn) {
  if (hydrating) hydrate_next()
  var runes = is_runes()
  var v = UNINITIALIZED
  var value = runes ? source(v) : /* @__PURE__ */ mutable_source(v, false, false)
  var error = runes ? source(v) : /* @__PURE__ */ mutable_source(v, false, false)
  var branches = new BranchManager(node)
  block(() => {
    var input = get_input()
    var destroyed = false
    /** Whether or not there was a hydration mismatch. Needs to be a `let` or else it isn't treeshaken out */
    let mismatch = hydrating && is_promise(input) === (node.data === HYDRATION_START_ELSE)
    if (mismatch) {
      set_hydrate_node(skip_nodes())
      set_hydrating(false)
    }
    if (is_promise(input)) {
      var restore = capture()
      var resolved = false
      /**
       * @param {() => void} fn
       */
      const resolve = fn => {
        if (destroyed) return
        resolved = true
        restore(false)
        Batch.ensure()
        if (hydrating) set_hydrating(false)
        try {
          fn()
        } finally {
          unset_context(false)
          if (!is_flushing_sync) flushSync()
        }
      }
      input.then(
        v => {
          resolve(() => {
            internal_set(value, v)
            branches.ensure(THEN, then_fn && (target => then_fn(target, value)))
          })
        },
        e => {
          resolve(() => {
            internal_set(error, e)
            branches.ensure(CATCH, catch_fn && (target => catch_fn(target, error)))
            if (!catch_fn) throw error.v
          })
        }
      )
      if (hydrating) branches.ensure(PENDING, pending_fn)
      else
        queue_micro_task(() => {
          if (!resolved)
            resolve(() => {
              branches.ensure(PENDING, pending_fn)
            })
        })
    } else {
      internal_set(value, input)
      branches.ensure(THEN, then_fn && (target => then_fn(target, value)))
    }
    if (mismatch) set_hydrating(true)
    return () => {
      destroyed = true
    }
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/if.js
/** @import { TemplateNode } from '#client' */
/**
 * @param {TemplateNode} node
 * @param {(branch: (fn: (anchor: Node) => void, key?: number | false) => void) => void} fn
 * @param {boolean} [elseif] True if this is an `{:else if ...}` block rather than an `{#if ...}`, as that affects which transitions are considered 'local'
 * @returns {void}
 */
function if_block(node, fn, elseif = false) {
  /** @type {TemplateNode | undefined} */
  var marker
  if (hydrating) {
    marker = hydrate_node
    hydrate_next()
  }
  var branches = new BranchManager(node)
  var flags = elseif ? EFFECT_TRANSPARENT : 0
  /**
   * @param {number | false} key
   * @param {null | ((anchor: Node) => void)} fn
   */
  function update_branch(key, fn) {
    if (hydrating) {
      var data = read_hydration_instruction(marker)
      if (key !== parseInt(data.substring(1))) {
        var anchor = skip_nodes()
        set_hydrate_node(anchor)
        branches.anchor = anchor
        set_hydrating(false)
        branches.ensure(key, fn)
        set_hydrating(true)
        return
      }
    }
    branches.ensure(key, fn)
  }
  block(() => {
    var has_branch = false
    fn((fn, key = 0) => {
      has_branch = true
      update_branch(key, fn)
    })
    if (!has_branch) update_branch(-1, null)
  }, flags)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/key.js
/** @import { TemplateNode } from '#client' */
const NAN = Symbol('NaN')
/**
 * @template V
 * @param {TemplateNode} node
 * @param {() => V} get_key
 * @param {(anchor: Node) => TemplateNode | void} render_fn
 * @returns {void}
 */
function key(node, get_key, render_fn) {
  if (hydrating) hydrate_next()
  var branches = new BranchManager(node)
  var legacy = !is_runes()
  block(() => {
    var key = get_key()
    if (key !== key) key = NAN
    if (legacy && key !== null && typeof key === 'object') key = {}
    branches.ensure(key, render_fn)
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/css-props.js
/**
 * @param {HTMLDivElement | SVGGElement} element
 * @param {() => Record<string, string>} get_styles
 * @returns {void}
 */
function css_props(element, get_styles) {
  if (hydrating) set_hydrate_node(/* @__PURE__ */ get_first_child(element))
  render_effect(() => {
    var styles = get_styles()
    for (var key in styles) {
      var value = styles[key]
      if (value) element.style.setProperty(key, value)
      else element.style.removeProperty(key)
    }
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/each.js
/** @import { EachItem, EachOutroGroup, EachState, Effect, EffectNodes, MaybeSource, Source, TemplateNode, TransitionManager, Value } from '#client' */
/** @import { Batch } from '../../reactivity/batch.js'; */
/**
 * @param {any} _
 * @param {number} i
 */
function index(_, i) {
  return i
}
/**
 * Pause multiple effects simultaneously, and coordinate their
 * subsequent destruction. Used in each blocks
 * @param {EachState} state
 * @param {Effect[]} to_destroy
 * @param {null | Node} controlled_anchor
 */
function pause_effects(state, to_destroy, controlled_anchor) {
  /** @type {TransitionManager[]} */
  var transitions = []
  var length = to_destroy.length
  /** @type {EachOutroGroup} */
  var group
  var remaining = to_destroy.length
  for (var i = 0; i < length; i++) {
    let effect = to_destroy[i]
    pause_effect(
      effect,
      () => {
        if (group) {
          group.pending.delete(effect)
          group.done.add(effect)
          if (group.pending.size === 0) {
            var groups = state.outrogroups
            destroy_effects(state, array_from(group.done))
            groups.delete(group)
            if (groups.size === 0) state.outrogroups = null
          }
        } else remaining -= 1
      },
      false
    )
  }
  if (remaining === 0) {
    var fast_path = transitions.length === 0 && controlled_anchor !== null
    if (fast_path) {
      var anchor = controlled_anchor
      var parent_node = anchor.parentNode
      clear_text_content(parent_node)
      parent_node.append(anchor)
      state.items.clear()
    }
    destroy_effects(state, to_destroy, !fast_path)
  } else {
    group = {
      pending: new Set(to_destroy),
      done: /* @__PURE__ */ new Set()
    }
    ;(state.outrogroups ??= /* @__PURE__ */ new Set()).add(group)
  }
}
/**
 * @param {EachState} state
 * @param {Effect[]} to_destroy
 * @param {boolean} remove_dom
 */
function destroy_effects(state, to_destroy, remove_dom = true) {
  /** @type {Set<Effect> | undefined} */
  var preserved_effects
  if (state.pending.size > 0) {
    preserved_effects = /* @__PURE__ */ new Set()
    for (const keys of state.pending.values())
      for (const key of keys)
        preserved_effects.add(
          /** @type {EachItem} */
          state.items.get(key).e
        )
  }
  for (var i = 0; i < to_destroy.length; i++) {
    var e = to_destroy[i]
    if (preserved_effects?.has(e)) {
      e.f |= EFFECT_OFFSCREEN
      move_effect(e, document.createDocumentFragment())
    } else destroy_effect(to_destroy[i], remove_dom)
  }
}
/** @type {TemplateNode} */
var offscreen_anchor
/**
 * @template V
 * @param {Element | Comment} node The next sibling node, or the parent node if this is a 'controlled' block
 * @param {number} flags
 * @param {() => V[]} get_collection
 * @param {(value: V, index: number) => any} get_key
 * @param {(anchor: Node, item: MaybeSource<V>, index: MaybeSource<number>) => void} render_fn
 * @param {null | ((anchor: Node) => void)} fallback_fn
 * @returns {void}
 */
function each(node, flags, get_collection, get_key, render_fn, fallback_fn = null) {
  var anchor = node
  /** @type {Map<any, EachItem>} */
  var items = /* @__PURE__ */ new Map()
  if ((flags & EACH_IS_CONTROLLED) !== 0) {
    var parent_node = node
    anchor = hydrating
      ? set_hydrate_node(/* @__PURE__ */ get_first_child(parent_node))
      : parent_node.appendChild(create_text())
  }
  if (hydrating) hydrate_next()
  /** @type {Effect | null} */
  var fallback = null
  var each_array = /* @__PURE__ */ derived_safe_equal(() => {
    var collection = get_collection()
    return is_array(collection) ? collection : collection == null ? [] : array_from(collection)
  })
  /** @type {V[]} */
  var array
  /** @type {Map<Batch, Set<any>>} */
  var pending = /* @__PURE__ */ new Map()
  var first_run = true
  /**
   * @param {Batch} batch
   */
  function commit(batch) {
    if ((state.effect.f & DESTROYED) !== 0) return
    state.pending.delete(batch)
    state.fallback = fallback
    reconcile(state, array, anchor, flags, get_key)
    if (fallback !== null)
      if (array.length === 0)
        if ((fallback.f & EFFECT_OFFSCREEN) === 0) resume_effect(fallback)
        else {
          fallback.f ^= EFFECT_OFFSCREEN
          move(fallback, null, anchor)
        }
      else
        pause_effect(fallback, () => {
          fallback = null
        })
  }
  /**
   * @param {Batch} batch
   */
  function discard(batch) {
    state.pending.delete(batch)
  }
  /** @type {EachState} */
  var state = {
    effect: block(() => {
      array = get$1(each_array)
      var length = array.length
      /** `true` if there was a hydration mismatch. Needs to be a `let` or else it isn't treeshaken out */
      let mismatch = false
      if (hydrating) {
        if ((read_hydration_instruction(anchor) === HYDRATION_START_ELSE) !== (length === 0)) {
          anchor = skip_nodes()
          set_hydrate_node(anchor)
          set_hydrating(false)
          mismatch = true
        }
      }
      var keys = /* @__PURE__ */ new Set()
      var batch = current_batch
      var defer = should_defer_append()
      for (var index = 0; index < length; index += 1) {
        if (
          hydrating &&
          hydrate_node.nodeType === COMMENT_NODE &&
          hydrate_node.data === HYDRATION_END
        ) {
          anchor = hydrate_node
          mismatch = true
          set_hydrating(false)
        }
        var value = array[index]
        var key = get_key(value, index)
        if (dev_fallback_default) {
          var key_again = get_key(value, index)
          if (key !== key_again) each_key_volatile(String(index), String(key), String(key_again))
        }
        var item = first_run ? null : items.get(key)
        if (item) {
          if (item.v) internal_set(item.v, value)
          if (item.i) internal_set(item.i, index)
          if (defer) batch.unskip_effect(item.e)
        } else {
          item = create_item(
            items,
            first_run ? anchor : (offscreen_anchor ??= create_text()),
            value,
            key,
            index,
            render_fn,
            flags,
            get_collection
          )
          if (!first_run) item.e.f |= EFFECT_OFFSCREEN
          items.set(key, item)
        }
        keys.add(key)
      }
      if (length === 0 && fallback_fn && !fallback)
        if (first_run) fallback = branch(() => fallback_fn(anchor))
        else {
          fallback = branch(() => fallback_fn((offscreen_anchor ??= create_text())))
          fallback.f |= EFFECT_OFFSCREEN
        }
      if (length > keys.size)
        if (dev_fallback_default) validate_each_keys(array, get_key)
        else each_key_duplicate('', '', '')
      if (hydrating && length > 0) set_hydrate_node(skip_nodes())
      if (!first_run) {
        pending.set(batch, keys)
        if (defer) {
          for (const [key, item] of items) if (!keys.has(key)) batch.skip_effect(item.e)
          batch.oncommit(commit)
          batch.ondiscard(discard)
        } else commit(batch)
      }
      if (mismatch) set_hydrating(true)
      get$1(each_array)
    }),
    flags,
    items,
    pending,
    outrogroups: null,
    fallback
  }
  first_run = false
  if (hydrating) anchor = hydrate_node
}
/**
 * Skip past any non-branch effects (which could be created with `createSubscriber`, for example) to find the next branch effect
 * @param {Effect | null} effect
 * @returns {Effect | null}
 */
function skip_to_branch(effect) {
  while (effect !== null && (effect.f & BRANCH_EFFECT) === 0) effect = effect.next
  return effect
}
/**
 * Add, remove, or reorder items output by an each block as its input changes
 * @template V
 * @param {EachState} state
 * @param {Array<V>} array
 * @param {Element | Comment | Text} anchor
 * @param {number} flags
 * @param {(value: V, index: number) => any} get_key
 * @returns {void}
 */
function reconcile(state, array, anchor, flags, get_key) {
  var is_animated = (flags & EACH_IS_ANIMATED) !== 0
  var length = array.length
  var items = state.items
  var current = skip_to_branch(state.effect.first)
  /** @type {undefined | Set<Effect>} */
  var seen
  /** @type {Effect | null} */
  var prev = null
  /** @type {undefined | Set<Effect>} */
  var to_animate
  /** @type {Effect[]} */
  var matched = []
  /** @type {Effect[]} */
  var stashed = []
  /** @type {V} */
  var value
  /** @type {any} */
  var key
  /** @type {Effect | undefined} */
  var effect
  /** @type {number} */
  var i
  if (is_animated)
    for (i = 0; i < length; i += 1) {
      value = array[i]
      key = get_key(value, i)
      effect = items.get(key).e
      if ((effect.f & EFFECT_OFFSCREEN) === 0) {
        effect.nodes?.a?.measure()
        ;(to_animate ??= /* @__PURE__ */ new Set()).add(effect)
      }
    }
  for (i = 0; i < length; i += 1) {
    value = array[i]
    key = get_key(value, i)
    effect = items.get(key).e
    if (state.outrogroups !== null)
      for (const group of state.outrogroups) {
        group.pending.delete(effect)
        group.done.delete(effect)
      }
    if ((effect.f & EFFECT_OFFSCREEN) !== 0) {
      effect.f ^= EFFECT_OFFSCREEN
      if (effect === current) move(effect, null, anchor)
      else {
        var next = prev ? prev.next : current
        if (effect === state.effect.last) state.effect.last = effect.prev
        if (effect.prev) effect.prev.next = effect.next
        if (effect.next) effect.next.prev = effect.prev
        link(state, prev, effect)
        link(state, effect, next)
        move(effect, next, anchor)
        prev = effect
        matched = []
        stashed = []
        current = skip_to_branch(prev.next)
        continue
      }
    }
    if ((effect.f & INERT) !== 0) {
      resume_effect(effect)
      if (is_animated) {
        effect.nodes?.a?.unfix()
        ;(to_animate ??= /* @__PURE__ */ new Set()).delete(effect)
      }
    }
    if (effect !== current) {
      if (seen !== void 0 && seen.has(effect)) {
        if (matched.length < stashed.length) {
          var start = stashed[0]
          var j
          prev = start.prev
          var a = matched[0]
          var b = matched[matched.length - 1]
          for (j = 0; j < matched.length; j += 1) move(matched[j], start, anchor)
          for (j = 0; j < stashed.length; j += 1) seen.delete(stashed[j])
          link(state, a.prev, b.next)
          link(state, prev, a)
          link(state, b, start)
          current = start
          prev = b
          i -= 1
          matched = []
          stashed = []
        } else {
          seen.delete(effect)
          move(effect, current, anchor)
          link(state, effect.prev, effect.next)
          link(state, effect, prev === null ? state.effect.first : prev.next)
          link(state, prev, effect)
          prev = effect
        }
        continue
      }
      matched = []
      stashed = []
      while (current !== null && current !== effect) {
        ;(seen ??= /* @__PURE__ */ new Set()).add(current)
        stashed.push(current)
        current = skip_to_branch(current.next)
      }
      if (current === null) continue
    }
    if ((effect.f & EFFECT_OFFSCREEN) === 0) matched.push(effect)
    prev = effect
    current = skip_to_branch(effect.next)
  }
  if (state.outrogroups !== null) {
    for (const group of state.outrogroups)
      if (group.pending.size === 0) {
        destroy_effects(state, array_from(group.done))
        state.outrogroups?.delete(group)
      }
    if (state.outrogroups.size === 0) state.outrogroups = null
  }
  if (current !== null || seen !== void 0) {
    /** @type {Effect[]} */
    var to_destroy = []
    if (seen !== void 0) {
      for (effect of seen) if ((effect.f & INERT) === 0) to_destroy.push(effect)
    }
    while (current !== null) {
      if ((current.f & INERT) === 0 && current !== state.fallback) to_destroy.push(current)
      current = skip_to_branch(current.next)
    }
    var destroy_length = to_destroy.length
    if (destroy_length > 0) {
      var controlled_anchor = (flags & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null
      if (is_animated) {
        for (i = 0; i < destroy_length; i += 1) to_destroy[i].nodes?.a?.measure()
        for (i = 0; i < destroy_length; i += 1) to_destroy[i].nodes?.a?.fix()
      }
      pause_effects(state, to_destroy, controlled_anchor)
    }
  }
  if (is_animated)
    queue_micro_task(() => {
      if (to_animate === void 0) return
      for (effect of to_animate) effect.nodes?.a?.apply()
    })
}
/**
 * @template V
 * @param {Map<any, EachItem>} items
 * @param {Node} anchor
 * @param {V} value
 * @param {unknown} key
 * @param {number} index
 * @param {(anchor: Node, item: V | Source<V>, index: number | Value<number>, collection: () => V[]) => void} render_fn
 * @param {number} flags
 * @param {() => V[]} get_collection
 * @returns {EachItem}
 */
function create_item(items, anchor, value, key, index, render_fn, flags, get_collection) {
  var v =
    (flags & EACH_ITEM_REACTIVE) !== 0
      ? (flags & EACH_ITEM_IMMUTABLE) === 0
        ? /* @__PURE__ */ mutable_source(value, false, false)
        : source(value)
      : null
  var i = (flags & EACH_INDEX_REACTIVE) !== 0 ? source(index) : null
  if (dev_fallback_default && v)
    v.trace = () => {
      get_collection()[i?.v ?? index]
    }
  return {
    v,
    i,
    e: branch(() => {
      render_fn(anchor, v ?? value, i ?? index, get_collection)
      return () => {
        items.delete(key)
      }
    })
  }
}
/**
 * @param {Effect} effect
 * @param {Effect | null} next
 * @param {Text | Element | Comment} anchor
 */
function move(effect, next, anchor) {
  if (!effect.nodes) return
  var node = effect.nodes.start
  var end = effect.nodes.end
  var dest = next && (next.f & EFFECT_OFFSCREEN) === 0 ? next.nodes.start : anchor
  while (node !== null) {
    var next_node = /* @__PURE__ */ get_next_sibling(node)
    dest.before(node)
    if (node === end) return
    node = next_node
  }
}
/**
 * @param {EachState} state
 * @param {Effect | null} prev
 * @param {Effect | null} next
 */
function link(state, prev, next) {
  if (prev === null) state.effect.first = next
  else prev.next = next
  if (next === null) state.effect.last = prev
  else next.prev = prev
}
/**
 * @param {Array<any>} array
 * @param {(item: any, index: number) => string} key_fn
 * @returns {void}
 */
function validate_each_keys(array, key_fn) {
  const keys = /* @__PURE__ */ new Map()
  const length = array.length
  for (let i = 0; i < length; i++) {
    const key = key_fn(array[i], i)
    if (keys.has(key)) {
      const a = String(keys.get(key))
      const b = String(i)
      /** @type {string | null} */
      let k = String(key)
      if (k.startsWith('[object ')) k = null
      each_key_duplicate(a, b, k)
    }
    keys.set(key, i)
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/html.js
/** @import { Effect, TemplateNode } from '#client' */
/** @import {} from 'trusted-types' */
/**
 * @param {Element} element
 * @param {string | null} server_hash
 * @param {string | TrustedHTML} value
 */
function check_hash(element, server_hash, value) {
  if (!server_hash || server_hash === hash(String(value ?? ''))) return
  let location
  const loc = element.__svelte_meta?.loc
  if (loc) location = `near ${loc.file}:${loc.line}:${loc.column}`
  else if (dev_current_component_function?.[FILENAME])
    location = `in ${dev_current_component_function[FILENAME]}`
  hydration_html_changed(sanitize_location(location))
}
/**
 * @param {Element | Text | Comment} node
 * @param {() => string | TrustedHTML} get_value
 * @param {boolean} [svg]
 * @param {boolean} [mathml]
 * @param {boolean} [skip_warning]
 * @returns {void}
 */
function html(node, get_value, svg = false, mathml = false, skip_warning = false) {
  var anchor = node
  /** @type {string | TrustedHTML} */
  var value = ''
  template_effect(() => {
    var effect = active_effect
    if (value === (value = get_value() ?? '')) {
      if (hydrating) hydrate_next()
      return
    }
    if (effect.nodes !== null) {
      remove_effect_dom(effect.nodes.start, effect.nodes.end)
      effect.nodes = null
    }
    if (value === '') return
    if (hydrating) {
      var hash = hydrate_node.data
      /** @type {TemplateNode | null} */
      var next = hydrate_next()
      var last = next
      while (next !== null && (next.nodeType !== COMMENT_NODE || next.data !== '')) {
        last = next
        next = /* @__PURE__ */ get_next_sibling(next)
      }
      if (next === null) {
        hydration_mismatch()
        throw HYDRATION_ERROR
      }
      if (dev_fallback_default && !skip_warning) check_hash(next.parentNode, hash, value)
      assign_nodes(hydrate_node, last)
      anchor = set_hydrate_node(next)
      return
    }
    var wrapper = create_element(
      svg ? 'svg' : mathml ? 'math' : 'template',
      svg ? NAMESPACE_SVG : mathml ? NAMESPACE_MATHML : void 0
    )
    wrapper.innerHTML = value
    /** @type {DocumentFragment | Element} */
    var node = svg || mathml ? wrapper : wrapper.content
    assign_nodes(/* @__PURE__ */ get_first_child(node), node.lastChild)
    if (svg || mathml)
      while (/* @__PURE__ */ get_first_child(node))
        anchor.before(/* @__PURE__ */ get_first_child(node))
    else anchor.before(node)
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/slot.js
/**
 * @param {Comment} anchor
 * @param {Record<string, any>} $$props
 * @param {string} name
 * @param {Record<string, unknown>} slot_props
 * @param {null | ((anchor: Comment) => void)} fallback_fn
 */
function slot(anchor, $$props, name, slot_props, fallback_fn) {
  if (hydrating) hydrate_next()
  var slot_fn = $$props.$$slots?.[name]
  var is_interop = false
  if (slot_fn === true) {
    slot_fn = $$props[name === 'default' ? 'children' : name]
    is_interop = true
  }
  if (slot_fn === void 0) {
    if (fallback_fn !== null) fallback_fn(anchor)
  } else slot_fn(anchor, is_interop ? () => slot_props : slot_props)
}
/**
 * @param {Record<string, any>} props
 * @returns {Record<string, boolean>}
 */
function sanitize_slots(props) {
  /** @type {Record<string, boolean>} */
  const sanitized = {}
  if (props.children) sanitized.default = true
  for (const key in props.$$slots) sanitized[key] = true
  return sanitized
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/shared/validate.js
/**
 * @param {() => string} tag_fn
 * @returns {void}
 */
function validate_void_dynamic_element(tag_fn) {
  const tag = tag_fn()
  if (tag && is_void(tag)) dynamic_void_element_content(tag)
}
/** @param {() => unknown} tag_fn */
function validate_dynamic_element_tag(tag_fn) {
  const tag = tag_fn()
  if (tag && !(typeof tag === 'string')) svelte_element_invalid_this_value()
}
/**
 * @param {any} store
 * @param {string} name
 */
function validate_store(store, name) {
  if (store != null && typeof store.subscribe !== 'function') store_invalid_shape(name)
}
/**
 * @template {(...args: any[]) => unknown} T
 * @param {T} fn
 */
function prevent_snippet_stringification(fn) {
  fn.toString = () => {
    snippet_without_render_tag()
    return ''
  }
  return fn
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/snippet.js
/** @import { Snippet } from 'svelte' */
/** @import { TemplateNode } from '#client' */
/** @import { Getters } from '#shared' */
/**
 * @template {(node: TemplateNode, ...args: any[]) => void} SnippetFn
 * @param {TemplateNode} node
 * @param {() => SnippetFn | null | undefined} get_snippet
 * @param {(() => any)[]} args
 * @returns {void}
 */
function snippet(node, get_snippet, ...args) {
  var branches = new BranchManager(node)
  block(() => {
    const snippet = get_snippet() ?? null
    if (dev_fallback_default && snippet == null) invalid_snippet()
    branches.ensure(snippet, snippet && (anchor => snippet(anchor, ...args)))
  }, EFFECT_TRANSPARENT)
}
/**
 * In development, wrap the snippet function so that it passes validation, and so that the
 * correct component context is set for ownership checks
 * @param {any} component
 * @param {(node: TemplateNode, ...args: any[]) => void} fn
 */
function wrap_snippet(component, fn) {
  const snippet = (node, ...args) => {
    var previous_component_function = dev_current_component_function
    set_dev_current_component_function(component)
    try {
      return fn(node, ...args)
    } finally {
      set_dev_current_component_function(previous_component_function)
    }
  }
  prevent_snippet_stringification(snippet)
  return snippet
}
/**
 * Create a snippet programmatically
 * @template {unknown[]} Params
 * @param {(...params: Getters<Params>) => {
 *   render: () => string
 *   setup?: (element: Element) => void | (() => void)
 * }} fn
 * @returns {Snippet<Params>}
 */
function createRawSnippet(fn) {
  return (anchor, ...params) => {
    var snippet = fn(...params)
    /** @type {Element} */
    var element
    if (hydrating) {
      element = hydrate_node
      hydrate_next()
    } else {
      element = /* @__PURE__ */ get_first_child(create_fragment_from_html(snippet.render().trim()))
      if (
        dev_fallback_default &&
        /* @__PURE__ */ (get_next_sibling(element) !== null || element.nodeType !== ELEMENT_NODE)
      )
        invalid_raw_snippet_render()
      anchor.before(element)
    }
    const result = snippet.setup?.(element)
    assign_nodes(element, element)
    if (typeof result === 'function') teardown(result)
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/svelte-component.js
/** @import { TemplateNode, Dom } from '#client' */
/**
 * @template P
 * @template {(props: P) => void} C
 * @param {TemplateNode} node
 * @param {() => C} get_component
 * @param {(anchor: TemplateNode, component: C) => Dom | void} render_fn
 * @returns {void}
 */
function component(node, get_component, render_fn) {
  /** @type {TemplateNode | undefined} */
  var hydration_start_node
  if (hydrating) {
    hydration_start_node = hydrate_node
    hydrate_next()
  }
  var branches = new BranchManager(node)
  block(() => {
    var component = get_component() ?? null
    if (hydrating) {
      if (
        (read_hydration_instruction(hydration_start_node) === HYDRATION_START) !==
        (component !== null)
      ) {
        var anchor = skip_nodes()
        set_hydrate_node(anchor)
        branches.anchor = anchor
        set_hydrating(false)
        branches.ensure(component, component && (target => render_fn(target, component)))
        set_hydrating(true)
        return
      }
    }
    branches.ensure(component, component && (target => render_fn(target, component)))
  }, EFFECT_TRANSPARENT)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/timing.js
/** @import { Raf } from '#client' */
const now = true_default ? () => performance.now() : () => Date.now()
/** @type {Raf} */
const raf = {
  tick: _ => (true_default ? requestAnimationFrame : noop)(_),
  now: () => now(),
  tasks: /* @__PURE__ */ new Set()
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/loop.js
/** @import { TaskCallback, Task, TaskEntry } from '#client' */
/**
 * @returns {void}
 */
function run_tasks() {
  const now = raf.now()
  raf.tasks.forEach(task => {
    if (!task.c(now)) {
      raf.tasks.delete(task)
      task.f()
    }
  })
  if (raf.tasks.size !== 0) raf.tick(run_tasks)
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 * @param {TaskCallback} callback
 * @returns {Task}
 */
function loop(callback) {
  /** @type {TaskEntry} */
  let task
  if (raf.tasks.size === 0) raf.tick(run_tasks)
  return {
    promise: new Promise(fulfill => {
      raf.tasks.add(
        (task = {
          c: callback,
          f: fulfill
        })
      )
    }),
    abort() {
      raf.tasks.delete(task)
    }
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/transitions.js
/** @import { AnimateFn, Animation, AnimationConfig, EachItem, Effect, EffectNodes, TransitionFn, TransitionManager } from '#client' */
/**
 * @param {Element} element
 * @param {'introstart' | 'introend' | 'outrostart' | 'outroend'} type
 * @returns {void}
 */
function dispatch_event(element, type) {
  without_reactive_context(() => {
    element.dispatchEvent(new CustomEvent(type))
  })
}
/**
 * Converts a property to the camel-case format expected by Element.animate(), KeyframeEffect(), and KeyframeEffect.setKeyframes().
 * @param {string} style
 * @returns {string}
 */
function css_property_to_camelcase(style) {
  if (style === 'float') return 'cssFloat'
  if (style === 'offset') return 'cssOffset'
  if (style.startsWith('--')) return style
  const parts = style.split('-')
  if (parts.length === 1) return parts[0]
  return (
    parts[0] +
    parts
      .slice(1)
      .map(
        /** @param {any} word */
        word => word[0].toUpperCase() + word.slice(1)
      )
      .join('')
  )
}
/**
 * @param {string} css
 * @returns {Keyframe}
 */
function css_to_keyframe(css) {
  /** @type {Keyframe} */
  const keyframe = {}
  const parts = css.split(';')
  for (const part of parts) {
    const [property, value] = part.split(':')
    if (!property || value === void 0) break
    const formatted_property = css_property_to_camelcase(property.trim())
    keyframe[formatted_property] = value.trim()
  }
  return keyframe
}
/** @param {number} t */
const linear = t => t
/** @type {Effect | null} */
let animation_effect_override = null
/** @param {Effect | null} v */
function set_animation_effect_override(v) {
  animation_effect_override = v
}
/**
 * Called inside keyed `{#each ...}` blocks (as `$.animation(...)`). This creates an animation manager
 * and attaches it to the block, so that moves can be animated following reconciliation.
 * @template P
 * @param {Element} element
 * @param {() => AnimateFn<P | undefined>} get_fn
 * @param {(() => P) | null} get_params
 */
function animation(element, get_fn, get_params) {
  var nodes = (animation_effect_override ?? active_effect).nodes
  /** @type {DOMRect} */
  var from
  /** @type {DOMRect} */
  var to
  /** @type {Animation | undefined} */
  var animation
  /** @type {null | { position: string, width: string, height: string, transform: string }} */
  var original_styles = null
  nodes.a ??= {
    element,
    measure() {
      from = this.element.getBoundingClientRect()
    },
    apply() {
      animation?.abort()
      to = this.element.getBoundingClientRect()
      if (
        from.left !== to.left ||
        from.right !== to.right ||
        from.top !== to.top ||
        from.bottom !== to.bottom
      ) {
        const options = get_fn()(
          this.element,
          {
            from,
            to
          },
          get_params?.()
        )
        animation = animate(this.element, options, void 0, 1, () => {
          animation?.abort()
          animation = void 0
        })
      }
    },
    fix() {
      if (element.getAnimations().length) return
      var { position, width, height } = getComputedStyle(element)
      if (position !== 'absolute' && position !== 'fixed') {
        var style = element.style
        original_styles = {
          position: style.position,
          width: style.width,
          height: style.height,
          transform: style.transform
        }
        style.position = 'absolute'
        style.width = width
        style.height = height
        var to = element.getBoundingClientRect()
        if (from.left !== to.left || from.top !== to.top) {
          var transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`
          style.transform = style.transform ? `${style.transform} ${transform}` : transform
        }
      }
    },
    unfix() {
      if (original_styles) {
        var style = element.style
        style.position = original_styles.position
        style.width = original_styles.width
        style.height = original_styles.height
        style.transform = original_styles.transform
      }
    }
  }
  nodes.a.element = element
}
/**
 * Called inside block effects as `$.transition(...)`. This creates a transition manager and
 * attaches it to the current effect — later, inside `pause_effect` and `resume_effect`, we
 * use this to create `intro` and `outro` transitions.
 * @template P
 * @param {number} flags
 * @param {HTMLElement} element
 * @param {() => TransitionFn<P | undefined>} get_fn
 * @param {(() => P) | null} get_params
 * @returns {void}
 */
function transition(flags, element, get_fn, get_params) {
  var is_intro = (flags & TRANSITION_IN) !== 0
  var is_outro = (flags & TRANSITION_OUT) !== 0
  var is_both = is_intro && is_outro
  var is_global = (flags & TRANSITION_GLOBAL) !== 0
  /** @type {'in' | 'out' | 'both'} */
  var direction = is_both ? 'both' : is_intro ? 'in' : 'out'
  /** @type {AnimationConfig | ((opts: { direction: 'in' | 'out' }) => AnimationConfig) | undefined} */
  var current_options
  var inert = element.inert
  /**
   * The default overflow style, stashed so we can revert changes during the transition
   * that are necessary to work around a Safari <18 bug
   * TODO 6.0 remove this, if older versions of Safari have died out enough
   */
  var overflow = element.style.overflow
  /** @type {Animation | undefined} */
  var intro
  /** @type {Animation | undefined} */
  var outro
  function get_options() {
    return without_reactive_context(() => {
      return (current_options ??= get_fn()(element, get_params?.() ?? {}, { direction }))
    })
  }
  /** @type {TransitionManager} */
  var transition = {
    is_global,
    in() {
      element.inert = inert
      if (!is_intro) {
        outro?.abort()
        outro?.reset?.()
        return
      }
      if (!is_outro) intro?.abort()
      intro = animate(element, get_options(), outro, 1, () => {
        dispatch_event(element, 'introend')
        intro?.abort()
        intro = current_options = void 0
        element.style.overflow = overflow
      })
    },
    out(fn) {
      if (!is_outro) {
        fn?.()
        current_options = void 0
        return
      }
      element.inert = true
      outro = animate(element, get_options(), intro, 0, () => {
        dispatch_event(element, 'outroend')
        fn?.()
      })
    },
    stop: () => {
      intro?.abort()
      outro?.abort()
    }
  }
  var e = active_effect
  ;(e.nodes.t ??= []).push(transition)
  if (is_intro && should_intro) {
    var run = is_global
    if (!run) {
      var block = e.parent
      while (block && (block.f & EFFECT_TRANSPARENT) !== 0)
        while ((block = block.parent)) if ((block.f & BLOCK_EFFECT) !== 0) break
      run = !block || (block.f & REACTION_RAN) !== 0
    }
    if (run)
      effect(() => {
        untrack(() => transition.in())
      })
  }
}
/**
 * Animates an element, according to the provided configuration
 * @param {Element} element
 * @param {AnimationConfig | ((opts: { direction: 'in' | 'out' }) => AnimationConfig)} options
 * @param {Animation | undefined} counterpart The corresponding intro/outro to this outro/intro
 * @param {number} t2 The target `t` value — `1` for intro, `0` for outro
 * @param {(() => void)} on_finish Called after successfully completing the animation
 * @returns {Animation}
 */
function animate(element, options, counterpart, t2, on_finish) {
  var is_intro = t2 === 1
  if (is_function(options)) {
    /** @type {Animation} */
    var a
    var aborted = false
    queue_micro_task(() => {
      if (aborted) return
      a = animate(
        element,
        options({ direction: is_intro ? 'in' : 'out' }),
        counterpart,
        t2,
        on_finish
      )
    })
    return {
      abort: () => {
        aborted = true
        a?.abort()
      },
      deactivate: () => a.deactivate(),
      reset: () => a.reset(),
      t: () => a.t()
    }
  }
  counterpart?.deactivate()
  if (!options?.duration && !options?.delay) {
    dispatch_event(element, is_intro ? 'introstart' : 'outrostart')
    on_finish()
    return {
      abort: noop,
      deactivate: noop,
      reset: noop,
      t: () => t2
    }
  }
  const { delay = 0, css, tick, easing = linear } = options
  var keyframes = []
  if (is_intro && counterpart === void 0) {
    if (tick) tick(0, 1)
    if (css) {
      var styles = css_to_keyframe(css(0, 1))
      keyframes.push(styles, styles)
    }
  }
  var get_t = () => 1 - t2
  var animation = element.animate(keyframes, {
    duration: delay,
    fill: 'forwards'
  })
  animation.onfinish = () => {
    animation.cancel()
    dispatch_event(element, is_intro ? 'introstart' : 'outrostart')
    var t1 = counterpart?.t() ?? 1 - t2
    counterpart?.abort()
    var delta = t2 - t1
    var duration = options.duration * Math.abs(delta)
    var keyframes = []
    if (duration > 0) {
      /**
       * Whether or not the CSS includes `overflow: hidden`, in which case we need to
       * add it as an inline style to work around a Safari <18 bug
       * TODO 6.0 remove this, if possible
       */
      var needs_overflow_hidden = false
      if (css) {
        var n = Math.ceil(duration / (1e3 / 60))
        for (var i = 0; i <= n; i += 1) {
          var t = t1 + delta * easing(i / n)
          var styles = css_to_keyframe(css(t, 1 - t))
          keyframes.push(styles)
          needs_overflow_hidden ||= styles.overflow === 'hidden'
        }
      }
      if (needs_overflow_hidden) /** @type {HTMLElement} */ element.style.overflow = 'hidden'
      get_t = () => {
        var time = animation.currentTime
        return t1 + delta * easing(time / duration)
      }
      if (tick)
        loop(() => {
          if (animation.playState !== 'running') return false
          var t = get_t()
          tick(t, 1 - t)
          return true
        })
    }
    animation = element.animate(keyframes, {
      duration,
      fill: 'forwards'
    })
    animation.onfinish = () => {
      get_t = () => t2
      tick?.(t2, 1 - t2)
      on_finish()
    }
  }
  return {
    abort: () => {
      if (animation) {
        animation.cancel()
        animation.effect = null
        animation.onfinish = noop
      }
    },
    deactivate: () => {
      on_finish = noop
    },
    reset: () => {
      if (t2 === 0) tick?.(1, 0)
    },
    t: () => get_t()
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/svelte-element.js
/** @import { Effect, EffectNodes, TemplateNode } from '#client' */
/**
 * @param {Comment | Element} node
 * @param {() => string} get_tag
 * @param {boolean} is_svg
 * @param {undefined | ((element: Element, anchor: Node | null) => void)} render_fn,
 * @param {undefined | (() => string)} get_namespace
 * @param {undefined | [number, number]} location
 * @returns {void}
 */
function element(node, get_tag, is_svg, render_fn, get_namespace, location) {
  let was_hydrating = hydrating
  if (hydrating) hydrate_next()
  var filename = dev_fallback_default && location && component_context?.function[FILENAME]
  /** @type {null | Element} */
  var element = null
  if (hydrating && hydrate_node.nodeType === ELEMENT_NODE) {
    element = hydrate_node
    hydrate_next()
  }
  var anchor = hydrating ? hydrate_node : node
  /**
   * We track this so we can set it when changing the element, allowing any
   * `animate:` directive to bind itself to the correct block
   */
  var parent_effect = active_effect
  var branches = new BranchManager(anchor, false)
  block(() => {
    const next_tag = get_tag() || null
    var ns = get_namespace ? get_namespace() : is_svg || next_tag === 'svg' ? NAMESPACE_SVG : void 0
    if (next_tag === null) {
      branches.ensure(null, null)
      set_should_intro(true)
      return
    }
    branches.ensure(next_tag, anchor => {
      if (next_tag) {
        element = hydrating ? element : create_element(next_tag, ns)
        if (dev_fallback_default && location)
          element.__svelte_meta = {
            parent: dev_stack,
            loc: {
              file: filename,
              line: location[0],
              column: location[1]
            }
          }
        assign_nodes(element, element)
        if (render_fn) {
          if (hydrating && is_raw_text_element(next_tag)) element.append(document.createComment(''))
          var child_anchor = hydrating
            ? /* @__PURE__ */ get_first_child(element)
            : element.appendChild(create_text())
          if (hydrating)
            if (child_anchor === null) set_hydrating(false)
            else set_hydrate_node(child_anchor)
          set_animation_effect_override(parent_effect)
          render_fn(element, child_anchor)
          set_animation_effect_override(null)
        }
        /** @type {Effect & { nodes: EffectNodes }} */ active_effect.nodes.end = element
        anchor.before(element)
      }
      if (hydrating) set_hydrate_node(anchor)
    })
    set_should_intro(true)
    return () => {
      if (next_tag) set_should_intro(false)
    }
  }, EFFECT_TRANSPARENT)
  teardown(() => {
    set_should_intro(true)
  })
  if (was_hydrating) {
    set_hydrating(true)
    set_hydrate_node(anchor)
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/blocks/svelte-head.js
/** @import { TemplateNode } from '#client' */
/**
 * @param {string} hash
 * @param {(anchor: Node) => void} render_fn
 * @returns {void}
 */
function head(hash, render_fn) {
  let previous_hydrate_node = null
  let was_hydrating = hydrating
  /** @type {Comment | Text} */
  var anchor
  if (hydrating) {
    previous_hydrate_node = hydrate_node
    var head_anchor = /* @__PURE__ */ get_first_child(document.head)
    while (
      head_anchor !== null &&
      (head_anchor.nodeType !== COMMENT_NODE || head_anchor.data !== hash)
    )
      head_anchor = /* @__PURE__ */ get_next_sibling(head_anchor)
    if (head_anchor === null) set_hydrating(false)
    else {
      var start = /* @__PURE__ */ get_next_sibling(head_anchor)
      head_anchor.remove()
      set_hydrate_node(start)
    }
  }
  if (!hydrating) anchor = document.head.appendChild(create_text())
  try {
    block(() => render_fn(anchor), HEAD_EFFECT | EFFECT_PRESERVED)
  } finally {
    if (was_hydrating) {
      set_hydrating(true)
      set_hydrate_node(previous_hydrate_node)
    }
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/css.js
/**
 * @param {Node} anchor
 * @param {{ hash: string, code: string }} css
 */
function append_styles$1(anchor, css) {
  effect(() => {
    var root = anchor.getRootNode()
    var target = root.host ? root : (root.head ?? root.ownerDocument.head)
    if (!target.querySelector('#' + css.hash)) {
      const style = create_element('style')
      style.id = css.hash
      style.textContent = css.code
      target.appendChild(style)
      if (dev_fallback_default) register_style(css.hash, style)
    }
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/actions.js
/** @import { ActionPayload } from '#client' */
/**
 * @template P
 * @param {Element} dom
 * @param {(dom: Element, value?: P) => ActionPayload<P>} action
 * @param {() => P} [get_value]
 * @returns {void}
 */
function action(dom, action, get_value) {
  effect(() => {
    var payload = untrack(() => action(dom, get_value?.()) || {})
    if (get_value && payload?.update) {
      var inited = false
      /** @type {P} */
      var prev = {}
      render_effect(() => {
        var value = get_value()
        deep_read_state(value)
        if (inited && safe_not_equal(prev, value)) {
          prev = value
          /** @type {Function} */ payload.update(value)
        }
      })
      inited = true
    }
    if (payload?.destroy) return () => payload.destroy()
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/attachments.js
/** @import { Effect } from '#client' */
/**
 * @param {Element} node
 * @param {() => (node: Element) => void} get_fn
 */
function attach(node, get_fn) {
  /** @type {false | undefined | ((node: Element) => void)} */
  var fn = void 0
  /** @type {Effect | null} */
  var e
  managed(() => {
    if (fn !== (fn = get_fn())) {
      if (e) {
        destroy_effect(e)
        e = null
      }
      if (fn)
        e = branch(() => {
          effect(() => fn(node))
        })
    }
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/escaping.js
const ATTR_REGEX = /[&"<]/g
const CONTENT_REGEX = /[&<]/g
/**
 * @template V
 * @param {V} value
 * @param {boolean} [is_attr]
 */
function escape_html(value, is_attr) {
  const str = String(value ?? '')
  const pattern = is_attr ? ATTR_REGEX : CONTENT_REGEX
  pattern.lastIndex = 0
  let escaped = ''
  let last = 0
  while (pattern.test(str)) {
    const i = pattern.lastIndex - 1
    const ch = str[i]
    escaped += str.substring(last, i) + (ch === '&' ? '&amp;' : ch === '"' ? '&quot;' : '&lt;')
    last = i + 1
  }
  return escaped + str.substring(last)
}

//#endregion
//#region node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t,
    f,
    n = ''
  if ('string' == typeof e || 'number' == typeof e) n += e
  else if ('object' == typeof e)
    if (Array.isArray(e)) {
      var o = e.length
      for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += ' '), (n += f))
    } else for (f in e) e[f] && (n && (n += ' '), (n += f))
  return n
}
function clsx$1() {
  for (var e, t, f = 0, n = '', o = arguments.length; f < o; f++)
    (e = arguments[f]) && (t = r(e)) && (n && (n += ' '), (n += t))
  return n
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/shared/attributes.js
/**
 * `<div translate={false}>` should be rendered as `<div translate="no">` and _not_
 * `<div translate="false">`, which is equivalent to `<div translate="yes">`. There
 * may be other odd cases that need to be added to this list in future
 * @type {Record<string, Map<any, string>>}
 */
const replacements = {
  translate: new Map([
    [true, 'yes'],
    [false, 'no']
  ])
}
/**
 * @template V
 * @param {string} name
 * @param {V} value
 * @param {boolean} [is_boolean]
 * @returns {string}
 */
function attr(name, value, is_boolean = false) {
  if (name === 'hidden' && value !== 'until-found') is_boolean = true
  if (value == null || (!value && is_boolean)) return ''
  const normalized =
    (has_own_property.call(replacements, name) && replacements[name].get(value)) || value
  return ` ${name}${is_boolean ? `=""` : `="${escape_html(normalized, true)}"`}`
}
/**
 * Small wrapper around clsx to preserve Svelte's (weird) handling of falsy values.
 * TODO Svelte 6 revisit this, and likely turn all falsy values into the empty string (what clsx also does)
 * @param  {any} value
 */
function clsx(value) {
  if (typeof value === 'object') return clsx$1(value)
  else return value ?? ''
}
const whitespace = [...' 	\n\r\f\xA0\v﻿']
/**
 * @param {any} value
 * @param {string | null} [hash]
 * @param {Record<string, boolean>} [directives]
 * @returns {string | null}
 */
function to_class(value, hash, directives) {
  var classname = value == null ? '' : '' + value
  if (hash) classname = classname ? classname + ' ' + hash : hash
  if (directives) {
    for (var key of Object.keys(directives))
      if (directives[key]) classname = classname ? classname + ' ' + key : key
      else if (classname.length) {
        var len = key.length
        var a = 0
        while ((a = classname.indexOf(key, a)) >= 0) {
          var b = a + len
          if (
            (a === 0 || whitespace.includes(classname[a - 1])) &&
            (b === classname.length || whitespace.includes(classname[b]))
          )
            classname = (a === 0 ? '' : classname.substring(0, a)) + classname.substring(b + 1)
          else a = b
        }
      }
  }
  return classname === '' ? null : classname
}
/**
 *
 * @param {Record<string,any>} styles
 * @param {boolean} important
 */
function append_styles(styles, important = false) {
  var separator = important ? ' !important;' : ';'
  var css = ''
  for (var key of Object.keys(styles)) {
    var value = styles[key]
    if (value != null && value !== '') css += ' ' + key + ': ' + value + separator
  }
  return css
}
/**
 * @param {string} name
 * @returns {string}
 */
function to_css_name(name) {
  if (name[0] !== '-' || name[1] !== '-') return name.toLowerCase()
  return name
}
/**
 * @param {any} value
 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [styles]
 * @returns {string | null}
 */
function to_style(value, styles) {
  if (styles) {
    var new_style = ''
    /** @type {Record<string,any> | undefined} */
    var normal_styles
    /** @type {Record<string,any> | undefined} */
    var important_styles
    if (Array.isArray(styles)) {
      normal_styles = styles[0]
      important_styles = styles[1]
    } else normal_styles = styles
    if (value) {
      value = String(value)
        .replaceAll(/\s*\/\*.*?\*\/\s*/g, '')
        .trim()
      /** @type {boolean | '"' | "'"} */
      var in_str = false
      var in_apo = 0
      var in_comment = false
      var reserved_names = []
      if (normal_styles) reserved_names.push(...Object.keys(normal_styles).map(to_css_name))
      if (important_styles) reserved_names.push(...Object.keys(important_styles).map(to_css_name))
      var start_index = 0
      var name_index = -1
      const len = value.length
      for (var i = 0; i < len; i++) {
        var c = value[i]
        if (in_comment) {
          if (c === '/' && value[i - 1] === '*') in_comment = false
        } else if (in_str) {
          if (in_str === c) in_str = false
        } else if (c === '/' && value[i + 1] === '*') in_comment = true
        else if (c === '"' || c === "'") in_str = c
        else if (c === '(') in_apo++
        else if (c === ')') in_apo--
        if (!in_comment && in_str === false && in_apo === 0) {
          if (c === ':' && name_index === -1) name_index = i
          else if (c === ';' || i === len - 1) {
            if (name_index !== -1) {
              var name = to_css_name(value.substring(start_index, name_index).trim())
              if (!reserved_names.includes(name)) {
                if (c !== ';') i++
                var property = value.substring(start_index, i).trim()
                new_style += ' ' + property + ';'
              }
            }
            start_index = i + 1
            name_index = -1
          }
        }
      }
    }
    if (normal_styles) new_style += append_styles(normal_styles)
    if (important_styles) new_style += append_styles(important_styles, true)
    new_style = new_style.trim()
    return new_style === '' ? null : new_style
  }
  return value == null ? null : String(value)
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/class.js
/**
 * @param {Element} dom
 * @param {boolean | number} is_html
 * @param {string | null} value
 * @param {string} [hash]
 * @param {Record<string, any>} [prev_classes]
 * @param {Record<string, any>} [next_classes]
 * @returns {Record<string, boolean> | undefined}
 */
function set_class(dom, is_html, value, hash, prev_classes, next_classes) {
  var prev = dom.__className
  if (hydrating || prev !== value || prev === void 0) {
    var next_class_name = to_class(value, hash, next_classes)
    if (!hydrating || next_class_name !== dom.getAttribute('class'))
      if (next_class_name == null) dom.removeAttribute('class')
      else if (is_html) dom.className = next_class_name
      else dom.setAttribute('class', next_class_name)
    dom.__className = value
  } else if (next_classes && prev_classes !== next_classes)
    for (var key in next_classes) {
      var is_present = !!next_classes[key]
      if (prev_classes == null || is_present !== !!prev_classes[key])
        dom.classList.toggle(key, is_present)
    }
  return next_classes
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/style.js
/**
 * @param {Element & ElementCSSInlineStyle} dom
 * @param {Record<string, any>} prev
 * @param {Record<string, any>} next
 * @param {string} [priority]
 */
function update_styles(dom, prev = {}, next, priority) {
  for (var key in next) {
    var value = next[key]
    if (prev[key] !== value)
      if (next[key] == null) dom.style.removeProperty(key)
      else dom.style.setProperty(key, value, priority)
  }
}
/**
 * @param {Element & ElementCSSInlineStyle} dom
 * @param {string | null} value
 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [prev_styles]
 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [next_styles]
 */
function set_style(dom, value, prev_styles, next_styles) {
  var prev = dom.__style
  if (hydrating || prev !== value) {
    var next_style_attr = to_style(value, next_styles)
    if (!hydrating || next_style_attr !== dom.getAttribute('style'))
      if (next_style_attr == null) dom.removeAttribute('style')
      else dom.style.cssText = next_style_attr
    dom.__style = value
  } else if (next_styles)
    if (Array.isArray(next_styles)) {
      update_styles(dom, prev_styles?.[0], next_styles[0])
      update_styles(dom, prev_styles?.[1], next_styles[1], 'important')
    } else update_styles(dom, prev_styles, next_styles)
  return next_styles
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
/**
 * Selects the correct option(s) (depending on whether this is a multiple select)
 * @template V
 * @param {HTMLSelectElement} select
 * @param {V} value
 * @param {boolean} mounting
 */
function select_option(select, value, mounting = false) {
  if (select.multiple) {
    if (value == void 0) return
    if (!is_array(value)) return select_multiple_invalid_value()
    for (var option of select.options) option.selected = value.includes(get_option_value(option))
    return
  }
  for (option of select.options)
    if (is(get_option_value(option), value)) {
      option.selected = true
      return
    }
  if (!mounting || value !== void 0) select.selectedIndex = -1
}
/**
 * Selects the correct option(s) if `value` is given,
 * and then sets up a mutation observer to sync the
 * current selection to the dom when it changes. Such
 * changes could for example occur when options are
 * inside an `#each` block.
 * @param {HTMLSelectElement} select
 */
function init_select(select) {
  var observer = new MutationObserver(() => {
    select_option(select, select.__value)
  })
  observer.observe(select, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['value']
  })
  teardown(() => {
    observer.disconnect()
  })
}
/**
 * @param {HTMLSelectElement} select
 * @param {() => unknown} get
 * @param {(value: unknown) => void} set
 * @returns {void}
 */
function bind_select_value(select, get, set = get) {
  var batches = /* @__PURE__ */ new WeakSet()
  var mounting = true
  listen_to_event_and_reset_event(select, 'change', is_reset => {
    var query = is_reset ? '[selected]' : ':checked'
    /** @type {unknown} */
    var value
    if (select.multiple) value = [].map.call(select.querySelectorAll(query), get_option_value)
    else {
      /** @type {HTMLOptionElement | null} */
      var selected_option =
        select.querySelector(query) ?? select.querySelector('option:not([disabled])')
      value = selected_option && get_option_value(selected_option)
    }
    set(value)
    if (current_batch !== null) batches.add(current_batch)
  })
  effect(() => {
    var value = get()
    if (select === document.activeElement) {
      var batch = previous_batch ?? current_batch
      if (batches.has(batch)) return
    }
    select_option(select, value, mounting)
    if (mounting && value === void 0) {
      /** @type {HTMLOptionElement | null} */
      var selected_option = select.querySelector(':checked')
      if (selected_option !== null) {
        value = get_option_value(selected_option)
        set(value)
      }
    }
    select.__value = value
    mounting = false
  })
  init_select(select)
}
/** @param {HTMLOptionElement} option */
function get_option_value(option) {
  if ('__value' in option) return option.__value
  else return option.value
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/attributes.js
/** @import { Blocker, Effect } from '#client' */
const CLASS = Symbol('class')
const STYLE = Symbol('style')
const IS_CUSTOM_ELEMENT = Symbol('is custom element')
const IS_HTML = Symbol('is html')
const LINK_TAG = IS_XHTML ? 'link' : 'LINK'
const INPUT_TAG = IS_XHTML ? 'input' : 'INPUT'
const OPTION_TAG = IS_XHTML ? 'option' : 'OPTION'
const SELECT_TAG = IS_XHTML ? 'select' : 'SELECT'
const PROGRESS_TAG = IS_XHTML ? 'progress' : 'PROGRESS'
/**
 * The value/checked attribute in the template actually corresponds to the defaultValue property, so we need
 * to remove it upon hydration to avoid a bug when someone resets the form value.
 * @param {HTMLInputElement} input
 * @returns {void}
 */
function remove_input_defaults(input) {
  if (!hydrating) return
  var already_removed = false
  var remove_defaults = () => {
    if (already_removed) return
    already_removed = true
    if (input.hasAttribute('value')) {
      var value = input.value
      set_attribute(input, 'value', null)
      input.value = value
    }
    if (input.hasAttribute('checked')) {
      var checked = input.checked
      set_attribute(input, 'checked', null)
      input.checked = checked
    }
  }
  input.__on_r = remove_defaults
  queue_micro_task(remove_defaults)
  add_form_reset_listener()
}
/**
 * @param {Element} element
 * @param {any} value
 */
function set_value(element, value) {
  var attributes = get_attributes(element)
  if (
    attributes.value === (attributes.value = value ?? void 0) ||
    (element.value === value && (value !== 0 || element.nodeName !== PROGRESS_TAG))
  )
    return
  element.value = value ?? ''
}
/**
 * @param {Element} element
 * @param {boolean} checked
 */
function set_checked(element, checked) {
  var attributes = get_attributes(element)
  if (attributes.checked === (attributes.checked = checked ?? void 0)) return
  element.checked = checked
}
/**
 * Sets the `selected` attribute on an `option` element.
 * Not set through the property because that doesn't reflect to the DOM,
 * which means it wouldn't be taken into account when a form is reset.
 * @param {HTMLOptionElement} element
 * @param {boolean} selected
 */
function set_selected(element, selected) {
  if (selected) {
    if (!element.hasAttribute('selected')) element.setAttribute('selected', '')
  } else element.removeAttribute('selected')
}
/**
 * Applies the default checked property without influencing the current checked property.
 * @param {HTMLInputElement} element
 * @param {boolean} checked
 */
function set_default_checked(element, checked) {
  const existing_value = element.checked
  element.defaultChecked = checked
  element.checked = existing_value
}
/**
 * Applies the default value property without influencing the current value property.
 * @param {HTMLInputElement | HTMLTextAreaElement} element
 * @param {string} value
 */
function set_default_value(element, value) {
  const existing_value = element.value
  element.defaultValue = value
  element.value = existing_value
}
/**
 * @param {Element} element
 * @param {string} attribute
 * @param {string | null} value
 * @param {boolean} [skip_warning]
 */
function set_attribute(element, attribute, value, skip_warning) {
  var attributes = get_attributes(element)
  if (hydrating) {
    attributes[attribute] = element.getAttribute(attribute)
    if (
      attribute === 'src' ||
      attribute === 'srcset' ||
      (attribute === 'href' && element.nodeName === LINK_TAG)
    ) {
      if (!skip_warning) check_src_in_dev_hydration(element, attribute, value ?? '')
      return
    }
  }
  if (attributes[attribute] === (attributes[attribute] = value)) return
  if (attribute === 'loading') element[LOADING_ATTR_SYMBOL] = value
  if (value == null) element.removeAttribute(attribute)
  else if (typeof value !== 'string' && get_setters(element).includes(attribute))
    element[attribute] = value
  else element.setAttribute(attribute, value)
}
/**
 * @param {Element} dom
 * @param {string} attribute
 * @param {string} value
 */
function set_xlink_attribute(dom, attribute, value) {
  dom.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value)
}
/**
 * @param {HTMLElement} node
 * @param {string} prop
 * @param {any} value
 */
function set_custom_element_data(node, prop, value) {
  var previous_reaction = active_reaction
  var previous_effect = active_effect
  let was_hydrating = hydrating
  if (hydrating) set_hydrating(false)
  set_active_reaction(null)
  set_active_effect(null)
  try {
    if (
      prop !== 'style' &&
      (setters_cache.has(node.getAttribute('is') || node.nodeName) ||
      !customElements ||
      customElements.get(node.getAttribute('is') || node.nodeName.toLowerCase())
        ? get_setters(node).includes(prop)
        : value && typeof value === 'object')
    )
      node[prop] = value
    else set_attribute(node, prop, value == null ? value : String(value))
  } finally {
    set_active_reaction(previous_reaction)
    set_active_effect(previous_effect)
    if (was_hydrating) set_hydrating(true)
  }
}
/**
 * Spreads attributes onto a DOM element, taking into account the currently set attributes
 * @param {Element & ElementCSSInlineStyle} element
 * @param {Record<string | symbol, any> | undefined} prev
 * @param {Record<string | symbol, any>} next New attributes - this function mutates this object
 * @param {string} [css_hash]
 * @param {boolean} [should_remove_defaults]
 * @param {boolean} [skip_warning]
 * @returns {Record<string, any>}
 */
function set_attributes(
  element,
  prev,
  next,
  css_hash,
  should_remove_defaults = false,
  skip_warning = false
) {
  if (hydrating && should_remove_defaults && element.nodeName === INPUT_TAG) {
    var input = element
    if (!((input.type === 'checkbox' ? 'defaultChecked' : 'defaultValue') in next))
      remove_input_defaults(input)
  }
  var attributes = get_attributes(element)
  var is_custom_element = attributes[IS_CUSTOM_ELEMENT]
  var preserve_attribute_case = !attributes[IS_HTML]
  let is_hydrating_custom_element = hydrating && is_custom_element
  if (is_hydrating_custom_element) set_hydrating(false)
  var current = prev || {}
  var is_option_element = element.nodeName === OPTION_TAG
  for (var key in prev) if (!(key in next)) next[key] = null
  if (next.class) next.class = clsx(next.class)
  else if (css_hash || next[CLASS]) next.class = null
  if (next[STYLE]) next.style ??= null
  var setters = get_setters(element)
  for (const key in next) {
    let value = next[key]
    if (is_option_element && key === 'value' && value == null) {
      element.value = element.__value = ''
      current[key] = value
      continue
    }
    if (key === 'class') {
      set_class(
        element,
        element.namespaceURI === 'http://www.w3.org/1999/xhtml',
        value,
        css_hash,
        prev?.[CLASS],
        next[CLASS]
      )
      current[key] = value
      current[CLASS] = next[CLASS]
      continue
    }
    if (key === 'style') {
      set_style(element, value, prev?.[STYLE], next[STYLE])
      current[key] = value
      current[STYLE] = next[STYLE]
      continue
    }
    var prev_value = current[key]
    if (value === prev_value && !(value === void 0 && element.hasAttribute(key))) continue
    current[key] = value
    var prefix = key[0] + key[1]
    if (prefix === '$$') continue
    if (prefix === 'on') {
      /** @type {{ capture?: true }} */
      const opts = {}
      const event_handle_key = '$$' + key
      let event_name = key.slice(2)
      var is_delegated = can_delegate_event(event_name)
      if (is_capture_event(event_name)) {
        event_name = event_name.slice(0, -7)
        opts.capture = true
      }
      if (!is_delegated && prev_value) {
        if (value != null) continue
        element.removeEventListener(event_name, current[event_handle_key], opts)
        current[event_handle_key] = null
      }
      if (is_delegated) {
        delegated(event_name, element, value)
        delegate([event_name])
      } else if (value != null) {
        /**
         * @this {any}
         * @param {Event} evt
         */
        function handle(evt) {
          current[key].call(this, evt)
        }
        current[event_handle_key] = create_event(event_name, element, handle, opts)
      }
    } else if (key === 'style') set_attribute(element, key, value)
    else if (key === 'autofocus') autofocus(element, Boolean(value))
    else if (!is_custom_element && (key === '__value' || (key === 'value' && value != null)))
      element.value = element.__value = value
    else if (key === 'selected' && is_option_element) set_selected(element, value)
    else {
      var name = key
      if (!preserve_attribute_case) name = normalize_attribute(name)
      var is_default = name === 'defaultValue' || name === 'defaultChecked'
      if (value == null && !is_custom_element && !is_default) {
        attributes[key] = null
        if (name === 'value' || name === 'checked') {
          let input = element
          const use_default = prev === void 0
          if (name === 'value') {
            let previous = input.defaultValue
            input.removeAttribute(name)
            input.defaultValue = previous
            input.value = input.__value = use_default ? previous : null
          } else {
            let previous = input.defaultChecked
            input.removeAttribute(name)
            input.defaultChecked = previous
            input.checked = use_default ? previous : false
          }
        } else element.removeAttribute(key)
      } else if (
        is_default ||
        (setters.includes(name) && (is_custom_element || typeof value !== 'string'))
      ) {
        element[name] = value
        if (name in attributes) attributes[name] = UNINITIALIZED
      } else if (typeof value !== 'function') set_attribute(element, name, value, skip_warning)
    }
  }
  if (is_hydrating_custom_element) set_hydrating(true)
  return current
}
/**
 * @param {Element & ElementCSSInlineStyle} element
 * @param {(...expressions: any) => Record<string | symbol, any>} fn
 * @param {Array<() => any>} sync
 * @param {Array<() => Promise<any>>} async
 * @param {Blocker[]} blockers
 * @param {string} [css_hash]
 * @param {boolean} [should_remove_defaults]
 * @param {boolean} [skip_warning]
 */
function attribute_effect(
  element,
  fn,
  sync = [],
  async = [],
  blockers = [],
  css_hash,
  should_remove_defaults = false,
  skip_warning = false
) {
  flatten(blockers, sync, async, values => {
    /** @type {Record<string | symbol, any> | undefined} */
    var prev = void 0
    /** @type {Record<symbol, Effect>} */
    var effects = {}
    var is_select = element.nodeName === SELECT_TAG
    var inited = false
    managed(() => {
      var next = fn(...values.map(get$1))
      /** @type {Record<string | symbol, any>} */
      var current = set_attributes(
        element,
        prev,
        next,
        css_hash,
        should_remove_defaults,
        skip_warning
      )
      if (inited && is_select && 'value' in next) select_option(element, next.value)
      for (let symbol of Object.getOwnPropertySymbols(effects))
        if (!next[symbol]) destroy_effect(effects[symbol])
      for (let symbol of Object.getOwnPropertySymbols(next)) {
        var n = next[symbol]
        if (symbol.description === ATTACHMENT_KEY && (!prev || n !== prev[symbol])) {
          if (effects[symbol]) destroy_effect(effects[symbol])
          effects[symbol] = branch(() => attach(element, () => n))
        }
        current[symbol] = n
      }
      prev = current
    })
    if (is_select) {
      var select = element
      effect(() => {
        select_option(
          select,
          /** @type {Record<string | symbol, any>} */
          prev.value,
          true
        )
        init_select(select)
      })
    }
    inited = true
  })
}
/**
 *
 * @param {Element} element
 */
function get_attributes(element) {
  return (element.__attributes ??= {
    [IS_CUSTOM_ELEMENT]: element.nodeName.includes('-'),
    [IS_HTML]: element.namespaceURI === NAMESPACE_HTML
  })
}
/** @type {Map<string, string[]>} */
var setters_cache = /* @__PURE__ */ new Map()
/** @param {Element} element */
function get_setters(element) {
  var cache_key = element.getAttribute('is') || element.nodeName
  var setters = setters_cache.get(cache_key)
  if (setters) return setters
  setters_cache.set(cache_key, (setters = []))
  var descriptors
  var proto = element
  var element_proto = Element.prototype
  while (element_proto !== proto) {
    descriptors = get_descriptors(proto)
    for (var key in descriptors) if (descriptors[key].set) setters.push(key)
    proto = get_prototype_of(proto)
  }
  return setters
}
/**
 * @param {any} element
 * @param {string} attribute
 * @param {string} value
 */
function check_src_in_dev_hydration(element, attribute, value) {
  if (!dev_fallback_default) return
  if (attribute === 'srcset' && srcset_url_equal(element, value)) return
  if (src_url_equal(element.getAttribute(attribute) ?? '', value)) return
  hydration_attribute_changed(
    attribute,
    element.outerHTML.replace(element.innerHTML, element.innerHTML && '...'),
    String(value)
  )
}
/**
 * @param {string} element_src
 * @param {string} url
 * @returns {boolean}
 */
function src_url_equal(element_src, url) {
  if (element_src === url) return true
  return new URL(element_src, document.baseURI).href === new URL(url, document.baseURI).href
}
/** @param {string} srcset */
function split_srcset(srcset) {
  return srcset.split(',').map(src => src.trim().split(' ').filter(Boolean))
}
/**
 * @param {HTMLSourceElement | HTMLImageElement} element
 * @param {string} srcset
 * @returns {boolean}
 */
function srcset_url_equal(element, srcset) {
  var element_urls = split_srcset(element.srcset)
  var urls = split_srcset(srcset)
  return (
    urls.length === element_urls.length &&
    urls.every(
      ([url, width], i) =>
        width === element_urls[i][1] &&
        (src_url_equal(element_urls[i][0], url) || src_url_equal(url, element_urls[i][0]))
    )
  )
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/customizable-select.js
/** @type {boolean | null} */
let supported = null
/**
 * Checks if the browser supports rich HTML content inside `<option>` elements.
 * Modern browsers preserve HTML elements inside options, while older browsers
 * strip them during parsing, leaving only text content.
 * @returns {boolean}
 */
function is_supported() {
  if (supported === null) {
    var select = create_element('select')
    select.innerHTML = create_trusted_html('<option><span>t</span></option>')
    supported = select.firstChild?.firstChild?.nodeType === 1
  }
  return supported
}
/**
 *
 * @param {HTMLElement} element
 * @param {(new_element: HTMLElement) => void} update_element
 */
function selectedcontent(element, update_element) {
  if (!is_supported()) return
  attach(element, () => () => {
    const select = element.closest('select')
    if (!select) return
    const observer = new MutationObserver(entries => {
      var selected = false
      for (const entry of entries) {
        if (entry.target === element) return
        selected ||= !!entry.target.parentElement?.closest('option')?.selected
      }
      if (selected) {
        element.replaceWith((element = element.cloneNode(true)))
        update_element(element)
      }
    })
    observer.observe(select, {
      childList: true,
      characterData: true,
      subtree: true
    })
    return () => {
      observer.disconnect()
    }
  })
}
/**
 * Handles rich HTML content inside `<option>`, `<optgroup>`, or `<select>` elements with browser-specific branching.
 * Modern browsers preserve HTML inside options, while older browsers strip it to text only.
 *
 * @param {HTMLOptionElement | HTMLOptGroupElement | HTMLSelectElement} element The element to process
 * @param {() => void} rich_fn Function to process rich HTML content (modern browsers)
 */
function customizable_select(element, rich_fn) {
  var was_hydrating = hydrating
  if (!is_supported()) {
    set_hydrating(false)
    element.textContent = ''
    element.append(create_comment(''))
  }
  try {
    rich_fn()
  } finally {
    if (was_hydrating)
      if (hydrating) reset(element)
      else {
        set_hydrating(true)
        set_hydrate_node(element)
      }
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/document.js
/**
 * @param {(activeElement: Element | null) => void} update
 * @returns {void}
 */
function bind_active_element(update) {
  listen(document, ['focusin', 'focusout'], event => {
    if (event && event.type === 'focusout' && event.relatedTarget) return
    update(document.activeElement)
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
/** @import { Batch } from '../../../reactivity/batch.js' */
/**
 * @param {HTMLInputElement} input
 * @param {() => unknown} get
 * @param {(value: unknown) => void} set
 * @returns {void}
 */
function bind_value(input, get, set = get) {
  var batches = /* @__PURE__ */ new WeakSet()
  listen_to_event_and_reset_event(input, 'input', async is_reset => {
    if (dev_fallback_default && input.type === 'checkbox') bind_invalid_checkbox_value()
    /** @type {any} */
    var value = is_reset ? input.defaultValue : input.value
    value = is_numberlike_input(input) ? to_number(value) : value
    set(value)
    if (current_batch !== null) batches.add(current_batch)
    await tick()
    if (value !== (value = get())) {
      var start = input.selectionStart
      var end = input.selectionEnd
      var length = input.value.length
      input.value = value ?? ''
      if (end !== null) {
        var new_length = input.value.length
        if (start === end && end === length && new_length > length) {
          input.selectionStart = new_length
          input.selectionEnd = new_length
        } else {
          input.selectionStart = start
          input.selectionEnd = Math.min(end, new_length)
        }
      }
    }
  })
  if ((hydrating && input.defaultValue !== input.value) || (untrack(get) == null && input.value)) {
    set(is_numberlike_input(input) ? to_number(input.value) : input.value)
    if (current_batch !== null) batches.add(current_batch)
  }
  render_effect(() => {
    if (dev_fallback_default && input.type === 'checkbox') bind_invalid_checkbox_value()
    var value = get()
    if (input === document.activeElement) {
      var batch = previous_batch ?? current_batch
      if (batches.has(batch)) return
    }
    if (is_numberlike_input(input) && value === to_number(input.value)) return
    if (input.type === 'date' && !value && !input.value) return
    if (value !== input.value) input.value = value ?? ''
  })
}
/** @type {Set<HTMLInputElement[]>} */
const pending = /* @__PURE__ */ new Set()
/**
 * @param {HTMLInputElement[]} inputs
 * @param {null | [number]} group_index
 * @param {HTMLInputElement} input
 * @param {() => unknown} get
 * @param {(value: unknown) => void} set
 * @returns {void}
 */
function bind_group(inputs, group_index, input, get, set = get) {
  var is_checkbox = input.getAttribute('type') === 'checkbox'
  var binding_group = inputs
  let hydration_mismatch = false
  if (group_index !== null)
    for (var index of group_index) binding_group = binding_group[index] ??= []
  binding_group.push(input)
  listen_to_event_and_reset_event(
    input,
    'change',
    () => {
      var value = input.__value
      if (is_checkbox) value = get_binding_group_value(binding_group, value, input.checked)
      set(value)
    },
    () => set(is_checkbox ? [] : null)
  )
  render_effect(() => {
    var value = get()
    if (hydrating && input.defaultChecked !== input.checked) {
      hydration_mismatch = true
      return
    }
    if (is_checkbox) {
      value = value || []
      input.checked = value.includes(input.__value)
    } else input.checked = is(input.__value, value)
  })
  teardown(() => {
    var index = binding_group.indexOf(input)
    if (index !== -1) binding_group.splice(index, 1)
  })
  if (!pending.has(binding_group)) {
    pending.add(binding_group)
    queue_micro_task(() => {
      binding_group.sort((a, b) => (a.compareDocumentPosition(b) === 4 ? -1 : 1))
      pending.delete(binding_group)
    })
  }
  queue_micro_task(() => {
    if (hydration_mismatch) {
      var value
      if (is_checkbox) value = get_binding_group_value(binding_group, value, input.checked)
      else value = binding_group.find(input => input.checked)?.__value
      set(value)
    }
  })
}
/**
 * @param {HTMLInputElement} input
 * @param {() => unknown} get
 * @param {(value: unknown) => void} set
 * @returns {void}
 */
function bind_checked(input, get, set = get) {
  listen_to_event_and_reset_event(input, 'change', is_reset => {
    set(is_reset ? input.defaultChecked : input.checked)
  })
  if ((hydrating && input.defaultChecked !== input.checked) || untrack(get) == null)
    set(input.checked)
  render_effect(() => {
    var value = get()
    input.checked = Boolean(value)
  })
}
/**
 * @template V
 * @param {Array<HTMLInputElement>} group
 * @param {V} __value
 * @param {boolean} checked
 * @returns {V[]}
 */
function get_binding_group_value(group, __value, checked) {
  /** @type {Set<V>} */
  var value = /* @__PURE__ */ new Set()
  for (var i = 0; i < group.length; i += 1) if (group[i].checked) value.add(group[i].__value)
  if (!checked) value.delete(__value)
  return Array.from(value)
}
/**
 * @param {HTMLInputElement} input
 */
function is_numberlike_input(input) {
  var type = input.type
  return type === 'number' || type === 'range'
}
/**
 * @param {string} value
 */
function to_number(value) {
  return value === '' ? null : +value
}
/**
 * @param {HTMLInputElement} input
 * @param {() => FileList | null} get
 * @param {(value: FileList | null) => void} set
 */
function bind_files(input, get, set = get) {
  listen_to_event_and_reset_event(input, 'change', () => {
    set(input.files)
  })
  if (hydrating && input.files) set(input.files)
  render_effect(() => {
    input.files = get()
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/media.js
/** @param {TimeRanges} ranges */
function time_ranges_to_array(ranges) {
  var array = []
  for (var i = 0; i < ranges.length; i += 1)
    array.push({
      start: ranges.start(i),
      end: ranges.end(i)
    })
  return array
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {() => number | undefined} get
 * @param {(value: number) => void} set
 * @returns {void}
 */
function bind_current_time(media, get, set = get) {
  /** @type {number} */
  var raf_id
  /** @type {number} */
  var value
  var callback = () => {
    cancelAnimationFrame(raf_id)
    if (!media.paused) raf_id = requestAnimationFrame(callback)
    var next_value = media.currentTime
    if (value !== next_value) set((value = next_value))
  }
  raf_id = requestAnimationFrame(callback)
  media.addEventListener('timeupdate', callback)
  render_effect(() => {
    var next_value = Number(get())
    if (value !== next_value && !isNaN(next_value)) media.currentTime = value = next_value
  })
  teardown(() => {
    cancelAnimationFrame(raf_id)
    media.removeEventListener('timeupdate', callback)
  })
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {(array: Array<{ start: number; end: number }>) => void} set
 */
function bind_buffered(media, set) {
  /** @type {{ start: number; end: number; }[]} */
  var current
  listen(media, ['loadedmetadata', 'progress', 'timeupdate', 'seeking'], () => {
    var ranges = media.buffered
    if (
      !current ||
      current.length !== ranges.length ||
      current.some((range, i) => ranges.start(i) !== range.start || ranges.end(i) !== range.end)
    ) {
      current = time_ranges_to_array(ranges)
      set(current)
    }
  })
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {(array: Array<{ start: number; end: number }>) => void} set
 */
function bind_seekable(media, set) {
  listen(media, ['loadedmetadata'], () => set(time_ranges_to_array(media.seekable)))
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {(array: Array<{ start: number; end: number }>) => void} set
 */
function bind_played(media, set) {
  listen(media, ['timeupdate'], () => set(time_ranges_to_array(media.played)))
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {(seeking: boolean) => void} set
 */
function bind_seeking(media, set) {
  listen(media, ['seeking', 'seeked'], () => set(media.seeking))
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {(seeking: boolean) => void} set
 */
function bind_ended(media, set) {
  listen(media, ['timeupdate', 'ended'], () => set(media.ended))
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {(ready_state: number) => void} set
 */
function bind_ready_state(media, set) {
  listen(
    media,
    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'waiting', 'emptied'],
    () => set(media.readyState)
  )
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {() => number | undefined} get
 * @param {(playback_rate: number) => void} set
 */
function bind_playback_rate(media, get, set = get) {
  effect(() => {
    var value = Number(get())
    if (value !== media.playbackRate && !isNaN(value)) media.playbackRate = value
  })
  effect(() => {
    listen(media, ['ratechange'], () => {
      set(media.playbackRate)
    })
  })
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {() => boolean | undefined} get
 * @param {(paused: boolean) => void} set
 */
function bind_paused(media, get, set = get) {
  var paused = get()
  var update = () => {
    if (paused !== media.paused) set((paused = media.paused))
  }
  listen(media, ['play', 'pause', 'canplay'], update, paused == null)
  effect(() => {
    if ((paused = !!get()) !== media.paused)
      if (paused) media.pause()
      else
        media.play().catch(error => {
          set((paused = true))
          throw error
        })
  })
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {() => number | undefined} get
 * @param {(volume: number) => void} set
 */
function bind_volume(media, get, set = get) {
  var callback = () => {
    set(media.volume)
  }
  if (get() == null) callback()
  listen(media, ['volumechange'], callback, false)
  render_effect(() => {
    var value = Number(get())
    if (value !== media.volume && !isNaN(value)) media.volume = value
  })
}
/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @param {() => boolean | undefined} get
 * @param {(muted: boolean) => void} set
 */
function bind_muted(media, get, set = get) {
  var callback = () => {
    set(media.muted)
  }
  if (get() == null) callback()
  listen(media, ['volumechange'], callback, false)
  render_effect(() => {
    var value = !!get()
    if (media.muted !== value) media.muted = value
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/navigator.js
/**
 * @param {(online: boolean) => void} update
 * @returns {void}
 */
function bind_online(update) {
  listen(window, ['online', 'offline'], () => {
    update(navigator.onLine)
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/props.js
/**
 * Makes an `export`ed (non-prop) variable available on the `$$props` object
 * so that consumers can do `bind:x` on the component.
 * @template V
 * @param {Record<string, unknown>} props
 * @param {string} prop
 * @param {V} value
 * @returns {void}
 */
function bind_prop(props, prop, value) {
  var desc = get_descriptor(props, prop)
  if (desc && desc.set) {
    props[prop] = value
    teardown(() => {
      props[prop] = null
    })
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/size.js
/**
 * We create one listener for all elements
 * @see {@link https://groups.google.com/a/chromium.org/g/blink-dev/c/z6ienONUb5A/m/F5-VcUZtBAAJ Explanation}
 */
var ResizeObserverSingleton = class ResizeObserverSingleton {
  /** */
  #listeners = /* @__PURE__ */ new WeakMap()
  /** @type {ResizeObserver | undefined} */
  #observer
  /** @type {ResizeObserverOptions} */
  #options
  /** @static */
  static entries = /* @__PURE__ */ new WeakMap()
  /** @param {ResizeObserverOptions} options */
  constructor(options) {
    this.#options = options
  }
  /**
   * @param {Element} element
   * @param {(entry: ResizeObserverEntry) => any} listener
   */
  observe(element, listener) {
    var listeners = this.#listeners.get(element) || /* @__PURE__ */ new Set()
    listeners.add(listener)
    this.#listeners.set(element, listeners)
    this.#getObserver().observe(element, this.#options)
    return () => {
      var listeners = this.#listeners.get(element)
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.#listeners.delete(element)
        /** @type {ResizeObserver} */ this.#observer.unobserve(element)
      }
    }
  }
  #getObserver() {
    return (
      this.#observer ??
      (this.#observer = new ResizeObserver(
        /** @param {any} entries */
        entries => {
          for (var entry of entries) {
            ResizeObserverSingleton.entries.set(entry.target, entry)
            for (var listener of this.#listeners.get(entry.target) || []) listener(entry)
          }
        }
      ))
    )
  }
}
var resize_observer_content_box = /* @__PURE__ */ new ResizeObserverSingleton({
  box: 'content-box'
})
var resize_observer_border_box = /* @__PURE__ */ new ResizeObserverSingleton({ box: 'border-box' })
var resize_observer_device_pixel_content_box = /* @__PURE__ */ new ResizeObserverSingleton({
  box: 'device-pixel-content-box'
})
/**
 * @param {Element} element
 * @param {'contentRect' | 'contentBoxSize' | 'borderBoxSize' | 'devicePixelContentBoxSize'} type
 * @param {(entry: keyof ResizeObserverEntry) => void} set
 */
function bind_resize_observer(element, type, set) {
  teardown(
    (type === 'contentRect' || type === 'contentBoxSize'
      ? resize_observer_content_box
      : type === 'borderBoxSize'
        ? resize_observer_border_box
        : resize_observer_device_pixel_content_box
    ).observe(
      element,
      /** @param {any} entry */
      entry => set(entry[type])
    )
  )
}
/**
 * @param {HTMLElement} element
 * @param {'clientWidth' | 'clientHeight' | 'offsetWidth' | 'offsetHeight'} type
 * @param {(size: number) => void} set
 */
function bind_element_size(element, type, set) {
  var unsub = resize_observer_border_box.observe(element, () => set(element[type]))
  effect(() => {
    untrack(() => set(element[type]))
    return unsub
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
/**
 * @param {any} bound_value
 * @param {Element} element_or_component
 * @returns {boolean}
 */
function is_bound_this(bound_value, element_or_component) {
  return (
    bound_value === element_or_component || bound_value?.[STATE_SYMBOL] === element_or_component
  )
}
/**
 * @param {any} element_or_component
 * @param {(value: unknown, ...parts: unknown[]) => void} update
 * @param {(...parts: unknown[]) => unknown} get_value
 * @param {() => unknown[]} [get_parts] Set if the this binding is used inside an each block,
 * 										returns all the parts of the each block context that are used in the expression
 * @returns {void}
 */
function bind_this(element_or_component = {}, update, get_value, get_parts) {
  effect(() => {
    /** @type {unknown[]} */
    var old_parts
    /** @type {unknown[]} */
    var parts
    render_effect(() => {
      old_parts = parts
      parts = get_parts?.() || []
      untrack(() => {
        if (element_or_component !== get_value(...parts)) {
          update(element_or_component, ...parts)
          if (old_parts && is_bound_this(get_value(...old_parts), element_or_component))
            update(null, ...old_parts)
        }
      })
    })
    return () => {
      queue_micro_task(() => {
        if (parts && is_bound_this(get_value(...parts), element_or_component))
          update(null, ...parts)
      })
    }
  })
  return element_or_component
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/universal.js
/**
 * @param {'innerHTML' | 'textContent' | 'innerText'} property
 * @param {HTMLElement} element
 * @param {() => unknown} get
 * @param {(value: unknown) => void} set
 * @returns {void}
 */
function bind_content_editable(property, element, get, set = get) {
  element.addEventListener('input', () => {
    set(element[property])
  })
  render_effect(() => {
    var value = get()
    if (element[property] !== value)
      if (value == null) {
        var non_null_value = element[property]
        set(non_null_value)
      } else element[property] = value + ''
  })
}
/**
 * @param {string} property
 * @param {string} event_name
 * @param {Element} element
 * @param {(value: unknown) => void} set
 * @param {() => unknown} [get]
 * @returns {void}
 */
function bind_property(property, event_name, element, set, get) {
  var handler = () => {
    set(element[property])
  }
  element.addEventListener(event_name, handler)
  if (get)
    render_effect(() => {
      element[property] = get()
    })
  else handler()
  if (element === document.body || element === window || element === document)
    teardown(() => {
      element.removeEventListener(event_name, handler)
    })
}
/**
 * @param {HTMLElement} element
 * @param {(value: unknown) => void} set
 * @returns {void}
 */
function bind_focused(element, set) {
  listen(element, ['focus', 'blur'], () => {
    set(element === document.activeElement)
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/bindings/window.js
/**
 * @param {'x' | 'y'} type
 * @param {() => number} get
 * @param {(value: number) => void} set
 * @returns {void}
 */
function bind_window_scroll(type, get, set = get) {
  var is_scrolling_x = type === 'x'
  var target_handler = () =>
    without_reactive_context(() => {
      scrolling = true
      clearTimeout(timeout)
      timeout = setTimeout(clear, 100)
      set(window[is_scrolling_x ? 'scrollX' : 'scrollY'])
    })
  addEventListener('scroll', target_handler, { passive: true })
  var scrolling = false
  /** @type {ReturnType<typeof setTimeout>} */
  var timeout
  var clear = () => {
    scrolling = false
  }
  var first = true
  render_effect(() => {
    var latest_value = get()
    if (first) first = false
    else if (!scrolling && latest_value != null) {
      scrolling = true
      clearTimeout(timeout)
      if (is_scrolling_x) scrollTo(latest_value, window.scrollY)
      else scrollTo(window.scrollX, latest_value)
      timeout = setTimeout(clear, 100)
    }
  })
  effect(target_handler)
  teardown(() => {
    removeEventListener('scroll', target_handler)
  })
}
/**
 * @param {'innerWidth' | 'innerHeight' | 'outerWidth' | 'outerHeight'} type
 * @param {(size: number) => void} set
 */
function bind_window_size(type, set) {
  listen(window, ['resize'], () => without_reactive_context(() => set(window[type])))
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/legacy/event-modifiers.js
/**
 * Substitute for the `trusted` event modifier
 * @deprecated
 * @param {(event: Event, ...args: Array<unknown>) => void} fn
 * @returns {(event: Event, ...args: unknown[]) => void}
 */
function trusted(fn) {
  return function (...args) {
    if (args[0].isTrusted) fn?.apply(this, args)
  }
}
/**
 * Substitute for the `self` event modifier
 * @deprecated
 * @param {(event: Event, ...args: Array<unknown>) => void} fn
 * @returns {(event: Event, ...args: unknown[]) => void}
 */
function self(fn) {
  return function (...args) {
    if (args[0].target === this) fn?.apply(this, args)
  }
}
/**
 * Substitute for the `stopPropagation` event modifier
 * @deprecated
 * @param {(event: Event, ...args: Array<unknown>) => void} fn
 * @returns {(event: Event, ...args: unknown[]) => void}
 */
function stopPropagation(fn) {
  return function (...args) {
    args[0].stopPropagation()
    return fn?.apply(this, args)
  }
}
/**
 * Substitute for the `once` event modifier
 * @deprecated
 * @param {(event: Event, ...args: Array<unknown>) => void} fn
 * @returns {(event: Event, ...args: unknown[]) => void}
 */
function once(fn) {
  var ran = false
  return function (...args) {
    if (ran) return
    ran = true
    return fn?.apply(this, args)
  }
}
/**
 * Substitute for the `stopImmediatePropagation` event modifier
 * @deprecated
 * @param {(event: Event, ...args: Array<unknown>) => void} fn
 * @returns {(event: Event, ...args: unknown[]) => void}
 */
function stopImmediatePropagation(fn) {
  return function (...args) {
    args[0].stopImmediatePropagation()
    return fn?.apply(this, args)
  }
}
/**
 * Substitute for the `preventDefault` event modifier
 * @deprecated
 * @param {(event: Event, ...args: Array<unknown>) => void} fn
 * @returns {(event: Event, ...args: unknown[]) => void}
 */
function preventDefault(fn) {
  return function (...args) {
    args[0].preventDefault()
    return fn?.apply(this, args)
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/legacy/lifecycle.js
/** @import { ComponentContextLegacy } from '#client' */
/**
 * Legacy-mode only: Call `onMount` callbacks and set up `beforeUpdate`/`afterUpdate` effects
 * @param {boolean} [immutable]
 */
function init(immutable = false) {
  const context = component_context
  const callbacks = context.l.u
  if (!callbacks) return
  let props = () => deep_read_state(context.s)
  if (immutable) {
    let version = 0
    let prev = {}
    const d = /* @__PURE__ */ derived(() => {
      let changed = false
      const props = context.s
      for (const key in props)
        if (props[key] !== prev[key]) {
          prev[key] = props[key]
          changed = true
        }
      if (changed) version++
      return version
    })
    props = () => get$1(d)
  }
  if (callbacks.b.length)
    user_pre_effect(() => {
      observe_all(context, props)
      run_all(callbacks.b)
    })
  user_effect(() => {
    const fns = untrack(() => callbacks.m.map(run$1))
    return () => {
      for (const fn of fns) if (typeof fn === 'function') fn()
    }
  })
  if (callbacks.a.length)
    user_effect(() => {
      observe_all(context, props)
      run_all(callbacks.a)
    })
}
/**
 * Invoke the getter of all signals associated with a component
 * so they can be registered to the effect this function is called in.
 * @param {ComponentContextLegacy} context
 * @param {(() => void)} props
 */
function observe_all(context, props) {
  if (context.l.s) for (const signal of context.l.s) get$1(signal)
  props()
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/legacy/misc.js
/**
 * Under some circumstances, imports may be reactive in legacy mode. In that case,
 * they should be using `reactive_import` as part of the transformation
 * @param {() => any} fn
 */
function reactive_import(fn) {
  var s = source(0)
  return function () {
    if (arguments.length === 1) {
      set(s, get$1(s) + 1)
      return arguments[0]
    } else {
      get$1(s)
      return fn()
    }
  }
}
/**
 * @this {any}
 * @param {Record<string, unknown>} $$props
 * @param {Event} event
 * @returns {void}
 */
function bubble_event($$props, event) {
  var events = $$props.$$events?.[event.type]
  for (var fn of is_array(events) ? events.slice() : events == null ? [] : [events])
    fn.call(this, event)
}
/**
 * Used to simulate `$on` on a component instance when `compatibility.componentApi === 4`
 * @param {Record<string, any>} $$props
 * @param {string} event_name
 * @param {Function} event_callback
 */
function add_legacy_event_listener($$props, event_name, event_callback) {
  $$props.$$events ||= {}
  $$props.$$events[event_name] ||= []
  $$props.$$events[event_name].push(event_callback)
}
/**
 * Used to simulate `$set` on a component instance when `compatibility.componentApi === 4`.
 * Needs component accessors so that it can call the setter of the prop. Therefore doesn't
 * work for updating props in `$$props` or `$$restProps`.
 * @this {Record<string, any>}
 * @param {Record<string, any>} $$new_props
 */
function update_legacy_props($$new_props) {
  for (var key in $$new_props) if (key in this) this[key] = $$new_props[key]
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/store/utils.js
/** @import { Readable } from './public' */
/**
 * @template T
 * @param {Readable<T> | null | undefined} store
 * @param {(value: T) => void} run
 * @param {(value: T) => void} [invalidate]
 * @returns {() => void}
 */
function subscribe_to_store(store, run, invalidate) {
  if (store == null) {
    run(void 0)
    if (invalidate) invalidate(void 0)
    return noop
  }
  const unsub = untrack(() => store.subscribe(run, invalidate))
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/store/shared/index.js
/**
 * Get the current value from a store by subscribing and immediately unsubscribing.
 *
 * @template T
 * @param {Readable<T>} store
 * @returns {T}
 */
function get(store) {
  let value
  subscribe_to_store(store, _ => (value = _))()
  return value
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/store.js
/** @import { StoreReferencesContainer } from '#client' */
/** @import { Store } from '#shared' */
/**
 * Whether or not the prop currently being read is a store binding, as in
 * `<Child bind:x={$y} />`. If it is, we treat the prop as mutable even in
 * runes mode, and skip `binding_property_non_reactive` validation
 */
let is_store_binding = false
let IS_UNMOUNTED = Symbol()
/**
 * Gets the current value of a store. If the store isn't subscribed to yet, it will create a proxy
 * signal that will be updated when the store is. The store references container is needed to
 * track reassignments to stores and to track the correct component context.
 * @template V
 * @param {Store<V> | null | undefined} store
 * @param {string} store_name
 * @param {StoreReferencesContainer} stores
 * @returns {V}
 */
function store_get(store, store_name, stores) {
  const entry = (stores[store_name] ??= {
    store: null,
    source: /* @__PURE__ */ mutable_source(void 0),
    unsubscribe: noop
  })
  if (dev_fallback_default) entry.source.label = store_name
  if (entry.store !== store && !(IS_UNMOUNTED in stores)) {
    entry.unsubscribe()
    entry.store = store ?? null
    if (store == null) {
      entry.source.v = void 0
      entry.unsubscribe = noop
    } else {
      var is_synchronous_callback = true
      entry.unsubscribe = subscribe_to_store(store, v => {
        if (is_synchronous_callback) entry.source.v = v
        else set(entry.source, v)
      })
      is_synchronous_callback = false
    }
  }
  if (store && IS_UNMOUNTED in stores) return get(store)
  return get$1(entry.source)
}
/**
 * Unsubscribe from a store if it's not the same as the one in the store references container.
 * We need this in addition to `store_get` because someone could unsubscribe from a store but
 * then never subscribe to the new one (if any), causing the subscription to stay open wrongfully.
 * @param {Store<any> | null | undefined} store
 * @param {string} store_name
 * @param {StoreReferencesContainer} stores
 */
function store_unsub(store, store_name, stores) {
  /** @type {StoreReferencesContainer[''] | undefined} */
  let entry = stores[store_name]
  if (entry && entry.store !== store) {
    entry.unsubscribe()
    entry.unsubscribe = noop
  }
  return store
}
/**
 * Sets the new value of a store and returns that value.
 * @template V
 * @param {Store<V>} store
 * @param {V} value
 * @returns {V}
 */
function store_set(store, value) {
  store.set(value)
  return value
}
/**
 * @param {StoreReferencesContainer} stores
 * @param {string} store_name
 */
function invalidate_store(stores, store_name) {
  var entry = stores[store_name]
  if (entry.store !== null) store_set(entry.store, entry.source.v)
}
/**
 * Unsubscribes from all auto-subscribed stores on destroy
 * @returns {[StoreReferencesContainer, ()=>void]}
 */
function setup_stores() {
  /** @type {StoreReferencesContainer} */
  const stores = {}
  function cleanup() {
    teardown(() => {
      for (var store_name in stores) stores[store_name].unsubscribe()
      define_property(stores, IS_UNMOUNTED, {
        enumerable: false,
        value: true
      })
    })
  }
  return [stores, cleanup]
}
/**
 * Updates a store with a new value.
 * @param {Store<V>} store  the store to update
 * @param {any} expression  the expression that mutates the store
 * @param {V} new_value  the new store value
 * @template V
 */
function store_mutate(store, expression, new_value) {
  store.set(new_value)
  return expression
}
/**
 * @param {Store<number>} store
 * @param {number} store_value
 * @param {1 | -1} [d]
 * @returns {number}
 */
function update_store(store, store_value, d = 1) {
  store.set(store_value + d)
  return store_value
}
/**
 * @param {Store<number>} store
 * @param {number} store_value
 * @param {1 | -1} [d]
 * @returns {number}
 */
function update_pre_store(store, store_value, d = 1) {
  const value = store_value + d
  store.set(value)
  return value
}
/**
 * Called inside prop getters to communicate that the prop is a store binding
 */
function mark_store_binding() {
  is_store_binding = true
}
/**
 * Returns a tuple that indicates whether `fn()` reads a prop that is a store binding.
 * Used to prevent `binding_property_non_reactive` validation false positives and
 * ensure that these props are treated as mutable even in runes mode
 * @template T
 * @param {() => T} fn
 * @returns {[T, boolean]}
 */
function capture_store_binding(fn) {
  var previous_is_store_binding = is_store_binding
  try {
    is_store_binding = false
    return [fn(), is_store_binding]
  } finally {
    is_store_binding = previous_is_store_binding
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/reactivity/props.js
/** @import { Effect, Source } from './types.js' */
/**
 * @param {((value?: number) => number)} fn
 * @param {1 | -1} [d]
 * @returns {number}
 */
function update_prop(fn, d = 1) {
  const value = fn()
  fn(value + d)
  return value
}
/**
 * @param {((value?: number) => number)} fn
 * @param {1 | -1} [d]
 * @returns {number}
 */
function update_pre_prop(fn, d = 1) {
  const value = fn() + d
  fn(value)
  return value
}
/**
 * The proxy handler for rest props (i.e. `const { x, ...rest } = $props()`).
 * Is passed the full `$$props` object and excludes the named props.
 * @type {ProxyHandler<{ props: Record<string | symbol, unknown>, exclude: Array<string | symbol>, name?: string }>}}
 */
const rest_props_handler = {
  get(target, key) {
    if (target.exclude.includes(key)) return
    return target.props[key]
  },
  set(target, key) {
    if (dev_fallback_default) props_rest_readonly(`${target.name}.${String(key)}`)
    return false
  },
  getOwnPropertyDescriptor(target, key) {
    if (target.exclude.includes(key)) return
    if (key in target.props)
      return {
        enumerable: true,
        configurable: true,
        value: target.props[key]
      }
  },
  has(target, key) {
    if (target.exclude.includes(key)) return false
    return key in target.props
  },
  ownKeys(target) {
    return Reflect.ownKeys(target.props).filter(key => !target.exclude.includes(key))
  }
}
/**
 * @param {Record<string, unknown>} props
 * @param {string[]} exclude
 * @param {string} [name]
 * @returns {Record<string, unknown>}
 */
/* @__NO_SIDE_EFFECTS__ */
function rest_props(props, exclude, name) {
  return new Proxy(
    dev_fallback_default
      ? {
          props,
          exclude,
          name,
          other: {},
          to_proxy: []
        }
      : {
          props,
          exclude
        },
    rest_props_handler
  )
}
/**
 * The proxy handler for legacy $$restProps and $$props
 * @type {ProxyHandler<{ props: Record<string | symbol, unknown>, exclude: Array<string | symbol>, special: Record<string | symbol, (v?: unknown) => unknown>, version: Source<number>, parent_effect: Effect }>}}
 */
const legacy_rest_props_handler = {
  get(target, key) {
    if (target.exclude.includes(key)) return
    get$1(target.version)
    return key in target.special ? target.special[key]() : target.props[key]
  },
  set(target, key, value) {
    if (!(key in target.special)) {
      var previous_effect = active_effect
      try {
        set_active_effect(target.parent_effect)
        /** @type {Record<string, (v?: unknown) => unknown>} */
        target.special[key] = prop(
          {
            get [key]() {
              return target.props[key]
            }
          },
          key,
          PROPS_IS_UPDATED
        )
      } finally {
        set_active_effect(previous_effect)
      }
    }
    target.special[key](value)
    update(target.version)
    return true
  },
  getOwnPropertyDescriptor(target, key) {
    if (target.exclude.includes(key)) return
    if (key in target.props)
      return {
        enumerable: true,
        configurable: true,
        value: target.props[key]
      }
  },
  deleteProperty(target, key) {
    if (target.exclude.includes(key)) return true
    target.exclude.push(key)
    update(target.version)
    return true
  },
  has(target, key) {
    if (target.exclude.includes(key)) return false
    return key in target.props
  },
  ownKeys(target) {
    return Reflect.ownKeys(target.props).filter(key => !target.exclude.includes(key))
  }
}
/**
 * @param {Record<string, unknown>} props
 * @param {string[]} exclude
 * @returns {Record<string, unknown>}
 */
function legacy_rest_props(props, exclude) {
  return new Proxy(
    {
      props,
      exclude,
      special: {},
      version: source(0),
      parent_effect: active_effect
    },
    legacy_rest_props_handler
  )
}
/**
 * The proxy handler for spread props. Handles the incoming array of props
 * that looks like `() => { dynamic: props }, { static: prop }, ..` and wraps
 * them so that the whole thing is passed to the component as the `$$props` argument.
 * @type {ProxyHandler<{ props: Array<Record<string | symbol, unknown> | (() => Record<string | symbol, unknown>)> }>}}
 */
const spread_props_handler = {
  get(target, key) {
    let i = target.props.length
    while (i--) {
      let p = target.props[i]
      if (is_function(p)) p = p()
      if (typeof p === 'object' && p !== null && key in p) return p[key]
    }
  },
  set(target, key, value) {
    let i = target.props.length
    while (i--) {
      let p = target.props[i]
      if (is_function(p)) p = p()
      const desc = get_descriptor(p, key)
      if (desc && desc.set) {
        desc.set(value)
        return true
      }
    }
    return false
  },
  getOwnPropertyDescriptor(target, key) {
    let i = target.props.length
    while (i--) {
      let p = target.props[i]
      if (is_function(p)) p = p()
      if (typeof p === 'object' && p !== null && key in p) {
        const descriptor = get_descriptor(p, key)
        if (descriptor && !descriptor.configurable) descriptor.configurable = true
        return descriptor
      }
    }
  },
  has(target, key) {
    if (key === STATE_SYMBOL || key === LEGACY_PROPS) return false
    for (let p of target.props) {
      if (is_function(p)) p = p()
      if (p != null && key in p) return true
    }
    return false
  },
  ownKeys(target) {
    /** @type {Array<string | symbol>} */
    const keys = []
    for (let p of target.props) {
      if (is_function(p)) p = p()
      if (!p) continue
      for (const key in p) if (!keys.includes(key)) keys.push(key)
      for (const key of Object.getOwnPropertySymbols(p)) if (!keys.includes(key)) keys.push(key)
    }
    return keys
  }
}
/**
 * @param {Array<Record<string, unknown> | (() => Record<string, unknown>)>} props
 * @returns {any}
 */
function spread_props(...props) {
  return new Proxy({ props }, spread_props_handler)
}
/**
 * This function is responsible for synchronizing a possibly bound prop with the inner component state.
 * It is used whenever the compiler sees that the component writes to the prop, or when it has a default prop_value.
 * @template V
 * @param {Record<string, unknown>} props
 * @param {string} key
 * @param {number} flags
 * @param {V | (() => V)} [fallback]
 * @returns {(() => V | ((arg: V) => V) | ((arg: V, mutation: boolean) => V))}
 */
function prop(props, key, flags, fallback) {
  var runes = !legacy_mode_flag || (flags & PROPS_IS_RUNES) !== 0
  var bindable = (flags & PROPS_IS_BINDABLE) !== 0
  var lazy = (flags & PROPS_IS_LAZY_INITIAL) !== 0
  var fallback_value = fallback
  var fallback_dirty = true
  var get_fallback = () => {
    if (fallback_dirty) {
      fallback_dirty = false
      fallback_value = lazy ? untrack(fallback) : fallback
    }
    return fallback_value
  }
  /** @type {((v: V) => void) | undefined} */
  var setter
  if (bindable) {
    var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props
    setter =
      get_descriptor(props, key)?.set ??
      (is_entry_props && key in props ? v => (props[key] = v) : void 0)
  }
  var initial_value
  var is_store_sub = false
  if (bindable) [initial_value, is_store_sub] = capture_store_binding(() => props[key])
  else initial_value = props[key]
  if (initial_value === void 0 && fallback !== void 0) {
    initial_value = get_fallback()
    if (setter) {
      if (runes) props_invalid_value(key)
      setter(initial_value)
    }
  }
  /** @type {() => V} */
  var getter
  if (runes)
    getter = () => {
      var value = props[key]
      if (value === void 0) return get_fallback()
      fallback_dirty = true
      return value
    }
  else
    getter = () => {
      var value = props[key]
      if (value !== void 0) fallback_value = void 0
      return value === void 0 ? fallback_value : value
    }
  if (runes && (flags & PROPS_IS_UPDATED) === 0) return getter
  if (setter) {
    var legacy_parent = props.$$legacy
    return function (value, mutation) {
      if (arguments.length > 0) {
        if (!runes || !mutation || legacy_parent || is_store_sub)
          /** @type {Function} */ setter(mutation ? getter() : value)
        return value
      }
      return getter()
    }
  }
  var overridden = false
  var d = ((flags & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(() => {
    overridden = false
    return getter()
  })
  if (dev_fallback_default) d.label = key
  if (bindable) get$1(d)
  var parent_effect = active_effect
  return function (value, mutation) {
    if (arguments.length > 0) {
      const new_value = mutation ? get$1(d) : runes && bindable ? proxy(value) : value
      set(d, new_value)
      overridden = true
      if (fallback_value !== void 0) fallback_value = new_value
      return value
    }
    if ((is_destroying_effect && overridden) || (parent_effect.f & DESTROYED) !== 0) return d.v
    return get$1(d)
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/validate.js
/** @import { Blocker } from '#client' */
/**
 * @param {string} binding
 * @param {Blocker[]} blockers
 * @param {() => Record<string, any>} get_object
 * @param {() => string} get_property
 * @param {number} line
 * @param {number} column
 */
function validate_binding(binding, blockers, get_object, get_property, line, column) {
  run_after_blockers(blockers, () => {
    var warned = false
    var filename = dev_current_component_function?.[FILENAME]
    render_effect(() => {
      if (warned) return
      var [object, is_store_sub] = capture_store_binding(get_object)
      if (is_store_sub) return
      var property = get_property()
      var ran = false
      var effect = render_effect(() => {
        if (ran) return
        object[property]
      })
      ran = true
      if (effect.deps === null) {
        var location = `${filename}:${line}:${column}`
        binding_property_non_reactive(binding, location)
        warned = true
      }
    })
  })
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/legacy/legacy-client.js
/** @import { ComponentConstructorOptions, ComponentType, SvelteComponent, Component } from 'svelte' */
/**
 * Takes the same options as a Svelte 4 component and the component function and returns a Svelte 4 compatible component.
 *
 * @deprecated Use this only as a temporary solution to migrate your imperative component code to Svelte 5.
 *
 * @template {Record<string, any>} Props
 * @template {Record<string, any>} Exports
 * @template {Record<string, any>} Events
 * @template {Record<string, any>} Slots
 *
 * @param {ComponentConstructorOptions<Props> & {
 * 	component: ComponentType<SvelteComponent<Props, Events, Slots>> | Component<Props>;
 * }} options
 * @returns {SvelteComponent<Props, Events, Slots> & Exports}
 */
function createClassComponent(options) {
  return new Svelte4Component(options)
}
/**
 * Support using the component as both a class and function during the transition period
 * @typedef  {{new (o: ComponentConstructorOptions): SvelteComponent;(...args: Parameters<Component<Record<string, any>>>): ReturnType<Component<Record<string, any>, Record<string, any>>>;}} LegacyComponentType
 */
var Svelte4Component = class {
  /** @type {any} */
  #events
  /** @type {Record<string, any>} */
  #instance
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(options) {
    var sources = /* @__PURE__ */ new Map()
    /**
     * @param {string | symbol} key
     * @param {unknown} value
     */
    var add_source = (key, value) => {
      var s = /* @__PURE__ */ mutable_source(value, false, false)
      sources.set(key, s)
      return s
    }
    const props = new Proxy(
      {
        ...(options.props || {}),
        $$events: {}
      },
      {
        get(target, prop) {
          return get$1(sources.get(prop) ?? add_source(prop, Reflect.get(target, prop)))
        },
        has(target, prop) {
          if (prop === LEGACY_PROPS) return true
          get$1(sources.get(prop) ?? add_source(prop, Reflect.get(target, prop)))
          return Reflect.has(target, prop)
        },
        set(target, prop, value) {
          set(sources.get(prop) ?? add_source(prop, value), value)
          return Reflect.set(target, prop, value)
        }
      }
    )
    this.#instance = (options.hydrate ? hydrate : mount)(options.component, {
      target: options.target,
      anchor: options.anchor,
      props,
      context: options.context,
      intro: options.intro ?? false,
      recover: options.recover,
      transformError: options.transformError
    })
    if (!async_mode_flag && (!options?.props?.$$host || options.sync === false)) flushSync()
    this.#events = props.$$events
    for (const key of Object.keys(this.#instance)) {
      if (key === '$set' || key === '$destroy' || key === '$on') continue
      define_property(this, key, {
        get() {
          return this.#instance[key]
        },
        set(value) {
          this.#instance[key] = value
        },
        enumerable: true
      })
    }
    this.#instance.$set = next => {
      Object.assign(props, next)
    }
    this.#instance.$destroy = () => {
      unmount(this.#instance)
    }
  }
  /** @param {Record<string, any>} props */
  $set(props) {
    this.#instance.$set(props)
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(event, callback) {
    this.#events[event] = this.#events[event] || []
    /** @param {any[]} args */
    const cb = (...args) => callback.call(this, ...args)
    this.#events[event].push(cb)
    return () => {
      this.#events[event] = this.#events[event].filter(
        /** @param {any} fn */
        fn => fn !== cb
      )
    }
  }
  $destroy() {
    this.#instance.$destroy()
  }
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dom/elements/custom-element.js
/**
 * @typedef {Object} CustomElementPropDefinition
 * @property {string} [attribute]
 * @property {boolean} [reflect]
 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
 */
/** @type {any} */
let SvelteElement
if (typeof HTMLElement === 'function')
  SvelteElement = class extends HTMLElement {
    /** The Svelte component constructor */
    $$ctor
    /** Slots */
    $$s
    /** @type {any} The Svelte component instance */
    $$c
    /** Whether or not the custom element is connected */
    $$cn = false
    /** @type {Record<string, any>} Component props data */
    $$d = {}
    /** `true` if currently in the process of reflecting component props back to attributes */
    $$r = false
    /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
    $$p_d = {}
    /** @type {Record<string, EventListenerOrEventListenerObject[]>} Event listeners */
    $$l = {}
    /** @type {Map<EventListenerOrEventListenerObject, Function>} Event listener unsubscribe functions */
    $$l_u = /* @__PURE__ */ new Map()
    /** @type {any} The managed render effect for reflecting attributes */
    $$me
    /** @type {ShadowRoot | null} The ShadowRoot of the custom element */
    $$shadowRoot = null
    /**
     * @param {*} $$componentCtor
     * @param {*} $$slots
     * @param {ShadowRootInit | undefined} shadow_root_init
     */
    constructor($$componentCtor, $$slots, shadow_root_init) {
      super()
      this.$$ctor = $$componentCtor
      this.$$s = $$slots
      if (shadow_root_init) this.$$shadowRoot = this.attachShadow(shadow_root_init)
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener(type, listener, options) {
      this.$$l[type] = this.$$l[type] || []
      this.$$l[type].push(listener)
      if (this.$$c) {
        const unsub = this.$$c.$on(type, listener)
        this.$$l_u.set(listener, unsub)
      }
      super.addEventListener(type, listener, options)
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options)
      if (this.$$c) {
        const unsub = this.$$l_u.get(listener)
        if (unsub) {
          unsub()
          this.$$l_u.delete(listener)
        }
      }
    }
    async connectedCallback() {
      this.$$cn = true
      if (!this.$$c) {
        await Promise.resolve()
        if (!this.$$cn || this.$$c) return
        /** @param {string} name */
        function create_slot(name) {
          /**
           * @param {Element} anchor
           */
          return anchor => {
            const slot = create_element('slot')
            if (name !== 'default') slot.name = name
            append(anchor, slot)
          }
        }
        /** @type {Record<string, any>} */
        const $$slots = {}
        const existing_slots = get_custom_elements_slots(this)
        for (const name of this.$$s)
          if (name in existing_slots)
            if (name === 'default' && !this.$$d.children) {
              this.$$d.children = create_slot(name)
              $$slots.default = true
            } else $$slots[name] = create_slot(name)
        for (const attribute of this.attributes) {
          const name = this.$$g_p(attribute.name)
          if (!(name in this.$$d))
            this.$$d[name] = get_custom_element_value(name, attribute.value, this.$$p_d, 'toProp')
        }
        for (const key in this.$$p_d)
          if (!(key in this.$$d) && this[key] !== void 0) {
            this.$$d[key] = this[key]
            delete this[key]
          }
        this.$$c = createClassComponent({
          component: this.$$ctor,
          target: this.$$shadowRoot || this,
          props: {
            ...this.$$d,
            $$slots,
            $$host: this
          }
        })
        this.$$me = effect_root(() => {
          render_effect(() => {
            this.$$r = true
            for (const key of object_keys(this.$$c)) {
              if (!this.$$p_d[key]?.reflect) continue
              this.$$d[key] = this.$$c[key]
              const attribute_value = get_custom_element_value(
                key,
                this.$$d[key],
                this.$$p_d,
                'toAttribute'
              )
              if (attribute_value == null) this.removeAttribute(this.$$p_d[key].attribute || key)
              else this.setAttribute(this.$$p_d[key].attribute || key, attribute_value)
            }
            this.$$r = false
          })
        })
        for (const type in this.$$l)
          for (const listener of this.$$l[type]) {
            const unsub = this.$$c.$on(type, listener)
            this.$$l_u.set(listener, unsub)
          }
        this.$$l = {}
      }
    }
    /**
     * @param {string} attr
     * @param {string} _oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attr, _oldValue, newValue) {
      if (this.$$r) return
      attr = this.$$g_p(attr)
      this.$$d[attr] = get_custom_element_value(attr, newValue, this.$$p_d, 'toProp')
      this.$$c?.$set({ [attr]: this.$$d[attr] })
    }
    disconnectedCallback() {
      this.$$cn = false
      Promise.resolve().then(() => {
        if (!this.$$cn && this.$$c) {
          this.$$c.$destroy()
          this.$$me()
          this.$$c = void 0
        }
      })
    }
    /**
     * @param {string} attribute_name
     */
    $$g_p(attribute_name) {
      return (
        object_keys(this.$$p_d).find(
          key =>
            this.$$p_d[key].attribute === attribute_name ||
            (!this.$$p_d[key].attribute && key.toLowerCase() === attribute_name)
        ) || attribute_name
      )
    }
  }
/**
 * @param {string} prop
 * @param {any} value
 * @param {Record<string, CustomElementPropDefinition>} props_definition
 * @param {'toAttribute' | 'toProp'} [transform]
 */
function get_custom_element_value(prop, value, props_definition, transform) {
  const type = props_definition[prop]?.type
  value = type === 'Boolean' && typeof value !== 'boolean' ? value != null : value
  if (!transform || !props_definition[prop]) return value
  else if (transform === 'toAttribute')
    switch (type) {
      case 'Object':
      case 'Array':
        return value == null ? null : JSON.stringify(value)
      case 'Boolean':
        return value ? '' : null
      case 'Number':
        return value == null ? null : value
      default:
        return value
    }
  else
    switch (type) {
      case 'Object':
      case 'Array':
        return value && JSON.parse(value)
      case 'Boolean':
        return value
      case 'Number':
        return value != null ? +value : value
      default:
        return value
    }
}
/**
 * @param {HTMLElement} element
 */
function get_custom_elements_slots(element) {
  /** @type {Record<string, true>} */
  const result = {}
  element.childNodes.forEach(node => {
    result[node.slot || 'default'] = true
  })
  return result
}
/**
 * @internal
 *
 * Turn a Svelte component into a custom element.
 * @param {any} Component  A Svelte component function
 * @param {Record<string, CustomElementPropDefinition>} props_definition  The props to observe
 * @param {string[]} slots  The slots to create
 * @param {string[]} exports  Explicitly exported values, other than props
 * @param {ShadowRootInit | undefined} shadow_root_init  Options passed to shadow DOM constructor
 * @param {(ce: new () => HTMLElement) => new () => HTMLElement} [extend]
 */
function create_custom_element(
  Component,
  props_definition,
  slots,
  exports,
  shadow_root_init,
  extend
) {
  let Class = class extends SvelteElement {
    constructor() {
      super(Component, slots, shadow_root_init)
      this.$$p_d = props_definition
    }
    static get observedAttributes() {
      return object_keys(props_definition).map(key =>
        (props_definition[key].attribute || key).toLowerCase()
      )
    }
  }
  object_keys(props_definition).forEach(prop => {
    define_property(Class.prototype, prop, {
      get() {
        return this.$$c && prop in this.$$c ? this.$$c[prop] : this.$$d[prop]
      },
      set(value) {
        value = get_custom_element_value(prop, value, props_definition)
        this.$$d[prop] = value
        var component = this.$$c
        if (component)
          if (get_descriptor(component, prop)?.get) component[prop] = value
          else component.$set({ [prop]: value })
      }
    })
  })
  exports.forEach(property => {
    define_property(Class.prototype, property, {
      get() {
        return this.$$c?.[property]
      }
    })
  })
  if (extend) Class = extend(Class)
  Component.element = Class
  return Class
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/dev/console-log.js
/**
 * @param {string} method
 * @param  {...any} objects
 */
function log_if_contains_state(method, ...objects) {
  untrack(() => {
    try {
      let has_state = false
      const transformed = []
      for (const obj of objects)
        if (obj && typeof obj === 'object' && STATE_SYMBOL in obj) {
          transformed.push(snapshot(obj, true))
          has_state = true
        } else transformed.push(obj)
      if (has_state) {
        console_log_state(method)
        console.log('%c[snapshot]', 'color: grey', ...transformed)
      }
    } catch {}
  })
  return objects
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/internal/client/hydratable.js
/**
 * @template T
 * @param {string} key
 * @param {() => T} fn
 * @returns {T}
 */
function hydratable(key, fn) {
  if (!async_mode_flag) experimental_async_required('hydratable')
  if (hydrating) {
    const store = window.__svelte?.h
    if (store?.has(key)) return store.get(key)
    if (dev_fallback_default) hydratable_missing_but_required(key)
    else hydratable_missing_but_expected(key)
  }
  return fn()
}

//#endregion
//#region node_modules/.pnpm/svelte@5.53.7/node_modules/svelte/src/index-client.js
/** @import { ComponentContext, ComponentContextLegacy } from '#client' */
/** @import { EventDispatcher } from './index.js' */
/** @import { NotFunction } from './internal/types.js' */
if (dev_fallback_default) {
  /**
   * @param {string} rune
   */
  function throw_rune_error(rune) {
    if (!(rune in globalThis)) {
      /** @type {any} */
      let value
      Object.defineProperty(globalThis, rune, {
        configurable: true,
        get: () => {
          if (value !== void 0) return value
          rune_outside_svelte(rune)
        },
        set: v => {
          value = v
        }
      })
    }
  }
  throw_rune_error('$state')
  throw_rune_error('$effect')
  throw_rune_error('$derived')
  throw_rune_error('$inspect')
  throw_rune_error('$props')
  throw_rune_error('$bindable')
}
/**
 * Returns an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that aborts when the current [derived](https://svelte.dev/docs/svelte/$derived) or [effect](https://svelte.dev/docs/svelte/$effect) re-runs or is destroyed.
 *
 * Must be called while a derived or effect is running.
 *
 * ```svelte
 * <script>
 * 	import { getAbortSignal } from 'svelte';
 *
 * 	let { id } = $props();
 *
 * 	async function getData(id) {
 * 		const response = await fetch(`/items/${id}`, {
 * 			signal: getAbortSignal()
 * 		});
 *
 * 		return await response.json();
 * 	}
 *
 * 	const data = $derived(await getData(id));
 * <\/script>
 * ```
 */
function getAbortSignal() {
  if (active_reaction === null) get_abort_signal_outside_reaction()
  return (active_reaction.ac ??= new AbortController()).signal
}
/**
 * `onMount`, like [`$effect`](https://svelte.dev/docs/svelte/$effect), schedules a function to run as soon as the component has been mounted to the DOM.
 * Unlike `$effect`, the provided function only runs once.
 *
 * It must be called during the component's initialisation (but doesn't need to live _inside_ the component;
 * it can be called from an external module). If a function is returned _synchronously_ from `onMount`,
 * it will be called when the component is unmounted.
 *
 * `onMount` functions do not run during [server-side rendering](https://svelte.dev/docs/svelte/svelte-server#render).
 *
 * @template T
 * @param {() => NotFunction<T> | Promise<NotFunction<T>> | (() => any)} fn
 * @returns {void}
 */
function onMount(fn) {
  if (component_context === null) lifecycle_outside_component('onMount')
  if (legacy_mode_flag && component_context.l !== null)
    init_update_callbacks(component_context).m.push(fn)
  else
    user_effect(() => {
      const cleanup = untrack(fn)
      if (typeof cleanup === 'function') return cleanup
    })
}
/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * @param {() => any} fn
 * @returns {void}
 */
function onDestroy(fn) {
  if (component_context === null) lifecycle_outside_component('onDestroy')
  onMount(() => () => untrack(fn))
}
/**
 * @template [T=any]
 * @param {string} type
 * @param {T} [detail]
 * @param {any}params_0
 * @returns {CustomEvent<T>}
 */
function create_custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
  return new CustomEvent(type, {
    detail,
    bubbles,
    cancelable
  })
}
/**
 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs/svelte/legacy-on#Component-events).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
 * ```ts
 * const dispatch = createEventDispatcher<{
 *  loaded: null; // does not take a detail argument
 *  change: string; // takes a detail argument of type string, which is required
 *  optional: number | null; // takes an optional detail argument of type number
 * }>();
 * ```
 *
 * @deprecated Use callback props and/or the `$host()` rune instead — see [migration guide](https://svelte.dev/docs/svelte/v5-migration-guide#Event-changes-Component-events)
 * @template {Record<string, any>} [EventMap = any]
 * @returns {EventDispatcher<EventMap>}
 */
function createEventDispatcher() {
  const active_component_context = component_context
  if (active_component_context === null) lifecycle_outside_component('createEventDispatcher')
  /**
   * @param [detail]
   * @param [options]
   */
  return (type, detail, options) => {
    const events = active_component_context.s.$$events?.[type]
    if (events) {
      const callbacks = is_array(events) ? events.slice() : [events]
      const event = create_custom_event(type, detail, options)
      for (const fn of callbacks) fn.call(active_component_context.x, event)
      return !event.defaultPrevented
    }
    return true
  }
}
/**
 * Schedules a callback to run immediately before the component is updated after any state change.
 *
 * The first time the callback runs will be before the initial `onMount`.
 *
 * In runes mode use `$effect.pre` instead.
 *
 * @deprecated Use [`$effect.pre`](https://svelte.dev/docs/svelte/$effect#$effect.pre) instead
 * @param {() => void} fn
 * @returns {void}
 */
function beforeUpdate(fn) {
  if (component_context === null) lifecycle_outside_component('beforeUpdate')
  if (component_context.l === null) lifecycle_legacy_only('beforeUpdate')
  init_update_callbacks(component_context).b.push(fn)
}
/**
 * Schedules a callback to run immediately after the component has been updated.
 *
 * The first time the callback runs will be after the initial `onMount`.
 *
 * In runes mode use `$effect` instead.
 *
 * @deprecated Use [`$effect`](https://svelte.dev/docs/svelte/$effect) instead
 * @param {() => void} fn
 * @returns {void}
 */
function afterUpdate(fn) {
  if (component_context === null) lifecycle_outside_component('afterUpdate')
  if (component_context.l === null) lifecycle_legacy_only('afterUpdate')
  init_update_callbacks(component_context).a.push(fn)
}
/**
 * Legacy-mode: Init callbacks object for onMount/beforeUpdate/afterUpdate
 * @param {ComponentContext} context
 */
function init_update_callbacks(context) {
  var l = context.l
  return (l.u ??= {
    a: [],
    b: [],
    m: []
  })
}

//#endregion
export {
  bind_played as $,
  autofocus as $n,
  if_block as $t,
  init as A,
  assign_nullish as An,
  add_svelte_meta as Ar,
  attach as At,
  bind_focused as B,
  untrack as Bn,
  trace as Br,
  snippet as Bt,
  store_unsub as C,
  delegated as Cn,
  wait as Cr,
  bind_select_value as Ct,
  bubble_event as D,
  cleanup_styles as Dn,
  flushSync as Dr,
  set_class as Dt,
  add_legacy_event_listener as E,
  add_locations as En,
  eager as Er,
  set_style as Et,
  stopPropagation as F,
  deep_read_state as Fn,
  pop as Fr,
  animation as Ft,
  bind_prop as G,
  effect_root as Gn,
  FILENAME as Gr,
  validate_void_dynamic_element as Gt,
  bind_this as H,
  aborted as Hn,
  hydrate_template as Hr,
  prevent_snippet_stringification as Ht,
  trusted as I,
  get$1 as In,
  push as Ir,
  transition as It,
  bind_current_time as J,
  legacy_pre_effect_reset as Jn,
  invalid_default_snippet as Jr,
  html as Jt,
  bind_online as K,
  effect_tracking as Kn,
  HMR as Kr,
  sanitize_slots as Kt,
  bind_window_scroll as L,
  safe_get as Ln,
  setContext as Lr,
  raf as Lt,
  preventDefault as M,
  createAttachmentKey as Mn,
  getAllContexts as Mr,
  append_styles$1 as Mt,
  self as N,
  active_effect as Nn,
  getContext as Nr,
  head as Nt,
  reactive_import as O,
  assign as On,
  fork as Or,
  attr as Ot,
  stopImmediatePropagation as P,
  deep_read as Pn,
  hasContext as Pr,
  element as Pt,
  bind_playback_rate as Q,
  user_pre_effect as Qn,
  to_array as Qr,
  key as Qt,
  bind_window_size as R,
  settled as Rn,
  tag as Rr,
  component as Rt,
  store_set as S,
  delegate as Sn,
  track_reactivity_loss as Sr,
  set_xlink_attribute as St,
  update_store as T,
  replay_events as Tn,
  pending$1 as Tr,
  select_option as Tt,
  bind_element_size as U,
  deferred_template_effect as Un,
  next as Ur,
  validate_dynamic_element_tag as Ut,
  bind_property as V,
  invalidate_inner_signals as Vn,
  snapshot as Vr,
  wrap_snippet as Vt,
  bind_resize_observer as W,
  effect as Wn,
  reset as Wr,
  validate_store as Wt,
  bind_muted as X,
  template_effect as Xn,
  fallback as Xr,
  index as Xt,
  bind_ended as Y,
  render_effect as Yn,
  exclude_from_object as Yr,
  each as Yt,
  bind_paused as Z,
  user_effect as Zn,
  noop as Zr,
  css_props as Zt,
  invalidate_store as _,
  from_tree as _n,
  user_derived as _r,
  set_custom_element_data as _t,
  onDestroy as a,
  legacy_api as an,
  sibling as ar,
  bind_files as at,
  store_get as b,
  with_script as bn,
  run_after_blockers as br,
  set_selected as bt,
  log_if_contains_state as c,
  hydrate as cn,
  proxy as cr,
  bind_active_element as ct,
  legacy_rest_props as d,
  unmount as dn,
  set as dr,
  CLASS as dt,
  await_block as en,
  remove_textarea_child as er,
  bind_ready_state as et,
  prop as f,
  append as fn,
  state as fr,
  STYLE as ft,
  update_prop as g,
  from_svg as gn,
  derived_safe_equal as gr,
  set_checked as gt,
  update_pre_prop as h,
  from_mathml as hn,
  async_derived as hr,
  set_attribute as ht,
  getAbortSignal as i,
  check_target as in,
  first_child as ir,
  bind_checked as it,
  once as j,
  assign_or as jn,
  createContext as jr,
  action as jt,
  update_legacy_props as k,
  assign_and as kn,
  invoke_error_boundary as kr,
  clsx as kt,
  create_custom_element as l,
  mount as ln,
  mutable_source as lr,
  customizable_select as lt,
  spread_props as m,
  from_html as mn,
  update_pre as mr,
  remove_input_defaults as mt,
  beforeUpdate as n,
  async as nn,
  $window as nr,
  bind_seeking as nt,
  onMount as o,
  create_ownership_validator as on,
  equals as or,
  bind_group as ot,
  rest_props as p,
  comment as pn,
  update as pr,
  attribute_effect as pt,
  bind_buffered as q,
  legacy_pre_effect as qn,
  NAMESPACE_SVG as qr,
  slot as qt,
  createEventDispatcher as r,
  inspect as rn,
  child as rr,
  bind_volume as rt,
  hydratable as s,
  hmr as sn,
  strict_equals as sr,
  bind_value as st,
  afterUpdate as t,
  validate_snippet_args as tn,
  $document as tr,
  bind_seekable as tt,
  validate_binding as u,
  set_text as un,
  mutate as ur,
  selectedcontent as ut,
  mark_store_binding as v,
  props_id as vn,
  for_await_track_reactivity_loss as vr,
  set_default_checked as vt,
  update_pre_store as w,
  event as wn,
  boundary as wr,
  init_select as wt,
  store_mutate as x,
  apply as xn,
  save as xr,
  set_value as xt,
  setup_stores as y,
  text as yn,
  run as yr,
  set_default_value as yt,
  bind_content_editable as z,
  tick as zn,
  tag_proxy as zr,
  createRawSnippet as zt
}
