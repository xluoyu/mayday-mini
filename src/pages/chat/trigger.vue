<script setup lang="ts">
import { LISTEN_KEY, WINDOW_LABEL } from '@/constants'
import { hideWindow, showWindow } from '@/plugins/window'
import { isTauri } from '@/utils/isTauri'

async function handleClick() {
  await hideWindow(WINDOW_LABEL.CHAT_TRIGGER)
  await showWindow(WINDOW_LABEL.CHAT)
}

if (isTauri) {
  const { PhysicalPosition } = await import('@tauri-apps/api/dpi')
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const { useTauriListen } = await import('@/composables/useTauriListen')

  const appWindow = getCurrentWebviewWindow()

  useTauriListen<{ x: number, y: number, width: number, height: number }>(
    LISTEN_KEY.CHAT_TRIGGER_POSITION,
    async ({ payload }) => {
      const { x, y, width } = payload
      await appWindow.setPosition(new PhysicalPosition(x + width + 8, y + 8))
    },
  )
}
</script>

<template>
  <div
    class="trigger-btn"
    @click.stop="handleClick"
    @mousedown.stop
  >
    <div class="i-solar:chat-round-bold text-5 text-white" />
  </div>
</template>

<style scoped>
.trigger-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.trigger-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}
</style>
