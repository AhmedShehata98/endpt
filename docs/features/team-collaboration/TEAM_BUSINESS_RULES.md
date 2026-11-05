# Team Business Rules — Endpt (v2.0)

**Status:** Consolidated Draft v2 — Conflicts Resolved
**Scope:** Teams, Memberships, Invitations, Projects, Roles & Permissions, Clone, Deletion, Audit

> This version resolves the conflicts and gaps found in the v1 review. New decisions not present in v1 are marked **[New Decision]**. Section 16 maps each change to the original review item number and lists the assumptions that need confirmation from the product owner.

---

## 1. Core Concepts

Endpt supports two types of projects:

- **Personal Project:** A project private to the user. It cannot be shared directly. Collaboration happens through Clone to Team only.
- **Team Project:** A project that belongs to a team. Members access it through Project Membership or Implicit Access.

### 1.1 Basic Rules

- A user can belong to more than one Team.
- Joining a Team does not automatically grant access to its projects (except for Owner and Admin).
- Access to Team Projects for non-administrators depends on Project Membership.

### 1.2 Glossary

| Term                 | Definition                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Team Membership      | An active relationship between a user and a team, with exactly one Team Role.                                         |
| Project Membership   | An explicit relationship between a team member and a project, with a Project Role. Never created for Owner or Admin.  |
| Implicit Access      | Full administrative access to all Team Projects that comes from being Owner or Admin, without any Project Membership. |
| Effective Permission | The actual permission a user holds; computed as described in Section 6.                                               |
| Active               | A membership that has not ended (`ended_at IS NULL`) in a team that is not soft-deleted.                              |
| Former Member        | A user whose team membership has ended (left or removed).                                                             |

---

## 2. Team Roles

| Role   | Description                                                                              |
| ------ | ---------------------------------------------------------------------------------------- |
| Owner  | Team owner with the highest permissions. Exactly one per team.                           |
| Admin  | Manages the team, its (non-administrator) members, and its projects.                     |
| Editor | A member who works on the projects assigned to them, and can be a Project Admin in them. |
| Viewer | A member with view-only permissions.                                                     |

### 2.1 Single Owner Invariant **[New Decision]**

- Every Team has **exactly one Owner** at any moment (Active).
- Enforced in the database with a Partial Unique Index on (`team_id`) where `role = 'owner'` and `ended_at IS NULL`.
- There is no "multiple Owners" mode.
- A new Owner can only be assigned through Ownership Transfer or the automatic promotion of the Successor when the Owner leaves (Section 10).

---

## 3. Role Management Matrix **[New Decision]**

This matrix is the single reference for assigning, changing roles, and removing members. Any operation not listed is **forbidden**.

### 3.1 The Matrix

| Actor           | Target (current role) | Operation                        |                  Allowed                   |
| --------------- | --------------------- | -------------------------------- | :----------------------------------------: |
| Owner           | Admin                 | Demote to Editor or Viewer       |                     ✓                      |
| Owner           | Admin                 | Remove from team                 |                     ✓                      |
| Owner           | Editor / Viewer       | Promote to Admin                 |                     ✓                      |
| Owner           | Editor / Viewer       | Switch between Editor and Viewer |                     ✓                      |
| Owner           | Editor / Viewer       | Remove from team                 |                     ✓                      |
| Owner           | Self                  | Change role                      |        — (Ownership Transfer only)         |
| Owner           | Self                  | Leave team                       | ✓ only with a valid Successor (Section 10) |
| Admin           | Owner                 | Any operation                    |                     —                      |
| Admin           | Another Admin         | Demote or remove                 |                     —                      |
| Admin           | Editor / Viewer       | Promote to Admin                 |                     —                      |
| Admin           | Editor / Viewer       | Switch between Editor and Viewer |                     ✓                      |
| Admin           | Editor / Viewer       | Remove from team                 |                     ✓                      |
| Admin           | Self                  | Promote                          |                     —                      |
| Admin           | Self                  | Demote to Editor or Viewer       |                     ✓                      |
| Admin           | Self                  | Leave team                       |                     ✓                      |
| Editor / Viewer | Any other member      | Any administrative operation     |                     —                      |
| Editor / Viewer | Self                  | Leave team                       |                     ✓                      |

### 3.2 Supplementary Rules

- Admin cannot create another Admin, neither by promotion nor by invitation. This is Owner-only.
- If an Admin is demoted (by themselves or by the Owner) and was the Successor, the Successor designation is automatically cleared (Section 10.2).
- Every operation runs inside a Transaction with a lock on the team row (Section 15).

---

## 4. Team Permission Matrix

The rows are the Permission Keys used internally. The tables here are the **single source of truth**; role names alone are never relied upon in code (Section 13).

| Permission Key                                  | Owner | Admin | Editor | Viewer |
| ----------------------------------------------- | :---: | :---: | :----: | :----: |
| `team.view`                                     |   ✓   |   ✓   |   ✓    |   ✓    |
| `team.update`                                   |   ✓   |   ✓   |   —    |   —    |
| `team.delete`                                   |   ✓   |   —   |   —    |   —    |
| `team.restore`                                  |   ✓   |   —   |   —    |   —    |
| `team.ownership.transfer`                       |   ✓   |   —   |   —    |   —    |
| `team.successor.manage`                         |   ✓   |   —   |   —    |   —    |
| `team.members.view`                             |   ✓   |   ✓   |   ✓    |   ✓    |
| `team.members.invite`                           |   ✓   |   ✓   |   —    |   —    |
| `team.members.remove`                           |   ✓   |   ✓   |   —    |   —    |
| `team.members.change_role`                      |   ✓   |   ✓   |   —    |   —    |
| `team.invitations.manage` (Revoke / Resend)     |   ✓   |   ✓   |   —    |   —    |
| `team.projects.create` (includes Clone to Team) |   ✓   |   ✓   |   —    |   —    |
| `team.projects.delete`                          |   ✓   |   ✓   |   —    |   —    |
| `team.projects.access_all` (Implicit Access)    |   ✓   |   ✓   |   —    |   —    |
| `team.audit.view`                               |   ✓   |   ✓   |   —    |   —    |

Notes:

- `team.members.remove` and `team.members.change_role` are always constrained by the matrix in Section 3: holding the permission is not enough; the matrix must also allow the operation on that specific target.
- **[New Decision]** `team.projects.delete` is a team-level permission and is not part of Project Roles. **A Project Admin cannot delete their project.** This is intentional, and the UI must make it clear.
- **[New Decision]** Editor and Viewer cannot create projects or Clone to the team (Section 8).

---

## 5. Project Roles & Permissions

| Role           | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| Project Admin  | Manages project settings and members, and works on all of its content. |
| Project Editor | Edits project content and executes requests.                           |
| Project Viewer | Views project content only.                                            |

### 5.1 Project Permission Matrix

| Permission Key                                                  | Project Admin | Project Editor | Project Viewer |
| --------------------------------------------------------------- | :-----------: | :------------: | :------------: |
| `project.view`                                                  |       ✓       |       ✓        |       ✓        |
| `project.settings.manage`                                       |       ✓       |       —        |       —        |
| `project.members.manage`                                        |       ✓       |       —        |       —        |
| `request.create` / `request.update` / `request.delete`          |       ✓       |       ✓        |       —        |
| `request.execute` **[New Decision]**                            |       ✓       |       ✓        |       —        |
| `collection.create` / `collection.update` / `collection.delete` |       ✓       |       ✓        |       —        |
| `environment.view` (variable names and non-secret values)       |       ✓       |       ✓        |       ✓        |
| `environment.manage`                                            |       ✓       |       ✓        |       —        |
| `environment.secret.write` (set or replace a secret value)      |       ✓       |       ✓        |       —        |
| `environment.secret.reveal` (show a secret value after saving)  |       —       |       —        |       —        |
| `history.view_own`                                              |       ✓       |       ✓        |       —        |
| `history.view_all`                                              |       ✓       |       —        |       —        |

Security rules **[New Decision]**:

- **Viewer cannot execute requests** in this version, because execution may cause side effects (POST / DELETE against real systems) and may use Secrets.
- **Secrets** (`is_secret = true`) are stored encrypted and displayed masked (`••••`) to everyone, including Project Admin and Owner. There is no Reveal. They are only used server-side at execution time and can be replaced.
- **Execution History** is private to whoever executed the request (`history.view_own`). Project Admin and Team Owner / Admin can view the whole project's history (`history.view_all`). History is not copied in Clone.
- Secret values never appear in Execution History or Logs (they are masked before storage).
- **Deleting a Team Project is intentionally absent from this table**: it is `team.projects.delete` in Section 4.

### 5.2 Maximum Project Role by Team Role

| Team Role | Maximum Project Role                    |
| --------- | --------------------------------------- |
| Owner     | Implicit Access (no Project Membership) |
| Admin     | Implicit Access (no Project Membership) |
| Editor    | Project Admin                           |
| Viewer    | Project Viewer                          |

### 5.3 Project Member Management Rules

- Project Admin manages project members (`project.members.manage`).
- Only Active Team members can be added to a project.
- Project Admin cannot assign a role that exceeds the member's maximum (5.2).
- **[New Decision]** No explicit Project Membership is created for Owner or Admin, and attempts to do so are rejected. They appear in a separate "Implicit Administrators" section of the project member list and **cannot be modified or removed** by a Project Admin.
- A Team Project may exist without a Project Admin: the project remains, Owner and Admin manage it, and a Project Admin can be assigned later. **[New Decision]** When a project loses its last Project Admin, a notification is sent to the Team Owner and Admins.

### 5.4 Principle Rewording **[New Decision]**

The v1 principle ("Project Role does not exceed Team Role") was imprecise. The adopted principle is now:

> **A Project Role never exceeds the maximum defined in table 5.2.**

It is explicitly acknowledged that a Team Editor may become a Project Admin, thereby holding member-management permissions for that project only. This grants no team-level permission. The role name "Editor" is documented in the UI as "a member who works on projects", and may be renamed later without affecting the rules.

---

## 6. Effective Permission **[New Decision]**

Order of checks for any operation on a Team Project:

1. Does the team exist and is it not soft-deleted? Otherwise the request is rejected.
2. Does the user have an active Team Membership? Otherwise rejected.
3. Team-level permission: does the user hold the Permission Key from Section 4?
4. Project-level permission:
   - If Owner or Admin: **Implicit Access** grants all Project Admin permissions (in addition to `team.projects.delete`).
   - Otherwise: permissions come from the active Project Membership (Section 5.1); without one, there is no access.
5. An explicit role is always capped at the maximum (5.2) at check time, even if a higher value remains stored due to a defect.

Rules:

- There is no practical "highest of two sources", because Owner and Admin never hold an active Project Membership (5.3).
- **When a member is promoted to Admin:** all their explicit Project Memberships are ended (`ended_at`, reason `promoted_to_admin`), since Implicit Access covers them.
- **When an Admin or Owner is demoted:** no memberships are created automatically, and they lose access to every project in which they have no membership. The UI must warn about this before execution.

---

## 7. Team Role Changes **[New Decision]**

When a Team Role changes, the system re-evaluates the member's Project Memberships:

| Change                         | Effect                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Viewer → Editor                | Project Roles remain unchanged.                                                                                           |
| Editor → Viewer                | Project Roles above Project Viewer are lowered to Project Viewer. Memberships are not cancelled.                          |
| Editor / Viewer → Admin        | Explicit Project Memberships are ended and replaced by Implicit Access (Section 6).                                       |
| Admin → Editor                 | Loses Implicit Access. No memberships are created automatically. Keeps only existing Project Memberships (normally none). |
| Admin → Viewer                 | Same as above; any explicit memberships are lowered to Project Viewer.                                                    |
| Owner → Admin (after Transfer) | Implicit Access remains unchanged.                                                                                        |

- A Project Membership is cancelled only when it cannot be kept with an allowed role.
- Each change runs in a single Transaction and is recorded in the Audit Log.

Example: `Team Editor → Team Viewer`, then `Project Admin → Project Viewer`.

---

## 8. Personal Project Cloning

A Personal Project cannot be shared directly. The way to collaborate is **Clone to Team**.

### 8.1 Who Can Clone **[New Decision]**

- The actor must own the personal project **and hold `team.projects.create` in the target team** (Owner or Admin only).
- Editor and Viewer cannot Clone. If they want to share a project, they ask an Admin, and the UI must show a clear message saying so.
- **The only supported path in this version is Personal → Team.** Not supported: Team → another Team, Team → Personal, Personal → Personal. These are rejected explicitly with a clear error message and listed as future features.

### 8.2 Clone Rules

- A fully independent copy is created inside the team, with no Synchronization with the original.
- **Clone is atomic:** all or nothing (a single Transaction). On failure, no partial project remains.
- **[New Decision]** A maximum size for the cloned project (initial configurable value: 5,000 Requests). If exceeded, Clone is rejected with a clear message.
- The actor becomes Project Admin of the copy (if they are Owner or Admin, there is no explicit Membership and they hold Implicit Access).
- Team members get no automatic access, except Owner and Admin.

### 8.3 Included Data

Copied:

- Collections
- Requests
- Request Configurations (after sanitizing sensitive fields, 8.4)
- Environments
- Non-sensitive Variables
- Names (Keys) of secret variables **with empty values**
- Project Settings

Not copied:

- Execution History
- Execution Logs
- Team Members
- Secret values

### 8.4 Sensitive Data Sanitization **[New Decision]**

- Classification is determined by the `is_secret` flag on the variable, set by whoever creates or edits it.
- A secret variable is copied **by name only with an empty value**, so that requests referencing it (`{{token}}`) do not break.
- Authorization fields in a Request Configuration (Bearer, Basic, API Key) are copied **with their type but without the value**.
- Sensitive Header values are emptied on copy: `Authorization`, `Cookie`, `Set-Cookie`, `X-API-Key`, `Proxy-Authorization`, and any Header classified as sensitive in settings.
- After Clone, the UI shows a report of what was emptied so the Project Admin can complete it.

### 8.5 Clone Relationship **[New Decision]**

- `source_project_id` is retained **for tracking purposes only**, and no Business logic or permissions are built on it.
- **It is shown only to the owner of the source project**, and does not appear to team members or in the team API (to prevent leaking the existence of a personal project).
- When the source is deleted, `source_project_id` is set to NULL and the copy remains independent.
- Deleting the copy does not affect the original.

---

## 9. Team Membership Lifecycle

### 9.1 Join Team

A user becomes a member after accepting a valid Invitation (Section 12).

### 9.2 Leave Team / Remove Member

A member leaving, or being removed by someone with permission (per Section 3), behaves identically:

- Access to the team is lost immediately.
- All of the member's Project Memberships are ended.
- Content they created remains.
- The membership record, departure date, and reason (`left` or `removed`) are retained.
- **[New Decision]** `created_by` and `updated_by` fields continue to reference the user internally, and the UI displays them as **"Former Member"** without personal data. Owner and Admin see the real identity in the Audit Log only.
- **[New Decision]** If the member was the last Project Admin of a project, a notification is sent to the Team Owner and Admins (5.3).
- **[New Decision]** All pending invitations created by this member are revoked (12.7).

### 9.3 Rejoin Team

When a former member is re-invited:

- A new Membership is created; the old one is not reactivated.
- The previous membership record remains preserved.
- The member starts with the role specified in the new invitation, and does not regain any previous Project Membership.

### 9.4 Membership Consistency

An active Project Membership must not exist for a member who has no active Team Membership in the owning team, nor for a member whose role is Owner or Admin (5.3).

---

## 10. Ownership & Successor

### 10.1 Successor Assignment

- Owner can designate an Admin as Successor.
- Owner can change or clear it at any time.
- A member who is not an Admin cannot be chosen.

### 10.2 Successor Invalidity

If the Successor leaves, is removed, or loses the Admin role:

- The designation is automatically cleared.
- A notification is sent to the Owner, who must choose a replacement before leaving.

### 10.3 Owner Leaves **[New Decision]**

- Requires a valid Successor (an Active Admin).
- The Successor is automatically promoted to Owner, the former Owner's membership ends, and they lose access to the team and its projects.
- **If no Admin exists**, the leave request is rejected with `OWNER_CANNOT_LEAVE_NO_SUCCESSOR`, explaining the available paths:
  1. Promote a member to Admin, designate them Successor, then leave.
  2. Transfer ownership to an Admin, then leave.
  3. Delete the team (Section 11).

### 10.4 Ownership Transfer Without Leaving

- The Successor becomes Owner and the former Owner becomes Admin, in a single Transaction.
- The former Owner keeps Implicit Access because they are now an Admin (Section 7).

### 10.5 Owner Account Deletion **[New Decision]**

- Deleting the account of a user who is Owner of an Active team is treated as Leave Team: if a valid Successor exists, the transfer happens automatically; otherwise **account deletion is blocked** until the user resolves each team individually (transfer or delete the team). The UI lists these teams.
- If the user is Owner of a team in Soft Delete state: explicit confirmation is required that deleting the account **brings that team's permanent deletion forward immediately**, since no one else can restore it.
- An Active team must never remain without an Owner.

---

## 11. Team Deletion & Recovery

### 11.1 Soft Delete

When a Team is deleted by the Owner (`team.delete`):

- A Soft Delete is performed, and all members immediately lose access to the team and its projects (Section 6, step 1).
- Memberships and projects remain as they are, **suspended** (not ended), and do not change during the recovery period.
- **[New Decision]** During the recovery period no member can leave, be removed, or have their role changed, because the team is entirely unavailable.
- **[New Decision]** All pending invitations are revoked on deletion and **do not return** on restore. The Owner reissues invitations if desired.
- **[New Decision]** The team name and slug remain **reserved** throughout the recovery period and cannot be used by another team.

### 11.2 Recovery

- Recovery period: 30 days.
- Only the Owner can restore a Team (`team.restore`). Admin cannot.
- On restore, memberships and projects return as they were.

### 11.3 Warnings Before Permanent Deletion **[New Decision]**

A notification (email and in-app) is sent to the Owner **7 days** and **1 day** before permanent deletion, stating the date and how to restore.

### 11.4 Permanent Deletion

After 30 days without restoration:

- An automatic Hard Delete runs via a Background Job.
- The Team and its dependent data are deleted: Memberships, Invitations, Projects, Project Memberships, Collections, Requests, Environments, and Variables.
- Deletion does not extend to the original Personal Projects that were Cloned.
- An Audit Log record of the team deletion is kept (metadata only, no content).

---

## 12. Invitations

Endpt supports two types:

- **Email Invitation:** Addressed to a specific email.
- **Invitation Link:** A limited-use link.

### 12.1 Invitation Permissions

Creating, revoking, and resending invitations is available to Owner and Admin (`team.members.invite` and `team.invitations.manage`).

### 12.2 Invitation Role **[New Decision]**

- The role is set at creation, and the invitee does not choose their role.
- Default role: Viewer.
- **Owner is never an option in invitations.**
- Admin cannot invite someone as Admin.
- **The Admin role is available in Email Invitations only (created by Owner only), and is not allowed in Invitation Links.** Roles allowed in links: Editor and Viewer.

### 12.3 Email Binding **[New Decision]**

- An Email Invitation is bound to a specific email, and can only be accepted by an account whose **verified email matches** the invited email (case-insensitive).
- On mismatch, acceptance is rejected without consuming the invitation.

### 12.4 Expiration **[New Decision]**

- The inviter sets the validity period at creation, and an independent date is stored per invitation in `expires_at`.
- Default: 7 days. Minimum: 1 hour. Maximum: 30 days.

### 12.5 Invitation Links

- The inviter sets `max_uses` (1 to 100), and `uses_count` is tracked.
- The link becomes invalid when uses are exhausted or it expires.
- Consumption is atomic to prevent exceeding `max_uses` under concurrent acceptance.

### 12.6 Duplicate Membership **[New Decision]**

If a user tries to accept an invitation while already an Active member:

- The invitation is rejected with a clear `ALREADY_A_MEMBER` message.
- `uses_count` is **not consumed**, the member's role is unchanged, and no additional Membership is created.
- Promotion happens only by changing the role manually (Section 3).

### 12.7 Revoke / Resend / Inviter Changes **[New Decision]**

- **Revoke:** Owner and Admin can revoke any pending invitation; its status becomes `revoked` and it can no longer be accepted.
- **Resend:** Creates a new Invitation with a new Token, and **the old invitation is automatically revoked** (`revoked`, reason `replaced`). There are never two active invitations for the same email and team, enforced by a partial unique constraint on (`team_id`, `email`) for active invitations.
- The history of old invitations is preserved, and they are never reactivated.
- **When the inviter loses invitation permission** (removed, left, or demoted to Editor / Viewer), all their pending invitations are automatically revoked.

### 12.8 Token Security

- A Hash of the Token (SHA-256) is stored instead of the original, and the Token is random with at least 128 bits of strength.
- The original Token is displayed only once, at creation.
- **[New Decision]** Rate Limiting on invitation acceptance attempts (initial value: 10 attempts per minute per user and 20 per IP), with uniform error messages that do not distinguish between a wrong and an expired Token.

---

## 13. Authorization Principles

1. The system relies internally on Permission-based Authorization, and the Permission Keys in Sections 4 and 5 are the **single source of truth**.
2. Role names alone are never relied upon when executing operations.
3. The user's permission is verified on every operation.
4. Verification order: team not deleted, then Team Membership, then Project Membership or Implicit Access (Section 6).
5. Team Owner and Admin have Implicit Access to Team Projects.
6. A Project Role never exceeds the maximum in table 5.2.
7. Restrictions are enforced at the Backend / Domain Logic level, not only in the UI.
8. Member-management operations are subject to the Section 3 matrix in addition to the Permission Key.

---

## 14. Audit Log, Limits & Notifications **[New Decision]**

### 14.1 Audit Log

Recorded (who performed it, on whom, when, value before and after):

- Team creation, update, deletion, and restoration.
- Invitations: creation, acceptance, revocation, resend, expiry.
- Role changes, removal, leaving.
- Successor designation and clearing, Ownership Transfer.
- Team Project creation, deletion, and Clone.
- Changes to Project Memberships and roles.

Visible to Owner and Admin (`team.audit.view`), and retained for at least 12 months. Secret values are never stored in it.

### 14.2 Limits (initial, configurable values)

| Limit                           | Value          |
| ------------------------------- | -------------- |
| Team members                    | 100            |
| Teams per user                  | 20             |
| Pending invitations per team    | 100            |
| Clone size                      | 5,000 Requests |
| Invitations created per inviter | 50 per hour    |

### 14.3 Notifications

| Event                                                  | Recipient             |
| ------------------------------------------------------ | --------------------- |
| Project without a Project Admin                        | Team Owner and Admins |
| Successor automatically cleared                        | Owner                 |
| Upcoming permanent deletion (7 days, 1 day)            | Owner                 |
| Invitation automatically revoked due to inviter change | Inviter and Owner     |

---

## 15. Implementation Notes

These are design notes, not new Business decisions:

- Retain the history of past memberships instead of physical deletion (`ended_at`, `end_reason`).
- Foreign Keys and Unique Constraints to prevent duplicate active memberships, plus a Partial Unique Index for the single Owner (2.1) and for the single active invitation (12.7).
- Transactions when accepting invitations, changing roles, transferring ownership, and Clone.
- **Lock the team row** (`SELECT ... FOR UPDATE`) in every operation touching Owner, Successor, or roles, re-validating the Successor inside the same Transaction, to prevent Race Conditions (e.g., the Owner leaving while the Successor is being demoted).
- Atomic exhaustion of Invitation Links (`UPDATE ... WHERE uses_count < max_uses`).
- Hard Delete after the Recovery Period via a Background Job, never leaving the team in an inconsistent partial-deletion state (executed in resumable batches with a `deleting` status).
- Protect secrets on copy, sharing, and storage: encryption, and masking in Logs and History.
- Unify English terms in table and column names according to the Glossary in Section 1.2.

---

## 16. Change Log and Assumptions

### 16.1 Mapping Changes to Review Items

| v1 Review Item | Change in v2                                                                             | Section  |
| -------------- | ---------------------------------------------------------------------------------------- | -------- |
| 1              | Deleting a Team Project is a team-only permission, removed from the Project Roles table  | 4, 5.1   |
| 2, 22          | Clone requires `team.projects.create` (Owner / Admin), and only the Personal → Team path | 8.1      |
| 3, 4, 5        | Full role-management matrix (actor × target × operation)                                 | 3        |
| 6              | Exactly one Owner with a Partial Unique Index                                            | 2.1      |
| 7              | Explicit paths when an Owner leaves with no Admin                                        | 10.3     |
| 8, 27          | Owner account deletion policy                                                            | 10.5     |
| 9              | Team row lock and re-validation inside the Transaction                                   | 15       |
| 10             | Former Member display, and notification on losing the Project Admin                      | 9.2, 5.3 |
| 11             | Complete role-change table                                                               | 7        |
| 12, 34         | Principle reworded to tie to table 5.2                                                   | 5.4      |
| 13             | Execution permission, secrets, execution history                                         | 5.1      |
| 14, 15         | Owner forbidden in invitations, Admin by email only                                      | 12.2     |
| 16             | Email Invitation bound to the verified email                                             | 12.3     |
| 17             | Revoke, and revoking the old invitation on Resend                                        | 12.7     |
| 18             | Revoking invitations of an inviter who lost permission                                   | 12.7     |
| 19             | Expiration limits and a default value                                                    | 12.4     |
| 20             | Rejection without consuming `uses_count`                                                 | 12.6     |
| 21             | `is_secret` definition, copying keys with empty values, Header sanitization              | 8.3, 8.4 |
| 23             | `source_project_id` for tracking, shown to the source owner only                         | 8.5      |
| 25             | Reserving the name and slug during recovery                                              | 11.1     |
| 26             | Revoking invitations on deletion without restoring them                                  | 11.1     |
| 29             | Notifications before permanent deletion                                                  | 11.3     |
| 30             | Effective Permission computation, and no explicit Membership for administrators          | 5.3, 6   |
| 31             | Checking team state first                                                                | 6, 13    |
| 32             | Permission Keys adopted as the single source                                             | 4, 5.1   |
| 33             | Glossary and unified terminology                                                         | 1.2      |
| 35             | Separating implementation notes from decisions, and consolidating repetition             | 9, 15    |
| 36, 37         | Audit Log and Limits                                                                     | 14       |
| 38             | Rate Limiting on acceptance                                                              | 12.8     |

### 16.2 Assumptions Requiring Product Owner Confirmation

These are decisions chosen to close gaps, and can be changed without breaking the rest of the rules:

1. **Viewer cannot execute requests** (5.1). Alternative: allow execution without access to secrets.
2. **Editor cannot Clone or create a project** (8.1). Alternative: grant Editor `team.projects.create`, which would make the Project Admin-as-creator logic more consistent.
3. **No Reveal of secrets for any role** (5.1). Alternative: allow Project Admin to reveal, with the action recorded in the Audit Log.
4. **Revoking an inviter's invitations when they lose permission** (12.7). Alternative: they remain valid until expiry.
5. **Deleting the account of an Owner of a deleted team brings permanent deletion forward** (10.5).
6. **The numbers for limits and durations** in 12.4 and 14.2 are initial values for discussion.
7. **Cloning from Team to Personal or to another Team is blocked** in this version (8.1).

---

**Document Status:** Consolidated Draft v2

**Next Step:** Database Schema Design — Tables, Relationships, Foreign Keys, Constraints, Indexes, and Data Lifecycle.
