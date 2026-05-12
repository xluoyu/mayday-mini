import { isTauri } from './isTauri'

let currentPlatform = ''

if (isTauri) {
  const { platform } = await import('@tauri-apps/plugin-os')
  currentPlatform = platform()
}

export const isMac = currentPlatform === 'macos'

export const isWindows = currentPlatform === 'windows'

export const isLinux = currentPlatform === 'linux'
