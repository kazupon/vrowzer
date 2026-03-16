# @vrowser/service-worker-server

A Node.js HTTP Server-like interface for Service Worker environments. Wraps `@vrowser/service-worker` to provide familiar `listen()` / `close()` / event patterns for handling fetch events and MessageChannel connections inside a Service Worker.

## 💿 Installation

```sh
# npm
npm install --save @vrowser/service-worker-server

# pnpm
pnpm add @vrowser/service-worker-server

# yarn
yarn add @vrowser/service-worker-server

# bun
bun add @vrowser/service-worker-server
```

## 🚀 Usage

```ts
import { createSvcWorkerServer } from '@vrowser/service-worker-server'

const server = createSvcWorkerServer(self, {
  version: 'v1',
  claimOnActivate: true
})

// Set fetch handler (like Node.js HTTP request handler)
server.setFetchHandler(event => {
  event.respondWith(new Response('Hello from Service Worker!'))
})

// Start listening for fetch events
server.listen()

server.on('listening', () => {
  console.log('Service Worker server is listening')
})

server.on('error', err => {
  console.error('Server error:', err)
})
```

### MessageChannel Connections

```ts
const server = createSvcWorkerServer(self, { version: 'v1' })

server.setFetchHandler(event => {
  event.respondWith(new Response('OK'))
})

// Enable listening for MessageChannel port connections
server.listen({ enableListenConnections: true })

server.on('connection', event => {
  console.log('Client connected:', event.clientId)
  console.log('Ports:', event.ports)
  console.log('Data:', event.data)
})
```

## 📖 API Documentation

See [packages/service-worker/docs](../service-worker/docs/) for full API documentation.

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
