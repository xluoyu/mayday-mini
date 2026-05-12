import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

import type { WindowState } from '@/composables/useWindowState'

import { isTauri } from '@/utils/isTauri'

export const useAppStore = defineStore('app', () => {
  const name = ref('')
  const version = ref('')
  const windowState = reactive<WindowState>({})

  const init = async () => {
    if (isTauri) {
      const { getName, getVersion } = await import('@tauri-apps/api/app')
      name.value = await getName()
      version.value = await getVersion()
    }
  }

  return {
    name,
    version,
    windowState,
    init,
  }
})
