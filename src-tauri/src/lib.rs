mod auth;
mod secrets;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "init_endpt_schema",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "account_password_hash",
            sql: include_str!("../migrations/002_account_password_hash.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:endpt.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            secrets::encrypt_secret,
            secrets::decrypt_secret,
            secrets::store_sync_key,
            secrets::load_sync_key,
            secrets::clear_sync_key,
            auth::hash_password,
            auth::verify_password
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
