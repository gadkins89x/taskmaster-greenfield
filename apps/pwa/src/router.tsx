import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
  useParams,
} from '@tanstack/react-router';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { WorkOrdersListPage, WorkOrderDetailPage, WorkOrderCreatePage } from './pages/work-orders';
import { InventoryListPage, InventoryDetailPage } from './pages/inventory';
import { AssetsListPage, AssetDetailPage } from './pages/assets';
import { SchedulingListPage, ScheduleDetailPage, ScheduleCreatePage } from './pages/scheduling';
import { SettingsPage } from './pages/settings';
import { ConflictsPage } from './pages/sync';
import { AppLayout } from './components/layout/app-layout';
import { useAuthStore } from './stores/auth-store';

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Login route (public)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
});

// Protected layout route
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
});

// Dashboard route
const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: DashboardPage,
});

// Work Orders routes
const workOrdersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/work-orders',
  component: WorkOrdersListPage,
});

const workOrderNewRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/work-orders/new',
  component: WorkOrderCreatePage,
});

function WorkOrderDetailWrapper() {
  const { workOrderId } = useParams({ strict: false });
  return <WorkOrderDetailPage workOrderId={workOrderId as string} />;
}

const workOrderDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/work-orders/$workOrderId',
  component: WorkOrderDetailWrapper,
});

// Inventory routes
const inventoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/inventory',
  component: InventoryListPage,
});

function InventoryDetailWrapper() {
  const { itemId } = useParams({ strict: false });
  return <InventoryDetailPage itemId={itemId as string} />;
}

const inventoryDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/inventory/$itemId',
  component: InventoryDetailWrapper,
});

// Assets routes
const assetsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/assets',
  component: AssetsListPage,
});

function AssetDetailWrapper() {
  const { assetId } = useParams({ strict: false });
  return <AssetDetailPage assetId={assetId as string} />;
}

const assetDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/assets/$assetId',
  component: AssetDetailWrapper,
});

// Scheduling routes
const schedulingRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/scheduling',
  component: SchedulingListPage,
});

const schedulingNewRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/scheduling/new',
  component: ScheduleCreatePage,
});

function ScheduleDetailWrapper() {
  const { scheduleId } = useParams({ strict: false });
  return <ScheduleDetailPage scheduleId={scheduleId as string} />;
}

const schedulingDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/scheduling/$scheduleId',
  component: ScheduleDetailWrapper,
});

// Settings route
const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/settings',
  component: SettingsPage,
});

// Sync conflicts route
const conflictsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/sync/conflicts',
  component: ConflictsPage,
});

// Route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    workOrdersRoute,
    workOrderNewRoute,
    workOrderDetailRoute,
    inventoryRoute,
    inventoryDetailRoute,
    assetsRoute,
    assetDetailRoute,
    schedulingRoute,
    schedulingNewRoute,
    schedulingDetailRoute,
    settingsRoute,
    conflictsRoute,
  ]),
]);

// Create router
export const router = createRouter({ routeTree });

// Type declaration for router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
