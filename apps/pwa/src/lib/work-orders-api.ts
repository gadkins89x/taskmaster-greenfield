import { apiClient } from './api-client';

// Types
export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'reactive' | 'preventive' | 'predictive' | 'inspection';
  asset?: {
    id: string;
    name: string;
    assetTag: string;
  };
  location?: {
    id: string;
    name: string;
    code: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  dueDate: string | null;
  isOverdue: boolean;
  estimatedHours?: number;
  stepsCount: number;
  stepsCompleted: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderPart {
  id: string;
  inventoryItemId?: string;
  partNumber?: string;
  partName: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  status: 'used' | 'returned' | 'damaged';
  inventoryItem?: {
    id: string;
    itemNumber: string;
    name: string;
    currentStock: number;
  };
  addedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface WorkOrderDetail extends WorkOrder {
  startedAt: string | null;
  completedAt: string | null;
  actualHours?: number;
  completionNotes?: string;
  steps: WorkOrderStep[];
  comments: WorkOrderComment[];
  signatures: WorkOrderSignature[];
  photos: WorkOrderPhoto[];
  laborEntries: WorkOrderLabor[];
  partsUsed: WorkOrderPart[];
  version: number;
}

export interface WorkOrderPhoto {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  caption?: string;
  category?: 'before' | 'during' | 'after' | 'damage' | 'repair';
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface WorkOrderLabor {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  startTime: string;
  endTime?: string;
  hours?: number;
  description?: string;
  laborType: 'regular' | 'overtime' | 'travel';
  hourlyRate?: number;
  createdAt: string;
}

export interface WorkOrderStep {
  id: string;
  stepOrder: number;
  title: string;
  description?: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  completedAt: string | null;
  completionNotes?: string;
}

export interface WorkOrderComment {
  id: string;
  content: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  isInternal: boolean;
  parentId?: string;
  replies?: WorkOrderComment[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderSignature {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  type: 'technician' | 'supervisor' | 'customer';
  signedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateWorkOrderData {
  title: string;
  description?: string;
  priority: string;
  type: string;
  assetId?: string;
  locationId?: string;
  assignedToId?: string;
  dueDate?: string;
  estimatedHours?: number;
  steps?: { title: string; description?: string; isRequired?: boolean }[];
}

export interface UpdateWorkOrderData {
  title?: string;
  description?: string;
  priority?: string;
  assignedToId?: string;
  dueDate?: string;
  estimatedHours?: number;
  expectedVersion: number;
}

// API functions
export async function getWorkOrders(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  assetId?: string;
} = {}): Promise<PaginatedResponse<WorkOrder>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.priority) searchParams.set('priority', params.priority);
  if (params.assignedToId) searchParams.set('assignedToId', params.assignedToId);
  if (params.assetId) searchParams.set('assetId', params.assetId);

  const query = searchParams.toString();
  return apiClient.get(`/work-orders${query ? `?${query}` : ''}`);
}

export async function getWorkOrder(id: string): Promise<WorkOrderDetail> {
  return apiClient.get(`/work-orders/${id}`);
}

export async function createWorkOrder(data: CreateWorkOrderData): Promise<WorkOrderDetail> {
  return apiClient.post('/work-orders', data);
}

export async function updateWorkOrder(id: string, data: UpdateWorkOrderData): Promise<WorkOrderDetail> {
  return apiClient.patch(`/work-orders/${id}`, data);
}

export async function startWorkOrder(id: string): Promise<WorkOrderDetail> {
  return apiClient.post(`/work-orders/${id}/start`);
}

export async function completeWorkOrder(
  id: string,
  data: { completionNotes?: string; actualHours?: number; expectedVersion: number }
): Promise<WorkOrderDetail> {
  return apiClient.post(`/work-orders/${id}/complete`, data);
}

// Steps
export async function completeStep(
  workOrderId: string,
  stepId: string,
  data: { completionNotes?: string }
): Promise<WorkOrderStep> {
  return apiClient.post(`/work-orders/${workOrderId}/steps/${stepId}/complete`, data);
}

export async function uncompleteStep(
  workOrderId: string,
  stepId: string
): Promise<WorkOrderStep> {
  return apiClient.post(`/work-orders/${workOrderId}/steps/${stepId}/uncomplete`);
}

// Comments
export async function getComments(
  workOrderId: string,
  params: { page?: number; limit?: number; includeInternal?: boolean } = {}
): Promise<PaginatedResponse<WorkOrderComment>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.includeInternal !== undefined) {
    searchParams.set('includeInternal', params.includeInternal.toString());
  }

  const query = searchParams.toString();
  return apiClient.get(`/work-orders/${workOrderId}/comments${query ? `?${query}` : ''}`);
}

export async function addComment(
  workOrderId: string,
  data: { content: string; parentId?: string; isInternal?: boolean }
): Promise<WorkOrderComment> {
  return apiClient.post(`/work-orders/${workOrderId}/comments`, data);
}

export async function updateComment(
  workOrderId: string,
  commentId: string,
  data: { content: string }
): Promise<WorkOrderComment> {
  return apiClient.patch(`/work-orders/${workOrderId}/comments/${commentId}`, data);
}

export async function deleteComment(
  workOrderId: string,
  commentId: string
): Promise<{ success: boolean }> {
  return apiClient.delete(`/work-orders/${workOrderId}/comments/${commentId}`);
}

// Activity Feed
export interface ActivityItem {
  id: string;
  type: 'comment' | 'step_completed' | 'status_change' | 'created' | 'updated';
  timestamp: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  } | null;
  data: Record<string, unknown>;
}

export async function getActivityFeed(
  workOrderId: string,
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<ActivityItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return apiClient.get(`/work-orders/${workOrderId}/activity${query ? `?${query}` : ''}`);
}

// Photos
export async function uploadPhoto(
  workOrderId: string,
  data: { dataUrl: string; filename: string; caption?: string; category?: string }
): Promise<WorkOrderPhoto> {
  return apiClient.post(`/work-orders/${workOrderId}/photos`, data);
}

export async function deletePhoto(
  workOrderId: string,
  photoId: string
): Promise<{ success: boolean }> {
  return apiClient.delete(`/work-orders/${workOrderId}/photos/${photoId}`);
}

export async function updatePhotoCaption(
  workOrderId: string,
  photoId: string,
  data: { caption?: string; category?: string }
): Promise<WorkOrderPhoto> {
  return apiClient.patch(`/work-orders/${workOrderId}/photos/${photoId}`, data);
}

// Labor Tracking
export async function addLaborEntry(
  workOrderId: string,
  data: {
    startTime: string;
    endTime?: string;
    hours?: number;
    description?: string;
    laborType?: 'regular' | 'overtime' | 'travel';
  }
): Promise<WorkOrderLabor> {
  return apiClient.post(`/work-orders/${workOrderId}/labor`, data);
}

export async function updateLaborEntry(
  workOrderId: string,
  laborId: string,
  data: {
    startTime?: string;
    endTime?: string;
    hours?: number;
    description?: string;
    laborType?: 'regular' | 'overtime' | 'travel';
  }
): Promise<WorkOrderLabor> {
  return apiClient.patch(`/work-orders/${workOrderId}/labor/${laborId}`, data);
}

export async function deleteLaborEntry(
  workOrderId: string,
  laborId: string
): Promise<{ success: boolean }> {
  return apiClient.delete(`/work-orders/${workOrderId}/labor/${laborId}`);
}

export async function startLaborTimer(workOrderId: string): Promise<WorkOrderLabor> {
  return apiClient.post(`/work-orders/${workOrderId}/labor/start`);
}

export async function stopLaborTimer(
  workOrderId: string,
  laborId: string,
  data?: { description?: string }
): Promise<WorkOrderLabor> {
  return apiClient.post(`/work-orders/${workOrderId}/labor/${laborId}/stop`, data || {});
}

// Parts/Materials
export async function addPart(
  workOrderId: string,
  data: {
    inventoryItemId?: string;
    partNumber?: string;
    partName: string;
    quantity: number;
    unitCost?: number;
    notes?: string;
  }
): Promise<WorkOrderPart> {
  return apiClient.post(`/work-orders/${workOrderId}/parts`, data);
}

export async function updatePart(
  workOrderId: string,
  partId: string,
  data: {
    quantity?: number;
    unitCost?: number;
    notes?: string;
    status?: 'used' | 'returned' | 'damaged';
  }
): Promise<WorkOrderPart> {
  return apiClient.patch(`/work-orders/${workOrderId}/parts/${partId}`, data);
}

export async function deletePart(
  workOrderId: string,
  partId: string
): Promise<{ success: boolean }> {
  return apiClient.delete(`/work-orders/${workOrderId}/parts/${partId}`);
}

export async function returnPart(
  workOrderId: string,
  partId: string,
  data: { quantity: number; notes?: string }
): Promise<WorkOrderPart> {
  return apiClient.post(`/work-orders/${workOrderId}/parts/${partId}/return`, data);
}
