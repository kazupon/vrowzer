[**@vrowzer/service-worker**](../index.md)

***

[@vrowzer/service-worker](../index.md) / protocols

# protocols

Service worker message protocols

Defines the message protocol between createSvcWorkerController \| the service worker controller and SvcWorker \| the service worker.

## Variables

| Variable | Description |
| ------ | ------ |
| [V\_SW\_CLAIM\_CLIENTS](variables/V_SW_CLAIM_CLIENTS.md) | Request the service worker to call `self.clients.claim()`. |
| [V\_SW\_SESSION\_CIRCUIT\_BREAKER](variables/V_SW_SESSION_CIRCUIT_BREAKER.md) | Message type constant for circuit breaker operations. |
| [V\_SW\_SESSION\_CLOSE](variables/V_SW_SESSION_CLOSE.md) | Session close message. |
| [V\_SW\_SESSION\_INIT](variables/V_SW_SESSION_INIT.md) | Session initialization message. |
| [V\_SW\_SESSION\_PING](variables/V_SW_SESSION_PING.md) | Session heartbeat ping message (Service Worker -> Page). |
| [V\_SW\_SESSION\_PONG](variables/V_SW_SESSION_PONG.md) | Session heartbeat pong response (Page -> Service Worker). |
| [V\_SW\_SESSION\_RESUME](variables/V_SW_SESSION_RESUME.md) | Message type constant for resume operations. |
| [V\_SW\_SESSION\_TERMINATED](variables/V_SW_SESSION_TERMINATED.md) | Message type constant for terminated notification (Service Worker -> Page). Sent when the service worker has unregistered itself. |
| [V\_SW\_SKIP\_WAITING](variables/V_SW_SKIP_WAITING.md) | Whether to skip waiting for `self.skipWaiting()` to be called on the service worker side after installation. |
| [V\_SW\_VERSION](variables/V_SW_VERSION.md) | Managed service worker version. |

## Functions

| Function | Description |
| ------ | ------ |
| [createSvcWorkerClaimClientsMessage](functions/createSvcWorkerClaimClientsMessage.md) | Create a [service worker 'V\_SW\_CLAIM\_CLIENTS' message](interfaces/SvcWorkerClaimClientsMessage.md). |
| [createSvcWorkerSessionCircuitBreakerResponse](functions/createSvcWorkerSessionCircuitBreakerResponse.md) | Create a circuit breaker response message. |
| [createSvcWorkerSessionCloseMessage](functions/createSvcWorkerSessionCloseMessage.md) | Create a [service worker 'V\_SW\_SESSION\_CLOSE' message](interfaces/SvcWorkerSessionCloseMessage.md). |
| [createSvcWorkerSessionInitMessage](functions/createSvcWorkerSessionInitMessage.md) | Create a [service worker 'V\_SW\_SESSION\_INIT' message](interfaces/SvcWorkerSessionInitMessage.md). |
| [createSvcWorkerSessionInitResponse](functions/createSvcWorkerSessionInitResponse.md) | Create a [service worker 'V\_SW\_SESSION\_INIT' response](interfaces/SvcWorkerSessionInitResponse.md). |
| [createSvcWorkerSessionPingMessage](functions/createSvcWorkerSessionPingMessage.md) | Create a [service worker 'V\_SW\_SESSION\_PING' message](interfaces/SvcWorkerSessionPingMessage.md). |
| [createSvcWorkerSessionPongMessage](functions/createSvcWorkerSessionPongMessage.md) | Create a [service worker 'V\_SW\_SESSION\_PONG' message](interfaces/SvcWorkerSessionPongMessage.md). |
| [createSvcWorkerSessionResumeResponse](functions/createSvcWorkerSessionResumeResponse.md) | Create a resume response message. |
| [createSvcWorkerSessionTerminatedMessage](functions/createSvcWorkerSessionTerminatedMessage.md) | Create a [SvcWorkerSessionTerminatedMessage](interfaces/SvcWorkerSessionTerminatedMessage.md). |
| [createSvcWorkerSkipWaitingMessage](functions/createSvcWorkerSkipWaitingMessage.md) | Create a [service worker 'V\_SW\_SKIP\_WAITING' message](interfaces/SvcWorkerSkipWaitingMessage.md). |
| [createSvcWorkerVersionMessage](functions/createSvcWorkerVersionMessage.md) | Create a [service worker 'V\_SW\_VERSION' message](interfaces/SvcWorkerVersionMessage.md). |
| [createSvcWorkerVersionResponse](functions/createSvcWorkerVersionResponse.md) | Create a [service worker 'V\_SW\_VERSION' response](interfaces/SvcWorkerVersionResponse.md). |
| [isSvcWorkerSessionCircuitBreakerMessage](functions/isSvcWorkerSessionCircuitBreakerMessage.md) | Type guard for circuit breaker messages |
| [isSvcWorkerSessionGenericResponse](functions/isSvcWorkerSessionGenericResponse.md) | Type guard for generic session response |
| [isSvcWorkerSessionInitResponse](functions/isSvcWorkerSessionInitResponse.md) | Type guard for [SvcWorkerSessionInitResponse](interfaces/SvcWorkerSessionInitResponse.md). |
| [isSvcWorkerSessionPingMessage](functions/isSvcWorkerSessionPingMessage.md) | Type guard for [SvcWorkerSessionPingMessage](interfaces/SvcWorkerSessionPingMessage.md). |
| [isSvcWorkerSessionResponse](functions/isSvcWorkerSessionResponse.md) | Type guard for [SvcWorkerSessionResponse](interfaces/SvcWorkerSessionResponse.md). |
| [isSvcWorkerSessionResumeMessage](functions/isSvcWorkerSessionResumeMessage.md) | Type guard for resume messages. |
| [isSvcWorkerSessionTerminatedMessage](functions/isSvcWorkerSessionTerminatedMessage.md) | Type guard for [SvcWorkerSessionTerminatedMessage](interfaces/SvcWorkerSessionTerminatedMessage.md). |
| [isSvcWrokerVersionMessageResponse](functions/isSvcWrokerVersionMessageResponse.md) | Type guard for [SvcWorkerVersionMessage](interfaces/SvcWorkerVersionMessage.md). |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [SvcWorkerClaimClientsMessage](interfaces/SvcWorkerClaimClientsMessage.md) | CLAIM_CLIENTS message (Page -> Service Worker). |
| [SvcWorkerMessageBase](interfaces/SvcWorkerMessageBase.md) | Base message structure for all protocol messages. |
| [SvcWorkerSessionCircuitBreakerMessage](interfaces/SvcWorkerSessionCircuitBreakerMessage.md) | Circuit breaker message sent from controller to service worker. |
| [SvcWorkerSessionCircuitBreakerResult](interfaces/SvcWorkerSessionCircuitBreakerResult.md) | Result of a circuit breaker operation. |
| [SvcWorkerSessionCloseMessage](interfaces/SvcWorkerSessionCloseMessage.md) | SESSION_CLOSE message (Page -> Service Worker via session MessagePort). |
| [SvcWorkerSessionGenericResponse](interfaces/SvcWorkerSessionGenericResponse.md) | Generic session response interface. |
| [SvcWorkerSessionInitMessage](interfaces/SvcWorkerSessionInitMessage.md) | SESSION_INIT message (Page -> Service Worker). Sent with a MessagePort to establish a persistent session. |
| [SvcWorkerSessionInitResponse](interfaces/SvcWorkerSessionInitResponse.md) | SESSION_INIT response (Service Worker -> Page via MessagePort). |
| [SvcWorkerSessionPingMessage](interfaces/SvcWorkerSessionPingMessage.md) | PING message (Service Worker -> Page via session MessagePort). |
| [SvcWorkerSessionPongMessage](interfaces/SvcWorkerSessionPongMessage.md) | PONG response (Page -> Service Worker via session MessagePort). |
| [SvcWorkerSessionResponse](interfaces/SvcWorkerSessionResponse.md) | Session response structure. |
| [SvcWorkerSessionResumeMessage](interfaces/SvcWorkerSessionResumeMessage.md) | Resume message sent from controller to service worker. |
| [SvcWorkerSessionResumeResult](interfaces/SvcWorkerSessionResumeResult.md) | Result of a resume operation. |
| [SvcWorkerSessionTerminatedMessage](interfaces/SvcWorkerSessionTerminatedMessage.md) | Terminated notification message (Service Worker -> Page via session MessagePort) |
| [SvcWorkerSkipWaitingMessage](interfaces/SvcWorkerSkipWaitingMessage.md) | SKIP_WAITING message (Page -> Service Worker). |
| [SvcWorkerVersionMessage](interfaces/SvcWorkerVersionMessage.md) | VERSION request message (Page -> Service Worker). |
| [SvcWorkerVersionResponse](interfaces/SvcWorkerVersionResponse.md) | VERSION response message (Service Worker -> Page via MessagePort). |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [CircuitBreakerMode](type-aliases/CircuitBreakerMode.md) | Circuit breaker mode for service worker control. |
| [SvcWorkerMessage](type-aliases/SvcWorkerMessage.md) | Union type of all messages from Page to Service Worker (via postMessage) |
| [SvcWorkerSessionMessage](type-aliases/SvcWorkerSessionMessage.md) | Union type of all session messages (via session MessagePort). |
| [SvcWorkerTerminatedReason](type-aliases/SvcWorkerTerminatedReason.md) | Reason why the service worker was terminated. |
