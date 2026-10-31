import type { AuthConfig, KeyValuePair, RequestDraft } from "@modules/request";

const PLACEHOLDER = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

export interface EnvBinding {
  key: string;
  value: string;
}

export interface ResolvedDraft {
  draft: RequestDraft;
  unresolved: string[];
}

export function resolveDraft(draft: RequestDraft, variables: readonly EnvBinding[]): ResolvedDraft {
  const values = new Map(variables.map((variable) => [variable.key, variable.value]));
  const unresolved = new Set<string>();

  const resolveText = (text: string): string =>
    text.replace(PLACEHOLDER, (match, key: string) => {
      const value = values.get(key);
      if (value === undefined) {
        unresolved.add(key);
        return match;
      }
      return value;
    });

  const resolveNullable = (text: string | null): string | null =>
    text === null ? null : resolveText(text);

  return {
    draft: {
      ...draft,
      url: resolveText(draft.url),
      queryParams: draft.queryParams.map((pair) => resolvePairValue(pair, resolveText)),
      headers: draft.headers.map((pair) => resolvePairValue(pair, resolveText)),
      body: resolveNullable(draft.body),
      auth: resolveAuth(draft.auth, resolveNullable),
    },
    unresolved: [...unresolved],
  };
}

function resolvePairValue(pair: KeyValuePair, resolveText: (text: string) => string): KeyValuePair {
  return { ...pair, value: resolveText(pair.value) };
}

function resolveAuth(
  auth: AuthConfig,
  resolveNullable: (text: string | null) => string | null,
): AuthConfig {
  return {
    ...auth,
    token: resolveNullable(auth.token),
    apiKey: resolveNullable(auth.apiKey),
    apiKeyHeader: resolveNullable(auth.apiKeyHeader),
    username: resolveNullable(auth.username),
    password: resolveNullable(auth.password),
  };
}
