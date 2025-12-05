# Teams Implementation Plan (Internal Multi-Tenancy)

## Overview

This document outlines the plan to complete the Teams feature, which enables internal multi-tenancy within TaskMaster. Different departments/teams (e.g., Maintenance, Accounting, Store Ops) will have isolated views of the system while sharing the same tenant.

---

## Current State (Completed)

- [x] **Schema Design**: Team, UserTeam models with `teamId` on entities
- [x] **Migration**: SQL ready at `prisma/migrations/20251205_add_teams/`
- [x] **Teams Module**: Full CRUD API with member management
- [x] **Prisma Client**: Regenerated with new models

---

## Design Decisions

### 1. Team Visibility Rules

| Scenario | Who Sees It |
|----------|-------------|
| `teamId = null` | Everyone in tenant (shared resource) |
| `teamId = X` | Team X members + Admins |
| Admin with `?teamId=X` filter | Only team X items (filtered view) |
| Admin without filter | All items across all teams |

### 2. Team Assignment Rules

| Action | Who Can Do It |
|--------|---------------|
| Assign item to a team | Creator (only their teams) or Admin (any team) |
| Change item's team | Admin only |
| Create user without team | **Blocked** - team assignment required |
| View team-scoped features | Only users assigned to at least one team |

### 3. Sharing Between Teams

- **Simple approach (recommended)**: Set `teamId = null` to share with ALL teams
- Items with `teamId = null` are tenant-wide shared resources
- If selective multi-team sharing is needed later, we can add junction tables

### 4. Admin Behavior

- Admins bypass team filtering by default (see everything)
- Admins can optionally filter by team using `?teamId=X` query parameter
- Admins can reassign items between teams
- Regular users cannot change team assignment after creation

---

## Implementation Phases

### Phase 1: Apply Migration & Seed Data

**Files to modify:**
- `prisma/seed.ts`

**Tasks:**
1. Run `prisma migrate deploy` to apply the teams migration
2. Add team permissions to seed data:
   - `teams:create`
   - `teams:read`
   - `teams:update`
   - `teams:delete`
3. Assign team permissions to Admin and Supervisor roles
4. Optionally create a default "General" team for existing tenants

---

### Phase 2: Auth & JWT Updates

**Files to modify:**
- `src/common/auth/strategies/jwt.strategy.ts`
- `src/common/auth/decorators/current-user.decorator.ts`

**Tasks:**

1. **Update TenantContext interface:**
```typescript
export interface TenantContext {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  // New team fields
  teamIds: string[];        // All teams user belongs to
  primaryTeamId: string | null;  // User's primary team
  isAdmin: boolean;         // Quick check for admin bypass
}
```

2. **Update JWT Strategy** to fetch user's teams on token validation

3. **Create team filter helper utility** (`src/common/auth/helpers/team-filter.helper.ts`):
```typescript
export function buildTeamFilter(ctx: TenantContext, requestedTeamId?: string) {
  // Admins can see all, or filter by specific team
  if (ctx.isAdmin) {
    if (requestedTeamId) {
      return { teamId: requestedTeamId };
    }
    return {}; // No filter - see all
  }

  // Regular users see their teams + shared items
  return {
    OR: [
      { teamId: null },                    // Shared items
      { teamId: { in: ctx.teamIds } },     // User's teams
    ]
  };
}
```

---

### Phase 3: Update Services for Team Scoping

**Pattern to apply to each service:**

1. Add `teamId` to Create DTO (optional field)
2. Validate team assignment on create:
   - If user is admin: allow any team or null
   - If regular user: only allow their teams or null
3. Add team filter to `findAll` queries
4. Add `?teamId=X` query parameter for admin filtering
5. Include team relation in responses
6. Restrict team reassignment to admins only

**Services to update (in order):**

1. **Work Orders Service** (`src/modules/work-orders/`)
   - `work-orders.service.ts`
   - `dto/create-work-order.dto.ts`
   - `dto/query-work-orders.dto.ts`
   - `work-orders.controller.ts`

2. **Assets Service** (`src/modules/assets/`)
   - Same pattern as work orders

3. **Inventory Service** (`src/modules/inventory/`)
   - Same pattern as work orders

4. **Locations Service** (`src/modules/locations/`)
   - Same pattern as work orders

5. **Scheduling Service** (`src/modules/scheduling/`)
   - Same pattern for maintenance schedules

---

### Phase 4: User Service Updates

**Files to modify:**
- `src/modules/users/users.service.ts`
- `src/modules/users/dto/create-user.dto.ts`

**Tasks:**

1. **Require team assignment on user creation:**
```typescript
// In CreateUserDto
@IsUUID()
@IsNotEmpty()
primaryTeamId: string;  // Required - user must have a team
```

2. **Auto-create UserTeam record** when creating user

3. **Add endpoint to get user's teams:**
   - `GET /users/:id/teams`
   - `GET /users/me/teams`

4. **Block access** if user has no team assignments (edge case protection)

---

### Phase 5: PWA Updates

**New files to create:**
- `src/contexts/team-context.tsx`
- `src/components/team-selector.tsx`

**Files to modify:**
- `src/lib/api-client.ts`
- Various list/form components

**Tasks:**

1. **Team Context Provider:**
```typescript
interface TeamContextValue {
  teams: Team[];              // User's teams
  selectedTeamId: string | null;  // Current filter (null = all)
  setSelectedTeamId: (id: string | null) => void;
  primaryTeam: Team | null;
}
```

2. **Team Selector Component:**
   - Dropdown in header/sidebar
   - Shows user's teams with color badges
   - "All Teams" option for viewing everything
   - Persists selection to localStorage

3. **API Client Updates:**
   - Add optional `teamId` query parameter to list endpoints
   - Include in work orders, assets, inventory, locations, schedules

4. **List View Updates:**
   - Pass `selectedTeamId` to API calls
   - Show team badge/color on list items
   - Filter indicator when team is selected

5. **Create/Edit Form Updates:**
   - Add team selector field (dropdown of user's teams)
   - Default to user's primary team
   - "Shared (All Teams)" option sets `teamId = null`

---

### Phase 6: Testing

**Unit Tests:**
- Team filter helper with various user roles
- Service methods with team scoping
- Admin bypass behavior
- Regular user restrictions

**Integration Tests:**
- Create item with team assignment
- Query items respects team filtering
- Admin can see all items
- Admin can filter by specific team
- User cannot see other teams' items
- Shared items (teamId=null) visible to all

**E2E Tests (PWA):**
- Team selector changes filtered results
- Creating item assigns to selected team
- Team badge displays correctly

---

## API Changes Summary

### New Endpoints (Already Implemented)
- `POST /teams` - Create team
- `GET /teams` - List teams
- `GET /teams/:id` - Get team details
- `PATCH /teams/:id` - Update team
- `DELETE /teams/:id` - Delete team
- `GET /teams/:id/members` - List team members
- `POST /teams/:id/members` - Add member
- `PATCH /teams/:id/members/:userId` - Update member role
- `DELETE /teams/:id/members/:userId` - Remove member

### Modified Endpoints
All list endpoints gain `?teamId=X` query parameter:
- `GET /work-orders?teamId=X`
- `GET /assets?teamId=X`
- `GET /inventory?teamId=X`
- `GET /locations?teamId=X`
- `GET /scheduling?teamId=X`

### New User Endpoints
- `GET /users/me/teams` - Get current user's teams
- `GET /users/:id/teams` - Get user's teams (admin)

---

## Database Changes Summary

### New Tables
- `teams` - Team definitions
- `user_teams` - User-team memberships (junction)

### Modified Tables (new column)
- `work_orders.team_id` - FK to teams (nullable)
- `assets.team_id` - FK to teams (nullable)
- `inventory_items.team_id` - FK to teams (nullable)
- `locations.team_id` - FK to teams (nullable)
- `maintenance_schedules.team_id` - FK to teams (nullable)

---

## Migration Notes

For existing data after migration:
1. All existing items will have `team_id = NULL` (shared/visible to all)
2. Create teams for each department
3. Optionally bulk-assign existing items to teams
4. Assign users to appropriate teams

---

## Questions Resolved

| Question | Decision |
|----------|----------|
| Should admins bypass team filtering? | Yes, admins see all. Can filter optionally. |
| Default team behavior? | Required on user creation. Default to primary team on item creation. |
| Can items be moved between teams? | Yes, but only by admins. |
| Multi-team sharing? | Use `teamId = null` for tenant-wide sharing. |

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Migration & Seed | 1 hour |
| Phase 2: Auth & JWT | 2-3 hours |
| Phase 3: Service Updates | 4-6 hours |
| Phase 4: User Service | 1-2 hours |
| Phase 5: PWA Updates | 4-6 hours |
| Phase 6: Testing | 2-3 hours |
| **Total** | **14-21 hours** |

---

## Next Steps

1. Start a new session
2. Apply the migration: `prisma migrate deploy`
3. Begin with Phase 2 (Auth & JWT updates)
4. Work through phases sequentially
5. Test thoroughly before moving to PWA updates
