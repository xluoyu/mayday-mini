import type { Event } from '@tauri-apps/api/event'

import { useDebounceFn } from '@vueuse/core'
import { isNumber } from 'es-toolkit/compat'
import { onMounted, ref, watch } from 'vue'

import { WINDOW_LABEL } from '@/constants'
import { useAppStore } from '@/stores/app'
import { useCatStore } from '@/stores/cat'
import { isTauri } from '@/utils/isTauri'
import { getCursorMonitor } from '@/utils/monitor'

export type WindowState = Record<string, Partial<{ x: number, y: number, width: number, height: number }> | undefined>

export function useWindowState() {
  const appStore = useAppStore()
  const catStore = useCatStore()
  const isRestored = ref(false)

  if (!isTauri) {
    isRestored.value = true
    return {
      isRestored,
      restoreState: async () => {},
    }
  }

  let appWindow: Awaited<ReturnType<typeof import('@tauri-apps/api/webviewWindow').getCurrentWebviewWindow>> | undefined
  let PhysicalPositionCtor: typeof import('@tauri-apps/api/dpi').PhysicalPosition | undefined
  let PhysicalSizeCtor: typeof import('@tauri-apps/api/dpi').PhysicalSize | undefined
  let label = ''

  const clampToMonitor = useDebounceFn(async () => {
    if (!appWindow || label !== WINDOW_LABEL.MAIN || !catStore.window.keepInScreen) return

    const monitor = await getCursorMonitor()

    if (!monitor) return

    const { position: monitorPos, size: monitorSize } = monitor
    const windowSize = await appWindow.outerSize()
    const windowPos = await appWindow.outerPosition()

    const minX = monitorPos.x
    const maxX = monitorPos.x + monitorSize.width - windowSize.width
    const minY = monitorPos.y
    const maxY = monitorPos.y + monitorSize.height - windowSize.height

    const clampedX = Math.max(minX, Math.min(windowPos.x, maxX))
    const clampedY = Math.max(minY, Math.min(windowPos.y, maxY))

    if (clampedX === windowPos.x && clampedY === windowPos.y) return

    return appWindow.setPosition(new PhysicalPositionCtor!(clampedX, clampedY))
  }, 500)

  watch(() => catStore.window.keepInScreen, clampToMonitor)

  const onChange = async (event: Event<{ x: number, y: number } | { width: number, height: number }>) => {
    if (!appWindow) return

    const minimized = await appWindow.isMinimized()

    if (minimized) return

    appStore.windowState[label] ??= {}

    Object.assign(appStore.windowState[label]!, event.payload)

    clampToMonitor()
  }

  onMounted(async () => {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const dpi = await import('@tauri-apps/api/dpi')
    PhysicalPositionCtor = dpi.PhysicalPosition
    PhysicalSizeCtor = dpi.PhysicalSize
    appWindow = getCurrentWebviewWindow()
    label = appWindow.label

    appWindow.onMoved(onChange)
    appWindow.onResized(onChange)
    appWindow.onScaleChanged(clampToMonitor)
  })

  const restoreState = async () => {
    if (!appWindow || !PhysicalPositionCtor || !PhysicalSizeCtor) {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
      const dpi = await import('@tauri-apps/api/dpi')
      PhysicalPositionCtor = dpi.PhysicalPosition
      PhysicalSizeCtor = dpi.PhysicalSize
      appWindow = getCurrentWebviewWindow()
      label = appWindow.label
    }

    const { x, y, width, height } = appStore.windowState[label] ?? {}

    if (isNumber(x) && isNumber(y)) {
      const { availableMonitors } = await import('@tauri-apps/api/window')
      const monitors = await availableMonitors()

      const monitor = monitors.find((monitor) => {
        const { position, size } = monitor

        const inBoundsX = x >= position.x && x <= position.x + size.width
        const inBoundsY = y >= position.y && y <= position.y + size.height

        return inBoundsX && inBoundsY
      })

      if (monitor) {
        await appWindow.setPosition(new PhysicalPositionCtor(x, y))
      }
    }

    if (width && height) {
      await appWindow.setSize(new PhysicalSizeCtor(width, height))
    }

    isRestored.value = true

    clampToMonitor()
  }

  return {
    isRestored,
    restoreState,
  }
}
