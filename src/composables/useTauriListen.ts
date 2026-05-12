import { noop } from '@vueuse/core'
import { onMounted, onUnmounted, ref } from 'vue'

import { isTauri } from '@/utils/isTauri'

type ListenArgs = Parameters<typeof import('@tauri-apps/api/event').listen>

export function useTauriListen<T>(...args: Parameters<typeof import('@tauri-apps/api/event').listen<T>>) {
  const unlisten = ref(noop)

  onMounted(async () => {
    if (!isTauri) return
    const { listen } = await import('@tauri-apps/api/event')
    unlisten.value = await listen<T>(...(args as unknown as ListenArgs))
  })

  onUnmounted(() => {
    unlisten.value()
  })
}
