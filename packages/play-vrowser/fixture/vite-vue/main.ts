import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')

if (import.meta.hot) {
  import.meta.hot.accept()
}
