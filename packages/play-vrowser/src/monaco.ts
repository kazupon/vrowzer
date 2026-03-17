/**
 * Custom Monaco Editor entry — Web-related languages only.
 *
 * Uses the main 'monaco-editor' entry for full API compatibility (including
 * languages.typescript namespace), but registers only web-related language
 * contributions. Non-web languages are excluded at build time via tree-shaking.
 *
 * Note: In dev mode, all languages from 'monaco-editor' may be loaded because
 * Vite pre-bundles the full package. The language reduction is effective at build time.
 */

export * from 'monaco-editor'
