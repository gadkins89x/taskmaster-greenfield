import { useAuthStore } from '../stores/auth-store';
import {
  ClipboardList,
  Package,
  MapPin,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Open Work Orders', value: 12, icon: Clock, color: 'text-blue-500' },
    { label: 'In Progress', value: 5, icon: Wrench, color: 'text-orange-500' },
    { label: 'Completed Today', value: 8, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Critical', value: 2, icon: AlertCircle, color: 'text-red-500' },
  ];

  const quickActions = [
    { label: 'Work Orders', icon: ClipboardList, href: '/work-orders' },
    { label: 'Assets', icon: Wrench, href: '/assets' },
    { label: 'Inventory', icon: Package, href: '/inventory' },
    { label: 'Locations', icon: MapPin, href: '/locations' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your maintenance operations today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stat.value}</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="divide-y">
            {[
              { text: 'Work order WO-001 completed', time: '5 minutes ago', type: 'success' },
              { text: 'New work order WO-015 created', time: '1 hour ago', type: 'info' },
              { text: 'Asset A-003 requires maintenance', time: '2 hours ago', type: 'warning' },
              { text: 'Inventory item restocked', time: '3 hours ago', type: 'info' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-4">
                <div
                  className={`h-2 w-2 rounded-full ${
                    activity.type === 'success'
                      ? 'bg-green-500'
                      : activity.type === 'warning'
                      ? 'bg-orange-500'
                      : 'bg-blue-500'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.text}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
