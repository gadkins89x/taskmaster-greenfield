import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { NativeSelect } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useCreateWorkOrder } from '../../hooks/use-work-orders';

const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  type: z.enum(['reactive', 'preventive', 'predictive', 'inspection']),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface Step {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
}

export function WorkOrderCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateWorkOrder();
  const [steps, setSteps] = useState<Step[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      priority: 'medium',
      type: 'reactive',
    },
  });

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: crypto.randomUUID(),
        title: '',
        description: '',
        isRequired: true,
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<Step>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const onSubmit = async (data: WorkOrderFormData) => {
    try {
      const validSteps = steps
        .filter((s) => s.title.trim())
        .map((s) => ({
          title: s.title,
          description: s.description || undefined,
          isRequired: s.isRequired,
        }));

      const result = await createMutation.mutateAsync({
        ...data,
        description: data.description || undefined,
        dueDate: data.dueDate || undefined,
        estimatedHours: data.estimatedHours || undefined,
        steps: validSteps.length > 0 ? validSteps : undefined,
      });

      navigate({ to: `/work-orders/${result.id}` });
    } catch (error) {
      console.error('Failed to create work order:', error);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/work-orders' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">New Work Order</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter work order title"
                {...register('title')}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the work to be done..."
                {...register('description')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="priority">Priority *</Label>
                <NativeSelect id="priority" {...register('priority')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </NativeSelect>
              </div>

              <div>
                <Label htmlFor="type">Type *</Label>
                <NativeSelect id="type" {...register('type')}>
                  <option value="reactive">Reactive</option>
                  <option value="preventive">Preventive</option>
                  <option value="predictive">Predictive</option>
                  <option value="inspection">Inspection</option>
                </NativeSelect>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...register('dueDate')}
                />
              </div>

              <div>
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  {...register('estimatedHours', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Checklist Steps</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No steps added. Click "Add Step" to create a checklist.
              </p>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <GripVertical className="mt-2 h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                          {index + 1}
                        </span>
                        <Input
                          placeholder="Step title"
                          value={step.title}
                          onChange={(e) => updateStep(step.id, { title: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                      <Input
                        placeholder="Step description (optional)"
                        value={step.description}
                        onChange={(e) => updateStep(step.id, { description: e.target.value })}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={step.isRequired}
                          onChange={(e) => updateStep(step.id, { isRequired: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        Required step
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate({ to: '/work-orders' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Work Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
