import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
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

// Work Orders route (placeholder)
const workOrdersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/work-orders',
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Work Orders</h1>
      <p className="text-muted-foreground">Work orders list will be implemented in Phase 2.</p>
    </div>
  ),
});

// Inventory route (placeholder)
const inventoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/inventory',
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Inventory</h1>
      <p className="text-muted-foreground">Inventory management will be implemented in Phase 2.</p>
    </div>
  ),
});

// Settings route (placeholder)
const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/settings',
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground">Settings will be implemented in Phase 2.</p>
    </div>
  ),
});

// Route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    workOrdersRoute,
    inventoryRoute,
    settingsRoute,
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
