import type { SecretCipher } from "../../ports/secret-cipher.interface";

/**
 * Dev/test cipher. Not for production storage.
 * Prefixes so ciphertext is never mistaken for plaintext.
 */
export class MemorySecretCipher implements SecretCipher {
  private readonly prefix = "mem:";

  async encrypt(plaintext: string): Promise<string> {
    const bytes = new TextEncoder().encode(plaintext);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return this.prefix + btoa(binary);
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext.startsWith(this.prefix)) {
      throw new Error("invalid memory ciphertext");
    }
    const binary = atob(ciphertext.slice(this.prefix.length));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
}
