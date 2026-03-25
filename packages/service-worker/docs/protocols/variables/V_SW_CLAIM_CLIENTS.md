[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [protocols](../index.md) / V\_SW\_CLAIM\_CLIENTS

# Variable: V\_SW\_CLAIM\_CLIENTS

```ts
const V_SW_CLAIM_CLIENTS: "V_SW_CLAIM_CLIENTS" = 'V_SW_CLAIM_CLIENTS';
```

Request the service worker to call `self.clients.claim()`.

This is used when the service worker is active but not yet the controller
(e.g. after a hard reload). The controller sends this message to request
the service worker to claim all clients.
