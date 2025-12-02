<script setup lang="ts">
import {
  onMounted,
  onUnmounted,
  reactive,
  ref,
  useTemplateRef,
  watch,
} from "vue";

const props = defineProps<{
  code: string;
}>();

const iframeRef = useTemplateRef("iframeRef");
const isReady = ref(false);
const isWorkerReady = ref(false);
const isIframeReady = ref(false);
const error = ref<string | null>(null);

// File state management
const files = reactive<Record<string, string>>({});

// Worker and MessageChannel
let worker: Worker | null = null;
let channel: MessageChannel | null = null;

console.log("[Main] import.meta", import.meta);
onMounted(() => {
  // Create Worker
  worker = new Worker(new URL("../worker/bundler.worker.ts", import.meta.url), {
    type: "module",
  });

  // Create MessageChannel for Worker ↔ iframe communication
  channel = new MessageChannel();

  // Handle Worker messages
  worker.onmessage = handleWorkerMessage;

  // Listen for iframe messages
  window.addEventListener("message", handleIframeMessage);
});

onUnmounted(() => {
  window.removeEventListener("message", handleIframeMessage);
  worker?.terminate();
  channel?.port1.close();
  channel?.port2.close();
});

/**
 * Handle messages from Worker
 */
function handleWorkerMessage(event: MessageEvent) {
  const { type, message } = event.data || {};

  if (type === "ready") {
    console.log("[Main] Worker is ready");
    isWorkerReady.value = true;
    checkReady();
  } else if (type === "bundle-error") {
    console.error("[Main] Bundle error:", message);
    error.value = message;
  }
}

/**
 * Handle messages from iframe
 */
function handleIframeMessage(event: MessageEvent) {
  const { type, message } = event.data || {};

  if (type === "ready") {
    console.log("[Main] iframe is ready");
    isIframeReady.value = true;
    checkReady();
  } else if (type === "error") {
    error.value = message;
  } else if (type === "success") {
    error.value = null;
  }
}

/**
 * Check if both Worker and iframe are ready
 */
function checkReady() {
  if (isWorkerReady.value && isIframeReady.value && !isReady.value) {
    isReady.value = true;
    // Send initial code
    if (props.code) {
      sendCode(props.code);
    }
  }
}

/**
 * Initialize Worker and iframe with MessageChannel ports
 */
function initializePorts() {
  if (!worker || !channel || !iframeRef.value?.contentWindow) {
    return;
  }

  console.log("[Main] Initializing ports...");

  // Transfer port1 to Worker (for sending bundled code to iframe)
  worker.postMessage({ type: "init", port: channel.port1 }, [channel.port1]);

  // Transfer port2 to iframe (for receiving bundled code from Worker)
  iframeRef.value.contentWindow.postMessage(
    { type: "init", port: channel.port2 },
    "*",
    [channel.port2],
  );
}

/**
 * Handle iframe load event
 */
function onIframeLoad() {
  console.log("[Main] iframe loaded");
  initializePorts();
}

/**
 * Send code update to Worker for bundling
 */
function sendCode(code: string) {
  if (!worker || !isReady.value) {
    return;
  }

  // Update files
  files["/main.js"] = code;

  console.log("[Main] Sending bundle request to Worker");

  // Send bundle request to Worker
  worker.postMessage({
    type: "bundle",
    entry: "/main.js",
    files: { ...files },
  });
}

watch(
  () => props.code,
  (newCode) => {
    if (isReady.value) {
      sendCode(newCode);
    }
  },
);
</script>

<template>
  <div class="preview-panel">
    <div class="preview-header">
      <span>Preview</span>
      <span v-if="!isReady" class="status loading">Loading...</span>
      <span v-else-if="error" class="status error">Error</span>
      <span v-else class="status ready">Ready</span>
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
