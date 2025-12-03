import Dexie, { type EntityTable } from 'dexie';

// Offline data types (mirrors backend schema)
export interface OfflineWorkOrder {
  id: string;
  tenantId: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'corrective' | 'preventive' | 'inspection' | 'emergency' | 'project';
  assetId?: string;
  locationId?: string;
  assignedToId?: string;
  requestedById?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: string;
  completionNotes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  // Sync metadata
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _localUpdatedAt?: string;
  _serverVersion?: number;
}

export interface OfflineWorkOrderStep {
  id: string;
  workOrderId: string;
  stepNumber: number;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedById?: string;
  notes?: string;
  // Sync metadata
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _localUpdatedAt?: string;
}

export interface OfflineAsset {
  id: string;
  tenantId: string;
  assetNumber: string;
  name: string;
  description?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  locationId?: string;
  status: 'operational' | 'needs_repair' | 'out_of_service' | 'retired';
  purchaseDate?: string;
  warrantyExpiration?: string;
  createdAt: string;
  updatedAt: string;
  // Sync metadata
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _localUpdatedAt?: string;
}

export interface OfflineLocation {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
  parentId?: string;
  path?: string;
  level: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Sync metadata
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _localUpdatedAt?: string;
}

export interface OfflineInventoryItem {
  id: string;
  tenantId: string;
  itemNumber: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost?: number;
  locationId?: string;
  createdAt: string;
  updatedAt: string;
  // Sync metadata
  _syncStatus: 'synced' | 'pending' | 'conflict';
  _localUpdatedAt?: string;
}

export interface OfflineUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  // Cached for offline display
  _cachedAt: string;
}

export interface SyncQueueItem {
  id?: number;
  entityType: 'workOrder' | 'workOrderStep' | 'asset' | 'location' | 'inventoryItem';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}

export interface SyncState {
  id: string;
  entityType: string;
  lastSyncedAt: string;
  cursor?: string;
}

// Create the database class
class TaskMasterDB extends Dexie {
  workOrders!: EntityTable<OfflineWorkOrder, 'id'>;
  workOrderSteps!: EntityTable<OfflineWorkOrderStep, 'id'>;
  assets!: EntityTable<OfflineAsset, 'id'>;
  locations!: EntityTable<OfflineLocation, 'id'>;
  inventoryItems!: EntityTable<OfflineInventoryItem, 'id'>;
  users!: EntityTable<OfflineUser, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  syncState!: EntityTable<SyncState, 'id'>;

  constructor() {
    super('TaskMasterDB');

    this.version(1).stores({
      // Work orders with indexes for common queries
      workOrders: 'id, tenantId, workOrderNumber, status, priority, assetId, locationId, assignedToId, dueDate, _syncStatus',

      // Work order steps indexed by work order
      workOrderSteps: 'id, workOrderId, stepNumber, _syncStatus',

      // Assets with indexes
      assets: 'id, tenantId, assetNumber, status, locationId, category, _syncStatus',

      // Locations with hierarchy support
      locations: 'id, tenantId, code, parentId, path, level, _syncStatus',

      // Inventory items
      inventoryItems: 'id, tenantId, itemNumber, category, locationId, _syncStatus',

      // Users cache
      users: 'id, tenantId, email',

      // Sync queue for offline mutations
      syncQueue: '++id, entityType, entityId, operation, createdAt',

      // Sync state tracking
      syncState: 'id, entityType, lastSyncedAt',
    });
  }
}

// Create singleton instance
export const db = new TaskMasterDB();

// Helper functions for offline operations
export async function addToSyncQueue(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  operation: SyncQueueItem['operation'],
  payload: unknown
) {
  await db.syncQueue.add({
    entityType,
    entityId,
    operation,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
}

export async function getPendingChanges() {
  return db.syncQueue.orderBy('createdAt').toArray();
}

export async function removeSyncQueueItem(id: number) {
  await db.syncQueue.delete(id);
}

export async function updateSyncQueueItem(id: number, updates: Partial<SyncQueueItem>) {
  await db.syncQueue.update(id, updates);
}

export async function getLastSyncTime(entityType: string): Promise<string | null> {
  const state = await db.syncState.get(entityType);
  return state?.lastSyncedAt ?? null;
}

export async function updateLastSyncTime(entityType: string, timestamp: string, cursor?: string) {
  await db.syncState.put({
    id: entityType,
    entityType,
    lastSyncedAt: timestamp,
    cursor,
  });
}

// Clear all offline data (useful for logout)
export async function clearOfflineData() {
  await db.transaction('rw', [
    db.workOrders,
    db.workOrderSteps,
    db.assets,
    db.locations,
    db.inventoryItems,
    db.users,
    db.syncQueue,
    db.syncState,
  ], async () => {
    await db.workOrders.clear();
    await db.workOrderSteps.clear();
    await db.assets.clear();
    await db.locations.clear();
    await db.inventoryItems.clear();
    await db.users.clear();
    await db.syncQueue.clear();
    await db.syncState.clear();
  });
}
