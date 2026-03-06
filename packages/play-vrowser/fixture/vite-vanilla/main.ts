import './style.css'
import vrowserLogo from './vrowser.svg'
import typescriptLogo from './typescript.svg'
import { setupCounter } from './counter.ts'
import data from './data.yaml'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://github.com/kazupon/vrowser" target="_blank">
      <img src="${vrowserLogo}" class="logo" alt="Vrowser logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vrowser + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="yaml-data">${data.title}</p>
    <ul class="yaml-list">
      ${data.items.map((item: { name: string; description: string }) => `<li><strong>${item.name}</strong>: ${item.description}</li>`).join('')}
    </ul>
    <p class="read-the-docs">
      Click on the Vrowser and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

if (import.meta.hot) {
  import.meta.hot.accept()
}
