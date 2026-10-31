import type { PasswordHasher } from "@modules/account/ports/password-hasher.interface";

/**
 * Deterministic fake hasher for tests and Vite-only runs.
 * Not for production storage.
 */
export class MemoryPasswordHasher implements PasswordHasher {
  private readonly prefix = "memory$";

  async hash(password: string): Promise<string> {
    return this.prefix + btoa(unescape(encodeURIComponent(password)));
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    if (!passwordHash.startsWith(this.prefix)) return false;
    return (await this.hash(password)) === passwordHash;
  }
}
