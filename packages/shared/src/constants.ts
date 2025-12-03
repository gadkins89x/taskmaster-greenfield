// Work Order Status
export const WORK_ORDER_STATUSES = [
  'open',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
] as const;

export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Work Order Priority
export const WORK_ORDER_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export const WORK_ORDER_PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

// Work Order Type
export const WORK_ORDER_TYPES = [
  'reactive',
  'preventive',
  'predictive',
  'inspection',
] as const;

export const WORK_ORDER_TYPE_LABELS: Record<string, string> = {
  reactive: 'Reactive',
  preventive: 'Preventive',
  predictive: 'Predictive',
  inspection: 'Inspection',
};

// Asset Status
export const ASSET_STATUSES = [
  'operational',
  'maintenance',
  'offline',
  'retired',
] as const;

export const ASSET_STATUS_LABELS: Record<string, string> = {
  operational: 'Operational',
  maintenance: 'Under Maintenance',
  offline: 'Offline',
  retired: 'Retired',
};

// Location Types
export const LOCATION_TYPES = [
  'site',
  'building',
  'floor',
  'area',
  'room',
] as const;

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  site: 'Site',
  building: 'Building',
  floor: 'Floor',
  area: 'Area',
  room: 'Room',
};

// Permissions
export const PERMISSIONS = {
  // Work Orders
  WORK_ORDERS_CREATE: 'work_orders:create',
  WORK_ORDERS_READ: 'work_orders:read',
  WORK_ORDERS_READ_ALL: 'work_orders:read_all',
  WORK_ORDERS_UPDATE: 'work_orders:update',
  WORK_ORDERS_DELETE: 'work_orders:delete',
  WORK_ORDERS_ASSIGN: 'work_orders:assign',

  // Assets
  ASSETS_CREATE: 'assets:create',
  ASSETS_READ: 'assets:read',
  ASSETS_UPDATE: 'assets:update',
  ASSETS_DELETE: 'assets:delete',

  // Locations
  LOCATIONS_CREATE: 'locations:create',
  LOCATIONS_READ: 'locations:read',
  LOCATIONS_UPDATE: 'locations:update',
  LOCATIONS_DELETE: 'locations:delete',

  // Inventory
  INVENTORY_READ: 'inventory:read',
  INVENTORY_ADJUST: 'inventory:adjust',
  INVENTORY_TRANSFER: 'inventory:transfer',

  // Users
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',

  // Roles
  ROLES_READ: 'roles:read',
  ROLES_MANAGE: 'roles:manage',

  // Settings
  SETTINGS_MANAGE: 'settings:manage',
} as const;

// Default Roles
export const DEFAULT_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  TECHNICIAN: 'technician',
  REQUESTER: 'requester',
  VIEWER: 'viewer',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
