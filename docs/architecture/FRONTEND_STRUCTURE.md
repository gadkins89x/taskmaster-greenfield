# TaskMaster CMMS - Frontend Project Structure

## Overview

The frontend is a **mobile-first Progressive Web App (PWA)** built with React 19, designed for technicians in the field with ~40% offline usage. The architecture prioritizes offline resilience, responsive design, and intuitive touch interactions.

---

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | React 19 | UI library with Actions API, useOptimistic |
| **Language** | TypeScript 5.6+ | Type safety |
| **Build** | Vite 7 | Fast builds, Rolldown bundler |
| **Routing** | TanStack Router | Type-safe routing |
| **Server State** | TanStack Query v5 | Data fetching, caching, offline sync |
| **Client State** | Zustand | Lightweight global state |
| **Offline Storage** | Dexie.js | IndexedDB wrapper |
| **Service Worker** | Workbox 7 | PWA caching strategies |
| **UI Components** | shadcn/ui + Radix | Accessible, customizable |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Animations** | Framer Motion | Gesture-based animations |
| **Forms** | React Hook Form + Zod | Performant validation |
| **Icons** | Lucide React | Consistent icon set |
| **Date Handling** | date-fns | Lightweight date utilities |
| **Barcode/QR** | html5-qrcode | Camera-based scanning |

---

## Directory Structure

```
apps/pwa/
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker (generated)
│   ├── icons/                  # App icons (various sizes)
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── maskable-icon.png
│   └── robots.txt
│
├── src/
│   ├── main.tsx                # App entry point
│   ├── App.tsx                 # Root component with providers
│   ├── vite-env.d.ts           # Vite type definitions
│   │
│   ├── app/                    # Application shell
│   │   ├── routes.tsx          # Route definitions (TanStack Router)
│   │   ├── router.tsx          # Router configuration
│   │   ├── providers.tsx       # Global providers wrapper
│   │   └── layouts/
│   │       ├── RootLayout.tsx          # Top-level layout
│   │       ├── AuthenticatedLayout.tsx # Logged-in shell
│   │       ├── PublicLayout.tsx        # Login/public pages
│   │       └── DashboardLayout.tsx     # Dashboard with large display mode
│   │
│   ├── features/               # Feature modules (domain-driven)
│   │   │
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── LogoutButton.tsx
│   │   │   │   └── SessionExpiredDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useLogin.ts
│   │   │   │   └── useLogout.ts
│   │   │   ├── api/
│   │   │   │   └── auth.api.ts
│   │   │   ├── stores/
│   │   │   │   └── auth.store.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── work-orders/
│   │   │   ├── components/
│   │   │   │   ├── WorkOrderList.tsx
│   │   │   │   ├── WorkOrderCard.tsx
│   │   │   │   ├── WorkOrderDetail.tsx
│   │   │   │   ├── WorkOrderForm.tsx
│   │   │   │   ├── WorkOrderFilters.tsx
│   │   │   │   ├── WorkOrderStatusBadge.tsx
│   │   │   │   ├── WorkOrderPriorityBadge.tsx
│   │   │   │   ├── WorkOrderSteps.tsx
│   │   │   │   ├── WorkOrderComments.tsx
│   │   │   │   ├── WorkOrderSignature.tsx
│   │   │   │   └── WorkOrderActions.tsx
│   │   │   ├── pages/
│   │   │   │   ├── WorkOrdersPage.tsx
│   │   │   │   ├── WorkOrderDetailPage.tsx
│   │   │   │   └── CreateWorkOrderPage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWorkOrders.ts
│   │   │   │   ├── useWorkOrder.ts
│   │   │   │   ├── useCreateWorkOrder.ts
│   │   │   │   ├── useUpdateWorkOrder.ts
│   │   │   │   └── useCompleteWorkOrder.ts
│   │   │   ├── api/
│   │   │   │   └── work-orders.api.ts
│   │   │   └── types/
│   │   │       └── work-order.types.ts
│   │   │
│   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── AssetList.tsx
│   │   │   │   ├── AssetCard.tsx
│   │   │   │   ├── AssetDetail.tsx
│   │   │   │   ├── AssetForm.tsx
│   │   │   │   ├── AssetQRScanner.tsx
│   │   │   │   └── AssetWorkOrderHistory.tsx
│   │   │   ├── pages/
│   │   │   │   ├── AssetsPage.tsx
│   │   │   │   └── AssetDetailPage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAssets.ts
│   │   │   │   ├── useAsset.ts
│   │   │   │   └── useAssetScanner.ts
│   │   │   ├── api/
│   │   │   │   └── assets.api.ts
│   │   │   └── types/
│   │   │       └── asset.types.ts
│   │   │
│   │   ├── inventory/
│   │   │   ├── components/
│   │   │   │   ├── InventoryList.tsx
│   │   │   │   ├── InventoryItemCard.tsx
│   │   │   │   ├── StockLevelBadge.tsx
│   │   │   │   ├── AdjustStockDialog.tsx
│   │   │   │   ├── TransferStockDialog.tsx
│   │   │   │   └── InventoryTransactionHistory.tsx
│   │   │   ├── pages/
│   │   │   │   ├── InventoryPage.tsx
│   │   │   │   └── InventoryItemPage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useInventory.ts
│   │   │   │   ├── useAdjustStock.ts
│   │   │   │   └── useTransferStock.ts
│   │   │   ├── api/
│   │   │   │   └── inventory.api.ts
│   │   │   └── types/
│   │   │       └── inventory.types.ts
│   │   │
│   │   ├── locations/
│   │   │   ├── components/
│   │   │   │   ├── LocationTree.tsx
│   │   │   │   ├── LocationBreadcrumb.tsx
│   │   │   │   ├── LocationPicker.tsx
│   │   │   │   └── LocationForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLocations.ts
│   │   │   │   └── useLocationTree.ts
│   │   │   ├── api/
│   │   │   │   └── locations.api.ts
│   │   │   └── types/
│   │   │       └── location.types.ts
│   │   │
│   │   ├── scheduling/
│   │   │   ├── components/
│   │   │   │   ├── ScheduleList.tsx
│   │   │   │   ├── ScheduleCard.tsx
│   │   │   │   ├── ScheduleForm.tsx
│   │   │   │   ├── RecurrenceRuleBuilder.tsx
│   │   │   │   └── ScheduleCalendarView.tsx
│   │   │   ├── pages/
│   │   │   │   ├── SchedulesPage.tsx
│   │   │   │   └── ScheduleDetailPage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSchedules.ts
│   │   │   │   └── useSchedule.ts
│   │   │   ├── api/
│   │   │   │   └── schedules.api.ts
│   │   │   └── types/
│   │   │       └── schedule.types.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   │   ├── NotificationList.tsx
│   │   │   │   ├── NotificationItem.tsx
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   └── NotificationPreferences.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useNotifications.ts
│   │   │   │   ├── usePushNotifications.ts
│   │   │   │   └── useNotificationPreferences.ts
│   │   │   ├── api/
│   │   │   │   └── notifications.api.ts
│   │   │   └── types/
│   │   │       └── notification.types.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── DashboardGrid.tsx
│   │   │   │   ├── WorkOrderMetricsCard.tsx
│   │   │   │   ├── CompletionRateChart.tsx
│   │   │   │   ├── OverdueWorkOrdersWidget.tsx
│   │   │   │   ├── RecentActivityFeed.tsx
│   │   │   │   └── TVDashboardMode.tsx
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useDashboardMetrics.ts
│   │   │   └── api/
│   │   │       └── analytics.api.ts
│   │   │
│   │   ├── users/
│   │   │   ├── components/
│   │   │   │   ├── UserList.tsx
│   │   │   │   ├── UserForm.tsx
│   │   │   │   ├── UserAvatar.tsx
│   │   │   │   ├── UserPicker.tsx
│   │   │   │   └── ProfileSettings.tsx
│   │   │   ├── pages/
│   │   │   │   ├── UsersPage.tsx
│   │   │   │   └── ProfilePage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useUsers.ts
│   │   │   │   └── useProfile.ts
│   │   │   └── api/
│   │   │       └── users.api.ts
│   │   │
│   │   └── settings/
│   │       ├── components/
│   │       │   ├── RolesList.tsx
│   │       │   ├── RoleForm.tsx
│   │       │   ├── PermissionMatrix.tsx
│   │       │   └── TenantSettings.tsx
│   │       ├── pages/
│   │       │   └── SettingsPage.tsx
│   │       └── hooks/
│   │           ├── useRoles.ts
│   │           └── useTenantSettings.ts
│   │
│   ├── components/             # Shared UI components
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── sheet.tsx       # Slide-out drawer
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── BottomNavigation.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── DrawerMenu.tsx
│   │   │   ├── FloatingActionButton.tsx
│   │   │   └── PageContainer.tsx
│   │   │
│   │   ├── feedback/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ErrorFallback.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   │
│   │   ├── data-display/
│   │   │   ├── DataTable.tsx
│   │   │   ├── VirtualizedList.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── Timestamp.tsx
│   │   │
│   │   ├── forms/
│   │   │   ├── FormField.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── TimePicker.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── SignaturePad.tsx
│   │   │   └── QRScanner.tsx
│   │   │
│   │   └── offline/
│   │       ├── OfflineIndicator.tsx
│   │       ├── SyncStatusBadge.tsx
│   │       ├── PendingSyncBanner.tsx
│   │       └── ConflictResolutionDialog.tsx
│   │
│   ├── hooks/                  # Shared hooks
│   │   ├── useOnlineStatus.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useIntersectionObserver.ts
│   │   ├── usePullToRefresh.ts
│   │   └── useSwipeGesture.ts
│   │
│   ├── lib/                    # Core utilities
│   │   ├── api/
│   │   │   ├── client.ts           # Fetch wrapper with auth
│   │   │   ├── interceptors.ts     # Request/response interceptors
│   │   │   └── types.ts            # API response types
│   │   │
│   │   ├── offline/
│   │   │   ├── db.ts               # Dexie database schema
│   │   │   ├── sync-engine.ts      # Offline sync orchestration
│   │   │   ├── mutation-queue.ts   # Queued mutations for offline
│   │   │   ├── conflict-resolver.ts
│   │   │   └── cache-manager.ts    # Query cache persistence
│   │   │
│   │   ├── query/
│   │   │   ├── query-client.ts     # TanStack Query configuration
│   │   │   ├── persister.ts        # Offline query persistence
│   │   │   └── query-keys.ts       # Centralized query key factory
│   │   │
│   │   ├── auth/
│   │   │   ├── token-manager.ts    # JWT storage and refresh
│   │   │   ├── auth-context.tsx    # Auth React context
│   │   │   └── protected-route.tsx
│   │   │
│   │   └── utils/
│   │       ├── cn.ts               # className utility (clsx + twMerge)
│   │       ├── format.ts           # Date, number, currency formatters
│   │       ├── validation.ts       # Zod schemas
│   │       └── constants.ts
│   │
│   ├── stores/                 # Zustand global stores
│   │   ├── ui.store.ts             # UI state (sidebar, modals)
│   │   ├── sync.store.ts           # Sync status state
│   │   └── preferences.store.ts    # User preferences
│   │
│   ├── styles/
│   │   ├── globals.css             # Tailwind base + custom CSS
│   │   └── themes/
│   │       ├── light.css
│   │       └── dark.css
│   │
│   └── types/                  # Global type definitions
│       ├── api.types.ts
│       ├── env.d.ts
│       └── global.d.ts
│
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── nginx.conf
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── Dockerfile
```

---

## Offline-First Architecture

### IndexedDB Schema (Dexie.js)

```typescript
// lib/offline/db.ts
import Dexie, { type Table } from 'dexie';

export interface CachedWorkOrder {
  id: string;
  tenantId: string;
  data: WorkOrder;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localVersion: number;
  serverVersion: number;
  updatedAt: number;
}

export interface QueuedMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'workOrder' | 'comment' | 'step' | 'inventoryTransaction';
  entityId: string;
  payload: unknown;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface CachedUser {
  id: string;
  data: User;
  updatedAt: number;
}

export class TaskMasterDB extends Dexie {
  workOrders!: Table<CachedWorkOrder>;
  mutations!: Table<QueuedMutation>;
  users!: Table<CachedUser>;
  assets!: Table<CachedAsset>;
  inventoryItems!: Table<CachedInventoryItem>;
  locations!: Table<CachedLocation>;

  constructor() {
    super('taskmaster');

    this.version(1).stores({
      workOrders: 'id, tenantId, syncStatus, updatedAt',
      mutations: 'id, type, entity, createdAt',
      users: 'id, updatedAt',
      assets: 'id, tenantId, locationId',
      inventoryItems: 'id, tenantId, sku',
      locations: 'id, tenantId, parentId',
    });
  }
}

export const db = new TaskMasterDB();
```

### Sync Engine

```typescript
// lib/offline/sync-engine.ts
import { db, QueuedMutation } from './db';
import { apiClient } from '../api/client';

export class SyncEngine {
  private isSyncing = false;
  private syncInterval: number | null = null;

  async start() {
    // Process queue when coming online
    window.addEventListener('online', () => this.processQueue());

    // Periodic sync attempt
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.processQueue();
      }
    }, 30000); // Every 30 seconds

    // Initial sync if online
    if (navigator.onLine) {
      await this.processQueue();
    }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  async queueMutation(mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'retryCount'>) {
    const id = crypto.randomUUID();
    await db.mutations.add({
      ...mutation,
      id,
      createdAt: Date.now(),
      retryCount: 0,
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return id;
  }

  async processQueue() {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;

    try {
      const mutations = await db.mutations
        .orderBy('createdAt')
        .toArray();

      for (const mutation of mutations) {
        try {
          await this.processMutation(mutation);
          await db.mutations.delete(mutation.id);
        } catch (error) {
          if (this.isConflict(error)) {
            await this.handleConflict(mutation, error);
          } else if (mutation.retryCount < 3) {
            await db.mutations.update(mutation.id, {
              retryCount: mutation.retryCount + 1,
              lastError: error.message,
            });
          } else {
            // Move to dead letter queue or notify user
            await this.handleFailedMutation(mutation, error);
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async processMutation(mutation: QueuedMutation) {
    switch (mutation.entity) {
      case 'workOrder':
        return this.syncWorkOrder(mutation);
      case 'comment':
        return this.syncComment(mutation);
      case 'step':
        return this.syncStep(mutation);
      default:
        throw new Error(`Unknown entity: ${mutation.entity}`);
    }
  }

  private async syncWorkOrder(mutation: QueuedMutation) {
    const { type, entityId, payload } = mutation;

    switch (type) {
      case 'create':
        const created = await apiClient.post('/work-orders', payload);
        // Update local cache with server-assigned ID and data
        await db.workOrders.put({
          id: created.id,
          tenantId: created.tenantId,
          data: created,
          syncStatus: 'synced',
          localVersion: created.version,
          serverVersion: created.version,
          updatedAt: Date.now(),
        });
        break;

      case 'update':
        const updated = await apiClient.patch(`/work-orders/${entityId}`, payload);
        await db.workOrders.update(entityId, {
          data: updated,
          syncStatus: 'synced',
          localVersion: updated.version,
          serverVersion: updated.version,
          updatedAt: Date.now(),
        });
        break;

      case 'delete':
        await apiClient.delete(`/work-orders/${entityId}`);
        await db.workOrders.delete(entityId);
        break;
    }
  }

  private isConflict(error: any): boolean {
    return error.status === 409;
  }

  private async handleConflict(mutation: QueuedMutation, error: any) {
    const serverData = error.data?.current;
    const cached = await db.workOrders.get(mutation.entityId);

    if (!cached || !serverData) {
      // Can't resolve, mark as conflict
      await db.workOrders.update(mutation.entityId, {
        syncStatus: 'conflict',
      });
      return;
    }

    // Store conflict for user resolution
    await db.workOrders.update(mutation.entityId, {
      syncStatus: 'conflict',
      serverVersion: serverData.version,
      data: {
        ...cached.data,
        _conflict: {
          local: cached.data,
          server: serverData,
        },
      },
    });
  }
}

export const syncEngine = new SyncEngine();
```

### Offline-Aware Query Hooks

```typescript
// features/work-orders/hooks/useWorkOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { workOrdersApi } from '../api/work-orders.api';
import { queryKeys } from '@/lib/query/query-keys';

export function useWorkOrders(filters: WorkOrderFilters) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.workOrders.list(filters),
    queryFn: async () => {
      if (!navigator.onLine) {
        // Serve from IndexedDB when offline
        const cached = await db.workOrders
          .where('tenantId')
          .equals(getCurrentTenantId())
          .toArray();

        return {
          data: cached.map(c => c.data),
          meta: { page: 1, limit: 100, total: cached.length, totalPages: 1 },
        };
      }

      // Fetch from API and update cache
      const response = await workOrdersApi.list(filters);

      // Update IndexedDB cache
      await Promise.all(
        response.data.map(wo =>
          db.workOrders.put({
            id: wo.id,
            tenantId: wo.tenantId,
            data: wo,
            syncStatus: 'synced',
            localVersion: wo.version,
            serverVersion: wo.version,
            updatedAt: Date.now(),
          })
        )
      );

      return response;
    },
    staleTime: 30000, // 30 seconds
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorkOrderInput) => {
      const tempId = `temp-${crypto.randomUUID()}`;

      // Optimistic local insert
      const tempWorkOrder: WorkOrder = {
        id: tempId,
        workOrderNumber: 'PENDING',
        ...data,
        status: 'open',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.workOrders.put({
        id: tempId,
        tenantId: getCurrentTenantId(),
        data: tempWorkOrder,
        syncStatus: 'pending',
        localVersion: 1,
        serverVersion: 0,
        updatedAt: Date.now(),
      });

      // Queue for sync
      await syncEngine.queueMutation({
        type: 'create',
        entity: 'workOrder',
        entityId: tempId,
        payload: data,
      });

      return tempWorkOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, expectedVersion }: UpdateWorkOrderInput) => {
      // Optimistic update
      const cached = await db.workOrders.get(id);
      if (cached) {
        await db.workOrders.update(id, {
          data: { ...cached.data, ...data },
          syncStatus: 'pending',
          localVersion: cached.localVersion + 1,
          updatedAt: Date.now(),
        });
      }

      // Queue for sync
      await syncEngine.queueMutation({
        type: 'update',
        entity: 'workOrder',
        entityId: id,
        payload: { ...data, expectedVersion },
      });

      return { id, ...data };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workOrders.detail(variables.id),
      });
    },
  });
}
```

### Query Client Configuration

```typescript
// lib/query/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Persist query cache to localStorage for fast startup
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'taskmaster-query-cache',
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  buster: import.meta.env.VITE_APP_VERSION,
});
```

---

## Mobile-First UI Patterns

### Bottom Navigation

```typescript
// components/layout/BottomNavigation.tsx
import { Link, useRouterState } from '@tanstack/react-router';
import { Home, ClipboardList, Package, Wrench, Menu } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SyncStatusBadge } from '@/components/offline/SyncStatusBadge';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/work-orders', icon: ClipboardList, label: 'Work Orders' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/assets', icon: Wrench, label: 'Assets' },
  { to: '/more', icon: Menu, label: 'More' },
];

export function BottomNavigation() {
  const { location } = useRouterState();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full',
                'text-muted-foreground transition-colors',
                isActive && 'text-primary'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Sync status indicator */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <SyncStatusBadge />
      </div>
    </nav>
  );
}
```

### Floating Action Button

```typescript
// components/layout/FloatingActionButton.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ClipboardPlus, PackagePlus, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { to: '/work-orders/new', icon: ClipboardPlus, label: 'New Work Order' },
    { to: '/inventory/adjust', icon: PackagePlus, label: 'Adjust Stock' },
    { to: '/scan', icon: ScanLine, label: 'Scan Asset' },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-3 mb-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.to}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={action.to}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 bg-secondary text-secondary-foreground rounded-full pl-4 pr-3 py-2 shadow-lg"
                >
                  <span className="text-sm font-medium">{action.label}</span>
                  <action.icon className="h-5 w-5" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg"
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
```

### Pull to Refresh

```typescript
// hooks/usePullToRefresh.ts
import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UsePullToRefreshOptions {
  queryKeys: unknown[][];
  threshold?: number;
  onRefresh?: () => Promise<void>;
}

export function usePullToRefresh({
  queryKeys,
  threshold = 80,
  onRefresh,
}: UsePullToRefreshOptions) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold) {
      setIsRefreshing(true);

      try {
        if (onRefresh) {
          await onRefresh();
        }

        await Promise.all(
          queryKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          )
        );
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, queryKeys, queryClient, onRefresh]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
```

### Responsive Layout Breakpoints

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'xs': '375px',   // Small phones
      'sm': '640px',   // Large phones / small tablets
      'md': '768px',   // Tablets
      'lg': '1024px',  // Laptops
      'xl': '1280px',  // Desktops
      '2xl': '1536px', // Large desktops
      'tv': '1920px',  // TV/Dashboard displays
    },
  },
};

// Usage in components
<div className="
  grid
  grid-cols-1          // Mobile: single column
  sm:grid-cols-2       // Tablet: 2 columns
  lg:grid-cols-3       // Desktop: 3 columns
  tv:grid-cols-4       // TV: 4 columns
  gap-4
">
```

---

## PWA Configuration

### Manifest

```json
// public/manifest.json
{
  "name": "TaskMaster CMMS",
  "short_name": "TaskMaster",
  "description": "Maintenance Management System",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/maskable-icon.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["business", "productivity"],
  "shortcuts": [
    {
      "name": "New Work Order",
      "short_name": "New WO",
      "url": "/work-orders/new",
      "icons": [{ "src": "/icons/shortcut-new-wo.png", "sizes": "96x96" }]
    },
    {
      "name": "Scan Asset",
      "short_name": "Scan",
      "url": "/scan",
      "icons": [{ "src": "/icons/shortcut-scan.png", "sizes": "96x96" }]
    }
  ]
}
```

### Service Worker (Workbox)

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt', // User chooses when to update
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: false, // Use public/manifest.json

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        runtimeCaching: [
          // API calls - Network first, fallback to cache
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
            },
          },
          // Static assets - Cache first
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Fonts - Cache first
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
});
```

---

## Version Checking & Updates

```typescript
// hooks/useAppVersion.ts
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useAppVersion() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Check for updates every 10 minutes
      setInterval(() => {
        registration?.update();
      }, 10 * 60 * 1000);
    },
    onNeedRefresh() {
      setShowUpdatePrompt(true);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  };

  return {
    showUpdatePrompt,
    handleUpdate,
    handleDismiss,
    currentVersion: import.meta.env.VITE_APP_VERSION,
  };
}

// components/UpdatePrompt.tsx
export function UpdatePrompt() {
  const { showUpdatePrompt, handleUpdate, handleDismiss } = useAppVersion();

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg">
      <p className="font-medium">A new version is available</p>
      <p className="text-sm opacity-90 mt-1">
        Update now to get the latest features and bug fixes.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleUpdate}
          className="px-4 py-2 bg-white text-primary rounded-md font-medium"
        >
          Update Now
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-white/80 hover:text-white"
        >
          Later
        </button>
      </div>
    </div>
  );
}
```
