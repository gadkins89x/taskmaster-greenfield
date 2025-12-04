import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '../stores/auth-store';
import {
  useDashboardStats,
  useWorkOrderTrends,
  useWorkOrdersByPriority,
  useWorkOrdersByStatus,
  useTechnicianPerformance,
  useRecentActivity,
  useAssetHealth,
} from '../hooks/use-dashboard';
import {
  ClipboardList,
  Package,
  Calendar,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Users,
  BarChart3,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Period = 'week' | 'month' | 'quarter' | 'year';

export function DashboardPage() {
  const { user } = useAuthStore();
  const [trendPeriod, setTrendPeriod] = useState<Period>('month');

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: trends } = useWorkOrderTrends(trendPeriod);
  const { data: byPriority } = useWorkOrdersByPriority();
  const { data: byStatus } = useWorkOrdersByStatus();
  const { data: techPerformance } = useTechnicianPerformance(trendPeriod, 5);
  const { data: recentActivity } = useRecentActivity(8);
  const { data: assetHealth } = useAssetHealth(5);

  const quickActions = [
    { label: 'Work Orders', icon: ClipboardList, href: '/work-orders', color: 'bg-blue-500' },
    { label: 'Assets', icon: Wrench, href: '/assets', color: 'bg-purple-500' },
    { label: 'Inventory', icon: Package, href: '/inventory', color: 'bg-green-500' },
    { label: 'Scheduling', icon: Calendar, href: '/scheduling', color: 'bg-orange-500' },
  ];

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-400',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-gray-400',
    in_progress: 'bg-blue-500',
    on_hold: 'bg-yellow-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-300',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your maintenance operations today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={trendPeriod}
            onChange={(e) => setTrendPeriod(e.target.value as Period)}
            className="px-3 py-1.5 border rounded-md text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Open Work Orders"
          value={stats?.workOrders.open ?? 0}
          subValue={`${stats?.workOrders.overdue ?? 0} overdue`}
          color="text-blue-500"
          loading={statsLoading}
          trend={stats?.workOrders.overdue ? 'down' : 'up'}
        />
        <StatCard
          icon={Wrench}
          label="In Progress"
          value={stats?.workOrders.inProgress ?? 0}
          subValue={`Avg ${stats?.workOrders.avgCompletionTime ? Number(stats.workOrders.avgCompletionTime).toFixed(1) : '0'} hrs`}
          color="text-orange-500"
          loading={statsLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed This Week"
          value={stats?.workOrders.completedThisWeek ?? 0}
          subValue={`${stats?.workOrders.completedThisMonth ?? 0} this month`}
          color="text-green-500"
          loading={statsLoading}
          trend="up"
        />
        <StatCard
          icon={AlertCircle}
          label="Low Stock Items"
          value={stats?.inventory.lowStockItems ?? 0}
          subValue={`${stats?.inventory.outOfStockItems ?? 0} out of stock`}
          color="text-red-500"
          loading={statsLoading}
          trend={stats?.inventory.lowStockItems ? 'down' : undefined}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Work Orders by Priority */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Work Orders by Priority</h3>
          </div>
          {byPriority && byPriority.length > 0 ? (
            <div className="space-y-3">
              {byPriority.map((item) => {
                const total = byPriority.reduce((sum, p) => sum + p.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.priority}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize">{item.priority}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${priorityColors[item.priority] || 'bg-gray-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Work Orders by Status */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Work Orders by Status</h3>
          </div>
          {byStatus && byStatus.length > 0 ? (
            <div className="space-y-3">
              {byStatus.map((item) => {
                const total = byStatus.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize">{item.status.replace('_', ' ')}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColors[item.status] || 'bg-gray-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Trends and Performance Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Work Order Trends */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Work Order Trends</h3>
          </div>
          {trends && trends.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-500"></span> Created
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span> Completed
                </span>
              </div>
              <div className="flex items-end justify-between h-32 gap-1">
                {trends.slice(-10).map((trend, index) => {
                  const maxVal = Math.max(...trends.map((t) => Math.max(t.created, t.completed)));
                  const createdHeight = maxVal > 0 ? (trend.created / maxVal) * 100 : 0;
                  const completedHeight = maxVal > 0 ? (trend.completed / maxVal) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex gap-0.5 items-end">
                      <div
                        className="flex-1 bg-blue-500 rounded-t"
                        style={{ height: `${createdHeight}%`, minHeight: trend.created ? '4px' : '0' }}
                        title={`Created: ${trend.created}`}
                      />
                      <div
                        className="flex-1 bg-green-500 rounded-t"
                        style={{ height: `${completedHeight}%`, minHeight: trend.completed ? '4px' : '0' }}
                        title={`Completed: ${trend.completed}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No trend data available
            </div>
          )}
        </div>

        {/* Top Technicians */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Top Performers</h3>
          </div>
          {techPerformance && techPerformance.length > 0 ? (
            <div className="space-y-3">
              {techPerformance.map((tech, index) => (
                <div key={tech.userId} className="flex items-center gap-3">
                  <div className="w-6 text-center font-medium text-muted-foreground">
                    #{index + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {tech.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tech.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tech.workOrdersCompleted} completed • {Number(tech.hoursLogged).toFixed(1)}h logged
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No performance data available
            </div>
          )}
        </div>
      </div>

      {/* Asset Health and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset Health */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Asset Health</h3>
            </div>
            <Link to="/assets" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {assetHealth && assetHealth.length > 0 ? (
            <div className="space-y-3">
              {assetHealth.map((asset) => (
                <div key={asset.assetId} className="flex items-center gap-3">
                  <HealthScore score={asset.healthScore} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.assetTag} • {asset.workOrdersThisMonth} WOs this month
                    </p>
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded text-xs ${
                      asset.status === 'operational'
                        ? 'bg-green-100 text-green-800'
                        : asset.status === 'maintenance'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {asset.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No asset data available
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Recent Activity</h3>
            </div>
          </div>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <ActivityIcon type={activity.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Wrench}
          label="Total Assets"
          value={stats?.assets.total ?? 0}
          subItems={[
            { label: 'Operational', value: stats?.assets.operational ?? 0 },
            { label: 'Under Maintenance', value: stats?.assets.underMaintenance ?? 0 },
          ]}
        />
        <SummaryCard
          icon={Package}
          label="Inventory Items"
          value={stats?.inventory.totalItems ?? 0}
          subItems={[
            { label: 'Total Value', value: `$${(stats?.inventory.totalValue ?? 0).toLocaleString()}` },
          ]}
        />
        <SummaryCard
          icon={Calendar}
          label="Active Schedules"
          value={stats?.scheduling.activeSchedules ?? 0}
          subItems={[
            { label: 'Upcoming', value: stats?.scheduling.upcomingMaintenance ?? 0 },
            { label: 'Overdue', value: stats?.scheduling.overdueSchedules ?? 0 },
          ]}
        />
        <SummaryCard
          icon={ClipboardList}
          label="Total Work Orders"
          value={stats?.workOrders.total ?? 0}
          subItems={[
            { label: 'Completed', value: stats?.workOrders.completed ?? 0 },
          ]}
        />
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  loading,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  subValue?: string;
  color: string;
  loading?: boolean;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        {loading ? (
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <span className="text-3xl font-bold">{value}</span>
            {trend && (
              trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )
            )}
          </>
        )}
      </div>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subItems,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  subItems: { label: string; value: number | string }[];
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-2 space-y-1">
        {subItems.map((item, index) => (
          <div key={index} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthScore({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-green-500 bg-green-100'
      : score >= 60
      ? 'text-yellow-600 bg-yellow-100'
      : 'text-red-500 bg-red-100';

  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${color}`}>
      {score}
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'work_order_completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />;
    case 'work_order_created':
      return <ClipboardList className="h-4 w-4 text-blue-500 mt-0.5" />;
    case 'schedule_generated':
      return <Calendar className="h-4 w-4 text-purple-500 mt-0.5" />;
    case 'low_inventory':
      return <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />;
    case 'asset_offline':
      return <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500 mt-0.5" />;
  }
}
