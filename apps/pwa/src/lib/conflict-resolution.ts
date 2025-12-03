import { db, type OfflineWorkOrder, type OfflineAsset, type SyncQueueItem } from './db';
import { apiClient } from './api-client';

export interface ConflictItem {
  id: string;
  entityType: SyncQueueItem['entityType'];
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown> | null;
  localUpdatedAt: string;
  serverUpdatedAt?: string;
  queueItemId?: number;
  fieldConflicts: FieldConflict[];
}

export interface FieldConflict {
  field: string;
  localValue: unknown;
  serverValue: unknown;
}

export type ResolutionStrategy = 'keep_local' | 'keep_server' | 'merge';

export interface MergeResolution {
  [field: string]: 'local' | 'server';
}

// Get all items in conflict state
export async function getConflictedItems(): Promise<ConflictItem[]> {
  const conflicts: ConflictItem[] = [];

  // Get conflicted work orders
  const conflictedWorkOrders = await db.workOrders
    .where('_syncStatus')
    .equals('conflict')
    .toArray();

  for (const wo of conflictedWorkOrders) {
    try {
      const serverData = await apiClient.get<OfflineWorkOrder>(`/work-orders/${wo.id}`);
      const fieldConflicts = compareFields(wo, serverData);

      conflicts.push({
        id: `workOrder:${wo.id}`,
        entityType: 'workOrder',
        entityId: wo.id,
        localData: wo as unknown as Record<string, unknown>,
        serverData: serverData as unknown as Record<string, unknown>,
        localUpdatedAt: wo._localUpdatedAt || wo.updatedAt,
        serverUpdatedAt: serverData.updatedAt,
        fieldConflicts,
      });
    } catch (error) {
      // Server version may have been deleted
      conflicts.push({
        id: `workOrder:${wo.id}`,
        entityType: 'workOrder',
        entityId: wo.id,
        localData: wo as unknown as Record<string, unknown>,
        serverData: null,
        localUpdatedAt: wo._localUpdatedAt || wo.updatedAt,
        fieldConflicts: [],
      });
    }
  }

  // Get conflicted assets
  const conflictedAssets = await db.assets
    .where('_syncStatus')
    .equals('conflict')
    .toArray();

  for (const asset of conflictedAssets) {
    try {
      const serverData = await apiClient.get<OfflineAsset>(`/assets/${asset.id}`);
      const fieldConflicts = compareFields(asset, serverData);

      conflicts.push({
        id: `asset:${asset.id}`,
        entityType: 'asset',
        entityId: asset.id,
        localData: asset as unknown as Record<string, unknown>,
        serverData: serverData as unknown as Record<string, unknown>,
        localUpdatedAt: asset._localUpdatedAt || asset.updatedAt,
        serverUpdatedAt: serverData.updatedAt,
        fieldConflicts,
      });
    } catch (error) {
      conflicts.push({
        id: `asset:${asset.id}`,
        entityType: 'asset',
        entityId: asset.id,
        localData: asset as unknown as Record<string, unknown>,
        serverData: null,
        localUpdatedAt: asset._localUpdatedAt || asset.updatedAt,
        fieldConflicts: [],
      });
    }
  }

  // Also get failed sync queue items (max retries exceeded)
  const failedItems = await db.syncQueue
    .filter(item => item.attempts >= 3 && item.error !== undefined)
    .toArray();

  for (const item of failedItems) {
    if (!conflicts.find(c => c.entityId === item.entityId)) {
      conflicts.push({
        id: `queue:${item.id}`,
        entityType: item.entityType,
        entityId: item.entityId,
        localData: item.payload as Record<string, unknown>,
        serverData: null,
        localUpdatedAt: item.createdAt,
        queueItemId: item.id,
        fieldConflicts: [],
      });
    }
  }

  return conflicts;
}

// Get count of conflicts for badge display
export async function getConflictCount(): Promise<number> {
  const workOrderConflicts = await db.workOrders
    .where('_syncStatus')
    .equals('conflict')
    .count();

  const assetConflicts = await db.assets
    .where('_syncStatus')
    .equals('conflict')
    .count();

  const failedQueueItems = await db.syncQueue
    .filter(item => item.attempts >= 3 && item.error !== undefined)
    .count();

  return workOrderConflicts + assetConflicts + failedQueueItems;
}

// Compare two objects and return field-level conflicts
function compareFields(
  local: Record<string, unknown>,
  server: Record<string, unknown>
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];
  const ignoredFields = ['_syncStatus', '_localUpdatedAt', '_serverVersion', 'updatedAt', 'createdAt'];

  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

  for (const key of allKeys) {
    if (ignoredFields.includes(key)) continue;
    if (key.startsWith('_')) continue;

    const localVal = local[key];
    const serverVal = server[key];

    if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
      conflicts.push({
        field: key,
        localValue: localVal,
        serverValue: serverVal,
      });
    }
  }

  return conflicts;
}

// Resolve a conflict
export async function resolveConflict(
  conflict: ConflictItem,
  strategy: ResolutionStrategy,
  mergeResolution?: MergeResolution
): Promise<void> {
  const { entityType, entityId, localData, serverData, queueItemId } = conflict;

  if (strategy === 'keep_server') {
    // Replace local with server data
    if (serverData) {
      await replaceLocalWithServer(entityType, entityId, serverData);
    } else {
      // Server version was deleted, remove local
      await deleteLocalEntity(entityType, entityId);
    }
  } else if (strategy === 'keep_local') {
    // Force push local changes to server
    await forcePushLocal(entityType, entityId, localData);
  } else if (strategy === 'merge' && mergeResolution && serverData) {
    // Merge fields based on user selection
    const mergedData = mergeData(localData, serverData, mergeResolution);
    await saveAndSyncMerged(entityType, entityId, mergedData);
  }

  // Clean up queue item if present
  if (queueItemId) {
    await db.syncQueue.delete(queueItemId);
  }
}

// Replace local data with server data
async function replaceLocalWithServer(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  serverData: Record<string, unknown>
): Promise<void> {
  switch (entityType) {
    case 'workOrder':
      await db.workOrders.put({
        ...serverData as unknown as OfflineWorkOrder,
        _syncStatus: 'synced',
      });
      break;
    case 'asset':
      await db.assets.put({
        ...serverData as unknown as OfflineAsset,
        _syncStatus: 'synced',
      });
      break;
  }

  // Remove any pending sync queue items for this entity
  await db.syncQueue
    .where('entityId')
    .equals(entityId)
    .delete();
}

// Delete local entity
async function deleteLocalEntity(
  entityType: SyncQueueItem['entityType'],
  entityId: string
): Promise<void> {
  switch (entityType) {
    case 'workOrder':
      await db.workOrders.delete(entityId);
      break;
    case 'asset':
      await db.assets.delete(entityId);
      break;
  }

  await db.syncQueue
    .where('entityId')
    .equals(entityId)
    .delete();
}

// Force push local to server (with force flag to override conflicts)
async function forcePushLocal(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  localData: Record<string, unknown>
): Promise<void> {
  try {
    switch (entityType) {
      case 'workOrder':
        await apiClient.put(`/work-orders/${entityId}?force=true`, localData);
        await db.workOrders.update(entityId, { _syncStatus: 'synced' });
        break;
      case 'asset':
        await apiClient.put(`/assets/${entityId}?force=true`, localData);
        await db.assets.update(entityId, { _syncStatus: 'synced' });
        break;
    }

    // Remove from sync queue
    await db.syncQueue
      .where('entityId')
      .equals(entityId)
      .delete();
  } catch (error) {
    console.error('Force push failed:', error);
    throw error;
  }
}

// Merge data based on user field selections
function mergeData(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
  resolution: MergeResolution
): Record<string, unknown> {
  const merged = { ...server }; // Start with server as base

  for (const [field, source] of Object.entries(resolution)) {
    if (source === 'local') {
      merged[field] = local[field];
    }
    // 'server' keeps the server value which is already there
  }

  return merged;
}

// Save merged data locally and sync to server
async function saveAndSyncMerged(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  mergedData: Record<string, unknown>
): Promise<void> {
  try {
    switch (entityType) {
      case 'workOrder':
        await apiClient.put(`/work-orders/${entityId}?force=true`, mergedData);
        await db.workOrders.put({
          ...mergedData as unknown as OfflineWorkOrder,
          _syncStatus: 'synced',
        });
        break;
      case 'asset':
        await apiClient.put(`/assets/${entityId}?force=true`, mergedData);
        await db.assets.put({
          ...mergedData as unknown as OfflineAsset,
          _syncStatus: 'synced',
        });
        break;
    }

    await db.syncQueue
      .where('entityId')
      .equals(entityId)
      .delete();
  } catch (error) {
    console.error('Merge sync failed:', error);
    throw error;
  }
}

// Dismiss/discard a conflict (remove local changes)
export async function discardConflict(conflict: ConflictItem): Promise<void> {
  const { entityType, entityId, queueItemId } = conflict;

  // Remove from sync queue
  if (queueItemId) {
    await db.syncQueue.delete(queueItemId);
  }

  // Reset sync status
  switch (entityType) {
    case 'workOrder':
      await db.workOrders.update(entityId, { _syncStatus: 'synced' });
      break;
    case 'asset':
      await db.assets.update(entityId, { _syncStatus: 'synced' });
      break;
  }
}

// Mark an entity as having a conflict (called during sync when version mismatch detected)
export async function markAsConflict(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  serverVersion?: number
): Promise<void> {
  switch (entityType) {
    case 'workOrder':
      await db.workOrders.update(entityId, {
        _syncStatus: 'conflict',
        _serverVersion: serverVersion,
      });
      break;
    case 'asset':
      await db.assets.update(entityId, {
        _syncStatus: 'conflict',
        _serverVersion: serverVersion,
      });
      break;
  }
}
