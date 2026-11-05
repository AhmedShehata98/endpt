export const teamPath = (teamId: string) => `teams/${teamId}`;
export const membershipsPath = (teamId: string) => `teams/${teamId}/memberships`;
export const membershipPath = (teamId: string, membershipId: string) =>
  `teams/${teamId}/memberships/${membershipId}`;
export const invitationsPath = (teamId: string) => `teams/${teamId}/invitations`;
export const invitationPath = (teamId: string, invitationId: string) =>
  `teams/${teamId}/invitations/${invitationId}`;
export const projectsPath = (teamId: string) => `teams/${teamId}/projects`;
export const projectPath = (teamId: string, projectId: string) =>
  `teams/${teamId}/projects/${projectId}`;
export const projectMembersPath = (teamId: string, projectId: string) =>
  `teams/${teamId}/projects/${projectId}/members`;
export const contentPath = (
  teamId: string,
  projectId: string,
  kind: string,
  id: string,
) => `teams/${teamId}/projects/${projectId}/${kind}/${id}`;
export const teamIndexPath = (uid: string, teamId: string) =>
  `users/${uid}/teamIndex/${teamId}`;
export const auditPath = (teamId: string, id: string) =>
  `teams/${teamId}/audit/${id}`;
