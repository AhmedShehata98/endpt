/** Encrypts and decrypts secret field values at rest (NFR-02). */
export interface SecretCipher {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}
