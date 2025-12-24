<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { createLogger } from "../logger.ts";
import { getServiceWorker } from "../sw/controller.ts";

import type {
  FileChangeMessage,
  ServiceWorkerToMainMessage,
  WorkerToMainMessage,
} from "../messages/types.ts";

const logger = createLogger("preview");
const props = defineProps<{
  code: string;
}>();

const iframeRef = useTemplateRef("iframeRef");
const isServiceWorkerReady = ref(false);
const isWorkerReady = ref(false);
const isIframeReady = ref(false);
const error = ref<string | null>(null);

// Web Worker instance
let worker: Worker | null = null;

// MessageChannel for Service Worker <-> Web Worker communication
let serviceWorkerAndWorkerChannel: MessageChannel | null = null;

// MessageChannel for Service Worker <-> iframe communication
let serviceWorkerAndIframeChannel: MessageChannel | null = null;

/**
 * Computed: All systems ready
 */
const isReady = computed(
  () =>
    isServiceWorkerReady.value && isWorkerReady.value && isIframeReady.value,
);

onMounted(() => {
  logger.debug("Mounting...");

  // Create Web Worker
  worker = new Worker(
    new URL("../worker/transform.worker.ts", import.meta.url),
    { type: "module" },
  );

  // Handle Worker messages
  worker.onmessage = handleWorkerMessage;

  // Create MessageChannel for Service Worker <-> Worker communication
  serviceWorkerAndWorkerChannel = new MessageChannel();

  // Create MessageChannel for Service Worker <-> iframe communication
  serviceWorkerAndIframeChannel = new MessageChannel();

  // Listen for iframe messages (for initial handshake)
  window.addEventListener("message", handleIframeMessage);

  // Listen for Service Worker messages
  navigator.serviceWorker?.addEventListener(
    "message",
    handleServiceWorkerMessage,
  );

  // Initialize Service Worker communication
  const serviceWorker = getServiceWorker();
  if (serviceWorker) {
    // Send init to get service-worker-ready response
    logger.debug("Sending init to Service Worker");
    serviceWorker.postMessage({ type: "init" });
  } else {
    throw new Error("Cannot use Service Worker");
  }
});

onUnmounted(() => {
  window.removeEventListener("message", handleIframeMessage);
  navigator.serviceWorker?.removeEventListener(
    "message",
    handleServiceWorkerMessage,
  );
  worker?.terminate();
  serviceWorkerAndWorkerChannel?.port1.close();
  serviceWorkerAndWorkerChannel?.port2.close();
  serviceWorkerAndIframeChannel?.port1.close();
  serviceWorkerAndIframeChannel?.port2.close();
});

/**
 * Handle messages from Web Worker
 */
function handleWorkerMessage(event: MessageEvent<WorkerToMainMessage>) {
  const { type } = event.data || {};
  logger.debug("Worker message:", type, event.data);

  if (type === "worker-ready") {
    logger.debug("Worker is ready");
    isWorkerReady.value = true;
    setupServiceWorkerWebWorkerBridge();
    checkReady();
  }
}

/**
 * Handle messages from Service Worker
 */
function handleServiceWorkerMessage(
  event: MessageEvent<ServiceWorkerToMainMessage>,
) {
  const { type } = event.data || {};
  logger.debug("Service Worker message:", type, event.data);

  if (type === "service-worker-ready") {
    logger.debug("Service Worker is ready");
    isServiceWorkerReady.value = true;
    setupServiceWorkerWebWorkerBridge();
    setupServiceWorkerIframeBridge();
    checkReady();
  }
}

/**
 * Handle messages from iframe
 */
function handleIframeMessage(event: MessageEvent) {
  // Check origin (same origin for our iframe)
  if (event.origin !== window.location.origin) {
    return;
  }

  // Check source is our iframe (if iframeRef is available)
  const iframeWindow = iframeRef.value?.contentWindow;
  if (iframeWindow && event.source !== iframeWindow) {
    return;
  }

  const { type, message } = event.data || {};
  logger.debug("iframe message:", type, event.data);

  if (type === "hmr-client-ready") {
    logger.debug("iframe HMR client is ready");
    isIframeReady.value = true;
    setupServiceWorkerIframeBridge();
    checkReady();
  } else if (type === "error") {
    error.value = message;
  } else if (type === "success") {
    error.value = null;
  }
}

/**
 * Setup MessageChannel bridge between Service Worker and iframe
 */
function setupServiceWorkerIframeBridge() {
  if (
    !isServiceWorkerReady.value ||
    !isIframeReady.value ||
    !serviceWorkerAndIframeChannel
  ) {
    return;
  }

  const serviceWorker = getServiceWorker();
  const iframe = iframeRef.value;
  if (!serviceWorker || !iframe?.contentWindow) {
    logger.debug("Cannot setup Service Worker <-> iframe bridge");
    return;
  }

  logger.debug("Setting up Service Worker <-> iframe bridge...");

  // Send port1 to Service Worker
  serviceWorker.postMessage(
    { type: "connect-iframe", port: serviceWorkerAndIframeChannel.port1 },
    [serviceWorkerAndIframeChannel.port1],
  );

  // Send port2 to iframe
  iframe.contentWindow.postMessage(
    {
      type: "connect-service-worker",
      port: serviceWorkerAndIframeChannel.port2,
    },
    "*",
    [serviceWorkerAndIframeChannel.port2],
  );
}

/**
 * Setup MessageChannel bridge between Service Worker and Web Worker
 */
function setupServiceWorkerWebWorkerBridge() {
  if (
    !isServiceWorkerReady.value ||
    !isWorkerReady.value ||
    !serviceWorkerAndWorkerChannel
  ) {
    return;
  }

  const serviceWorker = getServiceWorker();
  if (!serviceWorker) {
    logger.debug("No active Service Worker");
    return;
  }

  logger.debug("Setting up Service Worker <-> Worker bridge...");

  // Send port1 to Service Worker
  serviceWorker.postMessage(
    { type: "connect-worker", port: serviceWorkerAndWorkerChannel.port1 },
    [serviceWorkerAndWorkerChannel.port1],
  );

  // Send port2 to Web Worker
  worker?.postMessage(
    {
      type: "connect-service-worker",
      port: serviceWorkerAndWorkerChannel.port2,
    },
    [serviceWorkerAndWorkerChannel.port2],
  );
}

/**
 * Check if all systems are ready
 */
function checkReady() {
  if (isReady.value) {
    logger.debug("All systems ready!");
    if (props.code) {
      sendCodeChange(props.code);
    }
  }
}

/**
 * Handle iframe load event
 */
function onIframeLoad() {
  logger.debug("iframe loaded");
}

/**
 * Send code change to Service Worker and Web Worker
 */
function sendCodeChange(code: string) {
  const file = "/main.js";

  const message: FileChangeMessage = {
    type: "file-change",
    file,
    content: code,
  };

  // Send to Web Worker (for file cache)
  if (worker) {
    logger.debug("Sending file change to Worker:", file);
    worker.postMessage(message);
  }

  // Send to Service Worker (for HMR trigger)
  const serviceWorker = getServiceWorker();
  if (!serviceWorker) {
    logger.debug("No active Service Worker");
    return;
  }

  logger.debug("Sending file change to Service Worker:", file);
  serviceWorker.postMessage(message);
}

// Watch for code changes
watch(
  () => props.code,
  (newCode) => {
    if (isReady.value) {
      sendCodeChange(newCode);
    }
  },
);
</script>

<template>
  <div class="preview-panel">
    <div class="preview-header">
      <span>Preview</span>
      <div class="status-container">
        <span
          :class="['status-dot', { ready: isServiceWorkerReady }]"
          title="Service Worker"
        ></span>
        <span :class="['status-dot', { ready: isWorkerReady }]" title="Web Worker"></span>
        <span :class="['status-dot', { ready: isIframeReady }]" title="iframe"></span>
        <span v-if="error" class="status error">Error</span>
        <span v-else-if="isReady" class="status ready">Ready</span>
        <span v-else class="status loading">Loading...</span>
      </div>
    </div>
    <div class="preview-content">
      <div v-if="error" class="error-overlay">
        <pre>{{ error }}</pre>
      </div>
      <iframe
        ref="iframeRef"
        src="/src/preview/index.html"
        class="preview-iframe"
        sandbox="allow-scripts allow-same-origin"
        @load="onIframeLoad"
      ></iframe>
    </div>
  </div>
</template>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f3f3f3;
  color: #333333;
  font-size: 13px;
  border-bottom: 1px solid #e0e0e0;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}

.status-dot.ready {
  background: #4caf50;
}

.status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.status.loading {
  background: #fff3cd;
  color: #856404;
}

.status.ready {
  background: #d4edda;
  color: #155724;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
}

.preview-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: #fff5f5;
  border-bottom: 1px solid #feb2b2;
  padding: 12px;
  z-index: 10;
  max-height: 200px;
  overflow: auto;
}

.error-overlay pre {
  margin: 0;
  font-size: 12px;
  color: #c53030;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
