[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [worker](../index.md) / SvcWorker

# Interface: SvcWorker

Service Worker interface that extends ServiceWorkerGlobalScope

This interface provides transparent access to all native Service Worker APIs
while adding version management capabilities.

## Extends

- `ServiceWorkerGlobalScope`.`Disposable`

## Methods

### \[dispose\]()

```ts
dispose: void;
```

#### Returns

`void`

#### Inherited from

```ts
Disposable.[dispose]
```

---

### addEventListener()

#### Call Signature

```ts
addEventListener<K>(
   type,
   listener,
   options?): void;
```

##### Type Parameters

| Type Parameter                                         |
| ------------------------------------------------------ |
| `K` _extends_ keyof `ServiceWorkerGlobalScopeEventMap` |

##### Parameters

| Parameter  | Type                                   |
| ---------- | -------------------------------------- |
| `type`     | `K`                                    |
| `listener` | (`this`, `ev`) => `any`                |
| `options?` | `boolean` \| `AddEventListenerOptions` |

##### Returns

`void`

##### Inherited from

```ts
ServiceWorkerGlobalScope.addEventListener
```

#### Call Signature

```ts
addEventListener(
   type,
   listener,
   options?): void;
```

##### Parameters

| Parameter  | Type                                   |
| ---------- | -------------------------------------- |
| `type`     | `string`                               |
| `listener` | `EventListenerOrEventListenerObject`   |
| `options?` | `boolean` \| `AddEventListenerOptions` |

##### Returns

`void`

##### Inherited from

```ts
ServiceWorkerGlobalScope.addEventListener
```

---

### atob()

```ts
atob(data): string;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/atob)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `data`    | `string` |

#### Returns

`string`

#### Inherited from

```ts
ServiceWorkerGlobalScope.atob
```

---

### btoa()

```ts
btoa(data): string;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/btoa)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `data`    | `string` |

#### Returns

`string`

#### Inherited from

```ts
ServiceWorkerGlobalScope.btoa
```

---

### clearInterval()

```ts
clearInterval(id): void;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/clearInterval)

#### Parameters

| Parameter | Type                    |
| --------- | ----------------------- |
| `id`      | `number` \| `undefined` |

#### Returns

`void`

#### Inherited from

```ts
ServiceWorkerGlobalScope.clearInterval
```

---

### clearTimeout()

```ts
clearTimeout(id): void;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/clearTimeout)

#### Parameters

| Parameter | Type                    |
| --------- | ----------------------- |
| `id`      | `number` \| `undefined` |

#### Returns

`void`

#### Inherited from

```ts
ServiceWorkerGlobalScope.clearTimeout
```

---

### createImageBitmap()

#### Call Signature

```ts
createImageBitmap(image, options?): Promise<ImageBitmap>;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/createImageBitmap)

##### Parameters

| Parameter  | Type                 |
| ---------- | -------------------- |
| `image`    | `ImageBitmapSource`  |
| `options?` | `ImageBitmapOptions` |

##### Returns

`Promise`\<`ImageBitmap`\>

##### Inherited from

```ts
ServiceWorkerGlobalScope.createImageBitmap
```

#### Call Signature

```ts
createImageBitmap(
   image,
   sx,
   sy,
   sw,
   sh,
options?): Promise<ImageBitmap>;
```

##### Parameters

| Parameter  | Type                 |
| ---------- | -------------------- |
| `image`    | `ImageBitmapSource`  |
| `sx`       | `number`             |
| `sy`       | `number`             |
| `sw`       | `number`             |
| `sh`       | `number`             |
| `options?` | `ImageBitmapOptions` |

##### Returns

`Promise`\<`ImageBitmap`\>

##### Inherited from

```ts
ServiceWorkerGlobalScope.createImageBitmap
```

---

### dispatchEvent()

```ts
dispatchEvent(event): boolean;
```

The **`dispatchEvent()`** method of the EventTarget sends an Event to the object, (synchronously) invoking the affected event listeners in the appropriate order.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/dispatchEvent)

#### Parameters

| Parameter | Type    |
| --------- | ------- |
| `event`   | `Event` |

#### Returns

`boolean`

#### Inherited from

```ts
ServiceWorkerGlobalScope.dispatchEvent
```

---

### dispose()

```ts
dispose(): void;
```

Dispose the service worker and clean up resources

#### Returns

`void`

---

### fetch()

```ts
fetch(input, init?): Promise<Response>;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

#### Parameters

| Parameter | Type                   |
| --------- | ---------------------- |
| `input`   | `URL` \| `RequestInfo` |
| `init?`   | `RequestInit`          |

#### Returns

`Promise`\<`Response`\>

#### Inherited from

```ts
ServiceWorkerGlobalScope.fetch
```

---

### importScripts()

```ts
importScripts(...urls): void;
```

The **`importScripts()`** method of the WorkerGlobalScope interface synchronously imports one or more scripts into the worker's scope.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/importScripts)

#### Parameters

| Parameter | Type                  |
| --------- | --------------------- |
| ...`urls` | (`string` \| `URL`)[] |

#### Returns

`void`

#### Inherited from

```ts
ServiceWorkerGlobalScope.importScripts
```

---

### queueMicrotask()

```ts
queueMicrotask(callback): void;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/queueMicrotask)

#### Parameters

| Parameter  | Type           |
| ---------- | -------------- |
| `callback` | `VoidFunction` |

#### Returns

`void`

#### Inherited from

```ts
ServiceWorkerGlobalScope.queueMicrotask
```

---

### removeEventListener()

#### Call Signature

```ts
removeEventListener<K>(
   type,
   listener,
   options?): void;
```

##### Type Parameters

| Type Parameter                                         |
| ------------------------------------------------------ |
| `K` _extends_ keyof `ServiceWorkerGlobalScopeEventMap` |

##### Parameters

| Parameter  | Type                                |
| ---------- | ----------------------------------- |
| `type`     | `K`                                 |
| `listener` | (`this`, `ev`) => `any`             |
| `options?` | `boolean` \| `EventListenerOptions` |

##### Returns

`void`

##### Inherited from

```ts
ServiceWorkerGlobalScope.removeEventListener
```

#### Call Signature

```ts
removeEventListener(
   type,
   listener,
   options?): void;
```

##### Parameters

| Parameter  | Type                                 |
| ---------- | ------------------------------------ |
| `type`     | `string`                             |
| `listener` | `EventListenerOrEventListenerObject` |
| `options?` | `boolean` \| `EventListenerOptions`  |

##### Returns

`void`

##### Inherited from

```ts
ServiceWorkerGlobalScope.removeEventListener
```

---

### reportError()

```ts
reportError(e): void;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/reportError)

#### Parameters

| Parameter | Type  |
| --------- | ----- |
| `e`       | `any` |

#### Returns

`void`

#### Inherited from

```ts
ServiceWorkerGlobalScope.reportError
```

---

### setInterval()

```ts
setInterval(
   handler,
   timeout?, ...
   arguments?): number;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/setInterval)

#### Parameters

| Parameter       | Type           |
| --------------- | -------------- |
| `handler`       | `TimerHandler` |
| `timeout?`      | `number`       |
| ...`arguments?` | `any`[]        |

#### Returns

`number`

#### Inherited from

```ts
ServiceWorkerGlobalScope.setInterval
```

---

### setTimeout()

```ts
setTimeout(
   handler,
   timeout?, ...
   arguments?): number;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/setTimeout)

#### Parameters

| Parameter       | Type           |
| --------------- | -------------- |
| `handler`       | `TimerHandler` |
| `timeout?`      | `number`       |
| ...`arguments?` | `any`[]        |

#### Returns

`number`

#### Inherited from

```ts
ServiceWorkerGlobalScope.setTimeout
```

---

### skipWaiting()

```ts
skipWaiting(): Promise<void>;
```

The **`skipWaiting()`** method of the ServiceWorkerGlobalScope interface forces the waiting service worker to become the active service worker.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting)

#### Returns

`Promise`\<`void`\>

#### Inherited from

```ts
ServiceWorkerGlobalScope.skipWaiting
```

---

### structuredClone()

```ts
structuredClone<T>(value, options?): T;
```

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/structuredClone)

#### Type Parameters

| Type Parameter | Default type |
| -------------- | ------------ |
| `T`            | `any`        |

#### Parameters

| Parameter  | Type                         |
| ---------- | ---------------------------- |
| `value`    | `T`                          |
| `options?` | `StructuredSerializeOptions` |

#### Returns

`T`

#### Inherited from

```ts
ServiceWorkerGlobalScope.structuredClone
```

## Properties

| Property                                                         | Modifier   | Type                                        | Description                                                                                                                                                                                                                                                                                                                      | Inherited from                                      |
| ---------------------------------------------------------------- | ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| <a id="caches"></a> `caches`                                     | `readonly` | `CacheStorage`                              | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/caches)                                                                                                                                                                                                                     | `ServiceWorkerGlobalScope.caches`                   |
| <a id="clients"></a> `clients`                                   | `readonly` | `Clients`                                   | The **`clients`** read-only property of the object associated with the service worker. [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/clients)                                                                                                                                              | `ServiceWorkerGlobalScope.clients`                  |
| <a id="cookiestore"></a> `cookieStore`                           | `readonly` | `CookieStore`                               | The **`cookieStore`** read-only property of the ServiceWorkerGlobalScope interface returns a reference to the CookieStore object associated with this service worker. [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/cookieStore)                                                           | `ServiceWorkerGlobalScope.cookieStore`              |
| <a id="crossoriginisolated"></a> `crossOriginIsolated`           | `readonly` | `boolean`                                   | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/crossOriginIsolated)                                                                                                                                                                                                                                           | `ServiceWorkerGlobalScope.crossOriginIsolated`      |
| <a id="crypto"></a> `crypto`                                     | `readonly` | `Crypto`                                    | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/crypto)                                                                                                                                                                                                                                                        | `ServiceWorkerGlobalScope.crypto`                   |
| <a id="fonts"></a> `fonts`                                       | `readonly` | `FontFaceSet`                               | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/fonts)                                                                                                                                                                                                                                                       | `ServiceWorkerGlobalScope.fonts`                    |
| <a id="indexeddb"></a> `indexedDB`                               | `readonly` | `IDBFactory`                                | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/indexedDB)                                                                                                                                                                                                                                                     | `ServiceWorkerGlobalScope.indexedDB`                |
| <a id="issecurecontext"></a> `isSecureContext`                   | `readonly` | `boolean`                                   | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/isSecureContext)                                                                                                                                                                                                                                               | `ServiceWorkerGlobalScope.isSecureContext`          |
| <a id="location"></a> `location`                                 | `readonly` | `WorkerLocation`                            | The **`location`** read-only property of the WorkerGlobalScope interface returns the WorkerLocation associated with the worker. [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/location)                                                                                                           | `ServiceWorkerGlobalScope.location`                 |
| <a id="navigator"></a> `navigator`                               | `readonly` | `WorkerNavigator`                           | The **`navigator`** read-only property of the WorkerGlobalScope interface returns the WorkerNavigator associated with the worker. [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/navigator)                                                                                                        | `ServiceWorkerGlobalScope.navigator`                |
| <a id="onactivate"></a> `onactivate`                             | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/activate_event)                                                                                                                                                                                                                              | `ServiceWorkerGlobalScope.onactivate`               |
| <a id="oncookiechange"></a> `oncookiechange`                     | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/cookiechange_event)                                                                                                                                                                                                                          | `ServiceWorkerGlobalScope.oncookiechange`           |
| <a id="onerror"></a> `onerror`                                   | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/error_event)                                                                                                                                                                                                                                        | `ServiceWorkerGlobalScope.onerror`                  |
| <a id="onfetch"></a> `onfetch`                                   | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/fetch_event)                                                                                                                                                                                                                                 | `ServiceWorkerGlobalScope.onfetch`                  |
| <a id="oninstall"></a> `oninstall`                               | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/install_event)                                                                                                                                                                                                                               | `ServiceWorkerGlobalScope.oninstall`                |
| <a id="onlanguagechange"></a> `onlanguagechange`                 | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/languagechange_event)                                                                                                                                                                                                                               | `ServiceWorkerGlobalScope.onlanguagechange`         |
| <a id="onmessage"></a> `onmessage`                               | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/message_event)                                                                                                                                                                                                                               | `ServiceWorkerGlobalScope.onmessage`                |
| <a id="onmessageerror"></a> `onmessageerror`                     | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/messageerror_event)                                                                                                                                                                                                                          | `ServiceWorkerGlobalScope.onmessageerror`           |
| <a id="onnotificationclick"></a> `onnotificationclick`           | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event)                                                                                                                                                                                                                     | `ServiceWorkerGlobalScope.onnotificationclick`      |
| <a id="onnotificationclose"></a> `onnotificationclose`           | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/notificationclose_event)                                                                                                                                                                                                                     | `ServiceWorkerGlobalScope.onnotificationclose`      |
| <a id="onoffline"></a> `onoffline`                               | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/offline_event)                                                                                                                                                                                                                                      | `ServiceWorkerGlobalScope.onoffline`                |
| <a id="ononline"></a> `ononline`                                 | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/online_event)                                                                                                                                                                                                                                       | `ServiceWorkerGlobalScope.ononline`                 |
| <a id="onpush"></a> `onpush`                                     | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/push_event)                                                                                                                                                                                                                                  | `ServiceWorkerGlobalScope.onpush`                   |
| <a id="onpushsubscriptionchange"></a> `onpushsubscriptionchange` | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/pushsubscriptionchange_event)                                                                                                                                                                                                                | `ServiceWorkerGlobalScope.onpushsubscriptionchange` |
| <a id="onrejectionhandled"></a> `onrejectionhandled`             | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/rejectionhandled_event)                                                                                                                                                                                                                             | `ServiceWorkerGlobalScope.onrejectionhandled`       |
| <a id="onunhandledrejection"></a> `onunhandledrejection`         | `public`   | (`this`, `ev`) => `any` \| `null`           | [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/unhandledrejection_event)                                                                                                                                                                                                                           | `ServiceWorkerGlobalScope.onunhandledrejection`     |
| <a id="origin"></a> `origin`                                     | `readonly` | `string`                                    | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/origin)                                                                                                                                                                                                                                                        | `ServiceWorkerGlobalScope.origin`                   |
| <a id="performance"></a> `performance`                           | `readonly` | `Performance`                               | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/performance)                                                                                                                                                                                                                                                   | `ServiceWorkerGlobalScope.performance`              |
| <a id="registration"></a> `registration`                         | `readonly` | `ServiceWorkerRegistration`                 | The **`registration`** read-only property of the ServiceWorkerGlobalScope interface returns a reference to the ServiceWorkerRegistration object, which represents the service worker's registration. [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/registration)                           | `ServiceWorkerGlobalScope.registration`             |
| <a id="self"></a> `self`                                         | `readonly` | `WorkerGlobalScope` & _typeof_ `globalThis` | The **`self`** read-only property of the WorkerGlobalScope interface returns a reference to the `WorkerGlobalScope` itself. [MDN Reference](https://developer.mozilla.org/docs/Web/API/WorkerGlobalScope/self)                                                                                                                   | `ServiceWorkerGlobalScope.self`                     |
| <a id="serviceworker"></a> `serviceWorker`                       | `readonly` | `ServiceWorker`                             | The **`serviceWorker`** read-only property of the ServiceWorkerGlobalScope interface returns a reference to the ServiceWorker object, which represents the service worker. [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/serviceWorker)                                                    | `ServiceWorkerGlobalScope.serviceWorker`            |
| <a id="sessioncount"></a> `sessionCount`                         | `readonly` | `number`                                    | The number of active sessions                                                                                                                                                                                                                                                                                                    | -                                                   |
| <a id="suspended"></a> `suspended`                               | `readonly` | `boolean`                                   | Whether the service worker is suspended (circuit breaker engaged). When `true`, fetch handlers should bypass their logic and return `fetch(event.request)` directly. **Example** `sw.addEventListener('fetch', (event) => { if (sw.suspended) { event.respondWith(fetch(event.request)) return } // Normal fetch handling... })` | -                                                   |
| <a id="version"></a> `version`                                   | `readonly` | `string`                                    | The version of this service worker                                                                                                                                                                                                                                                                                               | -                                                   |
