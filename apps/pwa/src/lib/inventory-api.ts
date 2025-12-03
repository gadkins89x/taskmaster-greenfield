import { apiClient } from './api-client';

export interface InventoryItem {
  id: string;
  itemNumber: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost?: number;
  manufacturer?: string;
  partNumber?: string;
  barcode?: string;
  location?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  type: 'receipt' | 'issue' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  performedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
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

// API functions
export async function getInventoryItems(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  locationId?: string;
  lowStock?: boolean;
  isActive?: boolean;
} = {}): Promise<PaginatedResponse<InventoryItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.category) searchParams.set('category', params.category);
  if (params.locationId) searchParams.set('locationId', params.locationId);
  if (params.lowStock) searchParams.set('lowStock', 'true');
  if (params.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());

  const query = searchParams.toString();
  return apiClient.get(`/inventory${query ? `?${query}` : ''}`);
}

export async function getInventoryItem(id: string): Promise<InventoryItem & { transactions: InventoryTransaction[] }> {
  return apiClient.get(`/inventory/${id}`);
}

export async function getInventoryByBarcode(barcode: string): Promise<InventoryItem> {
  return apiClient.get(`/inventory/barcode/${encodeURIComponent(barcode)}`);
}

export async function issueInventory(
  id: string,
  data: { quantity: number; reference?: string; referenceId?: string; notes?: string }
): Promise<{ item: InventoryItem; transaction: InventoryTransaction }> {
  return apiClient.post(`/inventory/${id}/issue`, data);
}

export async function receiveInventory(
  id: string,
  data: { quantity: number; unitCost?: number; reference?: string; notes?: string }
): Promise<{ item: InventoryItem; transaction: InventoryTransaction }> {
  return apiClient.post(`/inventory/${id}/receive`, data);
}

export async function adjustInventory(
  id: string,
  data: { newQuantity: number; reason: string }
): Promise<{ item: InventoryItem; transaction: InventoryTransaction }> {
  return apiClient.post(`/inventory/${id}/adjust`, data);
}

export async function getCategories(): Promise<string[]> {
  return apiClient.get('/inventory/categories');
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  return apiClient.get('/inventory/low-stock');
}
