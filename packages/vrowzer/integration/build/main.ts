/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Vrowzer, VrowzerBuildError } from 'vrowzer'

import type { VrowzerBuildOptions, VrowzerOptions } from 'vrowzer'

// Count the live Workers that the page creates: Vrowzer's Web Worker and the build Workers. The
// Workers that they start themselves (e.g. the threads of rolldown) are not counted.
// Worker is replaced before any Vrowzer instance creates one.
const liveWorkers = new Set<Worker>()
let createdWorkers = 0

class TrackedWorker extends Worker {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    super(scriptURL, options)
    createdWorkers++
    liveWorkers.add(this)
  }

  override terminate(): void {
    liveWorkers.delete(this)
    super.terminate()
  }
}

window.Worker = TrackedWorker

function mainSource(text: string): string {
  return `document.querySelector('#app').innerHTML = '<h1>${text}</h1>'
if (import.meta.hot) { import.meta.hot.accept() }
`
}

const indexSource = [
  "import { add } from './math'",
  "import data from './data.json'",
  "import logoUrl from './logo.svg'",
  "import './style.css'",
  'export { add, logoUrl }',
  'export const version: string = data.version',
  'export default function greet(name: string): string {',
  '  return `Hello, ${name}`',
  '}',
  'export async function loadLazy(): Promise<string> {',
  "  const m = await import('./lazy')",
  '  return m.lazyValue',
  '}',
  'export const mode: string = import.meta.env.MODE',
  'export const prod: boolean = import.meta.env.PROD',
  'export const dev: boolean = import.meta.env.DEV',
  'declare const __APP_FLAG__: string',
  'export const flag: string = __APP_FLAG__',
  ''
].join('\n')

// A library, and the preview of the project
const projectFiles: Record<string, string | ArrayBuffer> = {
  '/package.json': JSON.stringify({ name: 'my-lib', type: 'module' }),
  '/src/index.ts': indexSource,
  '/src/math.ts': [
    'export function add(a: number, b: number): number {',
    '  return a + b',
    '}',
    "export function unused(): string { return 'tree-shaken-away' }",
    ''
  ].join('\n'),
  '/src/lazy.ts': "export const lazyValue: string = 'lazy-chunk-value'\n",
  '/src/data.json': '{"version":"1.2.3"}',
  '/src/style.css': '.lib-title { color: rgb(255, 0, 0); }\n',
  '/src/logo.svg':
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>',
  '/main.js': mainSource('preview v1')
}

// Binary files larger than the inline limit (4 KiB), so that the builds emit them as files
function binary(seed: number): Uint8Array {
  const bytes = new Uint8Array(5000)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + seed) % 256
  }
  return bytes
}
const bigImage = binary(7)
const photo = binary(11)

// An HTML app, with a nested HTML entry
const appFiles: Record<string, string | ArrayBuffer> = {
  '/index.html': [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <title>App</title>',
    '    <link rel="stylesheet" href="/src/global.css" />',
    '  </head>',
    '  <body>',
    '    <div id="app"></div>',
    '    <img id="big" src="/src/big.png" />',
    '    <script type="module" src="/src/main.ts"></script>',
    '  </body>',
    '</html>',
    ''
  ].join('\n'),
  '/src/global.css': '#app { color: rgb(0, 128, 0); }\n',
  '/src/main.ts': [
    "import './style.css'",
    "import smallUrl from './small.svg'",
    "import bigUrl from './big.png?url'",
    "import message from './message.txt?raw'",
    "document.querySelector('#app')!.textContent = 'app ok'",
    "const small = document.createElement('img')",
    "small.id = 'small'",
    'small.src = smallUrl',
    'document.body.append(small)',
    "const photoUrl = new URL('./photo.png', import.meta.url).href",
    'Object.assign(document.body.dataset, { bigUrl, photoUrl, message })',
    "import('./lazy').then(m => {",
    '  document.body.dataset.lazy = m.value',
    '})',
    ''
  ].join('\n'),
  '/src/style.css': '#app { font-weight: 700; }\n',
  '/src/lazy.ts': "import './lazy.css'\nexport const value: string = 'lazy ok'\n",
  '/src/lazy.css': '#app { background-color: rgb(255, 255, 0); }\n',
  '/src/small.svg':
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>',
  '/src/message.txt': 'Hello from a text file\n',
  '/src/big.png': bigImage.slice().buffer,
  '/src/photo.png': photo.slice().buffer,
  '/public/robots.txt': 'User-agent: *\n',
  '/nested/index.html': [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <title>Nested</title>',
    '    <link rel="stylesheet" href="../src/global.css" />',
    '  </head>',
    '  <body>',
    '    <div id="app"></div>',
    '    <script type="module" src="./nested.ts"></script>',
    '  </body>',
    '</html>',
    ''
  ].join('\n'),
  '/nested/nested.ts': "document.querySelector('#app')!.textContent = 'nested ok'\n"
}

// A project with the config of the project: `.env` files, tsconfig, CSS Modules, and a CommonJS
// dependency in the layout of the manifest of `@vrowzer/vite-plugin` with the build option
const configFiles: Record<string, string | ArrayBuffer> = {
  '/index.html': [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <title>Config</title>',
    '  </head>',
    '  <body>',
    '    <div id="app"></div>',
    '    <script type="module" src="/src/main.ts"></script>',
    '  </body>',
    '</html>',
    ''
  ].join('\n'),
  '/.env': [
    'VITE_TITLE=env ok',
    'VITE_GREETING=hello $VITE_TITLE',
    'SECRET_TOKEN=do-not-expose',
    ''
  ].join('\n'),
  '/.env.development': 'VITE_MODE_VALUE=development value\n',
  '/.env.production': 'VITE_MODE_VALUE=production value\n',
  '/.env.local': 'VITE_LOCAL=local value\n',
  // The previews do not read tsconfig, so builds only keep the type-only import of ./types
  '/tsconfig.json': JSON.stringify({ compilerOptions: { verbatimModuleSyntax: true } }),
  '/src/main.ts': [
    "import { type Shape } from './types'",
    "import styles from './styles.module.css'",
    "import fixture from 'cjs-fixture'",
    "const app = document.querySelector('#app')!",
    "app.textContent = 'config ok'",
    'app.className = styles.title',
    "const composed = document.createElement('div')",
    "composed.id = 'composed'",
    'composed.className = styles.composed',
    'document.body.append(composed)',
    "const shape: Shape = { kind: 'square' }",
    'Object.assign(document.body.dataset, {',
    '  title: import.meta.env.VITE_TITLE,',
    '  greeting: import.meta.env.VITE_GREETING,',
    '  modeValue: import.meta.env.VITE_MODE_VALUE,',
    '  local: import.meta.env.VITE_LOCAL,',
    '  secret: String(import.meta.env.SECRET_TOKEN),',
    '  cjs: fixture.mode,',
    '  shape: shape.kind,',
    '  titleClass: styles.title',
    '})',
    ''
  ].join('\n'),
  '/src/types.ts': [
    "document.body.dataset.typesSideEffect = 'ran'",
    'export interface Shape {',
    '  kind: string',
    '}',
    ''
  ].join('\n'),
  '/src/styles.module.css': [
    '.base { font-weight: 700; }',
    '.title { color: rgb(0, 0, 255); }',
    '.composed { composes: base; text-decoration: underline; }',
    ''
  ].join('\n'),
  '/node_modules/cjs-fixture/package.json': JSON.stringify({
    name: 'cjs-fixture',
    type: 'module',
    exports: {
      '.': {
        development: '../.vrowzer-esm/cjs-fixture.js',
        default: './.vrowzer-cjs/index.js'
      }
    }
  }),
  '/node_modules/cjs-fixture/.vrowzer-cjs/package.json': JSON.stringify({
    name: 'cjs-fixture',
    exports: { '.': './index.js' }
  }),
  '/node_modules/cjs-fixture/.vrowzer-cjs/index.js': [
    "if (process.env.NODE_ENV === 'production') {",
    "  module.exports = require('./production.js')",
    '} else {',
    "  module.exports = require('./development.js')",
    '}',
    ''
  ].join('\n'),
  '/node_modules/cjs-fixture/.vrowzer-cjs/production.js':
    "module.exports = { mode: 'cjs production' }\n",
  '/node_modules/cjs-fixture/.vrowzer-cjs/development.js':
    "module.exports = { mode: 'cjs development' }\n",
  '/node_modules/.vrowzer-esm/cjs-fixture.js': "export default { mode: 'esm development' }\n"
}

type SerializedContent = string | { bytes: number[] }

/**
 * Runs `build()` of the current instance, and returns the result or the error as plain data.
 */
async function runBuild(options?: VrowzerBuildOptions) {
  const vrowzer = (window as unknown as { __vrowzer__: ReturnType<typeof Vrowzer> }).__vrowzer__
  try {
    const result = await vrowzer.build(options)
    const files: Record<string, SerializedContent> = {}
    for (const [name, content] of Object.entries(result.files)) {
      files[name] =
        typeof content === 'string' ? content : { bytes: Array.from(new Uint8Array(content)) }
    }
    return { ok: true as const, files, warnings: result.warnings }
  } catch (error) {
    return {
      ok: false as const,
      error: {
        name: (error as Error).name,
        message: (error as Error).message,
        isBuildError: error instanceof VrowzerBuildError,
        errors: error instanceof VrowzerBuildError ? [...error.errors] : []
      }
    }
  }
}

Object.assign(window, {
  __createVrowzer__: (options?: VrowzerOptions) => Vrowzer(options),
  __projectFiles__: projectFiles,
  __appFiles__: appFiles,
  __configFiles__: configFiles,
  __appBinaries__: { big: Array.from(bigImage), photo: Array.from(photo) },
  __indexSource__: indexSource,
  __mainSource__: mainSource,
  __runBuild__: runBuild,
  __liveWorkerCount__: () => liveWorkers.size,
  __createdWorkerCount__: () => createdWorkers
})

document.body.dataset.fixtureReady = 'true'
