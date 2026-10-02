/**
 * SPIKE (#36): fixture for vrowzer.build()
 */

import { Vrowzer } from 'vrowzer'

// Count the Workers that the page creates (the build Worker and Vrowzer's Web Worker)
const pageWorkers: Worker[] = []
class TrackedWorker extends Worker {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    super(scriptURL, options)
    pageWorkers.push(this)
  }
}
window.Worker = TrackedWorker

const libraryFiles: Record<string, string | ArrayBuffer> = {
  '/package.json': JSON.stringify({ name: 'my-lib', type: 'module' }),
  '/src/index.ts': [
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
  ].join('\n'),
  '/src/math.ts': [
    'export function add(a: number, b: number): number { return a + b }',
    "export function unused(): string { return 'tree-shaken-away' }",
    ''
  ].join('\n'),
  '/src/lazy.ts': "export const lazyValue: string = 'lazy-chunk-value'\n",
  '/src/data.json': '{"version":"1.2.3","unused":"json-unused"}',
  '/src/style.css': '.lib-title { color: rgb(255, 0, 0); }\n',
  '/src/logo.svg':
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>',
  '/main.js': "document.querySelector('#app').textContent = 'preview ok'\n"
}

// A PNG-like binary larger than the inline limit (4 KiB), so that it is emitted as an asset
const bigPng = new Uint8Array(5000)
for (let i = 0; i < bigPng.length; i++) {
  bigPng[i] = (i * 31 + 7) % 256
}

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
    "document.querySelector('#app')!.textContent = 'app ok'",
    "const img = document.createElement('img')",
    "img.id = 'small'",
    'img.src = smallUrl',
    'document.body.append(img)',
    "import('./lazy').then(m => { document.body.dataset.lazy = m.value })",
    ''
  ].join('\n'),
  '/src/style.css': '.unused-but-kept { color: blue; }\n',
  '/src/lazy.ts': "import './lazy.css'\nexport const value: string = 'lazy ok'\n",
  '/src/lazy.css': '#app { background-color: rgb(255, 255, 0); }\n',
  '/src/small.svg':
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>',
  '/src/big.png': bigPng.buffer,
  '/public/robots.txt': 'User-agent: *\n'
}

Object.assign(window, {
  __createVrowzer__: () => Vrowzer(),
  __libraryFiles__: libraryFiles,
  __appFiles__: appFiles,
  __bigPng__: Array.from(bigPng),
  __pageWorkers__: () => pageWorkers.length
})

document.body.dataset.fixtureReady = 'true'
