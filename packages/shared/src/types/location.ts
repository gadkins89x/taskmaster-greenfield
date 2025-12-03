export type LocationType = 'site' | 'building' | 'floor' | 'area' | 'room';

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  parentId: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationSummary {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  path?: string;
}

export interface LocationTreeNode extends Location {
  children: LocationTreeNode[];
  depth: number;
  path: string;
}

export interface LocationWithAncestors extends Location {
  ancestors: LocationSummary[];
  childrenCount: number;
  assetsCount: number;
}

export interface CreateLocationRequest {
  name: string;
  code: string;
  type: LocationType;
  parentId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateLocationRequest {
  name?: string;
  code?: string;
  type?: LocationType;
  parentId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface LocationFilters {
  parentId?: string | null;
  type?: LocationType;
  search?: string;
  flat?: boolean;
}
