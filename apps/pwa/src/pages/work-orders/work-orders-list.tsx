import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  XCircle,
  ChevronRight,
  User,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { useWorkOrders } from '../../hooks/use-work-orders';
import { cn } from '../../lib/utils';

const statusConfig = {
  open: { label: 'Open', icon: Clock, variant: 'info' as const, color: 'text-blue-500' },
  in_progress: { label: 'In Progress', icon: AlertTriangle, variant: 'warning' as const, color: 'text-orange-500' },
  on_hold: { label: 'On Hold', icon: Pause, variant: 'secondary' as const, color: 'text-gray-500' },
  completed: { label: 'Completed', icon: CheckCircle2, variant: 'success' as const, color: 'text-green-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, variant: 'secondary' as const, color: 'text-gray-500' },
};

const priorityConfig = {
  low: { label: 'Low', variant: 'secondary' as const },
  medium: { label: 'Medium', variant: 'info' as const },
  high: { label: 'High', variant: 'warning' as const },
  critical: { label: 'Critical', variant: 'destructive' as const },
};

export function WorkOrdersListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useWorkOrders({
    search: search || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  if (isLoading) {
    return <LoadingScreen message="Loading work orders..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error loading work orders"
        description="Please try again later"
        action={
          <Button onClick={() => window.location.reload()}>Retry</Button>
        }
      />
    );
  }

  const workOrders = data?.data ?? [];
  const hasFilters = statusFilter || priorityFilter || search;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta.total ?? 0} total work orders
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/work-orders/new' })}>
          <Plus className="mr-2 h-4 w-4" />
          New Work Order
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search work orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {[statusFilter, priorityFilter].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All Statuses</option>
              {Object.entries(statusConfig).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All Priorities</option>
              {Object.entries(priorityConfig).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Work Orders List */}
      {workOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={hasFilters ? 'No matching work orders' : 'No work orders yet'}
          description={
            hasFilters
              ? 'Try adjusting your filters'
              : 'Create your first work order to get started'
          }
          action={
            !hasFilters && (
              <Button onClick={() => navigate({ to: '/work-orders/new' })}>
                <Plus className="mr-2 h-4 w-4" />
                Create Work Order
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {workOrders.map((wo) => {
            const status = statusConfig[wo.status];
            const priority = priorityConfig[wo.priority];
            const StatusIcon = status.icon;

            return (
              <Link key={wo.id} to={`/work-orders/${wo.id}`}>
                <Card className="p-4 transition-colors hover:bg-accent/50">
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className={cn('mt-0.5', status.color)}>
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {wo.workOrderNumber}
                        </span>
                        <Badge variant={priority.variant}>{priority.label}</Badge>
                        {wo.isOverdue && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </div>
                      <h3 className="mt-1 font-medium leading-tight">{wo.title}</h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {wo.assignedTo && (
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span>
                              {wo.assignedTo.firstName} {wo.assignedTo.lastName}
                            </span>
                          </div>
                        )}
                        {wo.asset && (
                          <span>{wo.asset.name}</span>
                        )}
                        {wo.location && (
                          <span>{wo.location.name}</span>
                        )}
                      </div>

                      {/* Progress */}
                      {wo.stepsCount > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{
                                width: `${(wo.stepsCompleted / wo.stepsCount) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {wo.stepsCompleted}/{wo.stepsCount} steps
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
