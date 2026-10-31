import type { PasswordHasher } from "../../ports/password-hasher.interface";
import type { SessionRepository } from "../../ports/session.repository";
import type { UserAccountRepository } from "../../ports/user-account.repository";
import type { UserSettingsRepository } from "../../ports/user-settings.repository";
import type { UserAccount, UserSettings } from "../../types/account.types";
import { DEFAULT_USER_SETTINGS } from "../../types/account.types";

export type PublicAccount = Omit<UserAccount, "passwordHash">;

export type AuthSuccess = {
  status: "ok";
  account: PublicAccount;
  settings: UserSettings;
};

export type AuthFailure =
  | { status: "invalid"; issues: { field: "email" | "password"; message: string }[] }
  | { status: "invalid-credentials" }
  | { status: "email-taken" };

export type AuthResult = AuthSuccess | AuthFailure;

export type RestoreResult =
  | { status: "signed-in"; account: PublicAccount; settings: UserSettings }
  | { status: "signed-out" };

const MIN_PASSWORD_LENGTH = 8;

export class AccountService {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly settings: UserSettingsRepository,
    private readonly hasher: PasswordHasher,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async signUp(input: {
    email: string;
    password: string;
    displayName?: string | null;
  }): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const issues = validateCredentials(email, input.password);
    if (issues.length > 0) return { status: "invalid", issues };

    const existing = await this.accounts.getByEmail(email);
    if (existing) return { status: "email-taken" };

    const now = this.now();
    const account: UserAccount = {
      id: this.createId(),
      email,
      displayName: normalizeDisplayName(input.displayName),
      passwordHash: await this.hasher.hash(input.password),
      cloudUserId: null,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
      deletedAt: null,
    };
    await this.accounts.save(account);

    const settings = defaultSettingsFor(account.id, this.createId, now);
    await this.settings.save(settings);
    await this.replaceSession(account.id, now);

    return { status: "ok", account: toPublic(account), settings };
  }

  async signIn(input: { email: string; password: string }): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const issues = validateCredentials(email, input.password);
    if (issues.length > 0) return { status: "invalid", issues };

    const account = await this.accounts.getByEmail(email);
    if (!account || !account.passwordHash) {
      return { status: "invalid-credentials" };
    }

    const ok = await this.hasher.verify(input.password, account.passwordHash);
    if (!ok) return { status: "invalid-credentials" };

    const now = this.now();
    await this.replaceSession(account.id, now);
    const settings = await this.loadOrCreateSettings(account.id, now);

    return { status: "ok", account: toPublic(account), settings };
  }

  async signOut(): Promise<void> {
    await this.sessions.clearAll();
  }

  async restoreSession(): Promise<RestoreResult> {
    const session = await this.sessions.getActive();
    if (!session) return { status: "signed-out" };

    const account = await this.accounts.getById(session.userId);
    if (!account || account.deletedAt != null) {
      await this.sessions.clearAll();
      return { status: "signed-out" };
    }

    const settings = await this.loadOrCreateSettings(account.id, this.now());
    return { status: "signed-in", account: toPublic(account), settings };
  }

  private async replaceSession(userId: string, now: string): Promise<void> {
    await this.sessions.clearAll();
    await this.sessions.save({
      id: this.createId(),
      userId,
      accessToken: null,
      createdAt: now,
      expiresAt: null,
    });
  }

  private async loadOrCreateSettings(userId: string, now: string): Promise<UserSettings> {
    const existing = await this.settings.getByUserId(userId);
    if (existing) return existing;
    const created = defaultSettingsFor(userId, this.createId, now);
    await this.settings.save(created);
    return created;
  }
}

export function toPublic(account: UserAccount): PublicAccount {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    cloudUserId: account.cloudUserId,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    lastSyncedAt: account.lastSyncedAt,
    deletedAt: account.deletedAt,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function validateCredentials(
  email: string,
  password: string,
): { field: "email" | "password"; message: string }[] {
  const issues: { field: "email" | "password"; message: string }[] = [];
  if (!email || !email.includes("@")) {
    issues.push({ field: "email", message: "Enter a valid email address." });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push({
      field: "password",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }
  return issues;
}

function defaultSettingsFor(
  userId: string,
  createId: () => string,
  now: string,
): UserSettings {
  return {
    id: createId(),
    userId,
    theme: DEFAULT_USER_SETTINGS.theme,
    defaultHttpMethod: DEFAULT_USER_SETTINGS.defaultHttpMethod,
    wrapResponseLines: DEFAULT_USER_SETTINGS.wrapResponseLines,
    syncEnabled: DEFAULT_USER_SETTINGS.syncEnabled,
    updatedAt: now,
    deletedAt: null,
  };
}
