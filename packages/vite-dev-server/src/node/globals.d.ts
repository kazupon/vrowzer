/**
 * Build-time constant set by rolldown define.
 * - `true` in serviceWorkerConfig (Service Worker bundle)
 * - `false` in transformerConfig (Web Worker bundle)
 *
 * Used in resolvePlugins() to DCE transform plugins from the SW bundle.
 */
declare const __VROWZER_SERVICE_WORKER__: boolean
