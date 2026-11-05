/** Feature flags for team capability rollout (Implementation Plan P11). */
export type TeamsFeatureFlags = {
  teams: boolean;
  invitations: boolean;
  clone: boolean;
};

const DEFAULT_FLAGS: TeamsFeatureFlags = {
  teams: true,
  invitations: true,
  clone: true,
};

let flags: TeamsFeatureFlags = { ...DEFAULT_FLAGS };

export function isTeamsFeatureEnabled(
  capability: keyof TeamsFeatureFlags = "teams",
): boolean {
  return flags[capability];
}

export function setTeamsFeatureFlags(next: Partial<TeamsFeatureFlags>): void {
  flags = { ...flags, ...next };
}

export function resetTeamsFeatureFlags(): void {
  flags = { ...DEFAULT_FLAGS };
}
