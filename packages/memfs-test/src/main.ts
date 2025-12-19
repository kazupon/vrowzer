import { createFsFromVolume, vol } from 'memfs-browser'

import { setupCounter } from './counter.ts'
import { readFile } from './mod.ts'
import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

const json = {
  './README.md': '1',
  './src/index.js': '2',
  './node_modules/debug/index.js': '3'
}
console.log('fromJSON', vol.fromJSON(json, '/'))

const fs = createFsFromVolume(vol)
console.log('memfs fs', fs)

const watcher = new fs.FSWatcher()
watcher.start('/')
const w = watcher.on('change', (p, stats, s) => {
  console.log('fs change -->', p, '---', stats, s)
})
console.log('memfs watcher', w)

console.log(await readFile('./mod.ts'))

console.log('memfs readfileSync', fs.readFileSync('/README.md', 'utf8'))

setInterval(() => {
  console.log('memfs update README.md')
  fs.appendFileSync('/README.md', '\nupdate ' + new Date().toISOString())
}, 500)
