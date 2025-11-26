# HMR Worker Architecture Design

## Current Architecture

```mermaid
flowchart TB
    subgraph MainWindow["Main Window"]
        EditorPanel["EditorPanel"]
        PreviewPanel["PreviewPanel"]
        EditorPanel -->|"emit"| PreviewPanel
    end

    subgraph PreviewIframe["Preview iframe"]
        runtime["runtime.ts<br/>executeCode"]
        bundler["bundler.ts<br/>(@rolldown/browser)"]
        runtime -->|"bundle()"| bundler
        bundler -->|"bundled code"| runtime
    end

    PreviewPanel -->|"postMessage<br/>{type: 'update'}"| runtime
    runtime -->|"postMessage<br/>{type: 'success/error'}"| PreviewPanel
```

### Current Message Protocol

| Direction | Type | Payload |
|-----------|------|---------|
| Main → iframe | `update` | `{ path: string, code: string }` |
| iframe → Main | `ready` | `{}` |
| iframe → Main | `success` | `{}` |
| iframe → Main | `error` | `{ message: string }` |

### Sequence Diagram (Current)

```mermaid
sequenceDiagram
    participant Editor as EditorPanel
    participant Preview as PreviewPanel
    participant Runtime as runtime.ts
    participant Bundler as bundler.ts

    Note over Runtime,Bundler: iframe initialization
    Runtime->>Preview: postMessage {type: 'ready'}

    Note over Editor,Bundler: Code update flow
    Editor->>Preview: emit('update', code)
    Preview->>Runtime: postMessage {type: 'update', path, code}
    Runtime->>Bundler: bundle(entry)
    Bundler-->>Runtime: bundled code
    Runtime->>Runtime: executeCode()
    alt success
        Runtime->>Preview: postMessage {type: 'success'}
    else error
        Runtime->>Preview: postMessage {type: 'error', message}
    end
```

---

## Option A: Main Window → Worker → Preview iframe

```mermaid
flowchart TB
    subgraph MainWindow["Main Window"]
        EditorPanel_A["EditorPanel"]
        PreviewPanel_A["PreviewPanel"]
        EditorPanel_A -->|"emit"| PreviewPanel_A

        subgraph Worker_A["Worker"]
            bundlerWorker["bundler.worker.ts<br/>(@rolldown/browser)"]
        end
    end

    subgraph PreviewIframe_A["Preview iframe"]
        runtime_A["runtime.ts<br/>executeCode"]
    end

    PreviewPanel_A -->|"postMessage<br/>{type: 'update'}"| bundlerWorker
    bundlerWorker -->|"postMessage<br/>{type: 'bundle-success'}"| PreviewPanel_A
    PreviewPanel_A -->|"postMessage<br/>{type: 'execute'}"| runtime_A
    runtime_A -->|"postMessage<br/>{type: 'success/error'}"| PreviewPanel_A
```

### Message Protocol (Option A)

**Main ↔ Worker:**

| Direction | Type | Payload |
|-----------|------|---------|
| Main → Worker | `init` | `{}` |
| Worker → Main | `ready` | `{}` |
| Main → Worker | `update` | `{ path: string, code: string }` |
| Worker → Main | `bundle-success` | `{ code: string }` |
| Worker → Main | `bundle-error` | `{ message: string }` |

**Main ↔ iframe:**

| Direction | Type | Payload |
|-----------|------|---------|
| Main → iframe | `execute` | `{ code: string, path: string }` |
| iframe → Main | `ready` | `{}` |
| iframe → Main | `success` | `{}` |
| iframe → Main | `error` | `{ message: string }` |

### Sequence Diagram (Option A)

```mermaid
sequenceDiagram
    participant Editor as EditorPanel
    participant Preview as PreviewPanel
    participant Worker as Worker
    participant Runtime as runtime.ts

    Note over Worker,Runtime: Initialization
    Preview->>Worker: postMessage {type: 'init'}
    Worker-->>Preview: postMessage {type: 'ready'}
    Runtime->>Preview: postMessage {type: 'ready'}

    Note over Editor,Runtime: Code update flow
    Editor->>Preview: emit('update', code)
    Preview->>Worker: postMessage {type: 'update', path, code}
    Worker->>Worker: bundle with @rolldown/browser
    alt bundle success
        Worker-->>Preview: postMessage {type: 'bundle-success', code}
        Preview->>Runtime: postMessage {type: 'execute', code, path}
        Runtime->>Runtime: executeCode()
        alt execution success
            Runtime->>Preview: postMessage {type: 'success'}
        else execution error
            Runtime->>Preview: postMessage {type: 'error', message}
        end
    else bundle error
        Worker-->>Preview: postMessage {type: 'bundle-error', message}
    end
```

### Pros

- **Separation of concerns**: Worker handles bundling only, iframe handles execution only
- **Worker reusability**: Worker can be shared across multiple preview iframes
- **Easier debugging**: Both Worker and iframe can be monitored from Main window
- **No SharedArrayBuffer in iframe**: COOP/COEP headers may not be required for iframe

### Cons

- **Complex communication**: Main window acts as a relay
- **More message hops**: Editor → Main → Worker → Main → iframe
- **Distributed state management**: State needs to be managed in both Worker and iframe

---

## Option A': Option A with MessageChannel (Direct Worker ↔ iframe)

Using the MessageChannel API, Worker and iframe can communicate directly after initial setup, eliminating the Main window relay for HMR updates.

### MessageChannel Overview

The MessageChannel API creates a pair of connected MessagePort objects that can be transferred to different contexts (Worker, iframe) for direct communication.

```mermaid
flowchart TB
    subgraph MainWindow_A2["Main Window"]
        EditorPanel_A2["EditorPanel"]
        PreviewPanel_A2["PreviewPanel"]
        EditorPanel_A2 -->|"emit"| PreviewPanel_A2

        subgraph Worker_A2["Worker"]
            bundlerWorker_A2["bundler.worker.ts<br/>(@rolldown/browser)"]
        end
    end

    subgraph PreviewIframe_A2["Preview iframe"]
        runtime_A2["runtime.ts<br/>executeCode"]
    end

    PreviewPanel_A2 -.->|"transfer port1"| bundlerWorker_A2
    PreviewPanel_A2 -.->|"transfer port2"| runtime_A2
    bundlerWorker_A2 <-->|"MessagePort<br/>direct communication"| runtime_A2
```

### Message Protocol (Option A')

**Main → Worker / iframe:** (initialization only)

| Direction | Type | Payload |
|-----------|------|---------|
| Main → Worker | `init` | `{ port: MessagePort }` (transferred) |
| Main → iframe | `init` | `{ port: MessagePort }` (transferred) |
| Worker → Main | `ready` | `{}` |
| iframe → Main | `ready` | `{}` |

**Worker ↔ iframe:** (via MessagePort, direct)

| Direction | Type | Payload |
|-----------|------|---------|
| iframe → Worker | `bundle` | `{ entry: string, files: Record<string, string> }` |
| Worker → iframe | `bundle-success` | `{ code: string }` |
| Worker → iframe | `bundle-error` | `{ message: string }` |

**iframe → Main:** (status reporting)

| Direction | Type | Payload |
|-----------|------|---------|
| iframe → Main | `success` | `{}` |
| iframe → Main | `error` | `{ message: string }` |

### Sequence Diagram (Option A')

```mermaid
sequenceDiagram
    participant Editor as EditorPanel
    participant Preview as PreviewPanel
    participant Worker as Worker
    participant Runtime as runtime.ts

    Note over Preview,Runtime: Initialization with MessageChannel
    Preview->>Preview: channel = new MessageChannel()
    Preview->>Worker: postMessage {type: 'init', port: port1} [transfer]
    Preview->>Runtime: postMessage {type: 'init', port: port2} [transfer]
    Worker-->>Preview: postMessage {type: 'ready'}
    Runtime-->>Preview: postMessage {type: 'ready'}

    Note over Editor,Runtime: Code update flow (direct communication)
    Editor->>Preview: emit('update', code)
    Preview->>Runtime: postMessage {type: 'update', path, code}
    Runtime->>Worker: port.postMessage {type: 'bundle', entry, files}
    Worker->>Worker: bundle with @rolldown/browser
    alt bundle success
        Worker-->>Runtime: port.postMessage {type: 'bundle-success', code}
        Runtime->>Runtime: executeCode()
        alt execution success
            Runtime->>Preview: postMessage {type: 'success'}
        else execution error
            Runtime->>Preview: postMessage {type: 'error', message}
        end
    else bundle error
        Worker-->>Runtime: port.postMessage {type: 'bundle-error', message}
        Runtime->>Preview: postMessage {type: 'error', message}
    end
```

### Code Examples

**Main Window (PreviewPanel.vue):**

```typescript
// Create MessageChannel
const channel = new MessageChannel()

// Transfer port1 to Worker
worker.postMessage({ type: 'init', port: channel.port1 }, [channel.port1])

// Transfer port2 to iframe
iframe.contentWindow.postMessage(
  { type: 'init', port: channel.port2 },
  '*',
  [channel.port2]
)
```

**Worker (bundler.worker.ts):**

```typescript
let port: MessagePort | null = null

self.onmessage = (e) => {
  if (e.data.type === 'init' && e.data.port) {
    port = e.data.port
    port.onmessage = handleBundleRequest
    self.postMessage({ type: 'ready' })
  }
}

function handleBundleRequest(e: MessageEvent) {
  if (e.data.type === 'bundle') {
    // Bundle and send result directly to iframe
    const result = await bundle(e.data.entry, e.data.files)
    port.postMessage({ type: 'bundle-success', code: result })
  }
}
```

**iframe (runtime.ts):**

```typescript
let workerPort: MessagePort | null = null

window.onmessage = (e) => {
  if (e.data.type === 'init' && e.data.port) {
    workerPort = e.data.port
    workerPort.onmessage = handleBundleResult
    window.parent.postMessage({ type: 'ready' }, '*')
  } else if (e.data.type === 'update') {
    // Send bundle request directly to Worker
    workerPort.postMessage({
      type: 'bundle',
      entry: e.data.path,
      files: { [e.data.path]: e.data.code }
    })
  }
}

function handleBundleResult(e: MessageEvent) {
  if (e.data.type === 'bundle-success') {
    executeCode(e.data.code)
    window.parent.postMessage({ type: 'success' }, '*')
  } else if (e.data.type === 'bundle-error') {
    window.parent.postMessage({ type: 'error', message: e.data.message }, '*')
  }
}
```

### Pros

- **Direct communication**: No Main window relay after initialization
- **Fewer message hops**: iframe → Worker → iframe (vs iframe → Main → Worker → Main → iframe)
- **Better performance**: Reduced latency for frequent HMR updates
- **Separation of concerns**: Same as Option A
- **Worker reusability**: Same as Option A

### Cons

- **Slightly more complex setup**: MessageChannel initialization required
- **Port management**: Need to handle port lifecycle

---

## Option B: Preview iframe → Worker → Preview iframe

```mermaid
flowchart TB
    subgraph MainWindow_B["Main Window"]
        EditorPanel_B["EditorPanel"]
        PreviewPanel_B["PreviewPanel"]
        EditorPanel_B -->|"emit"| PreviewPanel_B
    end

    subgraph PreviewIframe_B["Preview iframe"]
        runtime_B["runtime.ts<br/>executeCode"]

        subgraph Worker_B["Worker"]
            bundlerWorker_B["bundler.worker.ts<br/>(@rolldown/browser)"]
        end

        runtime_B -->|"postMessage<br/>{type: 'bundle'}"| bundlerWorker_B
        bundlerWorker_B -->|"postMessage<br/>{type: 'bundle-success'}"| runtime_B
    end

    PreviewPanel_B -->|"postMessage<br/>{type: 'update'}"| runtime_B
    runtime_B -->|"postMessage<br/>{type: 'success/error'}"| PreviewPanel_B
```

### Message Protocol (Option B)

**Main ↔ iframe:** (unchanged)

| Direction | Type | Payload |
|-----------|------|---------|
| Main → iframe | `update` | `{ path: string, code: string }` |
| iframe → Main | `ready` | `{}` |
| iframe → Main | `success` | `{}` |
| iframe → Main | `error` | `{ message: string }` |

**iframe ↔ Worker:** (new)

| Direction | Type | Payload |
|-----------|------|---------|
| iframe → Worker | `init` | `{}` |
| Worker → iframe | `ready` | `{}` |
| iframe → Worker | `bundle` | `{ entry: string, files: Record<string, string> }` |
| Worker → iframe | `bundle-success` | `{ code: string }` |
| Worker → iframe | `bundle-error` | `{ message: string }` |

### Sequence Diagram (Option B)

```mermaid
sequenceDiagram
    participant Editor as EditorPanel
    participant Preview as PreviewPanel
    participant Runtime as runtime.ts
    participant Worker as Worker

    Note over Runtime,Worker: iframe initialization
    Runtime->>Worker: postMessage {type: 'init'}
    Worker-->>Runtime: postMessage {type: 'ready'}
    Runtime->>Preview: postMessage {type: 'ready'}

    Note over Editor,Worker: Code update flow
    Editor->>Preview: emit('update', code)
    Preview->>Runtime: postMessage {type: 'update', path, code}
    Runtime->>Worker: postMessage {type: 'bundle', entry, files}
    Worker->>Worker: bundle with @rolldown/browser
    alt bundle success
        Worker-->>Runtime: postMessage {type: 'bundle-success', code}
        Runtime->>Runtime: executeCode()
        alt execution success
            Runtime->>Preview: postMessage {type: 'success'}
        else execution error
            Runtime->>Preview: postMessage {type: 'error', message}
        end
    else bundle error
        Worker-->>Runtime: postMessage {type: 'bundle-error', message}
        Runtime->>Preview: postMessage {type: 'error', message}
    end
```

### Pros

- **Minimal changes**: Main window code remains mostly unchanged
- **Encapsulation**: Bundling logic stays within the iframe
- **Preserves existing structure**: Current message protocol is not broken

### Cons

- **Worker creation in iframe**: Depends on iframe security settings
- **COOP/COEP required**: Headers needed for iframe when using SharedArrayBuffer
- **Worker reuse is difficult**: Each iframe requires its own Worker instance

---

## Recommendation: Option A' (Option A with MessageChannel)

### Rationale

1. **Easier COOP/COEP management**: Only needs to be configured for Main window
2. **Future extensibility**: Easier to support multiple files and multiple previews
3. **Debugging convenience**: Worker can be directly monitored from DevTools
4. **Clear separation of concerns**: bundling vs execution
5. **Direct communication**: MessageChannel enables Worker ↔ iframe direct messaging after setup
6. **Better HMR performance**: Reduced message hops for frequent code updates

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/worker/bundler.worker.ts` | New file - Worker implementation |
| `src/components/PreviewPanel.vue` | Add Worker creation and communication logic |
| `src/preview/runtime.ts` | Remove bundle calls, keep only executeCode |
| `src/preview/bundler.ts` | Rewrite for Worker or delete |
| `vite.config.ts` | Add Worker configuration (if needed) |

---

## Implementation Steps

1. **Create Worker**: Create `bundler.worker.ts` with @rolldown/browser initialization and bundling logic
2. **Update PreviewPanel**: Add Worker creation and message handling
3. **Simplify runtime.ts**: Remove bundling, keep only executeCode
4. **Implement message protocol**: Implement the new protocol defined above
5. **Test**: Verify HMR functionality works correctly
