# TaskMaster CMMS - Phase 1 API Contract

## Overview

This document defines the REST API contract for Phase 1 of TaskMaster CMMS. Phase 1 includes:

- Authentication & Authorization
- User & Role Management
- Work Orders (basic CRUD + status workflow)
- Locations (basic hierarchy)
- Assets (basic CRUD)
- Audit Logging

**Base URL**: `/api/v1`

**Authentication**: Bearer JWT token in `Authorization` header

---

## Common Response Formats

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Paginated Response

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Response

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "title", "message": "Title is required" },
    { "field": "priority", "message": "Invalid priority value" }
  ],
  "requestId": "uuid",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Authentication

### POST /auth/login

Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "tenantId": "uuid",
      "tenantName": "Acme Corp",
      "roles": ["technician"],
      "permissions": ["work_orders:read", "work_orders:update"]
    }
  }
}
```

**Notes:**
- Refresh token is set as `httpOnly` cookie
- Access token expires in 15 minutes
- Rate limited: 5 attempts per 15 minutes

---

### POST /auth/refresh

Refresh access token using refresh token cookie.

**Request:** No body (uses httpOnly cookie)

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/logout

Invalidate refresh token.

**Request:** No body

**Response (204):** No content

---

### GET /auth/me

Get current authenticated user.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatarUrl": "https://...",
    "tenantId": "uuid",
    "tenantName": "Acme Corp",
    "roles": [
      {
        "id": "uuid",
        "name": "technician",
        "permissions": ["work_orders:read", "work_orders:update"]
      }
    ],
    "lastLoginAt": "2024-01-15T09:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## Users

### GET /users

List users in tenant.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| search | string | - | Search by name or email |
| roleId | uuid | - | Filter by role |
| isActive | boolean | - | Filter by active status |
| sort | string | createdAt | Sort field |
| order | asc\|desc | desc | Sort order |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "avatarUrl": "https://...",
      "isActive": true,
      "roles": [{ "id": "uuid", "name": "technician" }],
      "lastLoginAt": "2024-01-15T09:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Required Permission:** `users:read`

---

### POST /users

Create a new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "roleIds": ["uuid"]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1234567890",
    "isActive": true,
    "roles": [{ "id": "uuid", "name": "technician" }],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Required Permission:** `users:manage`

---

### GET /users/:id

Get user by ID.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatarUrl": "https://...",
    "isActive": true,
    "roles": [
      {
        "id": "uuid",
        "name": "technician",
        "permissions": ["work_orders:read", "work_orders:update"]
      }
    ],
    "lastLoginAt": "2024-01-15T09:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-10T15:00:00Z"
  }
}
```

**Required Permission:** `users:read`

---

### PATCH /users/:id

Update user.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Updated",
  "phone": "+0987654321",
  "isActive": true,
  "roleIds": ["uuid1", "uuid2"]
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Updated",
    "phone": "+0987654321",
    "isActive": true,
    "roles": [
      { "id": "uuid1", "name": "technician" },
      { "id": "uuid2", "name": "supervisor" }
    ],
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Required Permission:** `users:manage`

---

### DELETE /users/:id

Deactivate user (soft delete).

**Response (204):** No content

**Required Permission:** `users:manage`

---

## Roles

### GET /roles

List roles in tenant.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Admin",
      "description": "Full system access",
      "isSystem": true,
      "userCount": 2,
      "permissions": ["*"],
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Technician",
      "description": "Field maintenance staff",
      "isSystem": false,
      "userCount": 15,
      "permissions": ["work_orders:read", "work_orders:update", "assets:read"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Required Permission:** `roles:read`

---

### POST /roles

Create a new role.

**Request:**
```json
{
  "name": "Supervisor",
  "description": "Team lead with elevated permissions",
  "permissions": [
    "work_orders:read",
    "work_orders:create",
    "work_orders:update",
    "work_orders:assign",
    "assets:read",
    "users:read"
  ]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Supervisor",
    "description": "Team lead with elevated permissions",
    "isSystem": false,
    "permissions": [...],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Required Permission:** `roles:manage`

---

### GET /permissions

List all available permissions.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "resource": "work_orders",
      "action": "create",
      "description": "Create new work orders"
    },
    {
      "id": "uuid",
      "resource": "work_orders",
      "action": "read",
      "description": "View work orders"
    },
    ...
  ]
}
```

---

## Locations

### GET /locations

List locations in tenant.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| parentId | uuid\|null | - | Filter by parent (null for root) |
| type | string | - | Filter by type (site, building, floor, area) |
| search | string | - | Search by name or code |
| flat | boolean | false | Return flat list vs tree |

**Response (200) - Tree format (flat=false):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Main Campus",
      "code": "MC",
      "type": "site",
      "address": "123 Main St",
      "isActive": true,
      "children": [
        {
          "id": "uuid",
          "name": "Building A",
          "code": "MC-A",
          "type": "building",
          "isActive": true,
          "children": [
            {
              "id": "uuid",
              "name": "Floor 1",
              "code": "MC-A-1",
              "type": "floor",
              "isActive": true,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Response (200) - Flat format (flat=true):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Main Campus",
      "code": "MC",
      "type": "site",
      "parentId": null,
      "path": "Main Campus",
      "depth": 0,
      "isActive": true
    },
    {
      "id": "uuid",
      "name": "Building A",
      "code": "MC-A",
      "type": "building",
      "parentId": "uuid",
      "path": "Main Campus > Building A",
      "depth": 1,
      "isActive": true
    }
  ]
}
```

**Required Permission:** `locations:read`

---

### POST /locations

Create a new location.

**Request:**
```json
{
  "name": "Building B",
  "code": "MC-B",
  "type": "building",
  "parentId": "uuid",
  "address": "125 Main St",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "metadata": {
    "sqft": 50000,
    "yearBuilt": 2010
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Building B",
    "code": "MC-B",
    "type": "building",
    "parentId": "uuid",
    "address": "125 Main St",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "metadata": { "sqft": 50000, "yearBuilt": 2010 },
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Required Permission:** `locations:create`

---

### GET /locations/:id

Get location by ID with ancestry.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Floor 1",
    "code": "MC-A-1",
    "type": "floor",
    "parentId": "uuid",
    "address": null,
    "metadata": { "sqft": 10000 },
    "isActive": true,
    "ancestors": [
      { "id": "uuid", "name": "Main Campus", "code": "MC", "type": "site" },
      { "id": "uuid", "name": "Building A", "code": "MC-A", "type": "building" }
    ],
    "childrenCount": 5,
    "assetsCount": 12,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-10T15:00:00Z"
  }
}
```

---

### PATCH /locations/:id

Update location.

**Request:**
```json
{
  "name": "Floor 1 - Renovated",
  "metadata": { "sqft": 12000, "renovatedYear": 2024 }
}
```

**Response (200):** Updated location object

**Required Permission:** `locations:update`

---

### DELETE /locations/:id

Delete location (fails if has children or assets).

**Response (204):** No content

**Error Response (409):**
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Cannot delete location with existing children or assets"
}
```

**Required Permission:** `locations:delete`

---

## Assets

### GET /assets

List assets in tenant.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | - | Search by name, tag, or serial |
| locationId | uuid | - | Filter by location |
| category | string | - | Filter by category |
| status | string | - | Filter by status |
| sort | string | createdAt | Sort field |
| order | asc\|desc | desc | Sort order |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "HVAC Unit #1",
      "assetTag": "AST-001",
      "serialNumber": "HV-2024-12345",
      "manufacturer": "Carrier",
      "model": "Infinity 21",
      "category": "HVAC",
      "status": "operational",
      "location": {
        "id": "uuid",
        "name": "Building A - Floor 1",
        "code": "MC-A-1"
      },
      "purchaseDate": "2022-06-15",
      "warrantyExpires": "2027-06-15",
      "openWorkOrdersCount": 2,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Required Permission:** `assets:read`

---

### POST /assets

Create a new asset.

**Request:**
```json
{
  "name": "Elevator #2",
  "assetTag": "AST-002",
  "serialNumber": "EL-2024-67890",
  "manufacturer": "Otis",
  "model": "Gen2",
  "category": "Elevator",
  "status": "operational",
  "locationId": "uuid",
  "purchaseDate": "2023-01-15",
  "warrantyExpires": "2028-01-15",
  "specifications": {
    "capacity": "2500 lbs",
    "floors": 10,
    "speed": "500 fpm"
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Elevator #2",
    "assetTag": "AST-002",
    "serialNumber": "EL-2024-67890",
    "manufacturer": "Otis",
    "model": "Gen2",
    "category": "Elevator",
    "status": "operational",
    "location": {
      "id": "uuid",
      "name": "Building A",
      "code": "MC-A"
    },
    "purchaseDate": "2023-01-15",
    "warrantyExpires": "2028-01-15",
    "specifications": {...},
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Required Permission:** `assets:create`

---

### GET /assets/:id

Get asset by ID with details.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "HVAC Unit #1",
    "assetTag": "AST-001",
    "serialNumber": "HV-2024-12345",
    "manufacturer": "Carrier",
    "model": "Infinity 21",
    "category": "HVAC",
    "status": "operational",
    "location": {
      "id": "uuid",
      "name": "Building A - Floor 1",
      "code": "MC-A-1",
      "path": "Main Campus > Building A > Floor 1"
    },
    "purchaseDate": "2022-06-15",
    "warrantyExpires": "2027-06-15",
    "specifications": {
      "btu": 60000,
      "refrigerant": "R-410A"
    },
    "workOrderStats": {
      "total": 15,
      "open": 2,
      "completedThisMonth": 3
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-10T15:00:00Z"
  }
}
```

---

### GET /assets/:id/work-orders

Get work orders for an asset.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| status | string[] | - | Filter by status |

**Response (200):** Paginated work order list

---

### GET /assets/by-tag/:tag

Look up asset by asset tag (for QR/barcode scanning).

**Response (200):** Asset object

**Response (404):** Asset not found

---

## Work Orders

### GET /work-orders

List work orders in tenant.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | - | Search by title or WO number |
| status | string[] | - | Filter by status(es) |
| priority | string[] | - | Filter by priority(ies) |
| type | string | - | Filter by type |
| assignedToId | uuid | - | Filter by assignee |
| assetId | uuid | - | Filter by asset |
| locationId | uuid | - | Filter by location |
| createdAfter | ISO date | - | Created after date |
| createdBefore | ISO date | - | Created before date |
| dueAfter | ISO date | - | Due after date |
| dueBefore | ISO date | - | Due before date |
| isOverdue | boolean | - | Filter overdue only |
| sort | string | createdAt | Sort field |
| order | asc\|desc | desc | Sort order |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "workOrderNumber": "WO-2024-0001",
      "title": "HVAC not cooling properly",
      "description": "Unit on floor 1 is blowing warm air",
      "status": "in_progress",
      "priority": "high",
      "type": "reactive",
      "asset": {
        "id": "uuid",
        "name": "HVAC Unit #1",
        "assetTag": "AST-001"
      },
      "location": {
        "id": "uuid",
        "name": "Floor 1",
        "path": "Main Campus > Building A > Floor 1"
      },
      "assignedTo": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "avatarUrl": "https://..."
      },
      "createdBy": {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "dueDate": "2024-01-16T17:00:00Z",
      "isOverdue": false,
      "estimatedHours": 2,
      "stepsCount": 5,
      "stepsCompleted": 2,
      "commentsCount": 3,
      "createdAt": "2024-01-15T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Required Permission:** `work_orders:read`

**Note:** Users with `work_orders:read` see only assigned work orders. Users with `work_orders:read_all` see all work orders.

---

### POST /work-orders

Create a new work order.

**Request:**
```json
{
  "title": "Replace air filter",
  "description": "Quarterly air filter replacement for HVAC unit",
  "priority": "medium",
  "type": "preventive",
  "assetId": "uuid",
  "locationId": "uuid",
  "assignedToId": "uuid",
  "dueDate": "2024-01-20T17:00:00Z",
  "estimatedHours": 1,
  "steps": [
    { "title": "Turn off HVAC unit", "isRequired": true },
    { "title": "Remove old filter", "isRequired": true },
    { "title": "Install new filter", "isRequired": true },
    { "title": "Turn on HVAC unit", "isRequired": true },
    { "title": "Verify operation", "isRequired": false }
  ]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "workOrderNumber": "WO-2024-0002",
    "title": "Replace air filter",
    "description": "Quarterly air filter replacement for HVAC unit",
    "status": "open",
    "priority": "medium",
    "type": "preventive",
    "asset": {...},
    "location": {...},
    "assignedTo": {...},
    "createdBy": {...},
    "dueDate": "2024-01-20T17:00:00Z",
    "estimatedHours": 1,
    "steps": [
      {
        "id": "uuid",
        "stepOrder": 1,
        "title": "Turn off HVAC unit",
        "isRequired": true,
        "isCompleted": false
      },
      ...
    ],
    "version": 1,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Required Permission:** `work_orders:create`

---

### GET /work-orders/:id

Get work order by ID with full details.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "workOrderNumber": "WO-2024-0001",
    "title": "HVAC not cooling properly",
    "description": "Unit on floor 1 is blowing warm air",
    "status": "in_progress",
    "priority": "high",
    "type": "reactive",
    "asset": {
      "id": "uuid",
      "name": "HVAC Unit #1",
      "assetTag": "AST-001",
      "manufacturer": "Carrier",
      "model": "Infinity 21"
    },
    "location": {
      "id": "uuid",
      "name": "Floor 1",
      "code": "MC-A-1",
      "path": "Main Campus > Building A > Floor 1"
    },
    "assignedTo": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatarUrl": "https://..."
    },
    "createdBy": {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "dueDate": "2024-01-16T17:00:00Z",
    "startedAt": "2024-01-15T09:00:00Z",
    "completedAt": null,
    "isOverdue": false,
    "estimatedHours": 2,
    "actualHours": null,
    "completionNotes": null,
    "steps": [
      {
        "id": "uuid",
        "stepOrder": 1,
        "title": "Diagnose issue",
        "description": "Check refrigerant levels and electrical connections",
        "isRequired": true,
        "isCompleted": true,
        "completedBy": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "completedAt": "2024-01-15T09:30:00Z",
        "completionNotes": "Refrigerant low, needs recharge"
      },
      {
        "id": "uuid",
        "stepOrder": 2,
        "title": "Recharge refrigerant",
        "isRequired": true,
        "isCompleted": false,
        "completedBy": null,
        "completedAt": null
      }
    ],
    "comments": [
      {
        "id": "uuid",
        "content": "Arrived on site, beginning diagnosis",
        "user": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "avatarUrl": "https://..."
        },
        "isInternal": false,
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ],
    "signatures": [],
    "version": 3,
    "createdAt": "2024-01-15T08:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### PATCH /work-orders/:id

Update work order.

**Request:**
```json
{
  "title": "HVAC not cooling - refrigerant issue",
  "priority": "critical",
  "assignedToId": "uuid",
  "dueDate": "2024-01-15T17:00:00Z",
  "expectedVersion": 3
}
```

**Response (200):** Updated work order object

**Response (409) - Conflict:**
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Work order was modified by another user",
  "details": {
    "currentVersion": 4,
    "expectedVersion": 3
  }
}
```

**Required Permission:** `work_orders:update`

---

### POST /work-orders/:id/start

Start working on a work order.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "startedAt": "2024-01-15T10:30:00Z",
    "version": 4
  }
}
```

**Required Permission:** `work_orders:update`

---

### POST /work-orders/:id/hold

Put work order on hold.

**Request:**
```json
{
  "reason": "Waiting for replacement parts"
}
```

**Response (200):** Updated work order with status "on_hold"

---

### POST /work-orders/:id/complete

Complete work order.

**Request:**
```json
{
  "completionNotes": "Recharged refrigerant. System now cooling properly.",
  "actualHours": 1.5,
  "expectedVersion": 4
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "status": "completed",
    "completedAt": "2024-01-15T11:30:00Z",
    "completionNotes": "Recharged refrigerant. System now cooling properly.",
    "actualHours": 1.5,
    "version": 5
  }
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Cannot complete work order with incomplete required steps",
  "details": {
    "incompleteSteps": [
      { "id": "uuid", "title": "Verify operation" }
    ]
  }
}
```

---

### POST /work-orders/:id/cancel

Cancel work order.

**Request:**
```json
{
  "reason": "Duplicate request - already resolved"
}
```

**Response (200):** Updated work order with status "cancelled"

---

## Work Order Steps

### PATCH /work-orders/:workOrderId/steps/:stepId

Update a step.

**Request:**
```json
{
  "isCompleted": true,
  "completionNotes": "Refrigerant at correct level"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "stepOrder": 2,
    "title": "Recharge refrigerant",
    "isCompleted": true,
    "completedBy": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe"
    },
    "completedAt": "2024-01-15T10:45:00Z",
    "completionNotes": "Refrigerant at correct level"
  }
}
```

---

### POST /work-orders/:workOrderId/steps

Add a new step to work order.

**Request:**
```json
{
  "title": "Document repair with photos",
  "description": "Take before/after photos",
  "isRequired": false,
  "insertAfter": "uuid"
}
```

**Response (201):** Created step object

---

### DELETE /work-orders/:workOrderId/steps/:stepId

Remove a step from work order.

**Response (204):** No content

---

## Work Order Comments

### GET /work-orders/:workOrderId/comments

List comments for a work order.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "content": "Arrived on site, beginning diagnosis",
      "user": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "avatarUrl": "https://..."
      },
      "isInternal": false,
      "parentId": null,
      "replies": [],
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T09:00:00Z"
    }
  ],
  "meta": {...}
}
```

---

### POST /work-orders/:workOrderId/comments

Add a comment to work order.

**Request:**
```json
{
  "content": "Found the issue - low refrigerant levels",
  "isInternal": false,
  "parentId": null
}
```

**Response (201):** Created comment object

---

### PATCH /work-orders/:workOrderId/comments/:commentId

Update a comment.

**Request:**
```json
{
  "content": "Found the issue - very low refrigerant levels"
}
```

**Response (200):** Updated comment object

---

### DELETE /work-orders/:workOrderId/comments/:commentId

Delete a comment.

**Response (204):** No content

---

## Health & Meta

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": { "status": "healthy", "latencyMs": 5 },
    "redis": { "status": "healthy", "latencyMs": 2 },
    "storage": { "status": "healthy" }
  }
}
```

---

### GET /health/ready

Readiness probe (for Kubernetes/Docker).

**Response (200):** `OK`

**Response (503):** `Service Unavailable`

---

### GET /health/live

Liveness probe.

**Response (200):** `OK`

---

## Error Codes Reference

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request body or parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Valid auth but insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Optimistic locking conflict or duplicate |
| 422 | UNPROCESSABLE_ENTITY | Business rule violation |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |
| 500 | INTERNAL_ERROR | Server error |

---

## Rate Limits

| Endpoint Pattern | Limit |
|-----------------|-------|
| POST /auth/login | 5 per 15 min |
| POST /auth/refresh | 10 per min |
| GET /api/* | 100 per min |
| POST/PATCH/DELETE /api/* | 50 per min |
| POST /*/upload | 10 per min |

Rate limit headers included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
