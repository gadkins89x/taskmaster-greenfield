import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Settings2,
  Play,
  Pause,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import {
  useSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useGenerateWorkOrder,
} from '../../hooks/use-scheduling';
import { cn } from '../../lib/utils';
import type { ScheduleFrequency, SchedulePriority } from '../../lib/scheduling-api';

interface ScheduleDetailPageProps {
  scheduleId: string;
}

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

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ScheduleDetailPage({ scheduleId }: ScheduleDetailPageProps) {
  const navigate = useNavigate();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { data: schedule, isLoading, error } = useSchedule(scheduleId);
  const updateMutation = useUpdateSchedule();
  const deleteMutation = useDeleteSchedule();
  const generateMutation = useGenerateWorkOrder();

  if (isLoading) {
    return <LoadingScreen message="Loading schedule..." />;
  }

  if (error || !schedule) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Schedule not found"
        description="The maintenance schedule you're looking for doesn't exist"
        action={
          <Button onClick={() => navigate({ to: '/scheduling' })}>
            Back to Scheduling
          </Button>
        }
      />
    );
  }

  const priority = priorityConfig[schedule.priority];

  const handleToggleActive = async () => {
    await updateMutation.mutateAsync({
      id: scheduleId,
      data: { isActive: !schedule.isActive },
    });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(scheduleId);
    navigate({ to: '/scheduling' });
  };

  const handleGenerateWorkOrder = async () => {
    await generateMutation.mutateAsync(scheduleId);
  };

  const formatRecurrence = () => {
    let text = frequencyLabels[schedule.frequency];
    if (schedule.interval > 1) {
      text = `Every ${schedule.interval} ${schedule.frequency === 'daily' ? 'days' : schedule.frequency === 'weekly' ? 'weeks' : schedule.frequency === 'monthly' ? 'months' : 'periods'}`;
    }
    if (schedule.daysOfWeek?.length > 0) {
      text += ` on ${schedule.daysOfWeek.map(d => dayNames[d]).join(', ')}`;
    }
    if (schedule.dayOfMonth) {
      text += ` on day ${schedule.dayOfMonth}`;
    }
    return text;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/scheduling' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={priority.variant}>{priority.label}</Badge>
            <Badge variant="outline">{frequencyLabels[schedule.frequency]}</Badge>
            {!schedule.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <h1 className="mt-1 text-xl font-bold">{schedule.name}</h1>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full text-white',
                schedule.isActive ? 'bg-green-500' : 'bg-gray-500'
              )}>
                {schedule.isActive ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <Pause className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="font-semibold">
                  {schedule.isActive ? 'Active' : 'Inactive'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatRecurrence()}
                </div>
              </div>
            </div>
          </div>

          {schedule.isActive && schedule.nextDueDate && (
            <div className="mt-4 border-t pt-4">
              <div className="text-sm text-muted-foreground">Next Due</div>
              <div className="text-2xl font-bold">
                {new Date(schedule.nextDueDate).toLocaleDateString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={handleToggleActive}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : schedule.isActive ? (
            <Pause className="mr-2 h-4 w-4" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {schedule.isActive ? 'Pause' : 'Activate'}
        </Button>
        <Button
          variant="outline"
          onClick={handleGenerateWorkOrder}
          disabled={!schedule.isActive || generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="mr-2 h-4 w-4" />
          )}
          Generate Now
        </Button>
      </div>

      {/* Description */}
      {schedule.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{schedule.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Schedule Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule Details</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {schedule.asset && (
            <div className="flex items-center gap-3 p-4">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Asset</div>
                <div className="font-medium">{schedule.asset.name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {schedule.asset.assetTag}
                </div>
              </div>
            </div>
          )}
          {schedule.location && (
            <div className="flex items-center gap-3 p-4">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="font-medium">{schedule.location.name}</div>
              </div>
            </div>
          )}
          {schedule.assignedTo && (
            <div className="flex items-center gap-3 p-4">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Assigned To</div>
                <div className="font-medium">
                  {schedule.assignedTo.firstName} {schedule.assignedTo.lastName}
                </div>
              </div>
            </div>
          )}
          {schedule.estimatedHours && (
            <div className="flex items-center gap-3 p-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Estimated Duration</div>
                <div className="font-medium">{schedule.estimatedHours} hours</div>
              </div>
            </div>
          )}
          <div className="p-4">
            <div className="text-sm text-muted-foreground">Work Order Title</div>
            <div className="font-medium">{schedule.workOrderTitle}</div>
          </div>
          <div className="p-4">
            <div className="text-sm text-muted-foreground">Lead Time</div>
            <div className="font-medium">{schedule.leadTimeDays} days before due</div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Start Date</div>
                <div className="font-medium">
                  {new Date(schedule.startDate).toLocaleDateString()}
                </div>
              </div>
              {schedule.endDate && (
                <div>
                  <div className="text-sm text-muted-foreground">End Date</div>
                  <div className="font-medium">
                    {new Date(schedule.endDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      {schedule.steps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklist Steps</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {schedule.steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3 p-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {step.stepOrder}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{step.title}</div>
                    {step.description && (
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {step.description}
                      </div>
                    )}
                  </div>
                  {step.isRequired && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Work Orders */}
      {schedule.generatedWorkOrders?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Work Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {schedule.generatedWorkOrders.map((swo) => (
                <div
                  key={swo.id}
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50"
                  onClick={() => navigate({
                    to: '/work-orders/$workOrderId',
                    params: { workOrderId: swo.workOrder.id },
                  })}
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    swo.workOrder.status === 'completed' && 'bg-green-500/10 text-green-600',
                    swo.workOrder.status === 'cancelled' && 'bg-red-500/10 text-red-600',
                    ['open', 'in_progress', 'on_hold'].includes(swo.workOrder.status) && 'bg-blue-500/10 text-blue-600'
                  )}>
                    {swo.workOrder.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : swo.workOrder.status === 'cancelled' ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-sm">{swo.workOrder.workOrderNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      Scheduled for {new Date(swo.scheduledFor).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant={
                      swo.workOrder.status === 'completed' ? 'default' :
                      swo.workOrder.status === 'cancelled' ? 'destructive' : 'secondary'
                    }
                    className="text-xs capitalize"
                  >
                    {swo.workOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Section */}
      <Card className="border-destructive/50">
        <CardContent className="p-4">
          {showConfirmDelete ? (
            <div className="space-y-3">
              <p className="text-sm">Are you sure you want to delete this schedule? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setShowConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Schedule
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
