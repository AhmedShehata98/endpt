import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { TeamOps, notifyPurgeWarnings, purgeDueTeams } from "./team-ops";

admin.initializeApp();

function ops(request: { auth?: { uid: string } | null }): TeamOps {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }
  return new TeamOps(request.auth.uid);
}

export const teamPing = onCall(async (request) => ops(request).ping());

export const teamCreate = onCall(async (request) =>
  ops(request).createTeam(request.data ?? {}),
);
export const teamUpdate = onCall(async (request) =>
  ops(request).updateTeam(request.data ?? {}),
);
export const teamListMine = onCall(async (request) => ops(request).listMine());
export const teamListMembers = onCall(async (request) =>
  ops(request).listMembers(request.data?.teamId),
);
export const memberChangeRole = onCall(async (request) =>
  ops(request).changeMemberRole(request.data ?? {}),
);
export const memberRemove = onCall(async (request) =>
  ops(request).removeMember(request.data ?? {}),
);
export const memberLeave = onCall(async (request) =>
  ops(request).leaveTeam(request.data?.teamId),
);
export const teamSetSuccessor = onCall(async (request) =>
  ops(request).setSuccessor(request.data ?? {}),
);
export const teamTransferOwnership = onCall(async (request) =>
  ops(request).transferOwnership(request.data ?? {}),
);
export const inviteCreate = onCall(async (request) =>
  ops(request).createInvitation(request.data ?? {}),
);
export const inviteAccept = onCall(async (request) =>
  ops(request).acceptInvitation(request.data ?? {}),
);
export const inviteRevoke = onCall(async (request) =>
  ops(request).revokeInvitation(request.data ?? {}),
);
export const inviteResend = onCall(async (request) =>
  ops(request).resendInvitation(request.data ?? {}),
);
export const projectCreate = onCall(async (request) =>
  ops(request).createProject(request.data ?? {}),
);
export const projectDelete = onCall(async (request) =>
  ops(request).deleteProject(request.data ?? {}),
);
export const projectList = onCall(async (request) =>
  ops(request).listProjects(request.data?.teamId),
);
export const projectSetMember = onCall(async (request) =>
  ops(request).setProjectMember(request.data ?? {}),
);
export const projectListMembers = onCall(async (request) =>
  ops(request).listProjectMembers(request.data ?? {}),
);
export const contentUpsert = onCall(async (request) =>
  ops(request).upsertContent(request.data ?? {}),
);
export const projectClonePersonal = onCall(async (request) =>
  ops(request).clonePersonal(request.data ?? {}),
);
export const teamSoftDelete = onCall(async (request) =>
  ops(request).softDelete(request.data?.teamId),
);
export const teamRestore = onCall(async (request) =>
  ops(request).restore(request.data?.teamId),
);

/** Daily purge of soft-deleted teams past purgeAfter */
export const teamPurgeJob = onSchedule("every 24 hours", async () => {
  await purgeDueTeams();
  await notifyPurgeWarnings();
});
