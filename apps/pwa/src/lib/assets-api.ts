import { apiClient } from './api-client';

export type AssetStatus = 'operational' | 'maintenance' | 'offline' | 'retired';

export interface Asset {
  id: string;
  name: string;
  assetTag: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  category?: string;
  status: AssetStatus;
  location?: {
    id: string;
    name: string;
    code: string;
  };
  purchaseDate?: string;
  warrantyExpires?: string;
  openWorkOrdersCount: number;
  createdAt: string;
}

export interface AssetDetail extends Asset {
  specifications?: Record<string, unknown>;
  workOrderStats: {
    total: number;
    open: number;
  };
  updatedAt: string;
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
export async function getAssets(params: {
  page?: number;
  limit?: number;
  search?: string;
  locationId?: string;
  status?: AssetStatus;
} = {}): Promise<PaginatedResponse<Asset>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.locationId) searchParams.set('locationId', params.locationId);
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return apiClient.get(`/assets${query ? `?${query}` : ''}`);
}

export async function getAsset(id: string): Promise<AssetDetail> {
  return apiClient.get(`/assets/${id}`);
}

export async function getAssetByTag(tag: string): Promise<AssetDetail> {
  return apiClient.get(`/assets/by-tag/${encodeURIComponent(tag)}`);
}

export async function getAssetByBarcode(barcode: string): Promise<AssetDetail> {
  return apiClient.get(`/assets/barcode/${encodeURIComponent(barcode)}`);
}
