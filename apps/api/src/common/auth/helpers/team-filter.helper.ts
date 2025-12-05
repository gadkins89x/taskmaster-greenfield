import { TenantContext } from '../strategies/jwt.strategy';

/**
 * Build a Prisma filter for team-scoped queries.
 *
 * Rules:
 * - Admins see everything by default, or can filter by specific team
 * - Regular users see:
 *   1. Items with teamId = null (shared/tenant-wide items)
 *   2. Items belonging to any team they are a member of
 *
 * @param ctx - The tenant context from JWT
 * @param requestedTeamId - Optional team ID to filter by (typically from query param)
 * @returns Prisma where clause for team filtering
 */
export function buildTeamFilter(
  ctx: TenantContext,
  requestedTeamId?: string,
): Record<string, unknown> {
  // Admins can see all, or filter by specific team
  if (ctx.isAdmin) {
    if (requestedTeamId) {
      return { teamId: requestedTeamId };
    }
    return {}; // No filter - see all
  }

  // If a specific team is requested, validate user has access
  if (requestedTeamId) {
    // User can only filter by teams they belong to
    if (!ctx.teamIds.includes(requestedTeamId)) {
      // Return impossible filter - user doesn't have access to this team
      return { teamId: '__FORBIDDEN__' };
    }
    return { teamId: requestedTeamId };
  }

  // Regular users see their teams + shared items (teamId = null)
  return {
    OR: [
      { teamId: null }, // Shared items visible to all in tenant
      { teamId: { in: ctx.teamIds } }, // User's teams
    ],
  };
}

/**
 * Validate that a user can assign an item to a specific team.
 *
 * Rules:
 * - Admins can assign to any team or null
 * - Regular users can only assign to teams they belong to, or null
 *
 * @param ctx - The tenant context from JWT
 * @param teamId - The team ID to assign (null for shared)
 * @returns true if the assignment is allowed
 */
export function canAssignToTeam(
  ctx: TenantContext,
  teamId: string | null,
): boolean {
  // null (shared) is always allowed
  if (teamId === null) {
    return true;
  }

  // Admins can assign to any team
  if (ctx.isAdmin) {
    return true;
  }

  // Regular users can only assign to their own teams
  return ctx.teamIds.includes(teamId);
}

/**
 * Get the default team ID for creating new items.
 *
 * @param ctx - The tenant context from JWT
 * @returns The user's primary team ID, or null if no teams
 */
export function getDefaultTeamId(ctx: TenantContext): string | null {
  return ctx.primaryTeamId;
}
