<script setup lang="ts">
import { onMounted } from 'vue';
import HelloWorld from './components/HelloWorld.vue';
import { runWithLatestSWControl } from './controller';

onMounted(async () => {
  const EXPECTED_SW_VERSION = '2026-01-07-001'

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(new Error('timeout')), 15_000)

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')

    await runWithLatestSWControl(
      {
        registration: reg,
        expectedVersion: EXPECTED_SW_VERSION,
        signal: ac.signal,

        // ✅ waiting が存在する限り必ず skipWaiting
        skipWaitingPolicy: 'always-when-waiting',

        // ✅ controller が切り替わらなそうなら reload を促す
        onReloadSuggested: ({ reason }) => {
          // ここで UI を出す（例）
          console.log('Reload suggested:', reason)
          // 例: "更新を適用するには再読み込みしてください"
        },
        onProgress: (phase: string) => {
          console.log('phase:', phase)
        },
        onExpectedStateChange: (info) => {
          console.log('onExpectedStateChange', info.state)
        }
      },
      () => {
        console.log('✅ expected SW controls this page. run logic.')
      }
    )
  } finally {
    clearTimeout(t)
  }
})
</script>

<template>
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
