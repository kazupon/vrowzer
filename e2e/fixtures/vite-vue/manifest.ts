import type { FixtureManifest } from '../types.ts'

import indexHtml from './index.html?raw'
import mainTs from './main.ts?raw'
import styleCss from './style.css?raw'
import appVue from './App.vue?raw'
import helloWorldVue from './HelloWorld.vue?raw'
import vrowserSvg from './vrowser.svg?raw'
import vueSvg from './vue.svg?raw'
import vueRuntime from './vendor/vue.js?raw'

export default {
  name: 'Vrowser + Vue',
  files: {
    '/index.html': indexHtml,
    '/main.ts': mainTs,
    '/style.css': styleCss,
    '/App.vue': appVue,
    '/HelloWorld.vue': helloWorldVue,
    '/vrowser.svg': vrowserSvg,
    '/vue.svg': vueSvg
  },
  vendorFiles: {
    '/vendor/vue.js': vueRuntime
  },
  activeFile: '/App.vue'
} satisfies FixtureManifest
