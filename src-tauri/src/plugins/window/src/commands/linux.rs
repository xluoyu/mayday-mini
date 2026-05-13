use tauri::{AppHandle, Manager, Runtime, WebviewWindow, command};

#[command]
pub async fn show_window<R: Runtime>(
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    label: Option<String>,
) {
    let target = label
        .and_then(|l| app_handle.get_webview_window(&l))
        .unwrap_or(window);

    let _ = target.show();
    let _ = target.unminimize();
    let _ = target.set_focus();
}

#[command]
pub async fn hide_window<R: Runtime>(
    app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    label: Option<String>,
) {
    let target = label
        .and_then(|l| app_handle.get_webview_window(&l))
        .unwrap_or(window);

    let _ = target.hide();
}

#[command]
pub async fn set_always_on_top<R: Runtime>(
    _app_handle: AppHandle<R>,
    window: WebviewWindow<R>,
    always_on_top: bool,
) {
    if always_on_top {
        let _ = window.set_always_on_bottom(false);
        let _ = window.set_always_on_top(true);
    } else {
        let _ = window.set_always_on_top(false);
        let _ = window.set_always_on_bottom(true);
    }
}

#[command]
pub async fn set_taskbar_visibility<R: Runtime>(window: WebviewWindow<R>, visible: bool) {
    let _ = window.set_skip_taskbar(!visible);
}
