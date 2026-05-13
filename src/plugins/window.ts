import type { WINDOW_LABEL } from '../constants'

import { isTauri } from '../utils/isTauri'

export type WindowLabel = typeof WINDOW_LABEL[keyof typeof WINDOW_LABEL]

const COMMAND = {
  SHOW_WINDOW: 'plugin:custom-window|show_window',
  HIDE_WINDOW: 'plugin:custom-window|hide_window',
  SET_ALWAYS_ON_TOP: 'plugin:custom-window|set_always_on_top',
  SET_TASKBAR_VISIBILITY: 'plugin:custom-window|set_taskbar_visibility',
}

export async function showWindow(label?: WindowLabel) {
  if (!isTauri) return

  const { invoke } = await import('@tauri-apps/api/core')
  await invoke(COMMAND.SHOW_WINDOW, { label: label ?? null })
}

export async function hideWindow(label?: WindowLabel) {
  if (!isTauri) return

  const { invoke } = await import('@tauri-apps/api/core')
  await invoke(COMMAND.HIDE_WINDOW, { label: label ?? null })
}

export async function setAlwaysOnTop(alwaysOnTop: boolean) {
  if (!isTauri) return

  const { invoke } = await import('@tauri-apps/api/core')
  invoke(COMMAND.SET_ALWAYS_ON_TOP, { alwaysOnTop })
}

export async function toggleWindowVisible(label?: WindowLabel) {
  if (!isTauri) return

  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const appWindow = getCurrentWebviewWindow()

  if (appWindow.label !== label) return

  const visible = await appWindow.isVisible()

  if (visible) {
    return hideWindow(label)
  }

  return showWindow(label)
}

export async function setTaskbarVisibility(visible: boolean) {
  if (!isTauri) return

  const { invoke } = await import('@tauri-apps/api/core')
  invoke(COMMAND.SET_TASKBAR_VISIBILITY, { visible })
}
