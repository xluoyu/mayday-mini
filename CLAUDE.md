# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BongoCat is a cross-platform desktop app that renders an animated Live2D cat model reacting to keyboard, mouse, and gamepad input. Built with **Tauri v2** (Rust backend) + **Vue 3** (TypeScript frontend). Inspired by Bongo-Cat-Mver, targeting macOS, Windows, and Linux.

## Commands

```bash
pnpm dev          # Build icons + start Vite dev server (port 1420)
pnpm build        # Build icons + Vite production build
pnpm lint         # ESLint with auto-fix
pnpm tauri dev    # Full Tauri dev mode (Rust + Vite)
pnpm tauri build  # Full Tauri production build
```

Package manager is **pnpm** (enforced via `npx only-allow pnpm`). No test framework is configured.

## Commit Convention

Conventional commits enforced by commitlint. Format: `type(scope): message`. Types: feat, fix, refactor, chore, docs, style, perf, test, ci, build.

## Architecture

### Two-Window Design

The app runs two Tauri webview windows from a single `index.html` using hash-based routing:

- **`main`** (`#/`) — Transparent, always-on-top floating cat window. On macOS, converted to an NSPanel.
- **`preference`** (`#/preference`) — Settings window, hidden by default.

### Frontend (`src/`)

- **`pages/main/`** — Cat window: hosts the Live2D canvas and handles input device listening.
- **`pages/preference/`** — Settings UI: model selection, key bindings, appearance, shortcuts.
- **`composables/`** — Core logic lives here:
  - `useDevice` — Subscribes to Rust `device-changed` events, maps keyboard/mouse to Live2D parameters, handles cursor smoothing via pixi.js Ticker.
  - `useGamepad` — Subscribes to `gamepad-changed` events, maps axes/buttons to Live2D parameters.
  - `useModel` — Loads Live2D models, maps key presses to model key images, manages motions/expressions.
  - `useKeyPress` — Global hotkey registration via Tauri plugin.
  - `useTray`, `useAppMenu`, `useWindowState` — System tray, native menus, window position tracking.
  - `useTauriListen` — Thin wrapper around Tauri's `listen()` with automatic cleanup on unmount.
- **`stores/`** — Pinia stores persisted via `@tauri-store/pinia` (`saveOnChange: true`): `app`, `cat`, `model`, `general`, `shortcut`.
- **`utils/live2d.ts`** — Live2D rendering via pixi.js 8 + `easy-live2d`. Loads `.model3.json` files, exposes `load()`, `setParameterValue()`, `startMotion()`, `setExpression()`, etc. Live2D Cubism SDK loaded via script tags in `index.html`.

### Backend (`src-tauri/src/`)

- **`lib.rs`** — Tauri builder, plugin registration, command setup.
- **`core/device.rs`** — Global keyboard/mouse listener using `rdev` crate. Emits `device-changed` events to frontend.
- **`core/gamepad.rs`** — Gamepad polling via `gilrs` crate. Emits `gamepad-changed` events.
- **`core/setup/macos.rs`** — macOS-specific: converts main window to NSPanel, hides dock icon.
- **`plugins/window/`** — Custom Tauri plugin for platform-specific window management (always-on-top, taskbar visibility, show/hide). Per-platform implementations in `commands/windows.rs`, `commands/linux.rs`, `commands/macos.rs`.
- **`plugins/admin-status/`** — Custom plugin to check admin privileges (Windows).

### IPC Flow

- **Frontend → Rust**: `invoke()` calls (e.g., `start_device_listening`, `copy_dir`, `plugin:custom-window|set_always_on_top`).
- **Rust → Frontend**: Tauri events (`device-changed`, `gamepad-changed`, `show-window`, `hide-window`).
- All IPC event/command names are centralized in `src/constants/index.ts`.

### State & Persistence

Pinia stores use Composition API (`defineStore` with setup functions). `@tauri-store/pinia` syncs state to the Rust backend, surviving app restarts. The `cat` and `general` stores include migration logic for deprecated fields.

### Live2D Models

Models have 3 modes: `standard`, `keyboard`, `gamepad`. Preset models are in `src-tauri/assets/models/`. Users can import custom models (frontend copies them via the `copy_dir` Rust command).

## Key Dependencies

- **Frontend**: Vue 3, Pinia, vue-router, vue-i18n, pixi.js 8, easy-live2d, antdv-next, UnoCSS
- **Backend (Rust)**: tauri v2, rdev (input), gilrs (gamepad), tauri-nspanel (macOS NSPanel)
- **Dev**: Vite 6, ESLint 9 (@antfu/eslint-config), simple-git-hooks, lint-staged, release-it

## Platform-Specific Notes

- macOS: Main window is an NSPanel (floating panel via `tauri-nspanel`), dock icon hidden. Setup in `core/setup/macos.rs`.
- Windows: NSIS installer. Custom window plugin handles always-on-top. Admin status plugin available.
- Linux: deb/rpm packages. Custom window plugin for x11.

## File Path Alias

`@` maps to `src/` (configured in `vite.config.ts`).
