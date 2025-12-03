import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useCreateSchedule } from '../../hooks/use-scheduling';
import type { ScheduleFrequency, SchedulePriority, CreateScheduleData } from '../../lib/scheduling-api';

interface Step {
  id: string;
  stepOrder: number;
  title: string;
  description: string;
  isRequired: boolean;
}

export function ScheduleCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateSchedule();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SchedulePriority>('medium');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('monthly');
  const [interval, setInterval] = useState('1');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [workOrderTitle, setWorkOrderTitle] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: crypto.randomUUID(),
        stepOrder: steps.length + 1,
        title: '',
        description: '',
        isRequired: true,
      },
    ]);
  };

  const updateStep = (id: string, updates: Partial<Step>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateScheduleData = {
      name,
      description: description || undefined,
      priority,
      frequency,
      interval: parseInt(interval, 10),
      startDate,
      endDate: endDate || undefined,
      leadTimeDays: parseInt(leadTimeDays, 10),
      workOrderTitle: workOrderTitle || name,
      estimatedHours: estimatedHours ? parseInt(estimatedHours, 10) : undefined,
      steps: steps.filter(s => s.title.trim()).map(s => ({
        stepOrder: s.stepOrder,
        title: s.title,
        description: s.description || undefined,
        isRequired: s.isRequired,
      })),
    };

    try {
      const schedule = await createMutation.mutateAsync(data);
      navigate({ to: '/scheduling/$scheduleId', params: { scheduleId: schedule.id } });
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/scheduling' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">New Maintenance Schedule</h1>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Schedule Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly HVAC Filter Replacement"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SchedulePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimatedHours">Est. Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recurrence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recurrence Pattern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduleFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="interval">Every N periods</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max="365"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="leadTimeDays">Lead Time (days before due)</Label>
            <Input
              id="leadTimeDays"
              type="number"
              min="0"
              max="90"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Work orders will be created this many days before the due date
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Work Order Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Order Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workOrderTitle">Work Order Title</Label>
            <Input
              id="workOrderTitle"
              value={workOrderTitle}
              onChange={(e) => setWorkOrderTitle(e.target.value)}
              placeholder={name || 'Same as schedule name'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist Steps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Checklist Steps</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addStep}>
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No steps added yet. Steps will appear on generated work orders.
            </p>
          ) : (
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.id} className="flex gap-3 p-3 border rounded-lg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
                    {step.stepOrder}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={step.title}
                      onChange={(e) => updateStep(step.id, { title: e.target.value })}
                      placeholder="Step title"
                    />
                    <Input
                      value={step.description}
                      onChange={(e) => updateStep(step.id, { description: e.target.value })}
                      placeholder="Optional description"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-${step.id}`}
                        checked={step.isRequired}
                        onChange={(e) => updateStep(step.id, { isRequired: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`required-${step.id}`} className="text-sm">
                        Required
                      </Label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(step.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
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
          onClick={() => navigate({ to: '/scheduling' })}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!name.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Schedule'
          )}
        </Button>
      </div>
    </form>
  );
}
