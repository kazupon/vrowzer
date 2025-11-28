<script setup lang="ts">
import { ref, onMounted, watch, useTemplateRef } from "vue";

const props = defineProps<{
  code: string;
}>();

const iframeRef = useTemplateRef("iframeRef");
const isReady = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  window.addEventListener("message", handleMessage);
});

function handleMessage(event: MessageEvent) {
  if (event.data?.type === "ready") {
    isReady.value = true;
    // Send initial code
    sendCode(props.code);
  } else if (event.data?.type === "error") {
    error.value = event.data.message;
  } else if (event.data?.type === "success") {
    error.value = null;
  }
}

function sendCode(code: string) {
  if (iframeRef.value?.contentWindow && isReady.value) {
    iframeRef.value.contentWindow.postMessage(
      {
        type: "update",
        path: "/main.js",
        code,
      },
      "*",
    );
  }
}

watch(
  () => props.code,
  (newCode) => {
    sendCode(newCode);
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
