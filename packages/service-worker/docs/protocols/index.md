# protocols

Service worker message protocols

Defines the message protocol between [the service worker controller](/packages/service-worker/docs/controller/functions/createSvcWorkerController.md) and [the service worker](/packages/service-worker/docs/worker/interfaces/SvcWorker.md).

## Variables

| Variable | Description |
| ------ | ------ |
| [V_SW_CLAIM_CLIENTS](/packages/service-worker/docs/protocols/variables/V_SW_CLAIM_CLIENTS.md) | Request the service worker to call `self.clients.claim()`. |
| [V_SW_SESSION_CIRCUIT_BREAKER](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_CIRCUIT_BREAKER.md) | Message type constant for circuit breaker operations. |
| [V_SW_SESSION_CLOSE](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_CLOSE.md) | Session close message. |
| [V_SW_SESSION_INIT](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_INIT.md) | Session initialization message. |
| [V_SW_SESSION_PING](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_PING.md) | Session heartbeat ping message (Service Worker -> Page). |
| [V_SW_SESSION_PONG](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_PONG.md) | Session heartbeat pong response (Page -> Service Worker). |
| [V_SW_SESSION_RESUME](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_RESUME.md) | Message type constant for resume operations. |
| [V_SW_SESSION_TERMINATED](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_TERMINATED.md) | Message type constant for terminated notification (Service Worker -> Page). Sent when the service worker has unregistered itself. |
| [V_SW_SKIP_WAITING](/packages/service-worker/docs/protocols/variables/V_SW_SKIP_WAITING.md) | Whether to skip waiting for `self.skipWaiting()` to be called on the service worker side after installation. |
| [V_SW_VERSION](/packages/service-worker/docs/protocols/variables/V_SW_VERSION.md) | Managed service worker version. |

## Functions

| Function | Description |
| ------ | ------ |
| [createSvcWorkerClaimClientsMessage](/packages/service-worker/docs/protocols/functions/createSvcWorkerClaimClientsMessage.md) | Create a [service worker 'V_SW_CLAIM_CLIENTS' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerClaimClientsMessage.md). |
| [createSvcWorkerSessionCircuitBreakerResponse](/packages/service-worker/docs/protocols/functions/createSvcWorkerSessionCircuitBreakerResponse.md) | Create a circuit breaker response message. |
| [createSvcWorkerSessionCloseMessage](/packages/service-worker/docs/protocols/functions/createSvcWorkerSessionCloseMessage.md) | Create a [service worker 'V_SW_SESSION_CLOSE' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCloseMessage.md). |
| [createSvcWorkerSessionInitMessage](/packages/service-worker/docs/protocols/functions/createSvcWorkerSessionInitMessage.md) | Create a [service worker 'V_SW_SESSION_INIT' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitMessage.md). |
| [createSvcWorkerSessionInitResponse](/packages/service-worker/docs/protocols/functions/createSvcWorkerSessionInitResponse.md) | Create a [service worker 'V_SW_SESSION_INIT' response](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitResponse.md). |
| [createSvcWorkerSessionPingMessage](/packages/service-worker/docs/protocols/functions/createSvcWorkerSessionPingMessage.md) | Create a [service worker 'V_SW_SESSION_PING' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPingMessage.md). |
| [createSvcWorkerSessionPongMessage](/packages/service-worker/docs/protocols/functions/createSvcWorkerSessionPongMessage.md) | Create a [service worker 'V_SW_SESSION_PONG' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPongMessage.md). |
| [createSvcWorkerSessionResumeResponse](/packages/service-worker/docs/protocols/functions/createSvcWorkerSessionResumeResponse.md) | Create a resume response message. |
| [createSvcWorkerSessionTerminatedMessage](/packages/service-worker/docs/protocols/functions/createSvcWorkerSessionTerminatedMessage.md) | Create a [SvcWorkerSessionTerminatedMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionTerminatedMessage.md). |
| [createSvcWorkerSkipWaitingMessage](/packages/service-worker/docs/protocols/functions/createSvcWorkerSkipWaitingMessage.md) | Create a [service worker 'V_SW_SKIP_WAITING' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSkipWaitingMessage.md). |
| [createSvcWorkerVersionMessage](/packages/service-worker/docs/protocols/functions/createSvcWorkerVersionMessage.md) | Create a [service worker 'V_SW_VERSION' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerVersionMessage.md). |
| [createSvcWorkerVersionResponse](/packages/service-worker/docs/protocols/functions/createSvcWorkerVersionResponse.md) | Create a [service worker 'V_SW_VERSION' response](/packages/service-worker/docs/protocols/interfaces/SvcWorkerVersionResponse.md). |
| [isSvcWorkerSessionCircuitBreakerMessage](/packages/service-worker/docs/protocols/functions/isSvcWorkerSessionCircuitBreakerMessage.md) | Type guard for circuit breaker messages |
| [isSvcWorkerSessionGenericResponse](/packages/service-worker/docs/protocols/functions/isSvcWorkerSessionGenericResponse.md) | Type guard for generic session response |
| [isSvcWorkerSessionInitResponse](/packages/service-worker/docs/protocols/functions/isSvcWorkerSessionInitResponse.md) | Type guard for [SvcWorkerSessionInitResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitResponse.md). |
| [isSvcWorkerSessionPingMessage](/packages/service-worker/docs/protocols/functions/isSvcWorkerSessionPingMessage.md) | Type guard for [SvcWorkerSessionPingMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPingMessage.md). |
| [isSvcWorkerSessionResponse](/packages/service-worker/docs/protocols/functions/isSvcWorkerSessionResponse.md) | Type guard for [SvcWorkerSessionResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResponse.md). |
| [isSvcWorkerSessionResumeMessage](/packages/service-worker/docs/protocols/functions/isSvcWorkerSessionResumeMessage.md) | Type guard for resume messages. |
| [isSvcWorkerSessionTerminatedMessage](/packages/service-worker/docs/protocols/functions/isSvcWorkerSessionTerminatedMessage.md) | Type guard for [SvcWorkerSessionTerminatedMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionTerminatedMessage.md). |
| [isSvcWrokerVersionMessageResponse](/packages/service-worker/docs/protocols/functions/isSvcWrokerVersionMessageResponse.md) | Type guard for [SvcWorkerVersionMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerVersionMessage.md). |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [SvcWorkerClaimClientsMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerClaimClientsMessage.md) | CLAIM_CLIENTS message (Page -> Service Worker). |
| [SvcWorkerMessageBase](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md) | Base message structure for all protocol messages. |
| [SvcWorkerSessionCircuitBreakerMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerMessage.md) | Circuit breaker message sent from controller to service worker. |
| [SvcWorkerSessionCircuitBreakerResult](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md) | Result of a circuit breaker operation. |
| [SvcWorkerSessionCloseMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCloseMessage.md) | SESSION_CLOSE message (Page -> Service Worker via session MessagePort). |
| [SvcWorkerSessionGenericResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionGenericResponse.md) | Generic session response interface. |
| [SvcWorkerSessionInitMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitMessage.md) | SESSION_INIT message (Page -> Service Worker). Sent with a MessagePort to establish a persistent session. |
| [SvcWorkerSessionInitResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitResponse.md) | SESSION_INIT response (Service Worker -> Page via MessagePort). |
| [SvcWorkerSessionPingMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPingMessage.md) | PING message (Service Worker -> Page via session MessagePort). |
| [SvcWorkerSessionPongMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPongMessage.md) | PONG response (Page -> Service Worker via session MessagePort). |
| [SvcWorkerSessionResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResponse.md) | Session response structure. |
| [SvcWorkerSessionResumeMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResumeMessage.md) | Resume message sent from controller to service worker. |
| [SvcWorkerSessionResumeResult](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResumeResult.md) | Result of a resume operation. |
| [SvcWorkerSessionTerminatedMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionTerminatedMessage.md) | Terminated notification message (Service Worker -> Page via session MessagePort) |
| [SvcWorkerSkipWaitingMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSkipWaitingMessage.md) | SKIP_WAITING message (Page -> Service Worker). |
| [SvcWorkerVersionMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerVersionMessage.md) | VERSION request message (Page -> Service Worker). |
| [SvcWorkerVersionResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerVersionResponse.md) | VERSION response message (Service Worker -> Page via MessagePort). |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [CircuitBreakerMode](/packages/service-worker/docs/protocols/type-aliases/CircuitBreakerMode.md) | Circuit breaker mode for service worker control. |
| [SvcWorkerMessage](/packages/service-worker/docs/protocols/type-aliases/SvcWorkerMessage.md) | Union type of all messages from Page to Service Worker (via postMessage) |
| [SvcWorkerSessionMessage](/packages/service-worker/docs/protocols/type-aliases/SvcWorkerSessionMessage.md) | Union type of all session messages (via session MessagePort). |
| [SvcWorkerTerminatedReason](/packages/service-worker/docs/protocols/type-aliases/SvcWorkerTerminatedReason.md) | Reason why the service worker was terminated. |

