import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Settings2,
  AlertCircle,
  Play,
  Pause,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { useSchedules } from '../../hooks/use-scheduling';
import { cn } from '../../lib/utils';
import type { ScheduleFrequency, SchedulePriority } from '../../lib/scheduling-api';

const frequencyLabels: Record<ScheduleFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

const priorityConfig: Record<SchedulePriority, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' }> = {
  low: { label: 'Low', variant: 'secondary' },
  medium: { label: 'Medium', variant: 'default' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'destructive' },
};

export function SchedulingListPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data, isLoading, error } = useSchedules({
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
    limit: 50,
  });

  if (isLoading) {
    return <LoadingScreen message="Loading schedules..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Error loading schedules"
        description="There was a problem loading the maintenance schedules"
        action={
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        }
      />
    );
  }

  const schedules = data?.data || [];

  const formatNextDue = (nextDueDate?: string) => {
    if (!nextDueDate) return 'Not scheduled';
    const date = new Date(nextDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(nextDueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const getDueStatus = (nextDueDate?: string) => {
    if (!nextDueDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(nextDueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'soon';
    if (diffDays <= 7) return 'upcoming';
    return 'scheduled';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scheduling</h1>
        <Button onClick={() => navigate({ to: '/scheduling/new' })}>
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as 'all' | 'active' | 'inactive')}>
          <SelectTrigger className="w-[140px]">
            <Settings2 className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No maintenance schedules"
          description={activeFilter !== 'all' ? "Try adjusting your filter" : "Create your first preventive maintenance schedule"}
          action={
            <Button onClick={() => navigate({ to: '/scheduling/new' })}>
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => {
            const priority = priorityConfig[schedule.priority];
            const dueStatus = getDueStatus(schedule.nextDueDate);

            return (
              <Card
                key={schedule.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate({ to: '/scheduling/$scheduleId', params: { scheduleId: schedule.id } })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      schedule.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {schedule.isActive ? (
                        <Play className="h-5 w-5" />
                      ) : (
                        <Pause className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={priority.variant} className="text-xs">
                          {priority.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {frequencyLabels[schedule.frequency]}
                        </Badge>
                        {!schedule.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium truncate mt-1">{schedule.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        {schedule.asset && (
                          <span className="flex items-center gap-1">
                            <Settings2 className="h-3 w-3" />
                            {schedule.asset.name}
                          </span>
                        )}
                        {schedule.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {schedule.location.name}
                          </span>
                        )}
                        {schedule.estimatedHours && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {schedule.estimatedHours}h
                          </span>
                        )}
                      </div>
                      {schedule.isActive && schedule.nextDueDate && (
                        <div className={cn(
                          'mt-2 text-sm font-medium',
                          dueStatus === 'overdue' && 'text-red-600',
                          dueStatus === 'soon' && 'text-orange-600',
                          dueStatus === 'upcoming' && 'text-yellow-600',
                          dueStatus === 'scheduled' && 'text-muted-foreground'
                        )}>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Next: {formatNextDue(schedule.nextDueDate)}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination info */}
      {data?.meta && data.meta.total > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {schedules.length} of {data.meta.total} schedules
        </div>
      )}
    </div>
  );
}
