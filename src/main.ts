import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { i18n } from './locales'
import router from './router'
import { isTauri } from './utils/isTauri'

import 'virtual:uno.css'
import 'antdv-next/dist/reset.css'

import './assets/css/global.scss'

const pinia = createPinia()

if (isTauri) {
  const { createPlugin } = await import('@tauri-store/pinia')
  pinia.use(createPlugin({ saveOnChange: true }))
}

createApp(App).use(router).use(pinia).use(i18n).mount('#app')
