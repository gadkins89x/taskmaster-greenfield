import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  XCircle,
  Play,
  User,
  MapPin,
  Wrench,
  Calendar,
  MessageSquare,
  CheckSquare,
  Square,
  MoreVertical,
  Send,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import {
  useWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
  useCompleteStep,
  useUncompleteStep,
  useAddComment,
} from '../../hooks/use-work-orders';
import { cn } from '../../lib/utils';

const statusConfig = {
  open: { label: 'Open', icon: Clock, variant: 'info' as const, color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', icon: AlertTriangle, variant: 'warning' as const, color: 'bg-orange-500' },
  on_hold: { label: 'On Hold', icon: Pause, variant: 'secondary' as const, color: 'bg-gray-500' },
  completed: { label: 'Completed', icon: CheckCircle2, variant: 'success' as const, color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, variant: 'secondary' as const, color: 'bg-gray-500' },
};

const priorityConfig = {
  low: { label: 'Low', variant: 'secondary' as const },
  medium: { label: 'Medium', variant: 'info' as const },
  high: { label: 'High', variant: 'warning' as const },
  critical: { label: 'Critical', variant: 'destructive' as const },
};

interface WorkOrderDetailPageProps {
  workOrderId: string;
}

export function WorkOrderDetailPage({ workOrderId }: WorkOrderDetailPageProps) {
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'steps' | 'comments'>('steps');

  const { data: workOrder, isLoading, error } = useWorkOrder(workOrderId);
  const startMutation = useStartWorkOrder();
  const completeMutation = useCompleteWorkOrder();
  const completeStepMutation = useCompleteStep();
  const uncompleteStepMutation = useUncompleteStep();
  const addCommentMutation = useAddComment();

  if (isLoading) {
    return <LoadingScreen message="Loading work order..." />;
  }

  if (error || !workOrder) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Work order not found"
        description="The work order you're looking for doesn't exist"
        action={
          <Button onClick={() => navigate({ to: '/work-orders' })}>
            Back to Work Orders
          </Button>
        }
      />
    );
  }

  const status = statusConfig[workOrder.status];
  const priority = priorityConfig[workOrder.priority];
  const StatusIcon = status.icon;

  const handleStart = () => {
    startMutation.mutate(workOrderId);
  };

  const handleComplete = () => {
    completeMutation.mutate({
      id: workOrderId,
      data: { expectedVersion: workOrder.version },
    });
  };

  const handleToggleStep = (stepId: string, isCompleted: boolean) => {
    if (isCompleted) {
      uncompleteStepMutation.mutate({ workOrderId, stepId });
    } else {
      completeStepMutation.mutate({ workOrderId, stepId, data: {} });
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(
      { workOrderId, data: { content: newComment } },
      { onSuccess: () => setNewComment('') }
    );
  };

  const allRequiredStepsComplete = workOrder.steps
    .filter((s) => s.isRequired)
    .every((s) => s.isCompleted);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/work-orders' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {workOrder.workOrderNumber}
            </span>
            <Badge variant={priority.variant}>{priority.label}</Badge>
          </div>
          <h1 className="mt-1 text-xl font-bold">{workOrder.title}</h1>
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
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', status.color)}>
                <StatusIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-medium">{status.label}</div>
                {workOrder.isOverdue && (
                  <span className="text-sm text-destructive">Overdue</span>
                )}
              </div>
            </div>
            {workOrder.status === 'open' && (
              <Button onClick={handleStart} disabled={startMutation.isPending}>
                <Play className="mr-2 h-4 w-4" />
                Start Work
              </Button>
            )}
            {workOrder.status === 'in_progress' && (
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending || !allRequiredStepsComplete}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete
              </Button>
            )}
          </div>

          {/* Progress */}
          {workOrder.steps.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span>
                  {workOrder.steps.filter((s) => s.isCompleted).length} / {workOrder.steps.length} steps
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(workOrder.steps.filter((s) => s.isCompleted).length / workOrder.steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="divide-y p-0">
          {workOrder.description && (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">{workOrder.description}</p>
            </div>
          )}
          {workOrder.assignedTo && (
            <div className="flex items-center gap-3 p-4">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Assigned to</div>
                <div className="font-medium">
                  {workOrder.assignedTo.firstName} {workOrder.assignedTo.lastName}
                </div>
              </div>
            </div>
          )}
          {workOrder.asset && (
            <div className="flex items-center gap-3 p-4">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Asset</div>
                <div className="font-medium">{workOrder.asset.name}</div>
                <div className="text-sm text-muted-foreground">{workOrder.asset.assetTag}</div>
              </div>
            </div>
          )}
          {workOrder.location && (
            <div className="flex items-center gap-3 p-4">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="font-medium">{workOrder.location.name}</div>
              </div>
            </div>
          )}
          {workOrder.dueDate && (
            <div className="flex items-center gap-3 p-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Due Date</div>
                <div className={cn('font-medium', workOrder.isOverdue && 'text-destructive')}>
                  {new Date(workOrder.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('steps')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'steps'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <CheckSquare className="h-4 w-4" />
          Steps ({workOrder.steps.length})
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'comments'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Comments ({workOrder.comments.length})
        </button>
      </div>

      {/* Steps Tab */}
      {activeTab === 'steps' && (
        <div className="space-y-2">
          {workOrder.steps.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No steps"
              description="This work order has no checklist steps"
            />
          ) : (
            workOrder.steps.map((step) => (
              <Card key={step.id} className="p-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStep(step.id, step.isCompleted)}
                    disabled={workOrder.status === 'completed' || workOrder.status === 'cancelled'}
                    className="mt-0.5 text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    {step.isCompleted ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className={cn('font-medium', step.isCompleted && 'line-through opacity-60')}>
                      {step.title}
                      {step.isRequired && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </div>
                    {step.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                    )}
                    {step.isCompleted && step.completedBy && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Completed by {step.completedBy.firstName} {step.completedBy.lastName}
                        {step.completedAt && ` on ${new Date(step.completedAt).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {/* Comment Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              size="icon"
              className="h-auto"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Comments List */}
          {workOrder.comments.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No comments"
              description="Be the first to add a comment"
            />
          ) : (
            <div className="space-y-3">
              {workOrder.comments.map((comment) => (
                <Card key={comment.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {comment.user.firstName[0]}
                      {comment.user.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {comment.user.firstName} {comment.user.lastName}
                        </span>
                        {comment.isInternal && (
                          <Badge variant="secondary">Internal</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{comment.content}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
