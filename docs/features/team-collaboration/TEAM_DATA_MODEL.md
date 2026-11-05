-- =====================================================================
-- Endpt — Team Data Model (derived from Team Business Rules v2.0)
-- Target: PostgreSQL 15+
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS citext;

---

-- Enums

---

CREATE TYPE team_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE project_role AS ENUM ('project_admin', 'project_editor', 'project_viewer');
CREATE TYPE invitation_role AS ENUM ('admin', 'editor', 'viewer'); -- 'owner' is never invitable (12.2)
CREATE TYPE invitation_type AS ENUM ('email', 'link');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'exhausted', 'expired', 'revoked');
CREATE TYPE invitation_revoke_reason AS ENUM
('manual', 'replaced', 'inviter_lost_permission', 'team_deleted');
CREATE TYPE team_status AS ENUM ('active', 'deleted', 'deleting'); -- soft delete / purge in progress
CREATE TYPE team_end_reason AS ENUM
('left', 'removed', 'ownership_transferred_out', 'account_deleted');
CREATE TYPE project_end_reason AS ENUM
('team_membership_ended', 'promoted_to_admin', 'removed_by_project_admin', 'left_project');
CREATE TYPE project_kind AS ENUM ('personal', 'team');

---

-- Users

---

CREATE TABLE users (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
email citext NOT NULL UNIQUE,
email_verified_at timestamptz,
display_name text NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz -- anonymize, never hard-delete (keeps created_by FKs valid)
);

---

-- Teams

---

CREATE TABLE teams (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
name text NOT NULL,
slug text NOT NULL UNIQUE, -- stays reserved while soft-deleted (11.1)
status team_status NOT NULL DEFAULT 'active',
created_by uuid NOT NULL REFERENCES users(id),
successor_membership_id uuid, -- FK added below (circular)
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
purge_after timestamptz, -- deleted_at + 30 days
CONSTRAINT teams_deleted_consistency CHECK (
(status = 'active' AND deleted_at IS NULL AND purge_after IS NULL)
OR (status <> 'active' AND deleted_at IS NOT NULL AND purge_after IS NOT NULL)
)
);
CREATE INDEX teams_purge_idx ON teams (purge_after) WHERE status = 'deleted';

---

-- Team memberships (history kept; a rejoin creates a NEW row — 9.3)

---

CREATE TABLE team_memberships (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
user_id uuid NOT NULL REFERENCES users(id),
role team_role NOT NULL,
joined_at timestamptz NOT NULL DEFAULT now(),
ended_at timestamptz,
end_reason team_end_reason,
UNIQUE (id, team_id), -- target of composite FKs
CONSTRAINT tm_end_consistency CHECK ((ended_at IS NULL) = (end_reason IS NULL))
);
-- One active membership per user per team
CREATE UNIQUE INDEX tm_one_active_per_user
ON team_memberships (team_id, user_id) WHERE ended_at IS NULL;
-- Exactly one active Owner per team (2.1)
CREATE UNIQUE INDEX tm_one_active_owner
ON team_memberships (team_id) WHERE role = 'owner' AND ended_at IS NULL;
CREATE INDEX tm_user_active_idx ON team_memberships (user_id) WHERE ended_at IS NULL;

-- Successor: same team, enforced by composite FK; "active Admin" enforced by trigger
ALTER TABLE teams
ADD CONSTRAINT teams_successor_fk
FOREIGN KEY (successor_membership_id, id)
REFERENCES team_memberships (id, team_id)
ON DELETE SET NULL (successor_membership_id);

---

-- Projects (personal or team)

---

CREATE TABLE projects (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
kind project_kind NOT NULL,
owner_user_id uuid REFERENCES users(id), -- personal only
team_id uuid REFERENCES teams(id) ON DELETE CASCADE, -- team only
name text NOT NULL,
settings jsonb NOT NULL DEFAULT '{}',
source_project_id uuid REFERENCES projects(id) ON DELETE SET NULL, -- tracking only (8.5)
created_by uuid NOT NULL REFERENCES users(id),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE (id, team_id),
CONSTRAINT projects_kind_shape CHECK (
(kind = 'personal' AND owner_user_id IS NOT NULL AND team_id IS NULL)
OR (kind = 'team' AND team_id IS NOT NULL AND owner_user_id IS NULL)
)
);
CREATE INDEX projects_team_idx ON projects (team_id) WHERE kind = 'team';
CREATE INDEX projects_owner_idx ON projects (owner_user_id) WHERE kind = 'personal';

---

-- Project memberships (explicit; never for Owner/Admin — 5.3)
-- Anchored to the team MEMBERSHIP (not the user), so a rejoin never revives them.

---

CREATE TABLE project_memberships (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
project_id uuid NOT NULL,
team_id uuid NOT NULL,
team_membership_id uuid NOT NULL,
role project_role NOT NULL,
started_at timestamptz NOT NULL DEFAULT now(),
ended_at timestamptz,
end_reason project_end_reason,
FOREIGN KEY (project_id, team_id)
REFERENCES projects (id, team_id) ON DELETE CASCADE,
FOREIGN KEY (team_membership_id, team_id)
REFERENCES team_memberships (id, team_id) ON DELETE CASCADE,
CONSTRAINT pm_end_consistency CHECK ((ended_at IS NULL) = (end_reason IS NULL))
);
CREATE UNIQUE INDEX pm_one_active
ON project_memberships (project_id, team_membership_id) WHERE ended_at IS NULL;
CREATE INDEX pm_project_active_idx
ON project_memberships (project_id) WHERE ended_at IS NULL;

---

-- Invitations

---

CREATE TABLE invitations (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
type invitation_type NOT NULL,
email citext,
role invitation_role NOT NULL DEFAULT 'viewer',
token_hash bytea NOT NULL UNIQUE, -- SHA-256 of a >=128-bit token (12.8)
created_by uuid NOT NULL REFERENCES users(id),
created_at timestamptz NOT NULL DEFAULT now(),
expires_at timestamptz NOT NULL,
max_uses int NOT NULL DEFAULT 1,
uses_count int NOT NULL DEFAULT 0,
status invitation_status NOT NULL DEFAULT 'pending',
revoked_at timestamptz,
revoke_reason invitation_revoke_reason,
replaced_by_id uuid REFERENCES invitations(id),
CONSTRAINT inv_type_shape CHECK (
(type = 'email' AND email IS NOT NULL AND max_uses = 1)
OR (type = 'link' AND email IS NULL AND max_uses BETWEEN 1 AND 100
AND role <> 'admin') -- no Admin via link (12.2)
),
CONSTRAINT inv_expiry_window CHECK (
expires_at >= created_at + interval '1 hour'
AND expires_at <= created_at + interval '30 days' -- 12.4
),
CONSTRAINT inv_uses_bound CHECK (uses_count >= 0 AND uses_count <= max_uses),
CONSTRAINT inv_revoke_consistency CHECK (
(status = 'revoked') = (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL)
)
);
-- At most one pending email invitation per (team, email) (12.7)
CREATE UNIQUE INDEX inv_one_pending_email
ON invitations (team_id, email) WHERE status = 'pending' AND type = 'email';
CREATE INDEX inv_team_pending_idx ON invitations (team_id) WHERE status = 'pending';
CREATE INDEX inv_inviter_pending_idx ON invitations (created_by) WHERE status = 'pending';

CREATE TABLE invitation_acceptances (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
invitation_id uuid NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
user_id uuid NOT NULL REFERENCES users(id),
membership_id uuid NOT NULL REFERENCES team_memberships(id) ON DELETE CASCADE,
accepted_at timestamptz NOT NULL DEFAULT now(),
UNIQUE (invitation_id, user_id)
);

---

-- Project content

---

CREATE TABLE collections (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
parent_id uuid REFERENCES collections(id) ON DELETE CASCADE,
name text NOT NULL,
position int NOT NULL DEFAULT 0,
created_by uuid NOT NULL REFERENCES users(id),
updated_by uuid REFERENCES users(id),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collections_project_idx ON collections (project_id);

CREATE TABLE requests (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
name text NOT NULL,
method text NOT NULL,
url text NOT NULL,
config jsonb NOT NULL DEFAULT '{}', -- headers, body, auth (sanitized on clone, 8.4)
position int NOT NULL DEFAULT 0,
created_by uuid NOT NULL REFERENCES users(id),
updated_by uuid REFERENCES users(id),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX requests_project_idx ON requests (project_id);

CREATE TABLE environments (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
name text NOT NULL,
created_by uuid NOT NULL REFERENCES users(id),
created_at timestamptz NOT NULL DEFAULT now(),
UNIQUE (project_id, name)
);

CREATE TABLE environment_variables (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
key text NOT NULL,
is_secret boolean NOT NULL DEFAULT false,
value text, -- plain value, non-secrets only
secret_ciphertext bytea, -- encrypted value, secrets only; NULL = "empty" (e.g. after clone)
updated_by uuid REFERENCES users(id),
updated_at timestamptz NOT NULL DEFAULT now(),
UNIQUE (environment_id, key),
CONSTRAINT var_secret_shape CHECK (
(is_secret AND value IS NULL)
OR (NOT is_secret AND secret_ciphertext IS NULL)
)
);

-- Execution history: private to executor; Project Admin / Owner / Admin see all (5.1). Not cloned.
CREATE TABLE executions (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
request_id uuid REFERENCES requests(id) ON DELETE SET NULL,
executed_by uuid NOT NULL REFERENCES users(id),
status_code int,
duration_ms int,
request_log jsonb, -- secrets masked BEFORE storage
response_log jsonb,
executed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX executions_project_idx ON executions (project_id, executed_at DESC);
CREATE INDEX executions_user_idx ON executions (project_id, executed_by, executed_at DESC);

---

-- Audit log & notifications
-- team_id intentionally has NO FK: audit metadata survives hard delete (11.4)

---

CREATE TABLE audit_logs (
id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
team_id uuid,
actor_user_id uuid REFERENCES users(id),
action text NOT NULL, -- e.g. 'member.role_changed', 'team.deleted'
target_type text NOT NULL,
target_id uuid,
before_state jsonb, -- never contains secret values
after_state jsonb,
created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_team_idx ON audit_logs (team_id, created_at DESC);

CREATE TABLE notifications (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid NOT NULL REFERENCES users(id),
team_id uuid,
kind text NOT NULL, -- 'project_without_admin','successor_cleared','purge_warning_7d','purge_warning_1d',...
payload jsonb NOT NULL DEFAULT '{}',
created_at timestamptz NOT NULL DEFAULT now(),
read_at timestamptz
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

-- =====================================================================
-- Triggers: invariants that plain constraints cannot express
-- =====================================================================

-- (a) Successor must be an ACTIVE ADMIN of the same team (10.1)
CREATE FUNCTION trg_teams_validate_successor() RETURNS trigger AS $$
BEGIN
  IF NEW.successor_membership_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE id = NEW.successor_membership_id AND team_id = NEW.id
      AND role = 'admin' AND ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'SUCCESSOR_MUST_BE_ACTIVE_ADMIN';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER teams_validate_successor
BEFORE INSERT OR UPDATE OF successor_membership_id ON teams
FOR EACH ROW EXECUTE FUNCTION trg_teams_validate_successor();

-- (b) Project membership: member must be an ACTIVE Editor/Viewer; role capped by ceiling (5.2, 5.3, 9.4)
CREATE FUNCTION trg_pm_validate() RETURNS trigger AS $$
DECLARE r team_role;
BEGIN
  IF NEW.ended_at IS NOT NULL THEN RETURN NEW; END IF;
  SELECT role INTO r FROM team_memberships
   WHERE id = NEW.team_membership_id AND ended_at IS NULL;
  IF r IS NULL THEN RAISE EXCEPTION 'TEAM_MEMBERSHIP_NOT_ACTIVE'; END IF;
  IF r IN ('owner', 'admin') THEN RAISE EXCEPTION 'NO_EXPLICIT_MEMBERSHIP_FOR_ADMINS'; END IF;
  IF r = 'viewer' AND NEW.role <> 'project_viewer' THEN
    RAISE EXCEPTION 'ROLE_EXCEEDS_CEILING';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER pm_validate
BEFORE INSERT OR UPDATE OF role, team_membership_id, ended_at ON project_memberships
FOR EACH ROW EXECUTE FUNCTION trg_pm_validate();

-- (c) Cascades from team membership changes (3.2, 7, 9.2, 10.2)
CREATE FUNCTION trg_tm_after_change() RETURNS trigger AS $$
BEGIN
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
    -- membership ended: end project memberships, clear successor
    UPDATE project_memberships
       SET ended_at = NEW.ended_at, end_reason = 'team_membership_ended'
     WHERE team_membership_id = NEW.id AND ended_at IS NULL;
    UPDATE teams SET successor_membership_id = NULL
     WHERE successor_membership_id = NEW.id;
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role IN ('owner', 'admin') THEN
      UPDATE project_memberships
         SET ended_at = now(), end_reason = 'promoted_to_admin'
       WHERE team_membership_id = NEW.id AND ended_at IS NULL;
    ELSIF NEW.role = 'viewer' THEN
      UPDATE project_memberships SET role = 'project_viewer'
       WHERE team_membership_id = NEW.id AND ended_at IS NULL
         AND role <> 'project_viewer';
    END IF;
    IF NEW.role <> 'admin' THEN
      UPDATE teams SET successor_membership_id = NULL
       WHERE successor_membership_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tm_after_change
AFTER UPDATE OF role, ended_at ON team_memberships
FOR EACH ROW EXECUTE FUNCTION trg_tm_after_change();
