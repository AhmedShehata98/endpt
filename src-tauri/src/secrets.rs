use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use keyring::Entry;
use rand::Rng;

const SERVICE: &str = "com.ahmed-shehata.endpt";
const ACCOUNT: &str = "db-encryption-key";
const KEY_LEN: usize = 32;
const NONCE_LEN: usize = 12;

fn load_or_create_key() -> Result<[u8; KEY_LEN], String> {
    let entry = Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())?;

    match entry.get_secret() {
        Ok(bytes) if bytes.len() == KEY_LEN => {
            let mut key = [0u8; KEY_LEN];
            key.copy_from_slice(&bytes);
            Ok(key)
        }
        Ok(_) => Err("stored encryption key has invalid length".into()),
        Err(keyring::Error::NoEntry) => {
            let mut key = [0u8; KEY_LEN];
            rand::rng().fill_bytes(&mut key);
            entry
                .set_secret(&key)
                .map_err(|e| format!("failed to store encryption key: {e}"))?;
            Ok(key)
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn encrypt_secret(plaintext: String) -> Result<String, String> {
    let key = load_or_create_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut packed = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    packed.extend_from_slice(&nonce_bytes);
    packed.extend_from_slice(&ciphertext);
    Ok(B64.encode(packed))
}

#[tauri::command]
pub fn decrypt_secret(payload: String) -> Result<String, String> {
    let key = load_or_create_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let packed = B64.decode(payload.as_bytes()).map_err(|e| e.to_string())?;
    if packed.len() < NONCE_LEN + 1 {
        return Err("ciphertext too short".into());
    }

    let (nonce_bytes, ciphertext) = packed.split_at(NONCE_LEN);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "decryption failed".to_string())?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}
