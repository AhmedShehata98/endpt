import { invoke } from "@tauri-apps/api/core";
import type { SecretCipher } from "../../ports/secret-cipher.interface";

export class TauriSecretCipher implements SecretCipher {
  async encrypt(plaintext: string): Promise<string> {
    return invoke<string>("encrypt_secret", { plaintext });
  }

  async decrypt(ciphertext: string): Promise<string> {
    return invoke<string>("decrypt_secret", { payload: ciphertext });
  }
}
