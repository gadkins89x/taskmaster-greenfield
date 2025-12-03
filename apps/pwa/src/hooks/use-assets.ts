import { useQuery } from '@tanstack/react-query';
import {
  getAssets,
  getAsset,
  getAssetByTag,
  getAssetByBarcode,
  type AssetStatus,
} from '../lib/assets-api';

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: string;
    status?: AssetStatus;
  }) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  byTag: (tag: string) => [...assetKeys.all, 'tag', tag] as const,
  byBarcode: (barcode: string) => [...assetKeys.all, 'barcode', barcode] as const,
};

export function useAssets(filters: {
  page?: number;
  limit?: number;
  search?: string;
  locationId?: string;
  status?: AssetStatus;
} = {}) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => getAssets(filters),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => getAsset(id),
    enabled: !!id,
  });
}

export function useAssetByTag(tag: string) {
  return useQuery({
    queryKey: assetKeys.byTag(tag),
    queryFn: () => getAssetByTag(tag),
    enabled: !!tag,
  });
}

export function useAssetByBarcode(barcode: string) {
  return useQuery({
    queryKey: assetKeys.byBarcode(barcode),
    queryFn: () => getAssetByBarcode(barcode),
    enabled: !!barcode,
  });
}
