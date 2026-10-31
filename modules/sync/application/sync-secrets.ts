import type { EnvironmentVariable } from "@modules/environment";
import type { RequestDraft, SavedRequest } from "@modules/request";
import type { SyncFieldCipher } from "./derive-sync-key";

export async function encryptEnvForSync(
  variable: EnvironmentVariable,
  cipher: SyncFieldCipher,
): Promise<EnvironmentVariable> {
  return { ...variable, value: await cipher.encrypt(variable.value) };
}

export async function decryptEnvFromSync(
  variable: EnvironmentVariable,
  cipher: SyncFieldCipher,
): Promise<EnvironmentVariable> {
  return { ...variable, value: await cipher.decrypt(variable.value) };
}

export async function encryptSavedRequestForSync(
  request: SavedRequest,
  cipher: SyncFieldCipher,
): Promise<SavedRequest> {
  return { ...request, draft: await encryptDraftAuth(request.draft, cipher) };
}

export async function decryptSavedRequestFromSync(
  request: SavedRequest,
  cipher: SyncFieldCipher,
): Promise<SavedRequest> {
  return { ...request, draft: await decryptDraftAuth(request.draft, cipher) };
}

async function encryptDraftAuth(
  draft: RequestDraft,
  cipher: SyncFieldCipher,
): Promise<RequestDraft> {
  const auth = draft.auth;
  return {
    ...draft,
    auth: {
      ...auth,
      token: auth.token != null ? await cipher.encrypt(auth.token) : null,
      apiKey: auth.apiKey != null ? await cipher.encrypt(auth.apiKey) : null,
      password: auth.password != null ? await cipher.encrypt(auth.password) : null,
    },
  };
}

async function decryptDraftAuth(
  draft: RequestDraft,
  cipher: SyncFieldCipher,
): Promise<RequestDraft> {
  const auth = draft.auth;
  return {
    ...draft,
    auth: {
      ...auth,
      token: auth.token != null ? await cipher.decrypt(auth.token) : null,
      apiKey: auth.apiKey != null ? await cipher.decrypt(auth.apiKey) : null,
      password: auth.password != null ? await cipher.decrypt(auth.password) : null,
    },
  };
}
