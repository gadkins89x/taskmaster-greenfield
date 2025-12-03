import { useState, useEffect } from 'react';
import { format, differenceInSeconds, parseISO } from 'date-fns';
import {
  useAddLaborEntry,
  useUpdateLaborEntry,
  useDeleteLaborEntry,
  useStartLaborTimer,
  useStopLaborTimer,
} from '../../hooks/use-work-orders';
import type { WorkOrderLabor } from '../../lib/work-orders-api';

interface LaborTrackingProps {
  workOrderId: string;
  laborEntries: WorkOrderLabor[];
  readOnly?: boolean;
}

const LABOR_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'travel', label: 'Travel' },
  { value: 'training', label: 'Training' },
];

export function LaborTracking({ workOrderId, laborEntries, readOnly = false }: LaborTrackingProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    hours: '',
    description: '',
    laborType: 'regular',
  });

  const addLaborEntry = useAddLaborEntry();
  const updateLaborEntry = useUpdateLaborEntry();
  const deleteLaborEntry = useDeleteLaborEntry();
  const startLaborTimer = useStartLaborTimer();
  const stopLaborTimer = useStopLaborTimer();

  // Find active timer
  const activeTimer = laborEntries.find((entry) => !entry.endTime);

  const handleStartTimer = () => {
    startLaborTimer.mutate({
      workOrderId,
      data: {
        description: formData.description || undefined,
        laborType: formData.laborType,
      },
    });
    setFormData({ hours: '', description: '', laborType: 'regular' });
  };

  const handleStopTimer = (entryId: string) => {
    stopLaborTimer.mutate({ workOrderId, entryId });
  };

  const handleAddManualEntry = () => {
    const hours = parseFloat(formData.hours);
    if (isNaN(hours) || hours <= 0) return;

    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    addLaborEntry.mutate({
      workOrderId,
      data: {
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        hours,
        description: formData.description || undefined,
        laborType: formData.laborType,
      },
    });

    setFormData({ hours: '', description: '', laborType: 'regular' });
    setShowAddForm(false);
  };

  const handleUpdateEntry = (entryId: string) => {
    const hours = parseFloat(formData.hours);
    if (isNaN(hours) || hours <= 0) return;

    updateLaborEntry.mutate({
      workOrderId,
      entryId,
      data: {
        hours,
        description: formData.description || undefined,
        laborType: formData.laborType,
      },
    });

    setEditingEntryId(null);
    setFormData({ hours: '', description: '', laborType: 'regular' });
  };

  const handleDeleteEntry = (entryId: string) => {
    if (confirm('Are you sure you want to delete this labor entry?')) {
      deleteLaborEntry.mutate({ workOrderId, entryId });
    }
  };

  const startEditing = (entry: WorkOrderLabor) => {
    setEditingEntryId(entry.id);
    setFormData({
      hours: entry.hours?.toString() || '',
      description: entry.description || '',
      laborType: entry.laborType || 'regular',
    });
  };

  const totalHours = laborEntries
    .filter((e) => e.hours)
    .reduce((sum, e) => sum + (e.hours || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Labor Time</h3>
        <div className="text-sm text-gray-500">
          Total: <span className="font-medium text-gray-900">{totalHours.toFixed(2)} hours</span>
        </div>
      </div>

      {/* Active Timer Display */}
      {activeTimer && (
        <ActiveTimerDisplay
          entry={activeTimer}
          onStop={() => handleStopTimer(activeTimer.id)}
          isLoading={stopLaborTimer.isPending}
        />
      )}

      {/* Timer Controls */}
      {!readOnly && !activeTimer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="What are you working on?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={formData.laborType}
                onChange={(e) => setFormData({ ...formData, laborType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {LABOR_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleStartTimer}
              disabled={startLaborTimer.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <PlayIcon className="w-4 h-4" />
              Start Timer
            </button>
          </div>
        </div>
      )}

      {/* Labor Entries List */}
      <div className="space-y-2">
        {laborEntries.map((entry) => (
          <div key={entry.id} className="border border-gray-200 rounded-lg p-3">
            {editingEntryId === entry.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.laborType}
                      onChange={(e) => setFormData({ ...formData, laborType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {LABOR_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateEntry(entry.id)}
                    disabled={updateLaborEntry.isPending}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingEntryId(null);
                      setFormData({ hours: '', description: '', laborType: 'regular' });
                    }}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {entry.hours?.toFixed(2) || '—'} hours
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {LABOR_TYPES.find((t) => t.value === entry.laborType)?.label || entry.laborType}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {format(parseISO(entry.startTime), 'MMM d, yyyy h:mm a')}
                    {entry.endTime && ` - ${format(parseISO(entry.endTime), 'h:mm a')}`}
                  </p>
                </div>
                {!readOnly && entry.endTime && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(entry)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Edit"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={deleteLaborEntry.isPending}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {laborEntries.length === 0 && (
          <p className="text-center text-gray-500 py-4">No labor time recorded yet</p>
        )}
      </div>

      {/* Manual Entry Form */}
      {!readOnly && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Add Manual Entry</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="0.00"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.laborType}
                    onChange={(e) => setFormData({ ...formData, laborType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {LABOR_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="What did you work on?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddManualEntry}
                  disabled={addLaborEntry.isPending || !formData.hours}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Entry
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ hours: '', description: '', laborType: 'regular' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Add Manual Entry
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Active Timer Component with live updating
function ActiveTimerDisplay({
  entry,
  onStop,
  isLoading,
}: {
  entry: WorkOrderLabor;
  onStop: () => void;
  isLoading: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = parseISO(entry.startTime);
    const updateElapsed = () => {
      setElapsed(differenceInSeconds(new Date(), startTime));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [entry.startTime]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium text-green-800">Timer Running</span>
          </div>
          <p className="text-3xl font-mono font-bold text-green-900 mt-1">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
            {String(seconds).padStart(2, '0')}
          </p>
          {entry.description && (
            <p className="text-sm text-green-700 mt-1">{entry.description}</p>
          )}
        </div>
        <button
          onClick={onStop}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
        >
          <StopIcon className="w-4 h-4" />
          Stop
        </button>
      </div>
    </div>
  );
}

// Icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
