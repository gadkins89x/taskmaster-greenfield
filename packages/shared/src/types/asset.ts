import type { LocationSummary } from './location';

export type AssetStatus = 'operational' | 'maintenance' | 'offline' | 'retired';

export interface Asset {
  id: string;
  name: string;
  assetTag: string;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  category: string | null;
  status: AssetStatus;
  locationId: string | null;
  location: LocationSummary | null;
  parentAssetId: string | null;
  purchaseDate: string | null;
  warrantyExpires: string | null;
  specifications: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetSummary {
  id: string;
  name: string;
  assetTag: string;
  manufacturer: string | null;
  model: string | null;
}

export interface AssetWithStats extends Asset {
  openWorkOrdersCount: number;
  workOrderStats?: {
    total: number;
    open: number;
    completedThisMonth: number;
  };
}

export interface CreateAssetRequest {
  name: string;
  assetTag: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  category?: string;
  status?: AssetStatus;
  locationId?: string;
  parentAssetId?: string;
  purchaseDate?: string;
  warrantyExpires?: string;
  specifications?: Record<string, unknown>;
}

export interface UpdateAssetRequest {
  name?: string;
  assetTag?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  category?: string;
  status?: AssetStatus;
  locationId?: string;
  parentAssetId?: string;
  purchaseDate?: string;
  warrantyExpires?: string;
  specifications?: Record<string, unknown>;
}

export interface AssetFilters {
  page?: number;
  limit?: number;
  search?: string;
  locationId?: string;
  category?: string;
  status?: AssetStatus;
  sort?: string;
  order?: 'asc' | 'desc';
}
