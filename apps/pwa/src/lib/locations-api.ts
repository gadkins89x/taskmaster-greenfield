import { apiClient } from './api-client';

export type LocationType = 'site' | 'building' | 'floor' | 'area' | 'room';

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  parentId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Location[];
}

export interface LocationDetail extends Location {
  ancestors: Array<{ id: string; name: string; code: string; type: string }>;
  childrenCount: number;
  assetsCount: number;
}

// API functions
export async function getLocations(params: {
  parentId?: string | null;
  flat?: boolean;
} = {}): Promise<Location[]> {
  const searchParams = new URLSearchParams();
  if (params.parentId !== undefined) searchParams.set('parentId', params.parentId ?? '');
  if (params.flat) searchParams.set('flat', 'true');

  const query = searchParams.toString();
  return apiClient.get(`/locations${query ? `?${query}` : ''}`);
}

export async function getLocation(id: string): Promise<LocationDetail> {
  return apiClient.get(`/locations/${id}`);
}

export interface CreateLocationData {
  name: string;
  code: string;
  type: LocationType;
  parentId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateLocationData {
  name?: string;
  code?: string;
  type?: LocationType;
  parentId?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export async function createLocation(data: CreateLocationData): Promise<Location> {
  return apiClient.post('/locations', data);
}

export async function updateLocation(id: string, data: UpdateLocationData): Promise<Location> {
  return apiClient.patch(`/locations/${id}`, data);
}

export async function deleteLocation(id: string): Promise<{ success: boolean }> {
  return apiClient.delete(`/locations/${id}`);
}
