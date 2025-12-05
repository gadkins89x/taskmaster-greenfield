import {
  db,
  addToSyncQueue,
  getPendingChanges,
  removeSyncQueueItem,
  updateSyncQueueItem,
  getLastSyncTime,
  updateLastSyncTime,
  type OfflineWorkOrder,
  type OfflineInventoryItem,
  type SyncQueueItem,
} from './db';
import { apiClient } from './api-client';

const MAX_RETRY_ATTEMPTS = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ entityId: string; error: string }>;
}

class SyncService {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: () => void;
  private offlineHandler: () => void;

  constructor() {
    this.onlineHandler = () => this.handleOnline();
    this.offlineHandler = () => this.handleOffline();
  }

  start() {
    // Listen for online/offline events
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    // Start periodic sync if online
    if (navigator.onLine) {
      this.startPeriodicSync();
    }
  }

  stop() {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    this.stopPeriodicSync();
  }

  private handleOnline() {
    this.startPeriodicSync();
    this.sync(); // Immediate sync when coming online
  }

  private handleOffline() {
    this.stopPeriodicSync();
  }

  private startPeriodicSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, SYNC_INTERVAL);
  }

  private stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync(): Promise<SyncResult> {
    if (this.isSyncing || !navigator.onLine) {
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Push local changes first
      await this.pushChanges(result);

      // Then pull server changes
      await this.pullChanges();
    } catch (error) {
      console.error('[Sync] Error during sync:', error);
      result.success = false;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async pushChanges(result: SyncResult): Promise<void> {
    const pendingChanges = await getPendingChanges();

    for (const item of pendingChanges) {
      try {
        await this.processQueueItem(item);
        if (item.id) {
          await removeSyncQueueItem(item.id);
        }
        result.syncedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({ entityId: item.entityId, error: errorMessage });
        result.failedCount++;

        // Update retry count
        if (item.id) {
          const attempts = item.attempts + 1;
          if (attempts >= MAX_RETRY_ATTEMPTS) {
            // Mark as failed, don't retry
            await updateSyncQueueItem(item.id, {
              attempts,
              lastAttempt: new Date().toISOString(),
              error: errorMessage,
            });
          } else {
            await updateSyncQueueItem(item.id, {
              attempts,
              lastAttempt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    const { entityType, entityId, operation, payload } = item;

    switch (entityType) {
      case 'workOrder':
        await this.syncWorkOrder(entityId, operation, payload);
        break;
      case 'workOrderStep':
        await this.syncWorkOrderStep(entityId, operation, payload);
        break;
      case 'asset':
        await this.syncAsset(entityId, operation, payload);
        break;
      case 'inventoryItem':
        await this.syncInventoryItem(entityId, operation, payload);
        break;
      default:
        console.warn(`[Sync] Unknown entity type: ${entityType}`);
    }
  }

  private async syncWorkOrder(
    id: string,
    operation: SyncQueueItem['operation'],
    payload: unknown
  ): Promise<void> {
    switch (operation) {
      case 'create':
        await apiClient.post('/work-orders', payload);
        break;
      case 'update':
        await apiClient.patch(`/work-orders/${id}`, payload);
        break;
      case 'delete':
        await apiClient.delete(`/work-orders/${id}`);
        break;
    }

    // Mark local record as synced
    await db.workOrders.update(id, { _syncStatus: 'synced' });
  }

  private async syncWorkOrderStep(
    id: string,
    operation: SyncQueueItem['operation'],
    payload: unknown
  ): Promise<void> {
    const stepPayload = payload as { workOrderId?: string };
    const workOrderId = stepPayload.workOrderId;

    switch (operation) {
      case 'create':
        await apiClient.post(`/work-orders/${workOrderId}/steps`, payload);
        break;
      case 'update':
        await apiClient.patch(`/work-orders/${workOrderId}/steps/${id}`, payload);
        break;
      case 'delete':
        await apiClient.delete(`/work-orders/${workOrderId}/steps/${id}`);
        break;
    }

    await db.workOrderSteps.update(id, { _syncStatus: 'synced' });
  }

  private async syncAsset(
    id: string,
    operation: SyncQueueItem['operation'],
    payload: unknown
  ): Promise<void> {
    switch (operation) {
      case 'create':
        await apiClient.post('/assets', payload);
        break;
      case 'update':
        await apiClient.patch(`/assets/${id}`, payload);
        break;
      case 'delete':
        await apiClient.delete(`/assets/${id}`);
        break;
    }

    await db.assets.update(id, { _syncStatus: 'synced' });
  }

  private async syncInventoryItem(
    id: string,
    operation: SyncQueueItem['operation'],
    payload: unknown
  ): Promise<void> {
    switch (operation) {
      case 'create':
        await apiClient.post('/inventory', payload);
        break;
      case 'update':
        await apiClient.patch(`/inventory/${id}`, payload);
        break;
      case 'delete':
        await apiClient.delete(`/inventory/${id}`);
        break;
    }

    await db.inventoryItems.update(id, { _syncStatus: 'synced' });
  }

  private async pullChanges(): Promise<void> {
    // Pull work orders
    await this.pullWorkOrders();

    // Pull assets
    await this.pullAssets();

    // Pull locations (usually don't change often)
    await this.pullLocations();

    // Pull inventory items (for parts lookup offline)
    await this.pullInventory();
  }

  private async pullWorkOrders(): Promise<void> {
    const lastSync = await getLastSyncTime('workOrders');
    const params = lastSync ? `?since=${encodeURIComponent(lastSync)}` : '';

    try {
      const response = await apiClient.get<{ data: OfflineWorkOrder[]; serverTime: string }>(
        `/work-orders${params}`
      );

      // Upsert work orders to local DB
      await db.transaction('rw', db.workOrders, async () => {
        for (const wo of response.data) {
          const existing = await db.workOrders.get(wo.id);

          // Skip if local version is newer (pending sync)
          if (existing?._syncStatus === 'pending') {
            continue;
          }

          await db.workOrders.put({
            ...wo,
            _syncStatus: 'synced',
          });
        }
      });

      await updateLastSyncTime('workOrders', response.serverTime);
    } catch (error) {
      console.error('[Sync] Error pulling work orders:', error);
    }
  }

  private async pullAssets(): Promise<void> {
    const lastSync = await getLastSyncTime('assets');
    const params = lastSync ? `?since=${encodeURIComponent(lastSync)}` : '';

    try {
      const response = await apiClient.get<{ data: Array<Record<string, unknown>>; serverTime: string }>(
        `/assets${params}`
      );

      await db.transaction('rw', db.assets, async () => {
        for (const asset of response.data) {
          const existing = await db.assets.get(asset.id as string);

          if (existing?._syncStatus === 'pending') {
            continue;
          }

          await db.assets.put({
            ...(asset as unknown as { id: string; tenantId: string; assetNumber: string; name: string; status: 'operational' | 'needs_repair' | 'out_of_service' | 'retired'; createdAt: string; updatedAt: string }),
            _syncStatus: 'synced',
          });
        }
      });

      await updateLastSyncTime('assets', response.serverTime);
    } catch (error) {
      console.error('[Sync] Error pulling assets:', error);
    }
  }

  private async pullLocations(): Promise<void> {
    const lastSync = await getLastSyncTime('locations');
    const params = lastSync ? `?since=${encodeURIComponent(lastSync)}` : '';

    try {
      const response = await apiClient.get<{ data: Array<Record<string, unknown>>; serverTime: string }>(
        `/locations${params}`
      );

      await db.transaction('rw', db.locations, async () => {
        for (const location of response.data) {
          const existing = await db.locations.get(location.id as string);

          if (existing?._syncStatus === 'pending') {
            continue;
          }

          await db.locations.put({
            ...(location as unknown as { id: string; tenantId: string; name: string; level: number; isActive: boolean; createdAt: string; updatedAt: string }),
            _syncStatus: 'synced',
          });
        }
      });

      await updateLastSyncTime('locations', response.serverTime);
    } catch (error) {
      console.error('[Sync] Error pulling locations:', error);
    }
  }

  private async pullInventory(): Promise<void> {
    const lastSync = await getLastSyncTime('inventory');
    const params = lastSync ? `?since=${encodeURIComponent(lastSync)}` : '';

    try {
      const response = await apiClient.get<{ data: OfflineInventoryItem[]; serverTime: string }>(
        `/inventory${params}`
      );

      await db.transaction('rw', db.inventoryItems, async () => {
        for (const item of response.data) {
          const existing = await db.inventoryItems.get(item.id);

          // Skip if local version is newer (pending sync)
          if (existing?._syncStatus === 'pending') {
            continue;
          }

          await db.inventoryItems.put({
            ...item,
            _syncStatus: 'synced',
          });
        }
      });

      await updateLastSyncTime('inventory', response.serverTime);
    } catch (error) {
      console.error('[Sync] Error pulling inventory:', error);
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();

// Helper function to create offline work order
export async function createWorkOrderOffline(
  workOrder: Omit<OfflineWorkOrder, 'id' | 'createdAt' | 'updatedAt' | '_syncStatus'>
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newWorkOrder: OfflineWorkOrder = {
    ...workOrder,
    id,
    createdAt: now,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  };

  await db.workOrders.add(newWorkOrder);
  await addToSyncQueue('workOrder', id, 'create', newWorkOrder);

  return id;
}

// Helper function to update offline work order
export async function updateWorkOrderOffline(
  id: string,
  updates: Partial<Omit<OfflineWorkOrder, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString();

  await db.workOrders.update(id, {
    ...updates,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  });

  const workOrder = await db.workOrders.get(id);
  if (workOrder) {
    await addToSyncQueue('workOrder', id, 'update', {
      ...updates,
      version: workOrder.version,
    });
  }
}

// Helper function to get inventory item from offline cache
export async function getInventoryItemOffline(id: string): Promise<OfflineInventoryItem | undefined> {
  return db.inventoryItems.get(id);
}

// Helper function to get all inventory items from offline cache
export async function getAllInventoryOffline(): Promise<OfflineInventoryItem[]> {
  return db.inventoryItems.toArray();
}

// Helper function to search inventory items offline
export async function searchInventoryOffline(query: string): Promise<OfflineInventoryItem[]> {
  const lowerQuery = query.toLowerCase();
  return db.inventoryItems
    .filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.itemNumber.toLowerCase().includes(lowerQuery) ||
      (item.description?.toLowerCase().includes(lowerQuery) ?? false)
    )
    .toArray();
}

// Helper function to get inventory items by category offline
export async function getInventoryByCategoryOffline(category: string): Promise<OfflineInventoryItem[]> {
  return db.inventoryItems.where('category').equals(category).toArray();
}

// Helper function to get low stock items offline
export async function getLowStockItemsOffline(): Promise<OfflineInventoryItem[]> {
  return db.inventoryItems
    .filter(item => item.currentStock <= item.reorderPoint)
    .toArray();
}
