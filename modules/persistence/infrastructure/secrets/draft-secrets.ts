import type { AuthConfig, RequestDraft } from "@modules/request";
import type { SecretCipher } from "../../ports/secret-cipher.interface";

async function encryptAuth(auth: AuthConfig, cipher: SecretCipher): Promise<AuthConfig> {
  return {
    ...auth,
    token: auth.token != null ? await cipher.encrypt(auth.token) : null,
    apiKey: auth.apiKey != null ? await cipher.encrypt(auth.apiKey) : null,
    password: auth.password != null ? await cipher.encrypt(auth.password) : null,
  };
}

async function decryptAuth(auth: AuthConfig, cipher: SecretCipher): Promise<AuthConfig> {
  return {
    ...auth,
    token: auth.token != null ? await cipher.decrypt(auth.token) : null,
    apiKey: auth.apiKey != null ? await cipher.decrypt(auth.apiKey) : null,
    password: auth.password != null ? await cipher.decrypt(auth.password) : null,
  };
}

export async function encryptDraft(
  draft: RequestDraft,
  cipher: SecretCipher,
): Promise<RequestDraft> {
  return { ...draft, auth: await encryptAuth(draft.auth, cipher) };
}

export async function decryptDraft(
  draft: RequestDraft,
  cipher: SecretCipher,
): Promise<RequestDraft> {
  return { ...draft, auth: await decryptAuth(draft.auth, cipher) };
}
