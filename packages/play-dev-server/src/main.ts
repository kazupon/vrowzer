import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

import type { Component } from 'vue'

// Mount Vue app first, then SW/WW initialization happens in App.vue onMounted
// (SW and WW are initialized in parallel, MessageChannel established after both are ready)
console.log('[Main] Mounting Vue app...')
createApp(App as Component).mount('#app')
