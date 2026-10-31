/** Derive a stable sync key from password + userId (PBKDF2 / Web Crypto). */
export async function deriveSyncKeyMaterial(
  password: string,
  userId: string,
): Promise<string> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(`endpt-sync:${userId}`),
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );
  return bufferToBase64(bits);
}

export async function createSyncCipher(keyMaterial: string): Promise<SyncFieldCipher> {
  const raw = base64ToBuffer(keyMaterial);
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return {
    async encrypt(plaintext: string): Promise<string> {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(plaintext),
      );
      const packed = new Uint8Array(iv.length + ciphertext.byteLength);
      packed.set(iv, 0);
      packed.set(new Uint8Array(ciphertext), iv.length);
      return `sync:${bufferToBase64(packed.buffer)}`;
    },
    async decrypt(ciphertext: string): Promise<string> {
      if (!ciphertext.startsWith("sync:")) {
        throw new Error("invalid sync ciphertext");
      }
      const packed = new Uint8Array(base64ToBuffer(ciphertext.slice(5)));
      if (packed.length < 13) throw new Error("sync ciphertext too short");
      const iv = packed.slice(0, 12);
      const data = packed.slice(12);
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
      return new TextDecoder().decode(plain);
    },
  };
}

export interface SyncFieldCipher {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
