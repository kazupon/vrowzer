import type { FixtureManifest } from '../types.ts'

import indexHtml from './index.html?raw'
import mainTsx from './main.tsx?raw'
import appTsx from './App.tsx?raw'
import appCss from './App.css?raw'
import indexCss from './index.css?raw'
import reactSvg from './react.svg?raw'
import vrowserSvg from './vrowser.svg?raw'
import reactRuntime from './vendor/react.js?raw'
import reactDomClient from './vendor/react-dom-client.js?raw'
import reactJsxDevRuntime from './vendor/react-jsx-dev-runtime.js?raw'
import reactShared from './vendor/react-shared.js?raw'

export default {
  name: 'Vrowser+ React',
  files: {
    '/index.html': indexHtml,
    '/main.tsx': mainTsx,
    '/App.tsx': appTsx,
    '/App.css': appCss,
    '/index.css': indexCss,
    '/react.svg': reactSvg,
    '/vrowser.svg': vrowserSvg
  },
  vendorFiles: {
    '/vendor/react.js': reactRuntime,
    '/vendor/react-dom-client.js': reactDomClient,
    '/vendor/react-jsx-dev-runtime.js': reactJsxDevRuntime,
    '/vendor/react-shared.js': reactShared
  },
  activeFile: '/App.tsx'
} satisfies FixtureManifest
