// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Finandex desktop (§14.2): single instance (a second launch focuses the window and forwards a finandex:// deep link),
// saved window size/position, native menu (Finandex / Edit / Tampilan / Bantuan → Tentang with copyright & version),
// deep link finandex://dex/<id>, save dialogs + fs scoped to user-chosen paths, auto-update from GitHub Releases.
use tauri::menu::{AboutMetadataBuilder, MenuBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Emitter, Manager};

const COPYRIGHT: &str = "© 2026 Dea Saka Kurnia Putra. All rights reserved.";

/// finandex://dex/<id>[/<tab>] → in-app path /dex/<id>[/<tab>]; anything else opens the home page.
fn deep_link_path(url: &str) -> String {
    let rest = url.strip_prefix("finandex://").unwrap_or("");
    let ok = rest.split('/').all(|p| p.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'));
    if rest.starts_with("dex/") && ok {
        format!("/{rest}")
    } else {
        "/".to_string()
    }
}

fn navigate(app: &tauri::AppHandle, url: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_focus();
        let _ = w.emit("finandex://navigate", deep_link_path(url));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            match argv.iter().find(|a| a.starts_with("finandex://")) {
                Some(url) => navigate(app, url),
                None => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.set_focus();
                    }
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let about = AboutMetadataBuilder::new()
                .name(Some("Finandex"))
                .version(Some(app.package_info().version.to_string()))
                .copyright(Some(COPYRIGHT))
                .authors(Some(vec!["Dea Saka Kurnia Putra".to_string()]))
                .build();
            let finandex = SubmenuBuilder::new(app, "Finandex")
                .item(&PredefinedMenuItem::about(app, Some("Tentang Finandex"), Some(about))?)
                .separator()
                .item(&PredefinedMenuItem::hide(app, None)?)
                .item(&PredefinedMenuItem::quit(app, Some("Keluar"))?)
                .build()?;
            let edit = SubmenuBuilder::new(app, "Edit").undo().redo().separator().cut().copy().paste().select_all().build()?;
            let view = SubmenuBuilder::new(app, "Tampilan").item(&PredefinedMenuItem::fullscreen(app, None)?).build()?;
            let window = SubmenuBuilder::new(app, "Jendela").minimize().maximize().close_window().build()?;
            app.set_menu(MenuBuilder::new(app).items(&[&finandex, &edit, &view, &window]).build()?)?;

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }
            let handle = app.handle().clone();
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().on_open_url(move |event| {
                    if let Some(url) = event.urls().first() {
                        navigate(&handle, url.as_str());
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Finandex");
}

#[cfg(test)]
mod tests {
    use super::deep_link_path;

    #[test]
    fn deep_links_map_to_dex_paths_only() {
        assert_eq!(deep_link_path("finandex://dex/rupiahdex"), "/dex/rupiahdex");
        assert_eq!(deep_link_path("finandex://dex/finlaiwyer/chat"), "/dex/finlaiwyer/chat");
        assert_eq!(deep_link_path("finandex://dex/../etc"), "/");
        assert_eq!(deep_link_path("finandex://settings"), "/");
        assert_eq!(deep_link_path("https://example.com"), "/");
    }
}
