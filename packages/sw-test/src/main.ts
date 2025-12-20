import { setupCounter } from './counter.ts'
import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/src/preview/sw.ts', { type: 'module', scope: '/src/preview/' })
    .then(registration => {
      console.log('Service Worker registered:', registration.scope)
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error)
    })
}

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
