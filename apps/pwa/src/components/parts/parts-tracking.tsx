import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useAddPart,
  useUpdatePart,
  useDeletePart,
  useReturnPart,
} from '../../hooks/use-work-orders';
import type { WorkOrderPart } from '../../lib/work-orders-api';

interface PartsTrackingProps {
  workOrderId: string;
  partsUsed: WorkOrderPart[];
  readOnly?: boolean;
}

const PART_STATUSES = [
  { value: 'used', label: 'Used', color: 'bg-green-100 text-green-800' },
  { value: 'returned', label: 'Returned', color: 'bg-blue-100 text-blue-800' },
  { value: 'damaged', label: 'Damaged', color: 'bg-red-100 text-red-800' },
];

export function PartsTracking({ workOrderId, partsUsed, readOnly = false }: PartsTrackingProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    partName: '',
    partNumber: '',
    quantity: '1',
    unitCost: '',
    notes: '',
  });

  const addPart = useAddPart();
  const updatePart = useUpdatePart();
  const deletePart = useDeletePart();
  const returnPart = useReturnPart();

  const handleAddPart = () => {
    const quantity = parseInt(formData.quantity, 10);
    if (!formData.partName || isNaN(quantity) || quantity <= 0) return;

    const unitCost = formData.unitCost ? parseFloat(formData.unitCost) : undefined;

    addPart.mutate({
      workOrderId,
      data: {
        partName: formData.partName,
        partNumber: formData.partNumber || undefined,
        quantity,
        unitCost,
        notes: formData.notes || undefined,
      },
    });

    setFormData({
      partName: '',
      partNumber: '',
      quantity: '1',
      unitCost: '',
      notes: '',
    });
    setShowAddForm(false);
  };

  const handleUpdatePart = (partId: string) => {
    const quantity = parseInt(formData.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) return;

    const unitCost = formData.unitCost ? parseFloat(formData.unitCost) : undefined;

    updatePart.mutate({
      workOrderId,
      partId,
      data: {
        quantity,
        unitCost,
        notes: formData.notes || undefined,
      },
    });

    setEditingPartId(null);
    setFormData({
      partName: '',
      partNumber: '',
      quantity: '1',
      unitCost: '',
      notes: '',
    });
  };

  const handleDeletePart = (partId: string) => {
    if (confirm('Are you sure you want to remove this part?')) {
      deletePart.mutate({ workOrderId, partId });
    }
  };

  const handleReturnPart = (part: WorkOrderPart) => {
    const returnQty = prompt(`Enter quantity to return (max ${part.quantity}):`, '1');
    if (returnQty === null) return;

    const quantity = parseInt(returnQty, 10);
    if (isNaN(quantity) || quantity <= 0 || quantity > part.quantity) {
      alert('Invalid quantity');
      return;
    }

    const notes = prompt('Return notes (optional):');

    returnPart.mutate({
      workOrderId,
      partId: part.id,
      data: {
        quantity,
        notes: notes || undefined,
      },
    });
  };

  const handleMarkDamaged = (part: WorkOrderPart) => {
    if (confirm('Mark this part as damaged?')) {
      updatePart.mutate({
        workOrderId,
        partId: part.id,
        data: { status: 'damaged' },
      });
    }
  };

  const startEditing = (part: WorkOrderPart) => {
    setEditingPartId(part.id);
    setFormData({
      partName: part.partName,
      partNumber: part.partNumber || '',
      quantity: part.quantity.toString(),
      unitCost: part.unitCost?.toString() || '',
      notes: part.notes || '',
    });
  };

  const totalCost = partsUsed
    .filter((p) => p.totalCost && p.status === 'used')
    .reduce((sum, p) => sum + Number(p.totalCost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Parts & Materials</h3>
        <div className="text-sm text-gray-500">
          Total Cost: <span className="font-medium text-gray-900">${totalCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Parts List */}
      <div className="space-y-2">
        {partsUsed.map((part) => (
          <div key={part.id} className="border border-gray-200 rounded-lg p-3">
            {editingPartId === part.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdatePart(part.id)}
                    disabled={updatePart.isPending}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingPartId(null);
                      setFormData({
                        partName: '',
                        partNumber: '',
                        quantity: '1',
                        unitCost: '',
                        notes: '',
                      });
                    }}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{part.partName}</span>
                    {part.partNumber && (
                      <span className="text-sm text-gray-500">#{part.partNumber}</span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        PART_STATUSES.find((s) => s.value === part.status)?.color ||
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {PART_STATUSES.find((s) => s.value === part.status)?.label || part.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <span>Qty: {part.quantity}</span>
                    {part.unitCost && (
                      <span className="ml-3">@ ${Number(part.unitCost).toFixed(2)}</span>
                    )}
                    {part.totalCost && (
                      <span className="ml-3 font-medium">= ${Number(part.totalCost).toFixed(2)}</span>
                    )}
                  </div>
                  {part.notes && <p className="text-sm text-gray-500 mt-1">{part.notes}</p>}
                  {part.inventoryItem && (
                    <p className="text-xs text-blue-600 mt-1">
                      From inventory: {part.inventoryItem.itemNumber} (Stock:{' '}
                      {part.inventoryItem.currentStock})
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Added by {part.addedBy.firstName} {part.addedBy.lastName} on{' '}
                    {format(parseISO(part.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {!readOnly && part.status === 'used' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(part)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Edit"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReturnPart(part)}
                      disabled={returnPart.isPending}
                      className="p-1 text-gray-400 hover:text-green-600"
                      title="Return"
                    >
                      <ReturnIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMarkDamaged(part)}
                      disabled={updatePart.isPending}
                      className="p-1 text-gray-400 hover:text-orange-600"
                      title="Mark Damaged"
                    >
                      <DamagedIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePart(part.id)}
                      disabled={deletePart.isPending}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Remove"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {partsUsed.length === 0 && (
          <p className="text-center text-gray-500 py-4">No parts or materials used yet</p>
        )}
      </div>

      {/* Add Part Form */}
      {!readOnly && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Add Part/Material</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Part Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Oil Filter, Bearing, Belt"
                    value={formData.partName}
                    onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Part Number
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={formData.partNumber}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Optional notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddPart}
                  disabled={addPart.isPending || !formData.partName || !formData.quantity}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Part
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      partName: '',
                      partNumber: '',
                      quantity: '1',
                      unitCost: '',
                      notes: '',
                    });
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
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <PartsIcon className="w-4 h-4" />
              Add Part/Material
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Icons
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

function ReturnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  );
}

function DamagedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function PartsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
