<script setup lang="ts">
import { HappyProvider } from '@antdv-next/happy-work-theme'
import { useEventListener } from '@vueuse/core'
import { ConfigProvider, theme } from 'antdv-next'
import { isString } from 'es-toolkit'
import isURL from 'is-url'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView } from 'vue-router'

import { LANGUAGE, LISTEN_KEY } from './constants'
import { getAntdLocale } from './locales/index.ts'
import { useAppStore } from './stores/app'
import { useCatStore } from './stores/cat'
import { useGeneralStore } from './stores/general'
import { useModelStore } from './stores/model'
import { useShortcutStore } from './stores/shortcut.ts'
import { isTauri } from './utils/isTauri'

const appStore = useAppStore()
const modelStore = useModelStore()
const catStore = useCatStore()
const generalStore = useGeneralStore()
const shortcutStore = useShortcutStore()
const { darkAlgorithm, defaultAlgorithm } = theme
const { locale } = useI18n()
const isRestored = ref(!isTauri)

onMounted(async () => {
  if (isTauri) {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { useTauriListen } = await import('./composables/useTauriListen')
    const { useWindowState } = await import('./composables/useWindowState')
    const { hideWindow, showWindow } = await import('./plugins/window')

    const appWindow = getCurrentWebviewWindow()
    const { restoreState } = useWindowState()

    await appStore.$tauri.start()
    await appStore.init()
    await modelStore.$tauri.start()
    await modelStore.init()
    await catStore.$tauri.start()
    catStore.init()
    await generalStore.$tauri.start()
    await generalStore.init()
    await shortcutStore.$tauri.start()
    await restoreState()
    isRestored.value = true

    useTauriListen(LISTEN_KEY.SHOW_WINDOW, ({ payload }) => {
      if (appWindow.label !== payload) return
      showWindow()
    })

    useTauriListen(LISTEN_KEY.HIDE_WINDOW, ({ payload }) => {
      if (appWindow.label !== payload) return
      hideWindow()
    })
  }
})

watch(() => generalStore.appearance.language, (value) => {
  locale.value = value ?? LANGUAGE.EN_US
})

useEventListener('unhandledrejection', ({ reason }) => {
  const message = isString(reason) ? reason : JSON.stringify(reason)

  if (isTauri) {
    import('@tauri-apps/plugin-log').then(({ error }) => error(message))
  } else {
    console.error(message)
  }
})

useEventListener('click', (event) => {
  const link = (event.target as HTMLElement).closest('a')

  if (!link) return

  const { href, target } = link

  if (target === '_blank') return

  event.preventDefault()

  if (!isURL(href)) return

  if (isTauri) {
    import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(href))
  } else {
    window.open(href, '_blank')
  }
})
</script>

<template>
  <HappyProvider
    v-slot="{ wave }"
    enabled
  >
    <ConfigProvider
      :locale="getAntdLocale(generalStore.appearance.language)"
      :theme="{
        algorithm: generalStore.appearance.isDark ? darkAlgorithm : defaultAlgorithm,
      }"
      :wave="wave"
    >
      <RouterView v-if="isRestored" v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
        </Suspense>
      </RouterView>
    </ConfigProvider>
  </HappyProvider>
</template>
