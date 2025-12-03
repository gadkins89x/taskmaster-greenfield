import type { AssetSummary } from './asset';
import type { LocationSummary } from './location';
import type { UserSummary } from './user';

export type WorkOrderStatus =
  | 'open'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';

export type WorkOrderType = 'reactive' | 'preventive' | 'predictive' | 'inspection';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  type: WorkOrderType;
  assetId: string | null;
  asset: AssetSummary | null;
  locationId: string | null;
  location: LocationSummary | null;
  assignedToId: string | null;
  assignedTo: UserSummary | null;
  createdById: string;
  createdBy: UserSummary;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  completionNotes: string | null;
  isOverdue: boolean;
  stepsCount: number;
  stepsCompleted: number;
  commentsCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderDetail extends WorkOrder {
  steps: WorkOrderStep[];
  comments: WorkOrderComment[];
  signatures: WorkOrderSignature[];
}

export interface WorkOrderStep {
  id: string;
  stepOrder: number;
  title: string;
  description: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  completedById: string | null;
  completedBy: UserSummary | null;
  completedAt: string | null;
  completionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderComment {
  id: string;
  content: string;
  userId: string;
  user: UserSummary;
  parentId: string | null;
  isInternal: boolean;
  replies?: WorkOrderComment[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderSignature {
  id: string;
  userId: string;
  user: UserSummary;
  signatureData: string;
  type: 'technician' | 'supervisor' | 'customer';
  signedAt: string;
}

export interface CreateWorkOrderRequest {
  title: string;
  description?: string;
  priority: WorkOrderPriority;
  type: WorkOrderType;
  assetId?: string;
  locationId?: string;
  assignedToId?: string;
  dueDate?: string;
  estimatedHours?: number;
  steps?: CreateWorkOrderStepRequest[];
}

export interface CreateWorkOrderStepRequest {
  title: string;
  description?: string;
  isRequired?: boolean;
}

export interface UpdateWorkOrderRequest {
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
  type?: WorkOrderType;
  assetId?: string;
  locationId?: string;
  assignedToId?: string;
  dueDate?: string;
  estimatedHours?: number;
  expectedVersion: number;
}

export interface CompleteWorkOrderRequest {
  completionNotes?: string;
  actualHours?: number;
  expectedVersion: number;
}

export interface UpdateWorkOrderStepRequest {
  isCompleted?: boolean;
  completionNotes?: string;
}

export interface CreateWorkOrderCommentRequest {
  content: string;
  isInternal?: boolean;
  parentId?: string;
}

export interface WorkOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkOrderStatus[];
  priority?: WorkOrderPriority[];
  type?: WorkOrderType;
  assignedToId?: string;
  assetId?: string;
  locationId?: string;
  createdAfter?: string;
  createdBefore?: string;
  dueAfter?: string;
  dueBefore?: string;
  isOverdue?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}
